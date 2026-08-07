import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  inject,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';
import {
  OgeCheckBox,
  OgeDateBox,
  OgeNumberBox,
  OgeSelectBox,
  OgeTextBox,
} from '@oge-ui/inputs';
import type { LookupItem, OgeDataType } from '@oge-ui/grid/foundation';

/** Where the editor renders — decides which keyboard/blur wiring the host binds. */
export type OgeCellEditorSurface = 'cell' | 'form' | 'popup';

/**
 * The one grid editor: renders the dataType/lookup-matched `@oge-ui/inputs`
 * editor in the compact grid shape (`size=sm`, hidden label, no subscript)
 * bound to the row's `FormControl`. Replaces the six formerly duplicated
 * editor template blocks (cell/form/popup × grid/tree-list).
 *
 * The host keeps the load-bearing `.oge-editor` class (`onCellClickToEdit`
 * ignores events bubbling out of it; specs assert it). Keyboard/blur events
 * surface as outputs — the grid binds them per surface; events already
 * consumed by an open dropdown (`defaultPrevented`) are not re-emitted.
 * `dataType: 'date'` intentionally stays a native `<input type="date">`
 * until the DateBox wave.
 */
@Component({
  selector: 'oge-cell-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    ReactiveFormsModule,
    OgeCheckBox,
    OgeDateBox,
    OgeNumberBox,
    OgeSelectBox,
    OgeTextBox,
  ],
  host: {
    class: 'oge-editor oge-cell-editor',
    '[class.oge-editor-invalid]': 'invalid()',
    '[attr.title]': 'errorTitle() || null',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
  template: `
    @if (lookupItems(); as items) {
      <oge-select-box
        [items]="items"
        displayExpr="text"
        valueExpr="value"
        size="sm"
        labelMode="hidden"
        subscriptSizing="none"
        [fluid]="true"
        [label]="label()"
        [invalid]="invalid()"
        [formControl]="control()"
      />
    } @else {
      @switch (dataType()) {
        @case ('boolean') {
          <oge-check-box
            [label]="label()"
            [invalid]="invalid()"
            [formControl]="control()"
          />
        }
        @case ('number') {
          <oge-number-box
            size="sm"
            labelMode="hidden"
            subscriptSizing="none"
            [fluid]="true"
            [label]="label()"
            [invalid]="invalid()"
            [formControl]="control()"
          />
        }
        @case ('date') {
          <oge-date-box
            size="sm"
            labelMode="hidden"
            subscriptSizing="none"
            [fluid]="true"
            [label]="label()"
            [invalid]="invalid()"
            [formControl]="control()"
          />
        }
        @default {
          <oge-text-box
            size="sm"
            labelMode="hidden"
            subscriptSizing="none"
            [fluid]="true"
            [label]="label()"
            [invalid]="invalid()"
            [formControl]="control()"
          />
        }
      }
    }
  `,
})
export class OgeCellEditor {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The editing `FormControl` from the grid's `EditingModel`. */
  readonly control = input.required<FormControl<unknown>>();
  readonly dataType = input<OgeDataType>('string');
  /** Lookup options; when set, a select box wins over `dataType`. */
  readonly lookupItems = input<readonly LookupItem[] | undefined>(undefined);
  /** Accessible name — the column caption. */
  readonly label = input('');
  readonly surface = input<OgeCellEditorSurface>('form');
  /** Validation state, evaluated by the host per CD (control state is not reactive). */
  readonly invalid = input(false);
  /** Error text mirrored into the host `title` (cell surface). */
  readonly errorTitle = input<string | null>(null);

  /** Enter that was not consumed by an open dropdown. */
  readonly enterKey = output<Event>();
  /** Escape that was not consumed by an open dropdown. */
  readonly escapeKey = output<Event>();
  /** Tab — the cell surface commits and moves to the next editable column. */
  readonly tabKey = output<Event>();
  /** Focus left the editor entirely (dropdown popups count as inside). */
  readonly focusLeft = output<Event>();

  /** Moves focus into the editor's focusable control. */
  focus(): void {
    const host = this.hostEl.nativeElement;
    const target =
      host.querySelector<HTMLElement>('input, select, textarea, button') ??
      host;
    target.focus();
  }

  protected onKeydown(event: KeyboardEvent): void {
    // an open dropdown consumed the key (option commit, popup close) — the
    // next press reaches the grid
    if (event.defaultPrevented) return;
    switch (event.key) {
      case 'Enter':
        this.enterKey.emit(event);
        return;
      case 'Escape':
        this.escapeKey.emit(event);
        return;
      case 'Tab':
        this.tabKey.emit(event);
        return;
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (related && this.hostEl.nativeElement.contains(related)) return;
    this.focusLeft.emit(event);
  }
}
