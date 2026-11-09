/**
 * Keeps `position: fixed` surfaces honest under awkward ancestors.
 *
 * A `transform`, `filter`, `backdrop-filter` (and a few others) on an ancestor
 * makes that ancestor the containing block of its `fixed` descendants: viewport
 * coordinates land in the wrong place, and the ancestor's `overflow` clips the
 * surface. The browser's top layer (`popover="manual"` + `showPopover()`) has
 * the viewport as containing block and ignores ancestor clipping, while the
 * element stays where it is in the DOM — so focus traps, `contains()` checks
 * and inherited theme tokens keep working, which a move to `<body>` would break.
 *
 * Promotion happens only when needed, so ordinary pages keep their z-index
 * stacking. Once one surface is promoted, every later one follows: anything
 * left outside the top layer would paint underneath it.
 */

/** Marks a promoted surface; survives the release so the exit motion can tell. */
export const OGE_TOP_LAYER_CLASS = 'oge-top-layer';

type PopoverElement = HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

const WILL_CHANGE_CONTAINING =
  /\b(transform|translate|rotate|scale|perspective|filter|backdrop-filter|contain)\b/;
const CONTAIN_CONTAINING = /\b(paint|layout|strict|content)\b/;

let promotedCount = 0;

function isSet(value: string | undefined): boolean {
  return !!value && value !== 'none';
}

function capturesFixed(style: CSSStyleDeclaration): boolean {
  return (
    isSet(style.transform) ||
    isSet(style.translate) ||
    isSet(style.rotate) ||
    isSet(style.scale) ||
    isSet(style.perspective) ||
    isSet(style.filter) ||
    isSet(style.backdropFilter) ||
    CONTAIN_CONTAINING.test(style.contain ?? '') ||
    WILL_CHANGE_CONTAINING.test(style.willChange ?? '') ||
    (!!style.containerType && style.containerType !== 'normal')
  );
}

/**
 * A containing block that matches the viewport and cannot scroll resolves
 * viewport coordinates correctly — the shaded modal layer is one.
 */
function behavesLikeViewport(element: Element, view: Window): boolean {
  const rect = element.getBoundingClientRect();
  return (
    Math.abs(rect.left) < 1 &&
    Math.abs(rect.top) < 1 &&
    Math.abs(rect.width - view.innerWidth) < 1 &&
    Math.abs(rect.height - view.innerHeight) < 1 &&
    element.scrollHeight <= element.clientHeight &&
    element.scrollWidth <= element.clientWidth
  );
}

/** Whether an ancestor of `element` would capture its `position: fixed`. */
export function hasFixedContainingBlockAncestor(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  let node: Element | null = parentOf(element);
  while (node) {
    if (
      capturesFixed(view.getComputedStyle(node)) &&
      !behavesLikeViewport(node, view)
    ) {
      return true;
    }
    node = parentOf(node);
  }
  return false;
}

function parentOf(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/**
 * Moves `element` to the top layer when it needs it; returns the release.
 * Browsers without the Popover API keep the element as it is.
 */
export function ogePromoteToTopLayer(element: HTMLElement): () => void {
  const target = element as PopoverElement;
  if (
    typeof target.showPopover !== 'function' ||
    !element.isConnected ||
    (promotedCount === 0 && !hasFixedContainingBlockAncestor(element))
  ) {
    return () => undefined;
  }
  element.setAttribute('popover', 'manual');
  element.classList.add(OGE_TOP_LAYER_CLASS);
  target.showPopover();
  promotedCount++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    promotedCount--;
    if (element.isConnected && element.matches(':popover-open')) {
      target.hidePopover?.();
    }
    element.removeAttribute('popover');
  };
}
