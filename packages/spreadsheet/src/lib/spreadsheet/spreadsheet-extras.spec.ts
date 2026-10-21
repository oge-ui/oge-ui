import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  createOgeWorkbook,
  type OgeImportIssue,
  type OgeWorkbook,
} from '@oge-ui/spreadsheet-engine';
import { OgeSpreadsheet } from './spreadsheet';
import type {
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadErrorEvent,
} from './spreadsheet-types';

/** One pixel of PNG: enough for the picture path (the bytes are never decoded in jsdom). */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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

@Component({
  imports: [OgeSpreadsheet],
  template: `
    <oge-spreadsheet
      [workbook]="workbook()"
      [source]="source()"
      [activeSheet]="sheet()"
      [showGridLines]="grid()"
      (hyperlinkClick)="links.push($event)"
      (loadError)="errors.push($event)"
      style="display: block; width: 800px; height: 400px"
    />
  `,
})
class Host {
  readonly workbook = signal<OgeWorkbook | null>(richBook());
  readonly source = signal<string | null>(null);
  readonly sheet = signal<number | undefined>(undefined);
  readonly grid = signal<boolean | undefined>(undefined);
  readonly links: OgeSpreadsheetHyperlinkClickEvent[] = [];
  readonly errors: OgeSpreadsheetLoadErrorEvent[] = [];
}

