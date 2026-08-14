import { signal, type Signal } from '@angular/core';
import {
  OgeAnchoredPanelCore,
  type OgeAnchoredPanelCoreOptions,
  type OgePopupCloseReason,
  type OgeResolvedPopupPosition,
} from '@oge-ui/behavior';

// The close-reason vocabulary lives beside the machine in `behavior`;
// re-exported so `@oge-ui/overlay` remains the Angular import path.
export type { OgePopupCloseReason } from '@oge-ui/behavior';

/**
 * Angular-facing options: everything the machine takes except the state
 * sinks, which this wrapper owns (it mirrors them into signals).
 */
export type OgeAnchoredPanelOptions = Omit<
  OgeAnchoredPanelCoreOptions,
  'onOpenChange' | 'onPositionChange'
>;

/**
 * Anchored-panel behavior as a DI-free model class (slice pattern): open/close
 * state, viewport-aware positioning (flip + clamp, RTL-aware), outside-click
 * and Escape closing, scroll/resize repositioning and focus restore. The
 * owning component renders the panel DOM inline (typically inside an
 * `<oge-popup>`) and calls `destroy()` from its `DestroyRef.onDestroy`.
 *
 * Since ADR 0001 Faz 3 the machine itself is `@oge-ui/behavior`'s
 * `OgeAnchoredPanelCore`, shared verbatim with the React overlay; this class
 * is the Angular seam — it mirrors the machine's state into `signal()`s so
 * templates and `effect()`s react to it, and forwards everything else.
 *
 * ```ts
 * readonly panel = new OgeAnchoredPanel({
 *   anchor: () => this.trigger()?.nativeElement ?? null,
 *   panel: () => this.panelRef()?.nativeElement ?? null,
 *   restoreFocus: () => this.trigger()?.nativeElement.focus(),
 * });
 * ```
 */
export class OgeAnchoredPanel {
  private readonly _isOpen = signal(false);
  readonly isOpen: Signal<boolean> = this._isOpen.asReadonly();

  /** `null` until the first measure after open; hide the panel while `null`. */
  private readonly _position = signal<OgeResolvedPopupPosition | null>(null);
  readonly position: Signal<OgeResolvedPopupPosition | null> =
    this._position.asReadonly();

  private readonly core: OgeAnchoredPanelCore;

  /** Unique id applied to the panel element — wire to `aria-controls`. */
  readonly panelId: string;

  constructor(options: OgeAnchoredPanelOptions) {
    this.core = new OgeAnchoredPanelCore({
      ...options,
      // The wrapper is what consumers hold, so it is what goes on the shared
      // Escape stack — `isTopOverlay(panel)` keeps working unchanged.
      stackToken: this,
      onOpenChange: (open) => this._isOpen.set(open),
      onPositionChange: (position) => this._position.set(position),
    });
    this.panelId = this.core.panelId;
  }

  open(): void {
    this.core.open();
  }

  close(reason: OgePopupCloseReason = 'api'): void {
    this.core.close(reason);
  }

  toggle(): void {
    this.core.toggle();
  }

  /** Re-measures anchor/panel and recomputes the position (rAF-coalesced). */
  updatePosition(): void {
    this.core.updatePosition();
  }

  /** Removes every listener and pending frame; call on owner destroy. */
  destroy(): void {
    this.core.destroy();
  }
}
