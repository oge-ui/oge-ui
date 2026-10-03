import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  findOgeRowDragParticipant,
  type OgeCellPreparedEvent,
  type OgeConditionalFormat,
  type OgeEditingOptions,
  type OgeGridCellRange,
  type OgeHeaderFilterOptions,
  type OgeRangeSelectionChangedEvent,
  type OgeRowDropEvent,
} from '@oge-ui/behavior';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  qty: number;
  region: string;
}

const rows = (): Row[] => [
  { id: 1, name: 'Ada', qty: 10, region: 'EU' },
  { id: 2, name: 'Bob', qty: 20, region: 'EU' },
  { id: 3, name: 'Cem', qty: 30, region: 'US' },
  { id: 4, name: 'Dee', qty: 40, region: 'US' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pointer(el: Element, type: string, init: MouseEventInit = {}): void {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: 'mouse' });
  el.dispatchEvent(event);
}

function key(el: Element, key: string, init: KeyboardEventInit = {}): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

function clipboardEvent(type: 'copy' | 'paste', text = ''): Event & {
  data: Map<string, string>;
} {
  const data = new Map<string, string>([['text/plain', text]]);
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    data: Map<string, string>;
  };
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (format: string) => data.get(format) ?? '',
      setData: (format: string, value: string) => data.set(format, value),
    },
  });
  event.data = data;
  return event;
}

