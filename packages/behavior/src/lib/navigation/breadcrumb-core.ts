import { fitToolbarItems } from '@oge-ui/core';
import type { OgeMenuItem } from '../menu/menu-types';

/**
 * The framework-free half of the breadcrumb (ADR 0001): its vocabulary, the
 * event payload, the message catalog and the config merge rule, plus the
 * descriptor normalization and the collapse decision. The fitting arithmetic
 * itself lives in `@oge-ui/core` (`toolbar-fit`) and is shared through it —
 * the breadcrumb only describes its crumbs as fit items.
 */

/** How the breadcrumb behaves when its container runs out of room. */
export type OgeBreadcrumbCollapseMode = 'auto' | 'wrap' | 'none';

/**
 * One breadcrumb entry. A deliberately narrow interface — extending the
 * canonical `OgeMenuItem` would drag along `checked`/`items`/`shortcut`, none
 * of which mean anything on a trail; the collapsed-crumbs menu maps these
 * fields onto menu items instead.
 */
export interface OgeBreadcrumbItemData<T = unknown> {
  text: string;
  /** Stable identity used in event payloads and DOM ids. */
  key?: string;
  /** Consumer-defined value carried through click events. */
  value?: T;
  /**
   * Renders the crumb as a real link (`<a href>`); the click event fires
   * first, so `preventDefault()` hands navigation to a router. Ignored on the
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
 * Payload of the breadcrumb's item-click event. Not fired by disabled crumbs
 * or by the last crumb (the current page).
 */
export interface OgeBreadcrumbItemClickEvent<T = unknown> {
  item: OgeBreadcrumbItemData<T>;
  /** The item's `key`, when it has one. */
  key?: string;
  /** Index within the rendered trail (collapsed crumbs included). */
  index: number;
  event: MouseEvent | KeyboardEvent;
}

// --- descriptors -----------------------------------------------------------

/** One normalized crumb: a stable id plus the entry it renders. */
export interface OgeBreadcrumbDescriptorCore {
  readonly id: string;
  readonly item: OgeBreadcrumbItemData;
}

/**
 * Normalizes an `items` array into descriptors — invisible entries dropped,
 * each given a stable id (`key`, or a positional fallback). Declarative
 * children come first in the render layers that have them, so the fallback ids
 * carry their own prefix and the two namespaces cannot collide.
 */
export function breadcrumbDataDescriptors(
  items: readonly OgeBreadcrumbItemData[] | undefined,
): readonly OgeBreadcrumbDescriptorCore[] {
  return (items ?? [])
    .filter((item) => item.visible !== false)
    .map((item, index) => ({ id: item.key ?? `i${index}`, item }));
}

// --- collapse decision -----------------------------------------------------

/** Estimated ellipsis-button size until the real element is measured. */
export const OGE_BREADCRUMB_ELLIPSIS_FALLBACK = 44;

export interface OgeBreadcrumbFitRequest {
  readonly descriptors: readonly OgeBreadcrumbDescriptorCore[];
  readonly collapseMode: OgeBreadcrumbCollapseMode;
  /** Measured container width; `<= 0` means "not measured yet". */
  readonly containerSize: number;
  /** Measured crumb widths by descriptor id. */
  readonly sizes: ReadonlyMap<string, number>;
  /** Measured ellipsis width; `<= 0` falls back to the estimate. */
  readonly ellipsisSize: number;
}

export interface OgeBreadcrumbFitResult {
  /** Indexes of the crumbs that folded into the ellipsis menu. */
  readonly inMenu: readonly number[];
  /** `true` while the ellipsis button is a real, reachable control. */
  readonly menuVisible: boolean;
}

const NOTHING_COLLAPSED: OgeBreadcrumbFitResult = {
  inMenu: [],
  menuVisible: false,
};

/**
 * Which crumbs fold into the ellipsis menu. The first and last crumb never
 * collapse (the reference contract) and the lowest priority yields first, so
 * the **oldest** middle crumb goes before the ones nearer the current page.
 *
 * Everything stays inline while the answer cannot be trusted: a non-`'auto'`
 * mode, a trail of two crumbs or fewer, an unmeasured container, or a crumb
 * whose width has not been recorded yet.
 */
export function fitBreadcrumbDescriptors(
  request: OgeBreadcrumbFitRequest,
): OgeBreadcrumbFitResult {
  if (request.collapseMode !== 'auto') return NOTHING_COLLAPSED;
  const ds = request.descriptors;
  if (ds.length <= 2) return NOTHING_COLLAPSED; // first and last never collapse
  if (request.containerSize <= 0) return NOTHING_COLLAPSED; // not measured yet
  const sizes = ds.map((d) => request.sizes.get(d.id));
  if (sizes.some((size) => size === undefined)) return NOTHING_COLLAPSED;
  const fit = fitToolbarItems({
    containerSize: request.containerSize,
    items: ds.map((d, index) => ({
      size: sizes[index] as number,
      policy: index === 0 || index === ds.length - 1 ? 'never' : 'auto',
      priority: index,
    })),
    menuButtonSize: request.ellipsisSize || OGE_BREADCRUMB_ELLIPSIS_FALLBACK,
  });
  return { inMenu: fit.inMenu, menuVisible: fit.menuVisible };
}

/**
 * The collapsed crumbs as menu rows, in trail order — `url` survives, so a
 * hidden crumb stays a real link, and `value` carries the trail index back to
 * the owner's click handler.
 */
export function breadcrumbMenuItems(
  descriptors: readonly OgeBreadcrumbDescriptorCore[],
  inMenu: Iterable<number>,
): readonly OgeMenuItem<number>[] {
  return [...inMenu]
    .sort((a, b) => a - b)
    .filter((index) => descriptors[index] !== undefined)
    .map((index) => ({
      text: descriptors[index].item.text,
      url: descriptors[index].item.url,
      icon: descriptors[index].item.icon,
      iconClass: descriptors[index].item.iconClass,
      disabled: descriptors[index].item.disabled,
      hint: descriptors[index].item.hint,
      value: index,
    }));
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the breadcrumb renders, including aria labels. */
export interface OgeBreadcrumbMessages {
  /** Accessible name of the `<nav>` landmark. */
  breadcrumb: string;
  /** Aria label of the ellipsis button opening the collapsed crumbs. */
  collapsed: string;
}

export const OGE_DEFAULT_BREADCRUMB_MESSAGES: OgeBreadcrumbMessages = {
  breadcrumb: 'Breadcrumb',
  collapsed: 'Show hidden items',
};

export interface OgeBreadcrumbConfig {
  messages: OgeBreadcrumbMessages;
  /** Default for the `collapseMode` input. */
  collapseMode?: OgeBreadcrumbCollapseMode;
}

export const OGE_DEFAULT_BREADCRUMB_CONFIG: OgeBreadcrumbConfig = {
  messages: OGE_DEFAULT_BREADCRUMB_MESSAGES,
};

export type OgeBreadcrumbConfigInput = Partial<
  Omit<OgeBreadcrumbConfig, 'messages'>
> & {
  messages?: Partial<OgeBreadcrumbMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeBreadcrumbConfig(
  input: OgeBreadcrumbConfigInput | undefined,
): OgeBreadcrumbConfig {
  return {
    ...OGE_DEFAULT_BREADCRUMB_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_BREADCRUMB_MESSAGES, ...input?.messages },
  };
}
