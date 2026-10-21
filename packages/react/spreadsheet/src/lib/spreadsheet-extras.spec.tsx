import { createRef, useState } from 'react';
import {
  act,
  fireEvent,
  render,
  type RenderResult,
} from '@testing-library/react';
import {
  createOgeWorkbook,
  type OgeImportIssue,
  type OgeSpreadsheetHyperlinkClickEvent,
  type OgeSpreadsheetLoadErrorEvent,
  type OgeSpreadsheetSource,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { OgeSpreadsheet } from './spreadsheet';
import type { OgeSpreadsheetHandle } from './spreadsheet-types';

/** One pixel of PNG: enough for the picture path (the bytes are never decoded in jsdom). */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The Angular extras spec's workbook: frozen panes, data bars, icons, filters, notes, a picture, three sheets. */
function richBook(): OgeWorkbook {
  const workbook = createOgeWorkbook();
  const sheet = workbook.sheets[0];
  for (let row = 0; row < 4; row++)
    sheet.setCell(row, 0, { value: (row + 1) * 10 });
  sheet.setCell(0, 1, { value: 'Head' });
  sheet.setCell(0, 2, { value: 'Link' });
  sheet.addHyperlink({
    range: { top: 0, left: 2, bottom: 0, right: 2 },
    target: 'https://example.com/a',
  });
  sheet.setNote(2, 1, { text: 'pinned', visible: true });
  sheet.setNote(3, 1, { text: 'hover me' });
  sheet.autoFilter = {
    range: { top: 0, left: 1, bottom: 3, right: 2 },
    columns: [{ offset: 0, xml: '' }],
  };
  sheet.conditionalFormats = [
    {
      ranges: [{ top: 0, left: 0, bottom: 3, right: 0 }],
      rules: [
        {
          type: 'dataBar',
          priority: 1,
          formulas: [],
          dataBar: {
            min: { type: 'min' },
            max: { type: 'max' },
            color: { rgb: 'FF638EC6' },
            showValue: true,
            minLength: 0,
            maxLength: 100,
          },
        },
        {
          type: 'iconSet',
          priority: 2,
          formulas: [],
          iconSet: {
            iconSet: '3Arrows',
            values: [
              { type: 'percent', value: '0' },
              { type: 'percent', value: '33' },
              { type: 'percent', value: '67' },
            ],
            showValue: true,
            reverse: false,
          },
        },
      ],
    },
  ];
  sheet.view = { ...sheet.view, frozenRows: 1, frozenColumns: 1 };
  sheet.pictures.push({
    image: 'xl/media/image1.png',
    description: 'Logo',
    anchor: { kind: 'absolute', x: 150, y: 50, width: 40, height: 30 },
    crop: { left: 0.1, top: 0, right: 0, bottom: 0.2 },
    rotation: 90,
  });
  workbook.opaqueParts.push({
    path: 'xl/media/image1.png',
    data: PNG,
    contentType: 'image/png',
  });
  workbook.addSheet('Two').setCell(0, 0, { value: 'two' });
  workbook.addSheet('Three').setCell(0, 0, { value: 'three' });
  return workbook;
}

const restore: (() => void)[] = [];

function stub<T extends object>(target: T, name: string, value: unknown): void {
  const original = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, {
    configurable: true,
    writable: true,
    value,
  });
  restore.push(() => {
    if (original) Object.defineProperty(target, name, original);
    else delete (target as Record<string, unknown>)[name];
  });
}

function stubLayout(): void {
  for (const [name, size] of [
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
        return this.classList.contains('oge-spreadsheet-grid') ? size : 0;
      },
    });
    restore.push(
      () =>
        original &&
        Object.defineProperty(HTMLElement.prototype, name, original),
    );
  }
}

interface HostState {
  workbook: (book: OgeWorkbook | null) => void;
  source: (source: OgeSpreadsheetSource | null) => void;
  sheet: (index: number | undefined) => void;
  grid: (show: boolean | undefined) => void;
}
let set: HostState;

