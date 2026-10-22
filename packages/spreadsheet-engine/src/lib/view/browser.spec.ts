// @vitest-environment jsdom
// The browser helpers are the engine's one DOM-facing module: they run in a DOM here.
import {
  OgeObjectUrls,
  ogeFetchWorkbook,
  ogeGridHeaderAt,
  ogeGridPoint,
  ogeOpenLink,
  ogePrintSheetTable,
  ogeScrollEdges,
  ogeWriteClipboard,
} from './browser';

const restore: (() => void)[] = [];

/** Replaces a property for one test. */
function stub<T extends object>(target: T, key: string, value: unknown): void {
  const had = Object.prototype.hasOwnProperty.call(target, key);
  const before = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, {
    value,
    configurable: true,
    writable: true,
  });
  restore.push(() => {
    if (had && before) Object.defineProperty(target, key, before);
    else delete (target as Record<string, unknown>)[key];
  });
}

afterEach(() => {
  while (restore.length) restore.pop()?.();
});

describe('ogeFetchWorkbook', () => {
  it('returns the body of a good response, and null for a bad one, a failure or no fetch', async () => {
    const blob = new Blob(['xlsx']);
    const fetch = vi.fn(async () => ({ ok: true, blob: async () => blob }));
    stub(globalThis, 'fetch', fetch);
    expect(await ogeFetchWorkbook('/book.xlsx')).toBe(blob);
    expect(fetch).toHaveBeenCalledWith('/book.xlsx', {
      credentials: 'same-origin',
    });
    const controller = new AbortController();
    await ogeFetchWorkbook('/book.xlsx', controller.signal);
    expect(fetch).toHaveBeenLastCalledWith('/book.xlsx', {
      credentials: 'same-origin',
      signal: controller.signal,
    });
    stub(
      globalThis,
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 })),
    );
    expect(await ogeFetchWorkbook('/missing.xlsx')).toBeNull();
    stub(
      globalThis,
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    );
    expect(await ogeFetchWorkbook('/book.xlsx')).toBeNull();
    stub(globalThis, 'fetch', undefined);
    expect(await ogeFetchWorkbook('/book.xlsx')).toBeNull();
  });
});

describe('OgeObjectUrls', () => {
  it('makes one URL per key, skips what makes no blob, and revokes them all', () => {
    let next = 0;
    const revoked: string[] = [];
    stub(
      URL,
      'createObjectURL',
      vi.fn(() => `blob:${++next}`),
    );
    stub(
      URL,
      'revokeObjectURL',
      vi.fn((url: string) => revoked.push(url)),
    );
    const urls = new OgeObjectUrls();
    const make = vi.fn(() => new Blob(['png'], { type: 'image/png' }));
    expect(urls.url('a', make)).toBe('blob:1');
    expect(urls.url('a', make)).toBe('blob:1');
    expect(make).toHaveBeenCalledTimes(1);
    expect(urls.url('none', () => null)).toBeNull();
    expect(urls.url('b', make)).toBe('blob:2');
    urls.release();
    expect(revoked).toEqual(['blob:1', 'blob:2']);
    // after a release the URLs are made anew
    expect(urls.url('a', make)).toBe('blob:3');
  });

  it('makes none where object URLs do not exist, and releases quietly there', () => {
    stub(URL, 'createObjectURL', undefined);
    stub(URL, 'revokeObjectURL', undefined);
    const urls = new OgeObjectUrls();
    expect(urls.url('a', () => new Blob(['x']))).toBeNull();
    expect(() => urls.release()).not.toThrow();
  });
});

describe('ogeWriteClipboard', () => {
  const content = { text: 'a\tb', html: '<table></table>', cells: 2 };

  it('writes text and HTML where the browser can, else text, and reports failures', async () => {
    stub(navigator, 'clipboard', undefined);
    expect(await ogeWriteClipboard(content)).toBe(false);
    const write = vi.fn(async () => undefined);
    const writeText = vi.fn(async () => undefined);
    stub(navigator, 'clipboard', { write, writeText });
    stub(
      globalThis,
      'ClipboardItem',
      class {
        constructor(readonly items: Record<string, Blob>) {}
      },
    );
    expect(await ogeWriteClipboard(content)).toBe(true);
    const [item] = write.mock.calls[0] as unknown as [
      [{ items: Record<string, Blob> }],
    ];
    expect(Object.keys(item[0].items)).toEqual(['text/plain', 'text/html']);
    stub(globalThis, 'ClipboardItem', undefined);
    expect(await ogeWriteClipboard(content)).toBe(true);
    expect(writeText).toHaveBeenCalledWith('a\tb');
    stub(navigator, 'clipboard', {
      writeText: vi.fn(async () => Promise.reject(new Error('denied'))),
    });
    expect(await ogeWriteClipboard(content)).toBe(false);
  });
});

describe('ogeOpenLink', () => {
  it('opens a new browsing context without an opener', () => {
    const open = vi.fn();
    stub(window, 'open', open);
    ogeOpenLink(window, 'https://example.com/');
    expect(open).toHaveBeenCalledWith(
      'https://example.com/',
      '_blank',
      'noopener,noreferrer',
    );
    expect(() => ogeOpenLink(null, 'https://example.com/')).not.toThrow();
  });
});

