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
