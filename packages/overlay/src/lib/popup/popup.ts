import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import type { OgeAnchoredPanel } from '../panel/anchored-panel';

/**
 * Presentational chrome for an anchored panel: fixed positioning, popup
 * surface tokens and the panel's generated id. The owner renders it inline
 * behind an `@if (panel.isOpen())` and projects arbitrary content:
 *
 * ```html
 * @if (panel.isOpen()) {
 *   <oge-popup [panel]="panel">…content…</oge-popup>
 * }
 * ```
 */
@Component({
  selector: 'oge-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-popup',
    '[id]': 'panel().panelId',
    '[style.top.px]': 'panel().position()?.top ?? 0',
    '[style.left.px]': 'panel().position()?.left ?? 0',
    '[style.width.px]': 'panel().position()?.width ?? null',
    // Transparent until the first measure so the panel never flashes at
    // (0,0) — opacity (not visibility) keeps the subtree focusable. The
    // ready class then plays the fade/scale entrance from that state.
    '[style.opacity]': "panel().position() ? null : '0'",
    '[class.oge-popup-ready]': 'panel().position() !== null',
    '[attr.data-placement]': 'panel().position()?.placement ?? null',
  },
  styleUrl: './popup.scss',
  template: `<ng-content />`,
})
export class OgePopup {
  /** The anchored-panel model driving id, position and visibility. */
  readonly panel = input.required<OgeAnchoredPanel>();
}
