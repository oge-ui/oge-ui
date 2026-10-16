/**
 * OGE UI Pro commercial terms shown on the docs site — one place to change
 * when the price or the store moves.
 */

/** Price per developer per year, in US dollars. */
export const PRO_PRICE_USD = 299;

/**
 * Lemon Squeezy checkout link of the OGE UI Pro product. Empty until the
 * store is live: the "Buy" button then falls back to email.
 */
export const PRO_CHECKOUT_URL = '';

/** Where buyers write for invoices, volume pricing or offline purchase. */
export const PRO_SALES_EMAIL = 'license@ogeui.com';

/** The six families an OGE UI Pro license covers. */
export const PRO_FAMILIES = [
  { name: 'Pivot Grid', pkg: 'pivot' },
  { name: 'Gantt', pkg: 'gantt' },
  { name: 'Scheduler', pkg: 'scheduler' },
  { name: 'Kanban', pkg: 'kanban' },
  { name: 'Charts', pkg: 'charts' },
  { name: 'BPMN Editor', pkg: 'bpmn' },
] as const;
