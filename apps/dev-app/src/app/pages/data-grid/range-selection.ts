import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { toLocalDate } from '@oge-ui/core';
import {
  OgeColumn,
  OgeGrid,
  type OgeGridCellRange,
  type OgeRangeSelectionChangedEvent,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { makeEmployees } from '../../shared/demo-data';
import { ReactGridRangeSelectionDemos } from '../react-grid/range-selection';
import { ASYNC_SNIPPET, RANGE_SNIPPET } from './range-selection-snippets';

@Component({
  selector: 'app-range-selection',
  imports: [
    OgeGrid,
    OgeColumn,
    DemoCard,
    DocHeader,
    ReactGridRangeSelectionDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Range Selection & Clipboard"
      category="Data Grid"
      [chips]="[
        'selectionMode: cell',
        'Ctrl+C / Ctrl+V',
        'fill handle',
        'undo / redo',
        'async validation',
      ]"
    >
      <p>
        Spreadsheet-style interaction: select rectangular cell ranges, copy them
        as tab-separated values, paste blocks straight from Excel, drag the fill
        handle to copy values or extend number and date series, and undo any of
        it. Every write runs the column's parser and validators and lands as one
        undoable batch through the regular editing events.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-grid-range-selection-demos />
    } @else {
      <h3>Ranges, copy, paste & fill</h3>
      <p>
        Click a cell, then <kbd>Shift</kbd>+click or drag to grow the range
        (long press first on touch); <kbd>Shift</kbd>+arrows extend it from the
        keyboard and <kbd>Ctrl</kbd>+click adds another range.
        <kbd>Ctrl</kbd>+<kbd>C</kbd> copies (with captions here —
        <code>copyHeaders</code>), <kbd>Ctrl</kbd>+<kbd>V</kbd> pastes a TSV
        block from the focused cell, <kbd>Ctrl</kbd>+<kbd>D</kbd> /
        <kbd>Ctrl</kbd>+<kbd>R</kbd> fill down / right, <kbd>Ctrl</kbd>+<kbd
          >Z</kbd
        >
        / <kbd>Ctrl</kbd>+<kbd>Y</kbd> undo and redo. The read-only
        <em>Id</em> column is skipped by every write.
      </p>
      <app-demo-card
        [chips]="['batch editing', 'copyHeaders', 'pasteAddsRows']"
        [code]="rangeSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-range-grid"
          [data]="employees"
          keyField="id"
          selectionMode="cell"
          [rangeSelection]="{ copyHeaders: true, pasteAddsRows: true }"
          [editing]="{ mode: 'batch', allowUpdating: true }"
          [selectedRanges]="ranges()"
          (selectedRangesChange)="ranges.set($event)"
          (rangeSelectionChanged)="onRanges($event)"
          style="height: 380px"
        >
          <oge-column field="firstName" caption="First name" />
          <oge-column field="department" caption="Department" />
          <oge-column field="salary" caption="Salary" dataType="number" />
          <oge-column field="hireDate" caption="Hired" dataType="date" />
          <oge-column field="id" caption="Id" [width]="70" [editable]="false" />
        </oge-grid>
        <p
          class="demo-range-summary mt-2 text-sm text-gray-500 dark:text-gray-400"
        >
          {{ summary() || 'No range selected' }}
        </p>
      </app-demo-card>

      <h3>Async validation</h3>
      <p>
        <code>asyncValidators</code> run like a server check: the editor turns
        <code>aria-busy</code> while it runs and a save waits for the answer.
        Type <em>Taken</em> as a last name to see the rejection. The
        <em>Hired at</em> column is <code>dataType="datetime"</code> — a date
        and time editor.
      </p>
      <app-demo-card
        [chips]="['asyncValidators', 'datetime']"
        [code]="asyncSnippet"
        language="ts"
      >
        <oge-grid
          [data]="asyncRows"
          keyField="id"
          [editing]="{ mode: 'row', allowUpdating: true }"
        >
          <oge-column
            field="lastName"
            caption="Last name (unique)"
            [asyncValidators]="[uniqueName]"
          />
          <oge-column field="hireDate" caption="Hired at" dataType="datetime" />
        </oge-grid>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          In cell mode a single click selects; editing starts on double-click,
          <kbd>F2</kbd> or <kbd>Enter</kbd>.
        </li>
        <li>
          Copied text is formula-guarded like the CSV export: a cell starting
          with <code>=</code>, <code>+</code>, <code>-</code> or
          <code>&#64;</code>
          is prefixed so a spreadsheet does not evaluate it.
        </li>
        <li>
          A single copied value pasted onto a multi-cell range fills the whole
          range. Lines past the last row are dropped unless
          <code>pasteAddsRows</code> is on.
        </li>
        <li>
          Range sizes are announced through the shared live announcer; the fill
          handle is a pointer affordance and <kbd>Ctrl</kbd>+<kbd>D</kbd> /
          <kbd>Ctrl</kbd>+<kbd>R</kbd> are its keyboard twins.
        </li>
      </ul>
    }
  `,
})
export class RangeSelectionPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly rangeSnippet = RANGE_SNIPPET;
  protected readonly asyncSnippet = ASYNC_SNIPPET;
  protected readonly employees = makeEmployees(60, 3).map((row) => ({
    ...row,
    hireDate: toLocalDate(row.hireDate),
  }));
  protected readonly asyncRows = makeEmployees(5, 9).map((row) => ({
    ...row,
    hireDate: toLocalDate(`${row.hireDate}T09:30`),
  }));
  protected readonly ranges = signal<readonly OgeGridCellRange[]>([]);
  protected readonly summary = signal('');

  protected onRanges(event: OgeRangeSelectionChangedEvent): void {
    this.summary.set(
      event.cellCount
        ? `${event.cellCount} cells in ${event.ranges.length} range(s)`
        : '',
    );
  }

  /** Pretends to ask a server whether the name is taken. */
  protected readonly uniqueName = (
    control: AbstractControl,
  ): Promise<ValidationErrors | null> =>
    new Promise((resolve) =>
      setTimeout(
        () => resolve(control.value === 'Taken' ? { taken: true } : null),
        600,
      ),
    );
}
