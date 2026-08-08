import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from '@angular/core';
import { OgeTabStrip } from './tab-strip';
import { OgeTabsBase } from './tabs-base';
import type { OgeTabsOrientation } from './tabs-types';

/**
 * Stand-alone tab strip without content panels — for view switching the
 * application controls itself (routing, custom containers):
 *
 * ```html
 * <oge-tabs
 *   [items]="[{ key: 'inbox', text: 'Inbox' }, { key: 'sent', text: 'Sent' }]"
 *   [(selectedKey)]="view"
 * />
 * ```
 *
 * Declarative `<oge-tab>` children work too; their projected content is
 * ignored here — use `oge-tab-panel` when the component should render the
 * content itself.
 */
@Component({
  selector: 'oge-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeTabStrip],
  host: {
    class: 'oge-tabs',
    '[class.oge-tabs-vertical]': "orientation() === 'vertical'",
    '[class.oge-disabled]': 'disabled()',
  },
  template: `
    <oge-tab-strip
      [descriptors]="descriptors()"
      [selectedIndex]="selectedIndex()"
      [activation]="activation()"
      [orientation]="orientation()"
      [disabled]="disabled()"
      [alignment]="tabAlignment()"
      [indicatorFit]="indicatorFit()"
      [showNavButtons]="showNavButtons()"
      [showTabListButton]="showTabListButton()"
      [allowReorder]="allowTabReordering()"
      [stylingMode]="stylingMode()"
      [size]="size()"
      [messages]="mergedMessages()"
      [closePendingIds]="closePendingIds()"
      [idPrefix]="uid"
      [ariaLabel]="ariaLabel()"
      (activate)="onStripActivate($event)"
      (focusSelect)="onStripFocusSelect($event)"
      (closeRequest)="onStripClose($event)"
      (reorderRequest)="onStripReorder($event)"
    />
    <div class="oge-tab-defs" hidden><ng-content /></div>
  `,
})
export class OgeTabs extends OgeTabsBase {
  /** Strip direction; `vertical` renders a column and maps arrow keys per APG. */
  readonly orientation = input<OgeTabsOrientation>('horizontal');
}
