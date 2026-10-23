import { StrictMode, createRef, useState } from 'react';
import {
  act,
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react';
import {
  createOgeWorkbook,
  ogeCellError,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { OgeSpreadsheet } from './spreadsheet';
import { OgeSpreadsheetConfigProvider } from './spreadsheet-config';
import type {
  OgeSpreadsheetHandle,
  OgeSpreadsheetProps,
} from './spreadsheet-types';
import type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
} from '@oge-ui/spreadsheet-engine';

/** A two-sheet workbook: numbers, text, a link, a note, a fill and a merge (the Angular spec's). */
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

const restore: (() => void)[] = [];

/** jsdom lays nothing out: give the grid a size. */
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

beforeEach(() => stubLayout());
afterEach(() => {
  while (restore.length) restore.pop()?.();
});

interface Recorded {
  selections: OgeSpreadsheetSelectionChangeEvent[];
  clicks: OgeSpreadsheetCellClickEvent[];
  errors: OgeSpreadsheetLoadErrorEvent[];
  links: OgeSpreadsheetHyperlinkClickEvent[];
  sheets: number[];
  zooms: number[];
}

/** The Angular spec's host: two-way sheet and zoom, every event recorded, links cancelled. */
function Host({
  recorded,
  handle,
  ...rest
}: {
  recorded: Recorded;
  handle: React.Ref<OgeSpreadsheetHandle>;
} & Partial<OgeSpreadsheetProps> & {
    initialSheet?: number;
    initialZoom?: number;
  }) {
  const [workbook] = useState(() => rest.workbook ?? sampleBook());
  const [sheet, setSheet] = useState<number | undefined>(rest.initialSheet);
  const [zoom, setZoom] = useState<number | undefined>(rest.initialZoom);
  (
    Host as unknown as { set: { sheet: typeof setSheet; zoom: typeof setZoom } }
  ).set = { sheet: setSheet, zoom: setZoom };
  return (
    <OgeSpreadsheet
      ref={handle}
      workbook={workbook}
      locale="en-US"
      activeSheet={sheet}
      onActiveSheetChange={(index) => {
        recorded.sheets.push(index);
        setSheet(index);
      }}
      zoom={zoom}
      onZoomChange={(value) => {
        recorded.zooms.push(value);
        setZoom(value);
      }}
      onSelectionChange={(event) => recorded.selections.push(event)}
      onHyperlinkClick={(event) => {
        event.cancel = true;
        recorded.links.push(event);
      }}
      onCellClick={(event) => recorded.clicks.push(event)}
      onLoadError={(event) => recorded.errors.push(event)}
      style={{ display: 'block', width: 800, height: 400 }}
      {...rest}
    />
  );
}
const hostSetters = () =>
  (
    Host as unknown as {
      set: { sheet: (v: number) => void; zoom: (v: number) => void };
    }
  ).set;

describe('OgeSpreadsheet (React)', () => {
  let view: RenderResult;
  let recorded: Recorded;
  const handle = createRef<OgeSpreadsheetHandle>();

  const mount = (props: Partial<OgeSpreadsheetProps> = {}) => {
    recorded = {
      selections: [],
      clicks: [],
      errors: [],
      links: [],
      sheets: [],
      zooms: [],
    };
    view = render(<Host recorded={recorded} handle={handle} {...props} />);
  };
  const root = () => view.container;
  const grid = () =>
    root().querySelector('.oge-spreadsheet-grid') as HTMLElement;
  const nameBox = () =>
    (root().querySelector('.oge-spreadsheet-name-box') as HTMLInputElement)
      .value;
  const key = (k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(grid(), { key: k, ...init });
  /** jsdom has no PointerEvent: a MouseEvent of the pointer type carries the fields read. */
  const pointer = (
    target: Element,
    type: string,
    init: MouseEventInit & { pointerId?: number },
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
    act(() => {
      target.dispatchEvent(event);
    });
  };
  const texts = () =>
    [...root().querySelectorAll('.oge-spreadsheet-text')].map((t) =>
      t.textContent?.trim(),
    );

  it('paints the workbook: text, number formats, headers, fills and tabs', () => {
    mount();
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
      ...root().querySelectorAll('.oge-spreadsheet-column-header'),
    ].map((h) => h.textContent?.trim());
    expect(headers.slice(0, 3)).toEqual(['A', 'B', 'C']);
    expect(
      root().querySelector('.oge-spreadsheet-row-header')?.textContent?.trim(),
    ).toBe('1');
    expect(
      root().querySelector('.oge-spreadsheet-fill')?.getAttribute('style'),
    ).toContain('background');
    expect(
      root().querySelector('.oge-spreadsheet-gridlines')?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(
      [...root().querySelectorAll('.oge-spreadsheet-tab')].map((t) =>
        t.textContent?.trim(),
      ),
    ).toEqual(['Sheet1', 'Second']);
    expect(root().querySelector('.oge-spreadsheet-note-mark')).not.toBeNull();
    // A1 is selected: a frame, and no fill handle — a viewer has none, as Excel's own
    expect(
      root().querySelector('.oge-spreadsheet-selection-frame'),
    ).not.toBeNull();
    expect(
      root().querySelector('.oge-spreadsheet-selection-handle'),
    ).toBeNull();
    expect(nameBox()).toBe('A1');
  });

  it('exposes the active cell to assistive tech and moves it with the keyboard', () => {
    mount();
    const cell = root().querySelector('[role="gridcell"]') as HTMLElement;
    expect(grid().getAttribute('aria-activedescendant')).toBe(cell.id);
    expect(cell.textContent).toContain('A1, Name');
    key('ArrowDown');
    expect(nameBox()).toBe('A2');
    expect(root().querySelector('[role="gridcell"]')?.textContent).toContain(
      'Note by Reviewer: First programmer',
    );
    expect(
      root().querySelector('[role="row"]')?.getAttribute('aria-rowindex'),
    ).toBe('2');
    key('ArrowRight');
    expect(nameBox()).toBe('B2');
    expect(root().querySelector('.oge-spreadsheet-formula')?.textContent).toBe(
      '4200.5',
    );
    key('ArrowDown', { shiftKey: true });
    expect(
      [...root().querySelectorAll('.oge-spreadsheet-status-item')].map(
        (s) => s.textContent,
      ),
    ).toEqual(['Average: 4,650.25', 'Count: 2', 'Sum: 9,300.50']);
    expect(
      root()
        .querySelector('.oge-spreadsheet-selection-overlay')
        ?.getAttribute('d'),
    ).toMatch(/^M/);
    expect(recorded.selections.at(-1)).toMatchObject({
      sheet: 0,
      address: 'B2',
    });
  });

  it('copies the selection as text and Excel HTML', () => {
    mount();
    act(() => void handle.current?.goTo('A2:B3'));
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
    act(() => void grid().dispatchEvent(event));
    expect(data.get('text/plain')).toBe('Ada\t4,200.50\r\nGrace\t5,100.00\r\n');
    expect(data.get('text/html')).toContain('<table');
    expect(event.defaultPrevented).toBe(true);
  });

  it('switches sheets from the tabs, two-way', () => {
    mount();
    fireEvent.click(root().querySelectorAll('.oge-spreadsheet-tab')[1]);
    expect(texts()).toContain('other sheet');
    expect(recorded.sheets.at(-1)).toBe(1);
    act(() => hostSetters().sheet(0));
    expect(texts()).toContain('Name');
    expect(
      root().querySelector('.oge-spreadsheet-tab-active')?.textContent?.trim(),
    ).toBe('Sheet1');
  });

  it('zooms: Excel’s steps, the status bar and the two-way prop', () => {
    mount();
    key('=', { ctrlKey: true });
    expect(recorded.zooms.at(-1)).toBe(110);
    expect(
      root().querySelector('.oge-spreadsheet-zoom-value')?.textContent,
    ).toBe('110%');
    act(() => hostSetters().zoom(200));
    expect(handle.current?.core.zoom()).toBe(200);
    // headers follow the zoomed Normal font: 54 px for three digits of Calibri at 200%
    expect(
      root()
        .querySelector('.oge-spreadsheet-select-all')
        ?.getAttribute('style'),
    ).toContain('width: 54px');
  });

  it('opens find with Ctrl+F and finds a match', () => {
    mount();
    key('f', { ctrlKey: true });
    const input = root().querySelector(
      '.oge-spreadsheet-find-input',
    ) as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = 'grace';
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(nameBox()).toBe('A3');
    expect(
      root().querySelector('.oge-spreadsheet-find-count')?.textContent,
    ).toBe('1 of 1');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(root().querySelector('.oge-spreadsheet-find')).toBeNull();
  });

  it('goes to a reference from the name box', () => {
    mount();
    const box = root().querySelector(
      '.oge-spreadsheet-name-box',
    ) as HTMLInputElement;
    box.value = 'B3';
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(nameBox()).toBe('B3');
    box.value = 'not a reference!';
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(handle.current?.core.selection().active).toEqual({ row: 2, col: 1 });
  });

  it('selects with the pointer and follows links on a click (cancelable)', () => {
    mount();
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
      pointerId: 1,
    };
    pointer(grid(), 'pointerdown', at);
    pointer(grid(), 'pointerup', at);
    expect(nameBox()).toBe('A4');
    expect(recorded.clicks.at(-1)).toMatchObject({
      address: 'A4',
      text: 'Site',
    });
    expect(recorded.links.at(-1)?.href).toBe('https://example.com/');
    // a column header selects the column
    pointer(
      root().querySelectorAll('.oge-spreadsheet-column-header')[1],
      'pointerdown',
      { button: 0 },
    );
    expect(
      root().querySelector('.oge-spreadsheet-header-full')?.textContent?.trim(),
    ).toBe('B');
  });

  it('shows a note on Shift+F2 and hides it with Escape', () => {
    mount();
    key('ArrowDown');
    key('F2', { shiftKey: true });
    expect(
      root().querySelector('.oge-spreadsheet-note')?.textContent,
    ).toContain('First programmer');
    key('Escape');
    expect(root().querySelector('.oge-spreadsheet-note')).toBeNull();
  });

  it('reports a file it cannot open', async () => {
    const errors: OgeSpreadsheetLoadErrorEvent[] = [];
    const result = render(
      <OgeSpreadsheet
        source={new Uint8Array([1, 2, 3, 4])}
        onLoadError={(event) => errors.push(event)}
      />,
    );
    await act(async () => {
      await vi.waitFor(() => expect(errors).toHaveLength(1));
    });
    expect(errors[0].error.code).toBe('not-xlsx');
    expect(
      result.container.querySelector('.oge-spreadsheet-placeholder-error')
        ?.textContent,
    ).toContain('not an Excel workbook');
  });

  it('draws an Excel table: its style, filter buttons and resize handle', () => {
    mount({ workbook: tableBook() });
    expect(
      root().querySelectorAll('.oge-spreadsheet-filter-button'),
    ).toHaveLength(2);
    expect(
      root()
        .querySelector('.oge-spreadsheet-table-handle polygon')
        ?.getAttribute('points'),
    ).toBe('2,0 4,0 4,4 0,4 0,2 2,2');
    // the header row's accent fill
    expect(
      [...root().querySelectorAll('.oge-spreadsheet-fill')].some((fill) =>
        fill.getAttribute('style')?.includes('rgb(68, 114, 196)'),
      ),
    ).toBe(true);
  });

  it('mirrors right-to-left sheets', () => {
    const book = sampleBook();
    book.sheets[0].view = { ...book.sheets[0].view, rightToLeft: true };
    mount({ workbook: book });
    expect(grid().getAttribute('dir')).toBe('rtl');
    expect(grid().classList).toContain('oge-spreadsheet-grid-rtl');
  });

  it('starts at a default sheet and zoom held until the workbook opens', () => {
    const book = sampleBook();
    const result = render(
      <OgeSpreadsheet
        workbook={book}
        defaultActiveSheet={1}
        defaultZoom={150}
      />,
    );
    expect(
      result.container.querySelector('.oge-spreadsheet-tab-active')
        ?.textContent,
    ).toBe('Second');
    expect(
      result.container.querySelector('.oge-spreadsheet-zoom-value')
        ?.textContent,
    ).toBe('150%');
  });
});

describe('OgeSpreadsheet (React) in StrictMode', () => {
  it('survives the double mount: the controller revives and keeps working', () => {
    const handle = createRef<OgeSpreadsheetHandle>();
    const result = render(
      <StrictMode>
        <OgeSpreadsheet ref={handle} workbook={sampleBook()} locale="en-US" />
      </StrictMode>,
    );
    const grid = result.container.querySelector(
      '.oge-spreadsheet-grid',
    ) as HTMLElement;
    expect(
      result.container.querySelectorAll('.oge-spreadsheet-text').length,
    ).toBeGreaterThan(0);
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    expect(
      (
        result.container.querySelector(
          '.oge-spreadsheet-name-box',
        ) as HTMLInputElement
      ).value,
    ).toBe('A2');
    expect(handle.current?.getWorkbook()).not.toBeNull();
  });
});

describe('OgeSpreadsheetConfigProvider', () => {
  it('feeds the configured messages to every viewer, and re-resolves on a new config', () => {
    const result = render(
      <OgeSpreadsheetConfigProvider
        config={{
          messages: { gridLabel: 'Tablo', empty: 'Çalışma kitabı yok' },
        }}
      >
        <OgeSpreadsheet />
      </OgeSpreadsheetConfigProvider>,
    );
    expect(
      result.container
        .querySelector('[role="grid"]')
        ?.getAttribute('aria-label'),
    ).toBe('Tablo');
    expect(
      result.container
        .querySelector('.oge-spreadsheet-placeholder')
        ?.textContent?.trim(),
    ).toBe('Çalışma kitabı yok');
    result.rerender(
      <OgeSpreadsheetConfigProvider config={{ messages: { gridLabel: 'Two' } }}>
        <OgeSpreadsheet messages={{ empty: 'Boş' }} />
      </OgeSpreadsheetConfigProvider>,
    );
    expect(
      result.container
        .querySelector('[role="grid"]')
        ?.getAttribute('aria-label'),
    ).toBe('Two');
    expect(
      result.container
        .querySelector('.oge-spreadsheet-placeholder')
        ?.textContent?.trim(),
    ).toBe('Boş');
  });
});
