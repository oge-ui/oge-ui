/**
 * OGE UI Pro commercial terms shown on the docs site — one place to change
 * when the price or the store moves.
 */

/** Price per developer per year, in US dollars. */
export const PRO_PRICE_USD = 299;

/**
 * Lemon Squeezy checkout link of the OGE UI Pro product (store `506298`,
 * product `1469395`). Set `PRO_CHECKOUT_URL` to it only once the store is
 * LIVE and the docs site's Vercel project holds a live-mode API key: a
 * test-mode link would let anyone "buy" with a test card and claim a real
 * key. While it is empty the "Buy" button falls back to email.
 */
export const PRO_STORE_CHECKOUT =
  'https://ogeui.lemonsqueezy.com/checkout/buy/437f37e9-e642-4db9-9c14-42149be003f0';
// Switched on 2026-10-24 while the store is still in test mode, so the
// owner can test the checkout end to end; test-mode orders carry no key
// (api/license/_order.mjs), so this exposes nothing.
export const PRO_CHECKOUT_URL: string = PRO_STORE_CHECKOUT;

/**
 * The checkout link for a number of seats — Lemon Squeezy reads `quantity`
 * as the order quantity, which the claim endpoint turns into seats.
 */
export function proCheckoutUrl(seats: number): string {
  if (!PRO_CHECKOUT_URL) return '';
  const url = new URL(PRO_CHECKOUT_URL);
  url.searchParams.set('quantity', String(Math.max(1, Math.round(seats))));
  return url.toString();
}

/** Where buyers write for invoices, volume pricing or offline purchase. */
export const PRO_SALES_EMAIL = 'license@ogeui.com';

/** The seven families an OGE UI Pro license covers. */
export const PRO_FAMILIES = [
  { name: 'Pivot Grid', pkg: 'pivot' },
  { name: 'Gantt', pkg: 'gantt' },
  { name: 'Scheduler', pkg: 'scheduler' },
  { name: 'Kanban', pkg: 'kanban' },
  { name: 'Charts', pkg: 'charts' },
  { name: 'BPMN Editor', pkg: 'bpmn' },
  { name: 'Spreadsheet', pkg: 'spreadsheet' },
] as const;