const cell = (el: HTMLElement, row: number, col: number): HTMLElement =>
  el.querySelector(`[data-cell="${row}-${col}"]`) as HTMLElement;

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      selectionMode="cell"
      [editing]="editing()"
      [rangeSelection]="{ copyHeaders: copyHeaders() }"
      [(selectedRanges)]="ranges"
      (rangeSelectionChanged)="changes.push($event)"
    >
      <oge-column field="name" caption="Name" />
      <oge-column field="qty" caption="Qty" dataType="number" />
      <oge-column field="region" caption="Region" [editable]="false" />
    </oge-grid>
  `,
})
class RangeHost {
  readonly grid = viewChild.required(OgeGrid);
  data = rows();
  readonly editing = signal<false | OgeEditingOptions>({
    mode: 'batch',
    allowUpdating: true,
  });
  readonly copyHeaders = signal(false);
  ranges: readonly OgeGridCellRange[] = [];
  readonly changes: OgeRangeSelectionChangedEvent[] = [];
}

describe('cell range selection', () => {
  async function render() {
    const fixture = TestBed.createComponent(RangeHost);
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement, host: fixture.componentInstance };
  }

  it('click + shift-click selects a range with aria-selected and an event', async () => {
    const { fixture, el, host } = await render();
    pointer(cell(el, 0, 0), 'pointerdown');
    pointer(cell(el, 0, 0), 'pointerup');
    pointer(cell(el, 2, 1), 'pointerdown', { shiftKey: true });
    await settle(fixture);
    expect(cell(el, 1, 1).getAttribute('aria-selected')).toBe('true');
    expect(cell(el, 3, 1).getAttribute('aria-selected')).toBe('false');
    expect(cell(el, 0, 0).classList).toContain('oge-range-top');
    expect(host.ranges).toEqual([
      { anchor: { row: 0, col: 0 }, focus: { row: 2, col: 1 } },
    ]);
    expect(host.changes.at(-1)).toMatchObject({ rowCount: 3, columnCount: 2, cellCount: 6 });
    expect(
      el.querySelector('.oge-viewport')?.getAttribute('aria-multiselectable'),
    ).toBe('true');
  });

  it('Shift+Arrow extends from the focused cell; Ctrl+C copies TSV', async () => {
    const { fixture, el, host } = await render();
    host.copyHeaders.set(true);
    cell(el, 0, 0).focus();
    pointer(cell(el, 0, 0), 'pointerdown');
    pointer(cell(el, 0, 0), 'pointerup');
    await settle(fixture);
    key(cell(el, 0, 0), 'ArrowDown', { shiftKey: true });
    await settle(fixture);
    key(cell(el, 1, 0), 'ArrowRight', { shiftKey: true });
    await settle(fixture);
    expect(host.ranges.at(-1)).toEqual({
      anchor: { row: 0, col: 0 },
      focus: { row: 1, col: 1 },
    });
    const copy = clipboardEvent('copy');
    el.querySelector('.oge-viewport')!.dispatchEvent(copy);
    expect(copy.defaultPrevented).toBe(true);
    expect(copy.data.get('text/plain')).toBe('Name\tQty\r\nAda\t10\r\nBob\t20');
  });

  it('pastes a TSV block into editable cells as staged changes, skipping read-only ones', async () => {
    const { fixture, el, host } = await render();
    cell(el, 1, 0).focus();
    await settle(fixture);
    el.querySelector('.oge-viewport')!.dispatchEvent(
      clipboardEvent('paste', 'Zed\t7\tXX\r\nYan\tnope\r\n'),
    );
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);
    expect(cell(el, 1, 0).textContent?.trim()).toBe('Zed');
    expect(cell(el, 1, 1).textContent?.trim()).toBe('7');
    // read-only region keeps its value; 'nope' is no number
    expect(cell(el, 1, 2).textContent?.trim()).toBe('EU');
    expect(cell(el, 2, 0).textContent?.trim()).toBe('Yan');
    expect(cell(el, 2, 1).textContent?.trim()).toBe('30');
    expect(host.grid().hasChanges()).toBe(true);
    // one undoable batch
    await host.grid().undo();
    await settle(fixture);
    expect(cell(el, 1, 0).textContent?.trim()).toBe('Bob');
    expect(cell(el, 2, 0).textContent?.trim()).toBe('Cem');
  });

  it('Ctrl+D fills down, extending nothing outside the range; Ctrl+Z reverts', async () => {
    const { fixture, el, host } = await render();
    host.grid().selectRange({ anchor: { row: 0, col: 1 }, focus: { row: 2, col: 1 } });
    await settle(fixture);
    cell(el, 0, 1).focus();
    await settle(fixture);
    key(cell(el, 0, 1), 'd', { ctrlKey: true });
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);
    expect([0, 1, 2, 3].map((r) => cell(el, r, 1).textContent?.trim())).toEqual([
      '10',
      '10',
      '10',
      '40',
    ]);
    key(cell(el, 0, 1), 'z', { ctrlKey: true });
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);
    expect(cell(el, 1, 1).textContent?.trim()).toBe('20');
  });

  it('draws the fill handle only while editing is on', async () => {
    const { fixture, el, host } = await render();
    host.grid().selectRange({ anchor: { row: 0, col: 0 }, focus: { row: 1, col: 1 } });
    await settle(fixture);
    expect(cell(el, 1, 1).querySelector('.oge-fill-handle')).not.toBeNull();
    host.editing.set(false);
    await settle(fixture);
    expect(el.querySelector('.oge-fill-handle')).toBeNull();
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [rowClass]="rowClass"
      [cellClass]="cellClass"
      [pinnedTopRows]="[2]"
      [pinnedBottomRows]="[{ id: 99, name: 'Total', qty: 100, region: '' }]"
      (cellPrepared)="prepared.push($event)"
    >
      <oge-column field="name" caption="Name" />
      <oge-column
        field="qty"
        caption="Qty"
        dataType="number"
        [conditionalFormats]="formats"
      />
      <oge-column field="region" caption="Region" [mergeCells]="true" />
    </oge-grid>
  `,
})
class StylingHost {
  data = rows();
  readonly rowClass = (row: Row) => ({ 'is-big': row.qty >= 30 });
  readonly cellClass = (row: Row, column: { field: string | undefined }) =>
    column.field === 'name' ? `name-${row.id}` : null;
  readonly formats: OgeConditionalFormat<Row>[] = [
    { when: { operator: 'ge', value: 40 }, style: { tone: 'danger' } },
    { type: 'dataBar' },
  ];
  readonly prepared: OgeCellPreparedEvent<Row>[] = [];
}

