/** How the breadcrumb behaves when its container runs out of room. */
export type OgeBreadcrumbCollapseMode = 'auto' | 'wrap' | 'none';

/**
 * One breadcrumb entry. A deliberately narrow interface — extending the
 * overlay's canonical `OgeMenuItem` would drag along `checked`/`items`/
 * `shortcut`, none of which mean anything on a trail; the collapsed-crumbs
 * menu maps these fields onto menu items instead.
 */
export interface OgeBreadcrumbItemData<T = unknown> {
  text: string;
  /** Stable identity used in event payloads and DOM ids. */
  key?: string;
  /** Consumer-defined value carried through click events. */
  value?: T;
  /**
   * Renders the crumb as a real link (`<a href>`); `itemClick` fires first,
   * so `event.preventDefault()` hands navigation to a router. Ignored on the
   * last crumb, which is the current page and never interactive.
   */
  url?: string;
  /** Tooltip (native `title`). */
  hint?: string;
  /** SVG path data (`d`) for a leading `aria-hidden` icon. */
  icon?: string;
  /** Class(es) for a leading icon element — the icon-font hook. */
  iconClass?: string;
  /** Disabled crumbs are exposed (`aria-disabled`) but inert. */
  disabled?: boolean;
  /** `false` removes the crumb entirely. */
  visible?: boolean;
}

/**
 * Payload of `OgeMenubar`-style `itemClick`. Not fired by disabled crumbs or
 * by the last crumb (the current page).
 */
export interface OgeBreadcrumbItemClickEvent<T = unknown> {
  item: OgeBreadcrumbItemData<T>;
  /** The item's `key`, when it has one. */
  key?: string;
  /** Index within the rendered trail (collapsed crumbs included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** Template context of `[ogeBreadcrumbItemTemplate]`. */
export interface OgeBreadcrumbItemTemplateContext {
  $implicit: OgeBreadcrumbItemData;
  index: number;
  /** `true` on the current page's crumb. */
  last: boolean;
}

/** Template context of `[ogeBreadcrumbSeparatorTemplate]`. */
export interface OgeBreadcrumbSeparatorTemplateContext {
  /** Index of the crumb the separator precedes. */
  index: number;
}
