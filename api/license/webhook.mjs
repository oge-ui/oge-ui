/**
 * POST /api/license/webhook — Lemon Squeezy calls this when an order is
 * created; a paid OGE UI Pro order gets its license key emailed to the buyer
 * through Resend. Vercel serverless function (Node runtime).
 *
 * The claim page (`claim.mjs`) stays the way to get a key again: both paths
 * share `_order.mjs`, so the emailed key and a claimed key are the same.
 *
 * Environment (Vercel project settings, never in the repository):
 * - `LEMONSQUEEZY_WEBHOOK_SECRET` — the signing secret set on the webhook in
 *   Lemon Squeezy; every request is checked against its `X-Signature`.
 * - `LEMONSQUEEZY_PRODUCT_ID` — optional; when set, only that product counts.
 * - `OGE_LICENSE_PRIVATE_KEY` — the Ed25519 PKCS#8 PEM that signs keys.
 * - `RESEND_API_KEY` — sends the email; `ogeui.com` is a verified Resend domain.
 * - `LICENSE_EMAIL_FROM` — optional sender, default `OGE UI <license@ogeui.com>`.
 * - `LEMONSQUEEZY_ACCEPT_TEST_ORDERS` — `1` to also answer test-mode orders
 *   (while the store is in test mode); off in production.
 *
 * Lemon Squeezy retries a webhook that does not answer 2xx, so failures that
 * a retry can fix (signing, email) answer 500; requests that will never carry
 * a license (unpaid, other product, test order) answer 200 and are skipped.
 * Resend's `Idempotency-Key` keeps a retried order from mailing twice.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { licenseForOrder, signLicense } from './_order.mjs';

const CLAIM_URL = 'https://www.ogeui.com/license/claim';
const SETUP_URL = 'https://www.ogeui.com/license';

function reply(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

/** The untouched request body — the signature is over these exact bytes. */
async function rawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

/** HMAC-SHA256 hex digest of the body, compared in constant time. */
export function validSignature(body, signature, secret) {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** The license email, as HTML and plain text. */
export function licenseEmail({ key, info, orderNumber }) {
  const seats = `${info.seats} ${info.seats === 1 ? 'seat' : 'seats'}`;
  const setup = `import { ogeSetLicenseKey } from '@oge-ui/core';\n\nogeSetLicenseKey('${key}');`;
  const text = [
    `Thank you for buying OGE UI Pro.`,
    ``,
    `Your license key (${seats}, updates until ${info.expires}):`,
    ``,
    key,
    ``,
    `Register it once, before the first Pro component renders — in main.ts (Angular) or at the top of your React entry:`,
    ``,
    setup,
    ``,
    `The key is checked offline and is safe to ship in your bundle.`,
    `Lost it? Get it again at ${CLAIM_URL} with order #${orderNumber} and this email address.`,
    `Full terms: ${SETUP_URL}`,
    ``,
    `Questions, invoices, more seats: reply to this email.`,
    `— OGE UI`,
  ].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px">
<tr><td style="padding:28px 32px 8px">
<p style="margin:0;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#6366f1">OGE UI Pro</p>
<h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">Your license key is ready</h1>
<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#475569">Thank you for your purchase. This key covers <strong>${escapeHtml(seats)}</strong> and every OGE UI release published until <strong>${escapeHtml(info.expires)}</strong> — those versions stay licensed forever.</p>
</td></tr>
<tr><td style="padding:16px 32px">
<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569">License key</p>
<div style="padding:12px 14px;border:1px solid #c7d2fe;border-radius:10px;background:#eef2ff;font-family:JetBrains Mono,Consolas,monospace;font-size:12px;line-height:1.5;word-break:break-all">${escapeHtml(key)}</div>
</td></tr>
<tr><td style="padding:4px 32px 8px">
<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569">Register it once, before the first Pro component renders</p>
<pre style="margin:0;padding:12px 14px;border-radius:10px;background:#0f172a;color:#e2e8f0;font-family:JetBrains Mono,Consolas,monospace;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all">${escapeHtml(setup)}</pre>
<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#475569">The key is checked offline and is safe to ship in your bundle.</p>
</td></tr>
<tr><td style="padding:16px 32px 28px">
<a href="${SETUP_URL}" style="display:inline-block;padding:10px 18px;border-radius:9px;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Read the license guide</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#64748b">Lost the key? Get it again at <a href="${CLAIM_URL}" style="color:#4f46e5">ogeui.com/license/claim</a> with order #${escapeHtml(orderNumber)} and this email address. Questions, invoices or more seats — just reply.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  return { text, html };
}

async function sendEmail({ to, key, info, orderNumber, orderId }) {
  const { text, html } = licenseEmail({ key, info, orderNumber });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `oge-license-${orderId}`,
    },
    body: JSON.stringify({
      from: process.env.LICENSE_EMAIL_FROM || 'OGE UI <license@ogeui.com>',
      to: [to],
      reply_to: 'license@ogeui.com',
      subject: `Your OGE UI Pro license key — order #${orderNumber}`,
      text,
      html,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${await response.text()}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Use POST.' });
  }
  const {
    LEMONSQUEEZY_WEBHOOK_SECRET,
    OGE_LICENSE_PRIVATE_KEY,
    RESEND_API_KEY,
  } = process.env;
  if (
    !LEMONSQUEEZY_WEBHOOK_SECRET ||
    !OGE_LICENSE_PRIVATE_KEY ||
    !RESEND_API_KEY
  ) {
    return reply(res, 503, { error: 'License emails are not configured.' });
  }

  const body = await rawBody(req);
  if (
    !validSignature(
      body,
      req.headers['x-signature'],
      LEMONSQUEEZY_WEBHOOK_SECRET,
    )
  ) {
    return reply(res, 401, { error: 'Invalid signature.' });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return reply(res, 400, { error: 'Invalid JSON.' });
  }
  const name = event?.meta?.event_name;
  if (name !== 'order_created') {
    return reply(res, 200, { skipped: `event ${name}` });
  }

  const order = event.data ?? {};
  const a = order.attributes ?? {};
  const result = licenseForOrder(
    order.id,
    a,
    process.env.LEMONSQUEEZY_PRODUCT_ID,
  );
  if (result.error) {
    return reply(res, 200, { skipped: result.error });
  }

  try {
    const key = signLicense(result.info);
    await sendEmail({
      to: a.user_email,
      key,
      info: result.info,
      orderNumber: a.order_number,
      orderId: order.id,
    });
    return reply(res, 200, { sent: true, seats: result.info.seats });
  } catch (error) {
    console.error('[license webhook]', error?.message ?? error);
    return reply(res, 500, {
      error: 'Could not issue or send the key; Lemon Squeezy will retry.',
    });
  }
}
