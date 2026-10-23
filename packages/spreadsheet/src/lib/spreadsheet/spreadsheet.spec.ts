import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  createOgeWorkbook,
  ogeCellError,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { provideOgeSpreadsheetConfig } from '../config';
import { OgeSpreadsheet } from './spreadsheet';
import type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
} from './spreadsheet-types';

/** A two-sheet workbook: numbers, text, a link, a note, a fill and a merge. */
function sampleBook(): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  const money = workbook.styles.intern({ numberFormat: '#,##0.00' });
  const yellow = workbook.styles.intern({
    fill: { type: 'pattern', pattern: 'solid', fgColor: { rgb: 'FFFFFF00' } },
  });
  sheet.setCell(0, 0, { value: 'Name' });
  sheet.setCell(0, 1, { value: 'Salary' });
  sheet.setCell(1, 0, { value: 'Ada' });
  sheet.setCell(1, 1, { value: 4200.5, style: money });
  sheet.setCell(2, 0, { value: 'Grace' });
  sheet.setCell(2, 1, { value: 5100, style: money });
  sheet.setCell(3, 0, { value: 'Site', style: yellow });
  sheet.addHyperlink({
    range: { top: 3, left: 0, bottom: 3, right: 0 },
    target: 'https://example.com/',
  });
  sheet.setNote(1, 0, { text: 'First programmer', author: 'Reviewer' });
  sheet.setCell(5, 0, { value: 'merged' });
  sheet.addMerge({ top: 5, left: 0, bottom: 5, right: 2 });
  sheet.setCell(6, 0, { value: ogeCellError('#N/A') });
  const second = workbook.addSheet('Second');
  second.setCell(0, 0, { value: 'other sheet' });
  return workbook;
}

/** The sample with an Excel table over A1:B3 in Excel's default style, filter buttons on. */
function tableBook(): OgeWorkbook {
  const book = sampleBook();
  const range = { top: 0, left: 0, bottom: 2, right: 1 };
  book.sheets[0].tables.push({
    id: 1,
    name: 'People',
    displayName: 'People',
    range,
    headerRowCount: 1,
    totalsRowCount: 0,
    columns: [
      { id: 1, name: 'Name' },
      { id: 2, name: 'Salary' },
    ],
    style: {
      name: 'TableStyleMedium2',
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    },
    autoFilter: { range, columns: [] },
  });
  return book;
}

@Component({
  imports: [OgeSpreadsheet],
  template: `
    <oge-spreadsheet
      [workbook]="workbook()"
      [source]="source()"
      [(activeSheet)]="sheet"
      [(zoom)]="zoom"
      locale="en-US"
      (selectionChange)="selections.push($event)"
      (hyperlinkClick)="onLink($event)"
      (cellClick)="clicks.push($event)"
      (loadError)="errors.push($event)"
      style="display: block; width: 800px; height: 400px"
    />
  `,
})
class Host {
  readonly workbook = signal<OgeWorkbook | null>(sampleBook());
  readonly source = signal<Uint8Array | null>(null);
  readonly sheet = signal<number | undefined>(undefined);
  readonly zoom = signal<number | undefined>(undefined);
  readonly selections: OgeSpreadsheetSelectionChangeEvent[] = [];
  readonly clicks: OgeSpreadsheetCellClickEvent[] = [];
  readonly errors: OgeSpreadsheetLoadErrorEvent[] = [];
  readonly links: OgeSpreadsheetHyperlinkClickEvent[] = [];
  onLink(event: OgeSpreadsheetHyperlinkClickEvent): void {
    event.cancel = true;
    this.links.push(event);
  }
}