describe('styling hooks, conditional formats, pinned rows, merged cells', () => {
  it('applies row/cell class hooks and token-only formats', async () => {
    const fixture = TestBed.createComponent(StylingHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const body = Array.from(el.querySelectorAll('.oge-rows > .oge-row'));
    // key 2 is pinned to the top: three body rows remain
    expect(body).toHaveLength(3);
    expect(body[1].classList).toContain('is-big');
    expect(body[0].querySelector('.name-1')).not.toBeNull();
    const dee = body[2].querySelectorAll('.oge-cell')[1] as HTMLElement;
    expect(dee.classList).toContain('oge-cf-tone-danger');
    expect(dee.classList).toContain('oge-cf-databar');
    expect(dee.style.getPropertyValue('--oge-cf-bar')).toBe('1');
    // 3 body rows × 3 cells, minus the one the merged region covers
    expect(fixture.componentInstance.prepared).toHaveLength(8);
  });

  it('renders pinned rows in the header and footer sections', async () => {
    const fixture = TestBed.createComponent(StylingHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const top = el.querySelector('.oge-header .oge-pinned-row');
    expect(top?.textContent).toContain('Bob');
    expect(top?.getAttribute('aria-rowindex')).toBe('2');
    const bottom = el.querySelector('.oge-footer .oge-pinned-row');
    expect(bottom?.textContent).toContain('Total');
    // pinned rows are not in the roving tab order
    expect(top?.querySelector('[tabindex]')).toBeNull();
  });

  it('merges equal adjacent values with aria-rowspan', async () => {
    const fixture = TestBed.createComponent(StylingHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // body: Ada(EU) Cem(US) Dee(US) — US merges
    const owner = el.querySelector('[data-cell="1-2"]') as HTMLElement;
    expect(owner.getAttribute('aria-rowspan')).toBe('2');
    expect(owner.style.getPropertyValue('--oge-span-rows')).toBe('2');
    expect(el.querySelector('[data-cell="2-2"]')).toBeNull();
    expect(el.querySelectorAll('.oge-cell-span-covered')).toHaveLength(1);
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [headerFilter]="headerFilter">
      <oge-column field="name" caption="Name" />
      <oge-column field="qty" caption="Qty" dataType="number" />
      <oge-column field="shipped" caption="Shipped" dataType="date" />
    </oge-grid>
  `,
})
class HeaderMenuHost {
  readonly headerFilter: OgeHeaderFilterOptions = { mode: 'both' };
  data = [
    { id: 1, name: 'Ada', qty: 10, shipped: new Date(2026, 0, 5) },
    { id: 2, name: 'Bob', qty: 20, shipped: new Date(2026, 1, 9) },
    { id: 3, name: 'Cem', qty: 30, shipped: new Date(2025, 11, 1) },
  ];
}

describe('Excel-style header filter menu', () => {
  it('filters by two conditions joined with And', async () => {
    const fixture = TestBed.createComponent(HeaderMenuHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('.oge-header-filter-btn')[1] as HTMLElement).click();
    await settle(fixture);
    const popup = document.querySelector('.oge-header-filter-menu') as HTMLElement;
    expect(popup.querySelector('.oge-hf-conditions')).not.toBeNull();
    expect(popup.querySelectorAll('.oge-hf-condition')).toHaveLength(2);
    const grid = fixture.debugElement.query(
      (node) => node.componentInstance instanceof OgeGrid,
    ).componentInstance as OgeGrid;
    const internal = grid as unknown as {
      setHeaderCondition(which: string, patch: object): void;
      applyHeaderConditions(): void;
    };
    internal.setHeaderCondition('first', { operator: 'ge', value: 15 });
    internal.setHeaderCondition('second', { operator: 'lt', value: 30 });
    internal.applyHeaderConditions();
    await settle(fixture);
    const names = Array.from(el.querySelectorAll('.oge-rows .oge-row')).map(
      (row) => row.querySelector('.oge-cell')?.textContent?.trim(),
    );
    expect(names).toEqual(['Bob']);
    expect(
      el.querySelectorAll('.oge-header-filter-btn')[1].classList,
    ).toContain('oge-header-filter-active');
  });

  it('shows a date column as a year → month → day tree', async () => {
    const fixture = TestBed.createComponent(HeaderMenuHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('.oge-header-filter-btn')[2] as HTMLElement).click();
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);
    const popup = document.querySelector('.oge-header-filter-menu') as HTMLElement;
    expect(
      Array.from(popup.querySelectorAll('.oge-hf-group > span')).map((s) =>
        s.textContent?.trim(),
      ),
    ).toEqual(['2025', '2026']);
    expect(popup.querySelectorAll('.oge-hf-month')).toHaveLength(3);
    expect(popup.querySelectorAll('.oge-hf-leaf')).toHaveLength(3);
    const toggle = popup.querySelector('.oge-hf-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    toggle.click();
    await settle(fixture);
    expect(popup.querySelectorAll('.oge-hf-leaf')).toHaveLength(2);
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [paging]="{ pageSize: 1, showFirstLastButtons: true, showPageInput: true }"
    >
      <oge-column field="name" />
    </oge-grid>
  `,
})
class PagerHost {
  data = rows();
}

describe('pager first / last / go-to-page', () => {
  it('jumps with the buttons and the page input', async () => {
    const fixture = TestBed.createComponent(PagerHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.oge-pager-last') as HTMLButtonElement).click();
    await settle(fixture);
    const input = el.querySelector('.oge-pager-input-field') as HTMLInputElement;
    expect(input.value).toBe('4');
    expect(el.querySelector('.oge-pager-input-count')?.textContent).toContain(
      'of 4',
    );
    input.value = '2';
    input.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(el.querySelector('.oge-rows .oge-cell')?.textContent?.trim()).toBe(
      'Bob',
    );
    (el.querySelector('.oge-pager-first') as HTMLButtonElement).click();
    await settle(fixture);
    expect(el.querySelector('.oge-rows .oge-cell')?.textContent?.trim()).toBe(
      'Ada',
    );
  });
});

let resolveCheck: ((errors: ValidationErrors | null) => void) | null = null;
const uniqueName = (_control: AbstractControl) =>
  new Promise<ValidationErrors | null>((resolve) => (resolveCheck = resolve));

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [editing]="{ mode: 'batch', allowUpdating: true }"
    >
      <oge-column field="name" [asyncValidators]="[check]" />
    </oge-grid>
  `,
})
class AsyncHost {
  data = rows();
  readonly check = uniqueName;
}

describe('async validators', () => {
  it('marks the editor aria-busy and commits once the check passed', async () => {
    const fixture = TestBed.createComponent(AsyncHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    cell(el, 0, 0).click();
    await settle(fixture);
    const editor = el.querySelector('.oge-cell-editor') as HTMLElement;
    expect(editor.getAttribute('aria-busy')).toBe('true');
    expect(editor.textContent).toContain('Checking');
    key(editor, 'Enter');
    await settle(fixture);
    // still open: the commit waits for the validator
    expect(el.querySelector('.oge-cell-editor')).not.toBeNull();
    resolveCheck?.(null);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await settle(fixture);
    expect(el.querySelector('.oge-cell-editor')).toBeNull();
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      id="left"
      [data]="left"
      keyField="id"
      [rowDragging]="true"
      rowDragGroup="people"
    >
      <oge-column field="name" />
    </oge-grid>
    <oge-grid
      id="right"
      [data]="right"
      keyField="id"
      rowDragGroup="people"
      (rowDrop)="drops.push($event)"
    >
      <oge-column field="name" />
    </oge-grid>
  `,
})
class DragHost {
  left = rows().slice(0, 2);
  right = rows().slice(2);
  readonly drops: OgeRowDropEvent[] = [];
}

describe('cross-grid row drag', () => {
  it('registers both grids and reports a drop on the target grid', async () => {
    const fixture = TestBed.createComponent(DragHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const right = el.querySelector('#right') as HTMLElement;
    const rowEl = right.querySelector('.oge-rows .oge-row') as HTMLElement;
    const participant = findOgeRowDragParticipant(rowEl, 'people');
    expect(participant?.componentId).toBe('right');
    const source = { componentId: 'left', key: 1, row: rows()[0] };
    const target = participant!.resolve(rowEl, 0, source)!;
    expect(target.key).toBe(3);
    participant!.drop(source, target);
    expect(fixture.componentInstance.drops[0]).toMatchObject({
      sourceComponentId: 'left',
      targetComponentId: 'right',
      sameComponent: false,
      sourceKey: 1,
      targetKey: 3,
    });
  });
});
