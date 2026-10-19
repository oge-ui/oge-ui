import {
  createOgeLayoutAnimator,
  ogeMotionEnabled,
  type OgeLayoutAnimator,
} from '../motion/motion';

/** The attribute each rendered form item (field or group) carries: its id. */
export const OGE_FORM_ITEM_ATTR = 'data-oge-form-item';

/** Conditional-field motion of a form — see {@link createOgeFormItemMotion}. */
export interface OgeFormItemMotion {
  /**
   * Call after every render. With `visibleChanged` (a `visibleWhen` showed
   * or hid an item) the items that appeared fade in and the ones below glide
   * from where they were; otherwise it only records the settled layout the
   * next change animates from.
   */
  update(visibleChanged: boolean): void;
  /** Stops every running glide (on destroy). */
  destroy(): void;
}

/**
 * FLIP motion for `visibleWhen` fields, shared by both render layers. One
 * layout animator runs per `.oge-form-fields` grid, keyed by the
 * `data-oge-form-item` of its direct children and measured against that
 * grid — so a group gliding down carries its own fields instead of each of
 * them gliding a second time. A hidden item just leaves (no exit ghost); a
 * grid that appears with the change records only. No-op with motion off.
 */
export function createOgeFormItemMotion(root: HTMLElement): OgeFormItemMotion {
  const animators = new Map<HTMLElement, OgeLayoutAnimator<string>>();
  const items = (grid: HTMLElement): (readonly [string, HTMLElement])[] =>
    Array.from(
      grid.querySelectorAll<HTMLElement>(`:scope > [${OGE_FORM_ITEM_ATTR}]`),
      (el) => [el.getAttribute(OGE_FORM_ITEM_ATTR) ?? '', el] as const,
    );
  return {
    update(visibleChanged) {
      if (!ogeMotionEnabled(root)) {
        if (animators.size > 0) this.destroy();
        return;
      }
      const grids = new Set(
        root.querySelectorAll<HTMLElement>('.oge-form-fields'),
      );
      for (const [grid, animator] of animators) {
        if (grids.has(grid)) continue;
        animator.cancel();
        animators.delete(grid);
      }
      for (const grid of grids) {
        let animator = animators.get(grid);
        if (!animator) {
          animator = createOgeLayoutAnimator<string>({
            root: grid,
            exit: false,
            query: () => items(grid),
          });
          animators.set(grid, animator);
          animator.capture();
          continue;
        }
        if (visibleChanged) void animator.play();
        else animator.capture();
      }
    },
    destroy() {
      for (const animator of animators.values()) animator.cancel();
      animators.clear();
    },
  };
}