function Host({
  links,
  errors,
  handle,
}: {
  links: OgeSpreadsheetHyperlinkClickEvent[];
  errors: OgeSpreadsheetLoadErrorEvent[];
  handle: React.Ref<OgeSpreadsheetHandle>;
}) {
  const [workbook, setWorkbook] = useState<OgeWorkbook | null>(() =>
    richBook(),
  );
  const [source, setSource] = useState<OgeSpreadsheetSource | null>(null);
  const [sheet, setSheet] = useState<number | undefined>(undefined);
  const [grid, setGrid] = useState<boolean | undefined>(undefined);
  set = {
    workbook: setWorkbook,
    source: setSource,
    sheet: setSheet,
    grid: setGrid,
  };
  return (
    <OgeSpreadsheet
      ref={handle}
      workbook={workbook}
      source={source}
      activeSheet={sheet}
      showGridLines={grid}
      onHyperlinkClick={(event) => links.push(event)}
      onLoadError={(event) => errors.push(event)}
      style={{ display: 'block', width: 800, height: 400 }}
    />
  );
}

describe('OgeSpreadsheet (React) — drawing and chrome', () => {
  let view: RenderResult;
  let links: OgeSpreadsheetHyperlinkClickEvent[];
  let errors: OgeSpreadsheetLoadErrorEvent[];
  const handle = createRef<OgeSpreadsheetHandle>();
  const host = () => view.container;
  const viewer = () => handle.current as OgeSpreadsheetHandle;
  const grid = () =>
    host().querySelector('.oge-spreadsheet-grid') as HTMLElement;
  const mouse = (target: Element, type: string, init: MouseEventInit = {}) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    act(() => void target.dispatchEvent(event));
  };
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
  const mount = () => {
    links = [];
    errors = [];
    view = render(<Host links={links} errors={errors} handle={handle} />);
  };

  beforeEach(() => {
    stubLayout();
    stub(URL, 'createObjectURL', () => 'blob:picture');
    stub(URL, 'revokeObjectURL', vi.fn());
  });

  afterEach(() => {
    while (restore.length) restore.pop()?.();
  });

  it('draws frozen panes, frozen headers, data bars, icons, filters and pinned notes', () => {
    mount();
    const panes = [...host().querySelectorAll('.oge-spreadsheet-pane')].map(
      (p) => p.getAttribute('data-pane'),
    );
    expect(panes).toEqual(['main', 'top', 'left', 'corner']);
    expect(
      host().querySelectorAll('.oge-spreadsheet-headers-frozen'),
    ).toHaveLength(2);
    expect(
      host().querySelectorAll('.oge-spreadsheet-data-bar').length,
    ).toBeGreaterThan(0);
    expect(
      host().querySelectorAll('.oge-spreadsheet-icon path').length,
    ).toBeGreaterThan(0);
    const filters = [
      ...host().querySelectorAll('.oge-spreadsheet-filter-button'),
    ];
    expect(filters).toHaveLength(2);
    expect(filters[0].classList).toContain('oge-spreadsheet-filter-active');
    expect(
      host().querySelector('.oge-spreadsheet-note')?.textContent,
    ).toContain('pinned');
  });

  it('shows pictures from the workbook’s media, cropped and rotated, and lets their URLs go', () => {
    mount();
    const picture = host().querySelector(
      '.oge-spreadsheet-picture',
    ) as HTMLElement;
    const image = picture.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('blob:picture');
    expect(image.getAttribute('alt')).toBe('Logo');
    expect(picture.style.transform).toContain('rotate(90deg)');
    expect(parseFloat(image.style.width)).toBeCloseTo(40 / 0.9);
    expect(parseFloat(image.style.left)).toBeLessThan(0);
    act(() => set.workbook(createOgeWorkbook()));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture');
  });

  it('can hide gridlines, follows a link (opening it), and hovers a note open', () => {
    const open = vi.fn();
    stub(window, 'open', open);
    mount();
    expect(host().querySelector('.oge-spreadsheet-gridlines')).not.toBeNull();
    act(() => set.grid(false));
    expect(host().querySelector('.oge-spreadsheet-gridlines')).toBeNull();
    act(() => void viewer().goTo('C1'));
    fireEvent.keyDown(grid(), { key: 'Enter', altKey: true });
    expect(links.at(-1)?.href).toBe('https://example.com/a');
    expect(open).toHaveBeenCalledWith(
      'https://example.com/a',
      '_blank',
      'noopener,noreferrer',
    );
    grid().getBoundingClientRect = () => rect as DOMRect;
    // B4: past the 26 px row numbers, the frozen A column (64) and three 20 px rows under the letters
    mouse(grid(), 'pointermove', {
      clientX: 26 + 64 + 10,
      clientY: 20 + 3 * 20 + 5,
    });
    expect(
      [...host().querySelectorAll('.oge-spreadsheet-note')].map(
        (n) => n.textContent,
      ),
    ).toContain('hover me');
    fireEvent.mouseLeave(grid());
    expect(
      [...host().querySelectorAll('.oge-spreadsheet-note')].map(
        (n) => n.textContent,
      ),
    ).not.toContain('hover me');
  });

  it('extends a selection by dragging over row headers and selects everything from the corner', () => {
    mount();
    grid().getBoundingClientRect = () => rect as DOMRect;
    mouse(
      host().querySelector(
        '.oge-spreadsheet-row-header[data-row="1"]',
      ) as Element,
      'pointerdown',
    );
    mouse(grid(), 'pointermove', {
      clientX: 26 + 70,
      clientY: 20 + 3 * 20 + 5,
    });
    mouse(grid(), 'pointerup', { clientX: 26 + 70, clientY: 20 + 3 * 20 + 5 });
    expect(viewer().core.selection().ranges[0]).toMatchObject({
      top: 1,
      bottom: 3,
    });
    mouse(
      host().querySelector('.oge-spreadsheet-select-all') as Element,
      'pointerdown',
    );
    expect(
      host().querySelectorAll('.oge-spreadsheet-header-full').length,
    ).toBeGreaterThan(0);
    // a pointer taken away ends the drag
    mouse(grid(), 'pointercancel');
  });

  it('switches sheets with the tab strip’s keys and scroll buttons', () => {
    mount();
    const tabs = () =>
      [...host().querySelectorAll('.oge-spreadsheet-tab')] as HTMLElement[];
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(viewer().core.activeSheet()).toBe(1);
    fireEvent.keyDown(tabs()[1], { key: 'End' });
    expect(viewer().core.activeSheet()).toBe(2);
    fireEvent.keyDown(tabs()[2], { key: 'Home' });
    expect(viewer().core.activeSheet()).toBe(0);
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });
    fireEvent.keyDown(tabs()[0], { key: 'x' });
    const list = host().querySelector(
      '.oge-spreadsheet-tabs',
    ) as HTMLElement & { scrollBy: (o: ScrollToOptions) => void };
    list.scrollBy = vi.fn();
    fireEvent.click(host().querySelectorAll('.oge-spreadsheet-tab-nav')[1]);
    expect(list.scrollBy).toHaveBeenCalledWith({
      left: 120,
      behavior: 'smooth',
    });
    fireEvent.click(host().querySelectorAll('.oge-spreadsheet-tab-nav')[0]);
    expect(list.scrollBy).toHaveBeenLastCalledWith({
      left: -120,
      behavior: 'smooth',
    });
    // the host's activeSheet wins
    act(() => set.sheet(2));
    expect(viewer().core.activeSheet()).toBe(2);
  });

  it('zooms from the status bar, the slider and Ctrl+wheel', () => {
    mount();
    const steps = host().querySelectorAll('.oge-spreadsheet-zoom-step');
    fireEvent.click(steps[1]);
    expect(viewer().core.zoom()).toBe(110);
    fireEvent.click(steps[0]);
    expect(viewer().core.zoom()).toBe(100);
    const slider = host().querySelector(
      '.oge-spreadsheet-zoom-slider',
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '150' } });
    expect(viewer().core.zoom()).toBe(250);
    fireEvent.change(slider, { target: { value: '50' } });
    expect(viewer().core.zoom()).toBe(55);
    act(
      () =>
        void grid().dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            ctrlKey: true,
            cancelable: true,
          }),
        ),
    );
    expect(viewer().core.zoom()).toBe(75);
    act(
      () =>
        void grid().dispatchEvent(
          new WheelEvent('wheel', { deltaY: 100, cancelable: true }),
        ),
    );
    expect(viewer().core.zoom()).toBe(75);
    act(() => viewer().setZoom(120));
    expect(viewer().core.zoom()).toBe(120);
  });

  it('runs find from its bar: options, steps and the count', () => {
    mount();
    act(() => viewer().find('0'));
    const input = host().querySelector(
      '.oge-spreadsheet-find-input',
    ) as HTMLInputElement;
    expect(input.value).toBe('0');
    expect(
      host().querySelector('.oge-spreadsheet-find-count')?.textContent,
    ).toBe('1 of 4');
    const buttons = () =>
      [
        ...host().querySelectorAll(
          '.oge-spreadsheet-find .oge-spreadsheet-icon-button',
        ),
      ] as HTMLElement[];
    fireEvent.click(buttons()[1]);
    expect(
      host().querySelector('.oge-spreadsheet-find-count')?.textContent,
    ).toBe('2 of 4');
    fireEvent.click(buttons()[0]);
    expect(
      host().querySelector('.oge-spreadsheet-find-count')?.textContent,
    ).toBe('1 of 4');
    const toggles = () =>
      [...host().querySelectorAll('.oge-spreadsheet-toggle')] as HTMLElement[];
    fireEvent.click(toggles()[1]);
    expect(toggles()[1].getAttribute('aria-pressed')).toBe('true');
    expect(
      host().querySelector('.oge-spreadsheet-find-count')?.textContent,
    ).toBe('No matches');
    fireEvent.click(toggles()[0]);
    fireEvent.click(toggles()[2]);
    fireEvent.click(toggles()[0]);
    input.value = 'Head';
    fireEvent.click(buttons()[1]);
    expect(viewer().core.selection().active).toEqual({ row: 0, col: 1 });
    fireEvent.click(buttons()[2]);
    expect(host().querySelector('.oge-spreadsheet-find')).toBeNull();
  });

  it('restores the name box, goes there with F5, and copies through the clipboard API', async () => {
    mount();
    const box = host().querySelector(
      '.oge-spreadsheet-name-box',
    ) as HTMLInputElement;
    box.value = 'nonsense';
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box.value).toBe('A1');
    box.value = 'nonsense';
    fireEvent.blur(box);
    expect(box.value).toBe('A1');
    fireEvent.focus(box);
    fireEvent.keyDown(grid(), { key: 'F5' });
    expect(document.activeElement).toBe(box);
    const write = vi.fn(async () => undefined);
    stub(navigator, 'clipboard', { write, writeText: vi.fn() });
    stub(
      globalThis,
      'ClipboardItem',
      class {
        constructor(readonly items: Record<string, Blob>) {}
      },
    );
    act(() => void viewer().goTo('A1:A2'));
    await act(async () => expect(await viewer().copy()).toBe(true));
    expect(write).toHaveBeenCalledTimes(1);
    // the browser copies on Ctrl+C itself (the copy event)
    fireEvent.keyDown(grid(), { key: 'c', ctrlKey: true });
    act(() => viewer().focus());
    expect(document.activeElement).toBe(grid());
  });

  it('prints the used range as a table it builds node by node', () => {
    mount();
    const print = vi.fn();
    const append = document.body.appendChild.bind(document.body);
    const frames: HTMLIFrameElement[] = [];
    stub(document.body, 'appendChild', <T extends Node>(node: T): T => {
      const added = append(node);
      if (node instanceof HTMLIFrameElement) {
        frames.push(node);
        Object.assign(node.contentWindow as Window, {
          print,
          focus: () => undefined,
        });
      }
      return added;
    });
    viewer().print();
    expect(print).toHaveBeenCalledTimes(1);
    const doc = frames[0].contentDocument as Document;
    expect(doc.title).toBe('Sheet1');
    expect(
      [...doc.querySelectorAll('td')].map((td) => td.textContent),
    ).toContain('Head');
    (frames[0].contentWindow as Window).dispatchEvent(new Event('afterprint'));
    expect(frames[0].isConnected).toBe(false);
  });

  it('warns about macros it keeps, and reports a URL it cannot fetch', async () => {
    mount();
    const workbook = createOgeWorkbook();
    const issues: OgeImportIssue[] = [
      { code: 'macros-kept', severity: 'info', count: 1 },
    ];
    act(() => viewer().core.setWorkbook(workbook, issues));
    const bar = host().querySelector(
      '.oge-spreadsheet-message-bar',
    ) as HTMLElement;
    expect(bar.textContent).toContain('macros');
    fireEvent.click(bar.querySelector('button') as HTMLElement);
    expect(host().querySelector('.oge-spreadsheet-message-bar')).toBeNull();
    stub(
      globalThis,
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    act(() => {
      set.workbook(null);
      set.source('/missing.xlsx');
    });
    await act(async () => {
      await vi.waitFor(() => expect(errors).toHaveLength(1));
    });
    expect(errors[0].error.code).toBe('fetch-failed');
    expect(viewer().getWorkbook()).toBeNull();
  });
});
