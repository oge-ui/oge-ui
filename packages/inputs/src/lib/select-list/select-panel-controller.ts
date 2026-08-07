import { computed, effect, untracked, type ModelSignal } from '@angular/core';
import { OgeAnchoredPanel, type OgePopupPlacement } from '@oge-ui/overlay';
import type { OgeInputDropDownApi } from '../field/input-host';

/** Signal getters and callbacks the owning dropdown editor wires into the controller. */
export interface SelectPanelControllerDeps {
  anchor: () => HTMLElement;
  panel: () => HTMLElement | null;
  placement: () => OgePopupPlacement;
  width: () => number | 'anchor';
  offset: () => number;
  viewportPadding: () => number;
  /** The component's two-way `opened` model — kept in sync with the panel. */
  opened: ModelSignal<boolean>;
  /** Disabled/readonly gate: `true` closes an open popup and blocks the toggle. */
  blocked: () => boolean;
  restoreFocus: () => void;
  /** Runs right after the panel opens (load items, seed the active option, emit). */
  onOpened: () => void;
  /** Runs when the panel closes for any reason (reset state, emit). */
  onClosed: () => void;
}

/**
 * Owns the `OgeAnchoredPanel` of a dropdown editor plus the two effects every
 * editor repeats: the `opened` model ↔ panel sync and closing the popup when
 * the field becomes disabled/readonly. Must be constructed in an injection
 * context (the owning component's constructor or a field initializer); the
 * owner calls `destroy()` from its `DestroyRef` hook.
 */
export class SelectPanelController {
  readonly panel: OgeAnchoredPanel;

  constructor(private readonly deps: SelectPanelControllerDeps) {
    this.panel = new OgeAnchoredPanel({
      anchor: deps.anchor,
      panel: deps.panel,
      placement: deps.placement,
      width: deps.width,
      offset: deps.offset,
      viewportPadding: deps.viewportPadding,
      restoreFocus: deps.restoreFocus,
      onClosed: () => {
        if (deps.opened()) deps.opened.set(false);
        deps.onClosed();
      },
    });
    // `opened` model ↔ panel model, loop-guarded by comparing states first.
    effect(() => {
      const shouldOpen = deps.opened();
      untracked(() => {
        if (shouldOpen && !this.panel.isOpen()) {
          this.panel.open();
          deps.onOpened();
        } else if (!shouldOpen && this.panel.isOpen()) {
          this.panel.close('api');
        }
      });
    });
    // Becoming disabled/readonly closes an open popup.
    effect(() => {
      const blocked = deps.blocked();
      untracked(() => {
        if (blocked && this.panel.isOpen()) this.panel.close('api');
      });
    });
  }

  /** The chevron feature block for the field rail; `toggle` is the owner's toggle method. */
  dropDownApi(visible: () => boolean, toggle: () => void): OgeInputDropDownApi {
    return {
      visible: computed(visible),
      expanded: computed(() => this.deps.opened()),
      toggle: () => {
        if (this.deps.blocked()) return;
        toggle();
        this.deps.restoreFocus();
      },
    };
  }

  destroy(): void {
    this.panel.destroy();
  }
}