describe('OgeSpreadsheet', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;
  const restore: (() => void)[] = [];

  /** jsdom lays nothing out: give the grid a size and a position. */
  function stubLayout(): void {
    for (const [name, value] of [
      ['clientWidth', 800],
      ['clientHeight', 360],
    ] as const) {
      const original = Object.getOwnPropertyDescriptor(
        HTMLElement.prototype,
        name,
      );
      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get(this: HTMLElement) {
          return this.classList.contains('oge-spreadsheet-grid') ? value : 0;
        },
      });
      restore.push(() => {
        if (original)
          Object.defineProperty(HTMLElement.prototype, name, original);
      });
    }
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  }

  const grid = () => host.querySelector('.oge-spreadsheet-grid') as HTMLElement;
  const component = () =>
    fixture.debugElement.children[0].componentInstance as OgeSpreadsheet;
  const nameBox = () =>
    (host.querySelector('.oge-spreadsheet-name-box') as HTMLInputElement).value;
  const key = async (k: string, init: KeyboardEventInit = {}) => {
    grid().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: k,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  /** jsdom has no PointerEvent: a MouseEvent of the pointer type carries the fields read. */
  const pointer = (
    type: string,
    init: MouseEventInit & { pointerId?: number },
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
    return event;
  };
  const texts = () =>
    [...host.querySelectorAll('.oge-spreadsheet-text')].map((t) =>
      t.textContent?.trim(),
    );

  beforeEach(async () => {
    stubLayout();
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
  });

  afterEach(() => {
    while (restore.length) restore.pop()?.();
  });

  it('paints the workbook: text, number formats, headers, fills and tabs', async () => {
    await render();
    expect(texts()).toEqual(
      expect.arrayContaining([
        'Name',
        'Salary',
        'Ada',
        '4,200.50',
        '5,100.00',
        '#N/A',
        'merged',
      ]),
    );
    const headers = [
      ...host.querySelectorAll('.oge-spreadsheet-column-header'),
    ].map((h) => h.textContent?.trim());
    expect(headers.slice(0, 3)).toEqual(['A', 'B', 'C']);
    expect(
      host.querySelector('.oge-spreadsheet-row-header')?.textContent?.trim(),
    ).toBe('1');
    expect(
      host.querySelector('.oge-spreadsheet-fill')?.getAttribute('style'),
    ).toContain('background');
    expect(
      host.querySelector('.oge-spreadsheet-gridlines')?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(
      [...host.querySelectorAll('.oge-spreadsheet-tab')].map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Sheet1', 'Second']);
    expect(host.querySelector('.oge-spreadsheet-note-mark')).not.toBeNull();
    // A1 is selected: a frame, and no fill handle — a viewer has none, as Excel's own
    expect(
      host.querySelector('.oge-spreadsheet-selection-frame'),
    ).not.toBeNull();
    expect(host.querySelector('.oge-spreadsheet-selection-handle')).toBeNull();
    expect(nameBox()).toBe('A1');
  });

  it('exposes the active cell to assistive tech and moves it with the keyboard', async () => {
    await render();
    const cell = host.querySelector('[role="gridcell"]') as HTMLElement;
    expect(grid().getAttribute('aria-activedescendant')).toBe(cell.id);
    expect(cell.textContent).toContain('A1, Name');
    await key('ArrowDown');
    expect(nameBox()).toBe('A2');
    expect(host.querySelector('[role="gridcell"]')?.textContent).toContain(
      'Note by Reviewer: First programmer',
    );
    expect(
      host.querySelector('[role="row"]')?.getAttribute('aria-rowindex'),
    ).toBe('2');
    await key('ArrowRight');
    expect(nameBox()).toBe('B2');
    expect(host.querySelector('.oge-spreadsheet-formula')?.textContent).toBe(
      '4200.5',
    );
    await key('ArrowDown', { shiftKey: true });
    // two numbers selected: Excel's summary in the active cell's format
    expect(
      [...host.querySelectorAll('.oge-spreadsheet-status-item')].map(
        (s) => s.textContent,
      ),
    ).toEqual(['Average: 4,650.25', 'Count: 2', 'Sum: 9,300.50']);
    expect(
      host
        .querySelector('.oge-spreadsheet-selection-overlay')
        ?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(fixture.componentInstance.selections.at(-1)).toMatchObject({
      sheet: 0,
      address: 'B2',
    });
  });

  it('copies the selection as text and Excel HTML', async () => {
    await render();
    component().goTo('A2:B3');
    fixture.detectChanges();
    const data = new Map<string, string>();
    const event = new Event('copy', {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: {
        setData: (type: string, value: string) => data.set(type, value),
      },
    });
    grid().dispatchEvent(event);
    // what the cells show, as Excel copies it
    expect(data.get('text/plain')).toBe('Ada\t4,200.50\r\nGrace\t5,100.00\r\n');
    expect(data.get('text/html')).toContain('<table');
    expect(event.defaultPrevented).toBe(true);
  });

  it('switches sheets from the tabs, two-way', async () => {
    await render();
    (host.querySelectorAll('.oge-spreadsheet-tab')[1] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texts()).toContain('other sheet');
    expect(fixture.componentInstance.sheet()).toBe(1);
    fixture.componentInstance.sheet.set(0);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(texts()).toContain('Name');
    expect(
      host.querySelector('.oge-spreadsheet-tab-active')?.textContent?.trim(),
    ).toBe('Sheet1');
  });

  it('zooms: Excel’s steps, the status bar and the two-way input', async () => {
    await render();
    await key('=', { ctrlKey: true });
    expect(fixture.componentInstance.zoom()).toBe(110);
    expect(host.querySelector('.oge-spreadsheet-zoom-value')?.textContent).toBe(
      '110%',
    );
    fixture.componentInstance.zoom.set(200);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component().core.zoom()).toBe(200);
    // headers follow the zoomed Normal font: 54 px for three digits of Calibri at 200%
    expect(
      host.querySelector('.oge-spreadsheet-select-all')?.getAttribute('style'),
    ).toContain('width: 54px');
  });

  it('opens find with Ctrl+F and finds a match', async () => {
    await render();
    await key('f', { ctrlKey: true });
    const input = host.querySelector(
      '.oge-spreadsheet-find-input',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'grace';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(nameBox()).toBe('A3');
    expect(host.querySelector('.oge-spreadsheet-find-count')?.textContent).toBe(
      '1 of 1',
    );
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.querySelector('.oge-spreadsheet-find')).toBeNull();
  });

  it('goes to a reference from the name box', async () => {
    await render();
    const box = host.querySelector(
      '.oge-spreadsheet-name-box',
    ) as HTMLInputElement;
    box.value = 'B3';
    box.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(nameBox()).toBe('B3');
    box.value = 'not a reference!';
    box.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    fixture.detectChanges();
    expect(component().core.selection().active).toEqual({ row: 2, col: 1 });
  });

  it('selects with the pointer and follows links on a click (cancelable)', async () => {
    await render();
    const rect = {
      left: 0,
      top: 0,
      right: 800,
      bottom: 360,
      width: 800,
      height: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    grid().getBoundingClientRect = () => rect as DOMRect;
    // A4 (the link): x past the 26 px row header, y past the 20 px letter row and three rows
    const at = {
      clientX: 26 + 10,
      clientY: 20 + 3 * 20 + 5,
      button: 0,
      bubbles: true,
      pointerId: 1,
    };
    grid().dispatchEvent(pointer('pointerdown', at));
    grid().dispatchEvent(pointer('pointerup', at));
    fixture.detectChanges();
    expect(nameBox()).toBe('A4');
    expect(fixture.componentInstance.clicks.at(-1)).toMatchObject({
      address: 'A4',
      text: 'Site',
    });
    expect(fixture.componentInstance.links.at(-1)?.href).toBe(
      'https://example.com/',
    );
    // a column header selects the column
    (
      host.querySelectorAll('.oge-spreadsheet-column-header')[1] as HTMLElement
    ).dispatchEvent(pointer('pointerdown', { button: 0 }));
    fixture.detectChanges();
    expect(
      host.querySelector('.oge-spreadsheet-header-full')?.textContent?.trim(),
    ).toBe('B');
  });

  it('resizes a column from its header’s edge with Excel’s tooltip, and AutoFits one on a double-click', async () => {
    await render();
    const rect = {
      left: 0,
      top: 0,
      right: 800,
      bottom: 360,
      width: 800,
      height: 360,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
    grid().getBoundingClientRect = () => rect as DOMRect;
    const headers = host.querySelectorAll('.oge-spreadsheet-column-header');
    // B ends 26 + 128 px in: the edge is under the pointer
    const edge = { clientX: 153, clientY: 10, button: 0 };
    headers[1].dispatchEvent(pointer('pointermove', edge));
    fixture.detectChanges();
    const viewer = host.querySelector('oge-spreadsheet') as HTMLElement;
    expect(viewer.classList).toContain('oge-spreadsheet-resize-columns');
    headers[1].dispatchEvent(pointer('pointerdown', edge));
    grid().dispatchEvent(pointer('pointermove', { ...edge, clientX: 189 }));
    fixture.detectChanges();
    expect(host.querySelector('.oge-spreadsheet-resize-tip')?.textContent).toBe(
      'Width: 13.57 (100 pixels)',
    );
    expect(
      host.querySelector('.oge-spreadsheet-resize-line')?.getAttribute('style'),
    ).toContain('inset-inline-start: 189px');
    grid().dispatchEvent(pointer('pointerup', { ...edge, clientX: 189 }));
    fixture.detectChanges();
    expect(host.querySelector('.oge-spreadsheet-resize')).toBeNull();
    expect(component().core.layout()?.cols.size(1)).toBe(100);
    // a double-click on A's edge fits it to its contents
    headers[0].dispatchEvent(
      new MouseEvent('dblclick', { clientX: 89, clientY: 10, bubbles: true }),
    );
    fixture.detectChanges();
    expect(component().core.announcement()).toBe(
      'Column A fitted to its contents',
    );
    grid().dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 60 }));
    fixture.detectChanges();
    expect(viewer.classList).not.toContain('oge-spreadsheet-resize-columns');
  });

  it('sizes a column from its header’s menu and dialog, opened by a right-click or Shift+F10', async () => {
    await render();
    grid().getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 360,
        width: 800,
        height: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const menu = () =>
      host.querySelector('.oge-spreadsheet-header-menu') as HTMLElement | null;
    const items = () => [
      ...(menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    // a right-click on B's header selects B and opens its menu there
    const click = new MouseEvent('contextmenu', {
      clientX: 120,
      clientY: 10,
      button: 2,
      bubbles: true,
      cancelable: true,
    });
    host
      .querySelectorAll('.oge-spreadsheet-column-header')[1]
      .dispatchEvent(click);
    fixture.detectChanges();
    expect(click.defaultPrevented).toBe(true);
    expect(nameBox()).toBe('B1');
    expect(menu()?.getAttribute('aria-label')).toBe('Column');
    expect(menu()?.getAttribute('style')).toContain('top: 10px');
    expect(items().map((item) => item.textContent?.trim())).toEqual([
      'Column width…',
      'AutoFit column width',
      'Hide',
      'Unhide',
    ]);
    // Column width… asks in characters, from B's own width
    items()[0].click();
    fixture.detectChanges();
    expect(menu()).toBeNull();
    const field = host.querySelector(
      '[role="dialog"] input',
    ) as HTMLInputElement;
    expect(field.value).toBe('8.43');
    const enter = () => {
      field.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
    };
    // a width Excel refuses keeps the dialog open, saying why
    field.value = '300';
    enter();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      'Enter a width from 0 to 255.',
    );
    expect(field.getAttribute('aria-invalid')).toBe('true');
    // 12.5 characters is 93 px, as Excel makes it
    field.value = '12.5';
    enter();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(component().core.layout()?.cols.size(1)).toBe(93);
    // Shift+F10 on the selected column: the same menu; Hide hides it
    await key('F10', { shiftKey: true });
    expect(menu()?.getAttribute('aria-label')).toBe('Column');
    items()[2].click();
    fixture.detectChanges();
    expect(component().core.layout()?.cols.size(1)).toBe(0);
    // Escape drops the dialog without a change
    await key('F10', { shiftKey: true });
    items()[0].click();
    fixture.detectChanges();
    (
      host.querySelector('[role="dialog"] input') as HTMLInputElement
    ).dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(component().core.layout()?.cols.size(1)).toBe(0);
  });

  it('keeps the size dialog modal and leaves a cell’s right-click to the browser', async () => {
    await render();
    grid().getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 360,
        width: 800,
        height: 360,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const contextMenu = (target: Element, clientX: number, clientY: number) => {
      const event = new MouseEvent('contextmenu', {
        clientX,
        clientY,
        button: 2,
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      fixture.detectChanges();
      return event;
    };
    const menu = () => host.querySelector('.oge-spreadsheet-header-menu');
    // a cell has no menu of ours: the browser shows its own
    expect(contextMenu(grid(), 120, 50).defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
    // once a header's menu is open, a second contextmenu does not reopen it
    contextMenu(
      host.querySelectorAll('.oge-spreadsheet-column-header')[1],
      120,
      10,
    );
    expect(contextMenu(grid(), 300, 200).defaultPrevented).toBe(true);
    expect(menu()?.getAttribute('style')).toContain('top: 10px');
    (menu()?.querySelector('[role="menuitem"]') as HTMLElement).click();
    fixture.detectChanges();
    const dialog = host.querySelector('[role="dialog"]') as HTMLElement;
    const [field, ok, cancel] = [
      ...dialog.querySelectorAll<HTMLElement>('input, button'),
    ];
    const tab = (from: HTMLElement, shiftKey = false) => {
      from.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      from.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return host.ownerDocument.activeElement;
    };
    // Tab and Shift+Tab go round the dialog's field and buttons
    expect(tab(field)).toBe(ok);
    expect(tab(ok)).toBe(cancel);
    expect(tab(cancel)).toBe(field);
    expect(tab(field, true)).toBe(cancel);
    expect(tab(ok, true)).toBe(field);
    // a press beside the dialog keeps the focus; one on it does not
    const press = (target: Element) => {
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(
      press(host.querySelector('.oge-spreadsheet-dialog-layer') as HTMLElement),
    ).toBe(true);
    expect(press(dialog)).toBe(false);
    cancel.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows a note on Shift+F2 and hides it with Escape', async () => {
    await render();
    await key('ArrowDown');
    await key('F2', { shiftKey: true });
    expect(host.querySelector('.oge-spreadsheet-note')?.textContent).toContain(
      'First programmer',
    );
    await key('Escape');
    expect(host.querySelector('.oge-spreadsheet-note')).toBeNull();
  });

  it('reports a file it cannot open', async () => {
    await render();
    fixture.componentInstance.workbook.set(null);
    fixture.componentInstance.source.set(new Uint8Array([1, 2, 3, 4]));
    fixture.detectChanges();
    await vi.waitFor(() =>
      expect(fixture.componentInstance.errors.length).toBe(1),
    );
    fixture.detectChanges();
    expect(fixture.componentInstance.errors[0].error.code).toBe('not-xlsx');
    expect(
      host.querySelector('.oge-spreadsheet-placeholder-error')?.textContent,
    ).toContain('not an Excel workbook');
  });

  it('says which sheet it opened, and closes it when the source goes back to null', async () => {
    await render();
    const live = () =>
      host.querySelector('.oge-spreadsheet-live')?.textContent?.trim();
    fixture.componentInstance.workbook.set(null);
    fixture.componentInstance.source.set(
      new Uint8Array(
        readFileSync(
          resolve(
            __dirname,
            '../../../../spreadsheet-engine/testing/corpus/structure.xlsx',
          ),
        ),
      ),
    );
    fixture.detectChanges();
    // the sheet it opens at replaces "Opening workbook…"
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(live()).toBe('Sheet Main, 1 of 4');
    });
    fixture.componentInstance.source.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component().getWorkbook()).toBeNull();
    expect(
      host.querySelector('.oge-spreadsheet-placeholder')?.textContent?.trim(),
    ).toBe('No workbook');
    expect(live()).toBe('');
  });

  it('draws an Excel table: its style, filter buttons and resize handle', async () => {
    await render();
    fixture.componentInstance.workbook.set(tableBook());
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      host.querySelectorAll('.oge-spreadsheet-filter-button'),
    ).toHaveLength(2);
    expect(
      host
        .querySelector('.oge-spreadsheet-table-handle polygon')
        ?.getAttribute('points'),
    ).toBe('2,0 4,0 4,4 0,4 0,2 2,2');
    // the header row's accent fill
    expect(
      [...host.querySelectorAll('.oge-spreadsheet-fill')].some((fill) =>
        fill.getAttribute('style')?.includes('rgb(68, 114, 196)'),
      ),
    ).toBe(true);
  });

  it('draws a sparkline in its cell, under the text layer', async () => {
    const book = sampleBook();
    const sheet = book.sheets[0];
    [1, 3, 2].forEach((v, i) => sheet.setValue(9, i, v));
    sheet.sparklineGroups.push({
      type: 'column',
      sparklines: [{ cell: { row: 10, col: 0 }, ref: 'A10:C10' }],
      colors: { series: { rgb: 'FF0000FF' } },
      lineWeight: 0.75,
      markers: false,
      high: false,
      low: false,
      first: false,
      last: false,
      negative: false,
      displayXAxis: false,
      displayHidden: false,
      displayEmptyCellsAs: 'gap',
      minAxisType: 'individual',
      maxAxisType: 'individual',
      rightToLeft: false,
    });
    await render();
    fixture.componentInstance.workbook.set(book);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const svg = host.querySelector('.oge-spreadsheet-sparkline') as Element;
    const bars = svg.querySelector('path') as Element;
    expect(bars.getAttribute('fill')).toBe('#0000FF');
    expect(bars.getAttribute('shape-rendering')).toBe('crispEdges');
    expect(bars.getAttribute('d')).toMatch(/^M\d+ \d+H/);
    const layers = [...(svg.parentElement?.children ?? [])];
    expect(layers.indexOf(svg)).toBeLessThan(
      layers.findIndex((layer) =>
        layer.classList.contains('oge-spreadsheet-clip'),
      ),
    );
  });

  it('mirrors right-to-left sheets', async () => {
    const book = sampleBook();
    book.sheets[0].view = { ...book.sheets[0].view, rightToLeft: true };
    await render();
    fixture.componentInstance.workbook.set(book);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(grid().getAttribute('dir')).toBe('rtl');
    expect(grid().classList).toContain('oge-spreadsheet-grid-rtl');
  });
});

describe('provideOgeSpreadsheetConfig', () => {
  it('feeds the configured messages to every viewer', async () => {
    await TestBed.configureTestingModule({
      imports: [OgeSpreadsheet],
      providers: [
        provideOgeSpreadsheetConfig({
          messages: { gridLabel: 'Tablo', empty: 'Çalışma kitabı yok' },
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OgeSpreadsheet);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('[role="grid"]')?.getAttribute('aria-label'),
    ).toBe('Tablo');
    expect(
      element
        .querySelector('.oge-spreadsheet-placeholder')
        ?.textContent?.trim(),
    ).toBe('Çalışma kitabı yok');
  });

  it('can be live', async () => {
    const label = signal('One');
    await TestBed.configureTestingModule({
      imports: [OgeSpreadsheet],
      providers: [
        provideOgeSpreadsheetConfig(() => ({
          messages: { gridLabel: label() },
        })),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(OgeSpreadsheet);
    fixture.detectChanges();
    label.set('Two');
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[role="grid"]')
        ?.getAttribute('aria-label'),
    ).toBe('Two');
  });
});
