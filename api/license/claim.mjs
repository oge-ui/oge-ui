/**
 * POST /api/license/claim — exchanges a Lemon Squeezy order for an OGE UI Pro
 * license key. Vercel serverless function (Node runtime).
 *
 * Body: `{ "order": "#12345", "email": "buyer@example.com" }` — the order
 * number from the receipt and the email the order was placed with. The pair
 * is the proof of purchase; the same order always yields an equivalent key,
 * so a lost key is simply claimed again.
 *
 * Environment (Vercel project settings, never in the repository):
 * - `LEMONSQUEEZY_API_KEY` — API key of the store (read access to orders).
 * - `LEMONSQUEEZY_STORE_ID` — the store whose orders count.
 * - `LEMONSQUEEZY_PRODUCT_ID` — optional; when set, only that product counts.
 * - `OGE_LICENSE_PRIVATE_KEY` — the Ed25519 PKCS#8 PEM that signs keys.
 * - `LEMONSQUEEZY_ACCEPT_TEST_ORDERS` — `1` to let test-mode orders carry a
 *   key while testing; unset in production.
 *
 * A key covers releases up to one year after the purchase day (plus a short
 * grace period); it never stops working for those releases.
 */
import { licenseForOrder, signLicense } from './_order.mjs';

const API = 'https://api.lemonsqueezy.com/v1';

function reply(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

async function lemon(path) {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Lemon Squeezy ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Use POST.' });
  }
  const {
    LEMONSQUEEZY_API_KEY,
    LEMONSQUEEZY_STORE_ID,
    OGE_LICENSE_PRIVATE_KEY,
  } = process.env;
  if (
    !LEMONSQUEEZY_API_KEY ||
    !LEMONSQUEEZY_STORE_ID ||
    !OGE_LICENSE_PRIVATE_KEY
  ) {
    return reply(res, 503, {
      error: 'License claiming is not configured yet. Email license@ogeui.com.',
    });
  }

  const body =
    typeof req.body === 'string' ? safeJson(req.body) : (req.body ?? {});
  const orderNumber = String(body.order ?? '').replace(/[^0-9]/g, '');
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  if (orderNumber === '' || !email.includes('@') || email.length > 254) {
    return reply(res, 400, {
      error: 'Enter the order number and the email you bought with.',
    });
  }

  let orders;
  try {
    const query = new URLSearchParams({
      'filter[store_id]': LEMONSQUEEZY_STORE_ID,
      'filter[user_email]': email,
      'page[size]': '100',
    });
    orders = (await lemon(`/orders?${query}`)).data ?? [];
  } catch {
    return reply(res, 502, {
      error: 'The store did not answer. Try again in a minute.',
    });
  }

  const order = orders.find(
    (o) =>
      String(o.attributes?.order_number) === orderNumber &&
      String(o.attributes?.user_email ?? '').toLowerCase() === email,
  );
  if (order === undefined) {
    return reply(res, 404, { error: 'No order with that number and email.' });
  }
  const result = licenseForOrder(
    order.id,
    order.attributes,
    process.env.LEMONSQUEEZY_PRODUCT_ID,
  );
  if (result.error) {
    return reply(res, result.status, { error: result.error });
  }
  const info = result.info;
  try {
    const key = signLicense(info);
    return reply(res, 200, { key, ...info });
  } catch {
    return reply(res, 500, {
      error: 'Could not sign the key. Email license@ogeui.com.',
    });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