describe('OgeSpreadsheet — drawing and chrome', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;
  const restore: (() => void)[] = [];

  function stub<T extends object>(
    target: T,
    name: string,
    value: unknown,
  ): void {
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

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(Host);
    await settle();
    host = fixture.nativeElement as HTMLElement;
  }

  const viewer = () =>
    fixture.debugElement.children[0].componentInstance as OgeSpreadsheet;
  const grid = () => host.querySelector('.oge-spreadsheet-grid') as HTMLElement;
  const mouse = (target: Element, type: string, init: MouseEventInit = {}) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init,
    });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    target.dispatchEvent(event);
  };

  beforeEach(async () => {
    stubLayout();
    stub(URL, 'createObjectURL', () => 'blob:picture');
    stub(URL, 'revokeObjectURL', vi.fn());
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
  });

  afterEach(() => {
    while (restore.length) restore.pop()?.();
  });

  it('draws frozen panes, frozen headers, data bars, icons, filters and pinned notes', async () => {
    await render();
    const panes = [...host.querySelectorAll('.oge-spreadsheet-pane')].map((p) =>
      p.getAttribute('data-pane'),
    );
    expect(panes).toEqual(['main', 'top', 'left', 'corner']);
    expect(
      host.querySelectorAll('.oge-spreadsheet-headers-frozen'),
    ).toHaveLength(2);
    expect(
      host.querySelectorAll('.oge-spreadsheet-data-bar').length,
    ).toBeGreaterThan(0);
    expect(
      host.querySelectorAll('.oge-spreadsheet-icon path').length,
    ).toBeGreaterThan(0);
    const filters = [
      ...host.querySelectorAll('.oge-spreadsheet-filter-button'),
    ];
    expect(filters).toHaveLength(2);
    expect(filters[0].classList).toContain('oge-spreadsheet-filter-active');
    // a note pinned open in the file shows without hovering
    expect(host.querySelector('.oge-spreadsheet-note')?.textContent).toContain(
      'pinned',
    );
  });

  it('shows pictures from the workbook’s media, cropped and rotated, and lets their URLs go', async () => {
    await render();
    const picture = host.querySelector(
      '.oge-spreadsheet-picture',
    ) as HTMLElement;
    const image = picture.querySelector('img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('blob:picture');
    expect(image.getAttribute('alt')).toBe('Logo');
    expect(picture.style.transform).toContain('rotate(90deg)');
    // 40 px shown of a 10% left crop: the image is wider and shifted left
    expect(parseFloat(image.style.width)).toBeCloseTo(40 / 0.9);
    expect(parseFloat(image.style.left)).toBeLessThan(0);
    fixture.componentInstance.workbook.set(createOgeWorkbook());
    await settle();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:picture');
  });

  it('can hide gridlines, follows a link (opening it), and hovers a note open', async () => {
    const open = vi.fn();
    stub(window, 'open', open);
    await render();
    expect(host.querySelector('.oge-spreadsheet-gridlines')).not.toBeNull();
    fixture.componentInstance.grid.set(false);
    await settle();
    expect(host.querySelector('.oge-spreadsheet-gridlines')).toBeNull();
    viewer().goTo('C1');
    grid().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(fixture.componentInstance.links.at(-1)?.href).toBe(
      'https://example.com/a',
    );
    expect(open).toHaveBeenCalledWith(
      'https://example.com/a',
      '_blank',
      'noopener,noreferrer',
    );
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
    // B4: past the 26 px row numbers, the frozen A column (64) and three 20 px rows under the letters
    mouse(grid(), 'pointermove', {
      clientX: 26 + 64 + 10,
      clientY: 20 + 3 * 20 + 5,
    });
    await settle();
    expect(
      [...host.querySelectorAll('.oge-spreadsheet-note')].map(
        (n) => n.textContent,
      ),
    ).toContain('hover me');
    grid().dispatchEvent(new MouseEvent('mouseleave'));
    await settle();
    expect(
      [...host.querySelectorAll('.oge-spreadsheet-note')].map(
        (n) => n.textContent,
      ),
    ).not.toContain('hover me');
  });

  it('extends a selection by dragging over row headers and selects everything from the corner', async () => {
    await render();
    mouse(
      host.querySelector(
        '.oge-spreadsheet-row-header[data-row="1"]',
      ) as Element,
      'pointerdown',
    );
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
    mouse(grid(), 'pointermove', {
      clientX: 26 + 70,
      clientY: 20 + 3 * 20 + 5,
    });
    mouse(grid(), 'pointerup', { clientX: 26 + 70, clientY: 20 + 3 * 20 + 5 });
    await settle();
    expect(viewer().core.selection().ranges[0]).toMatchObject({
      top: 1,
      bottom: 3,
    });
    mouse(
      host.querySelector('.oge-spreadsheet-select-all') as Element,
      'pointerdown',
    );
    await settle();
    expect(
      host.querySelectorAll('.oge-spreadsheet-header-full').length,
    ).toBeGreaterThan(0);
  });

  it('switches sheets with the tab strip’s keys and scroll buttons', async () => {
    await render();
    const tabs = () =>
      [...host.querySelectorAll('.oge-spreadsheet-tab')] as HTMLElement[];
    tabs()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(viewer().core.activeSheet()).toBe(1);
    tabs()[1].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(viewer().core.activeSheet()).toBe(2);
    tabs()[2].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle();
    expect(viewer().core.activeSheet()).toBe(0);
    tabs()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        bubbles: true,
        cancelable: true,
      }),
    );
    tabs()[0].dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
        cancelable: true,
      }),
    );
    const list = host.querySelector('.oge-spreadsheet-tabs') as HTMLElement & {
      scrollBy: (o: ScrollToOptions) => void;
    };
    list.scrollBy = vi.fn();
    (
      host.querySelectorAll('.oge-spreadsheet-tab-nav')[1] as HTMLElement
    ).click();
    expect(list.scrollBy).toHaveBeenCalledWith({
      left: 120,
      behavior: 'smooth',
    });
    // the host's [activeSheet] wins
    fixture.componentInstance.sheet.set(2);
    await settle();
    expect(viewer().core.activeSheet()).toBe(2);
  });

  it('zooms from the status bar, the slider and Ctrl+wheel', async () => {
    await render();
    const steps = host.querySelectorAll('.oge-spreadsheet-zoom-step');
    (steps[1] as HTMLElement).click();
    expect(viewer().core.zoom()).toBe(110);
    (steps[0] as HTMLElement).click();
    expect(viewer().core.zoom()).toBe(100);
    const slider = host.querySelector(
      '.oge-spreadsheet-zoom-slider',
    ) as HTMLInputElement;
    slider.value = '150';
    slider.dispatchEvent(new Event('input'));
    expect(viewer().core.zoom()).toBe(250);
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    expect(viewer().core.zoom()).toBe(55);
    grid().dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        cancelable: true,
      }),
    );
    expect(viewer().core.zoom()).toBe(75);
    viewer().setZoom(120);
    expect(viewer().core.zoom()).toBe(120);
  });

  it('runs find from its bar: options, steps and the count', async () => {
    await render();
    viewer().find('0');
    await settle();
    const input = host.querySelector(
      '.oge-spreadsheet-find-input',
    ) as HTMLInputElement;
    expect(input.value).toBe('0');
    expect(host.querySelector('.oge-spreadsheet-find-count')?.textContent).toBe(
      '1 of 4',
    );
    const buttons = [
      ...host.querySelectorAll(
        '.oge-spreadsheet-find .oge-spreadsheet-icon-button',
      ),
    ] as HTMLElement[];
    buttons[1].click();
    await settle();
    expect(host.querySelector('.oge-spreadsheet-find-count')?.textContent).toBe(
      '2 of 4',
    );
    buttons[0].click();
    await settle();
    expect(host.querySelector('.oge-spreadsheet-find-count')?.textContent).toBe(
      '1 of 4',
    );
    const toggles = [
      ...host.querySelectorAll('.oge-spreadsheet-toggle'),
    ] as HTMLElement[];
    toggles[1].click();
    await settle();
    expect(toggles[1].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('.oge-spreadsheet-find-count')?.textContent).toBe(
      'No matches',
    );
    input.value = 'Head';
    buttons[1].click();
    await settle();
    expect(viewer().core.selection().active).toEqual({ row: 0, col: 1 });
    buttons[2].click();
    await settle();
    expect(host.querySelector('.oge-spreadsheet-find')).toBeNull();
  });

  it('restores the name box, goes there with F5, and copies through the clipboard API', async () => {
    await render();
    const box = host.querySelector(
      '.oge-spreadsheet-name-box',
    ) as HTMLInputElement;
    box.value = 'nonsense';
    box.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(box.value).toBe('A1');
    box.value = 'nonsense';
    box.dispatchEvent(new FocusEvent('blur'));
    expect(box.value).toBe('A1');
    grid().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F5',
        bubbles: true,
        cancelable: true,
      }),
    );
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
    viewer().goTo('A1:A2');
    expect(await viewer().copy()).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('prints the used range as a table it builds node by node', async () => {
    await render();
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
    await render();
    const workbook = createOgeWorkbook();
    const issues: OgeImportIssue[] = [
      { code: 'macros-kept', severity: 'info', count: 1 },
    ];
    viewer().core.setWorkbook(workbook, issues);
    await settle();
    const bar = host.querySelector(
      '.oge-spreadsheet-message-bar',
    ) as HTMLElement;
    expect(bar.textContent).toContain('macros');
    (bar.querySelector('button') as HTMLElement).click();
    await settle();
    expect(host.querySelector('.oge-spreadsheet-message-bar')).toBeNull();
    stub(
      globalThis,
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    fixture.componentInstance.workbook.set(null);
    fixture.componentInstance.source.set('/missing.xlsx');
    await settle();
    await vi.waitFor(() =>
      expect(fixture.componentInstance.errors).toHaveLength(1),
    );
    expect(viewer().getWorkbook()).toBeNull();
  });
});