describe('ogePrintSheetTable', () => {
  it('prints a table built node by node in a frame that goes away afterwards', () => {
    const print = vi.fn();
    const append = document.body.appendChild.bind(document.body);
    const frames: HTMLIFrameElement[] = [];
    stub(document.body, 'appendChild', <T extends Node>(node: T): T => {
      const added = append(node);
      if (node instanceof HTMLIFrameElement) {
        frames.push(node);
        Object.assign(node.contentWindow as Window, {
          print,
          focus: () => {
            throw new Error('no focus');
          },
        });
      }
      return added;
    });
    const printed = ogePrintSheetTable(
      document,
      {
        columns: [64, 80],
        rows: [
          {
            height: 20,
            cells: [
              {
                text: '<b>x</b>',
                rowSpan: 2,
                colSpan: 1,
                style: { fontWeight: '700' },
              },
              { text: 'y', rowSpan: 1, colSpan: 1, style: {} },
            ],
          },
          {
            height: 30,
            cells: [{ text: 'z', rowSpan: 1, colSpan: 2, style: {} }],
          },
        ],
      },
      'Sheet1',
    );
    expect(printed).toBe(true);
    expect(print).toHaveBeenCalledTimes(1);
    const doc = frames[0].contentDocument as Document;
    expect(doc.title).toBe('Sheet1');
    expect([...doc.querySelectorAll('col')].map((c) => c.style.width)).toEqual([
      '64px',
      '80px',
    ]);
    const cells = [...doc.querySelectorAll('td')];
    // text stays text: no markup is ever parsed
    expect(cells[0].textContent).toBe('<b>x</b>');
    expect(cells[0].querySelector('b')).toBeNull();
    expect(cells[0].rowSpan).toBe(2);
    expect(cells[2].colSpan).toBe(2);
    expect(cells[0].style.fontWeight).toBe('700');
    (frames[0].contentWindow as Window).dispatchEvent(new Event('afterprint'));
    expect(frames[0].isConnected).toBe(false);
  });

  it('gives up without a frame document', () => {
    const append = document.body.appendChild.bind(document.body);
    stub(document.body, 'appendChild', <T extends Node>(node: T): T => {
      const added = append(node);
      if (node instanceof HTMLIFrameElement)
        Object.defineProperty(node, 'contentDocument', { value: null });
      return added;
    });
    expect(ogePrintSheetTable(document, { columns: [], rows: [] }, 'x')).toBe(
      false,
    );
    expect(document.querySelector('iframe')).toBeNull();
  });
});

describe('grid pointer readers', () => {
  it('reads the point and the scroller under a pointer', () => {
    const scroller = document.createElement('div');
    scroller.getBoundingClientRect = () => ({
      left: 10,
      right: 210,
      top: 20,
      bottom: 120,
      width: 200,
      height: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });
    Object.assign(scroller, { scrollTop: 40, scrollLeft: -64 });
    expect(ogeGridPoint({ clientX: 50, clientY: 60 }, scroller)).toMatchObject({
      clientX: 50,
      clientY: 60,
      scrollTop: 40,
      scrollLeft: -64,
      rect: { left: 10, right: 210, top: 20 },
    });
  });

  it('finds the header a pointer went down on', () => {
    const element = (className: string, data: Record<string, string> = {}) => {
      const outer = document.createElement('div');
      outer.className = className;
      for (const [name, value] of Object.entries(data))
        outer.setAttribute(`data-${name}`, value);
      const inner = document.createElement('span');
      outer.appendChild(inner);
      return inner;
    };
    expect(ogeGridHeaderAt(element('oge-spreadsheet-select-all'))).toEqual({
      kind: 'select-all',
    });
    expect(
      ogeGridHeaderAt(element('oge-spreadsheet-column-header', { col: '3' })),
    ).toEqual({ kind: 'column-header', col: 3 });
    expect(
      ogeGridHeaderAt(element('oge-spreadsheet-row-header', { row: '7' })),
    ).toEqual({ kind: 'row-header', row: 7 });
    expect(ogeGridHeaderAt(element('oge-spreadsheet-row-header'))).toBeNull();
    expect(ogeGridHeaderAt(element('oge-spreadsheet-pane'))).toBeNull();
    expect(ogeGridHeaderAt(null)).toBeNull();
    expect(ogeGridHeaderAt(window)).toBeNull();
  });
});

describe('ogeScrollEdges', () => {
  it('says where a sideways list can still scroll, either direction', () => {
    const list = (scrollLeft: number) => ({
      scrollLeft,
      scrollWidth: 600,
      clientWidth: 400,
    });
    expect(ogeScrollEdges(list(0))).toEqual({ back: false, forward: true });
    expect(ogeScrollEdges(list(100))).toEqual({ back: true, forward: true });
    expect(ogeScrollEdges(list(200))).toEqual({ back: true, forward: false });
    // a right-to-left list scrolls to negative offsets
    expect(ogeScrollEdges(list(-200))).toEqual({ back: true, forward: false });
    expect(
      ogeScrollEdges({ scrollLeft: 0, scrollWidth: 300, clientWidth: 400 }),
    ).toEqual({ back: false, forward: false });
  });
});
