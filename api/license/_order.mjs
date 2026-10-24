/**
 * What a paid Lemon Squeezy order is worth, shared by the claim page
 * (`claim.mjs`) and the purchase webhook (`webhook.mjs`) so both always
 * issue the same key for the same order. Not a route: Vercel does not turn
 * files starting with `_` into functions.
 */
import {
  day,
  issueLicenseKey,
  loadPrivateKey,
  oneYearAfter,
} from '../../tools/license/sign.mjs';

/** Days added to the one-year update window, so a late renewal loses nothing. */
export const GRACE_DAYS = 14;

/**
 * Checks an order (the JSON:API `attributes` of a Lemon Squeezy order) and
 * returns the license it carries, or `{ error, status }` when it carries none.
 * Test-mode orders count only when `LEMONSQUEEZY_ACCEPT_TEST_ORDERS=1`.
 */
export function licenseForOrder(orderId, a, productId) {
  // Test-mode orders cost nothing — anyone holding a checkout link can place
  // one with a test card — so they carry a key only while testing is on.
  if (a.test_mode && process.env.LEMONSQUEEZY_ACCEPT_TEST_ORDERS !== '1') {
    return {
      status: 409,
      error: 'This is a test-mode order; it carries no license.',
    };
  }
  if (a.status !== 'paid') {
    return {
      status: 409,
      error: `This order is ${a.status}; only paid orders carry a license.`,
    };
  }
  const item = a.first_order_item ?? {};
  if (productId && String(item.product_id) !== String(productId)) {
    return { status: 404, error: 'That order is not for OGE UI Pro.' };
  }
  const purchased = new Date(a.created_at);
  return {
    info: {
      id: `ls-${orderId}`,
      licensee: a.user_name || a.user_email,
      seats: Math.max(1, Number(item.quantity) || 1),
      families: ['all'],
      issued: day(purchased),
      expires: oneYearAfter(purchased, GRACE_DAYS),
    },
  };
}

/** Signs a license with `OGE_LICENSE_PRIVATE_KEY`. Throws when the key is unusable. */
export function signLicense(info) {
  return issueLicenseKey(
    loadPrivateKey(process.env.OGE_LICENSE_PRIVATE_KEY),
    info,
  );
}
