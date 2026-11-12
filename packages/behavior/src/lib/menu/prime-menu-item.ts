import type { OgeMenuItem } from './menu-types';

/**
 * Moving from PrimeNG: the `MenuItem` shape of `primeng/api`, described
 * structurally so OGE does not depend on PrimeNG. Pass your existing model
 * arrays to {@link ogeFromPrimeMenuItems} unchanged.
 */
export interface OgePrimeMenuItem {
  label?: string;
  /** An icon CSS class (`'pi pi-save'`) → `iconClass`. */
  icon?: string;
  command?: (event: { originalEvent?: Event; item?: OgePrimeMenuItem }) => void;
  url?: string;
  routerLink?: unknown;
  queryParams?: Record<string, unknown>;
  fragment?: string;
  items?: OgePrimeMenuItem[];
  disabled?: boolean;
  visible?: boolean;
  separator?: boolean;
  styleClass?: string;
  badge?: string;
  title?: string;
  tooltip?: string;
  shortcut?: string;
  id?: string;
  /** Anything else PrimeNG allows is carried in `value`. */
  [key: string]: unknown;
}

/**
 * The `routerLink` of a PrimeNG item (with its `queryParams` and `fragment`)
 * as one URL: `['/users', 42]` → `/users/42`, `{ tab: 'a b' }` →
 * `?tab=a%20b`. The OGE menu renders a real link from it; hand navigation to
 * the router from the item-click event (`event.preventDefault()`).
 */
export function ogePrimeRouterLinkUrl(
  item: Pick<OgePrimeMenuItem, 'routerLink' | 'queryParams' | 'fragment'>,
): string | undefined {
  const link = item.routerLink;
  if (link === undefined || link === null || link === '') return undefined;
  const path = Array.isArray(link)
    ? link
        .map((segment, index) => {
          const text = String(segment);
          // join segments with single slashes, keeping a leading one
          return index === 0
            ? text.replace(/\/+$/, '')
            : text.replace(/^\/+|\/+$/g, '');
        })
        .filter((segment, index) => index === 0 || segment !== '')
        .join('/') || '/'
    : String(link);
  const query = item.queryParams
    ? Object.entries(item.queryParams)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
        )
        .join('&')
    : '';
  return `${path}${query ? `?${query}` : ''}${
    item.fragment ? `#${encodeURIComponent(item.fragment)}` : ''
  }`;
}

/**
 * Converts PrimeNG `MenuItem` arrays to `OgeMenuItem` arrays, recursively:
 *
 * | PrimeNG | OGE |
 * |---|---|
 * | `label` | `text` |
 * | `command` | `action` (called with `{ item }`) |
 * | `icon` (a CSS class) | `iconClass` |
 * | `routerLink` (+ `queryParams`, `fragment`) / `url` | `url` |
 * | `separator`, `disabled`, `visible`, `badge`, `shortcut`, `items` | the same |
 * | `styleClass` | `cssClass` |
 * | `title` / `tooltip` | `hint` |
 * | `id` (else the item) | `value` |
 *
 * The originals stay untouched; the result is a new array each call.
 */
export function ogeFromPrimeMenuItems(
  items: readonly OgePrimeMenuItem[],
): OgeMenuItem[] {
  return items.map((prime) => {
    if (prime.separator) {
      return {
        text: '',
        separator: true,
        ...(prime.visible === false ? { visible: false } : {}),
      };
    }
    const out: OgeMenuItem = {
      text: prime.label ?? '',
      value: prime.id ?? prime,
    };
    const url = prime.url ?? ogePrimeRouterLinkUrl(prime);
    if (url) out.url = url;
    if (prime.icon) out.iconClass = prime.icon;
    if (prime.disabled) out.disabled = true;
    if (prime.visible === false) out.visible = false;
    if (prime.styleClass) out.cssClass = prime.styleClass;
    const hint = prime.title ?? prime.tooltip;
    if (hint) out.hint = hint;
    if (prime.badge !== undefined && prime.badge !== '')
      out.badge = prime.badge;
    if (prime.shortcut) out.shortcut = prime.shortcut;
    if (prime.command) {
      const command = prime.command;
      out.action = () => command({ item: prime });
    }
    if (prime.items?.length) out.items = ogeFromPrimeMenuItems(prime.items);
    return out;
  });
}
