import { createPlainSpreadsheetReactivity } from '../view/reactivity';
import type { OgePdfJs, OgePdfJsTextItem } from './pdfjs-types';
import {
  OGE_DEFAULT_PDF_VIEWER_CONFIG,
  OgePdfViewerCore,
  ogePdfFindMatches,
  ogePdfScale,
  ogeVisiblePdfPages,
  resolveOgePdfViewerConfig,
  type OgePdfLoadErrorEvent,
} from './viewer-core';

const text = (
  str: string,
  x: number,
  y: number,
  size = 10,
): OgePdfJsTextItem => ({
  str,
  transform: [size, 0, 0, size, x, y],
  width: str.length * size * 0.5,
  height: size,
});

/** A pdf.js stand-in: pages of 600 × 800 pt with the given text runs. */
function fakePdfJs(
  pages: OgePdfJsTextItem[][],
  options: { fail?: string } = {},
): OgePdfJs & { renders: number; worker: { workerSrc: string } } {
  const worker = { workerSrc: '' };
  const fake = {
    renders: 0,
    worker,
    GlobalWorkerOptions: worker,
    getDocument: () => ({
      promise: options.fail
        ? Promise.reject(Object.assign(new Error('no'), { name: options.fail }))
        : Promise.resolve({
            numPages: pages.length,
            getPage: async (n: number) => ({
              getViewport: ({ scale }: { scale: number }) => ({
                width: 600 * scale,
                height: 800 * scale,
                scale,
                rotation: 0,
              }),
              render: () => {
                fake.renders++;
                return { promise: Promise.resolve(), cancel: () => undefined };
              },
              getTextContent: async () => ({ items: pages[n - 1] }),
            }),
            destroy: async () => undefined,
          }),
      destroy: async () => undefined,
    }),
  };
  return fake as unknown as OgePdfJs & {
    renders: number;
    worker: { workerSrc: string };
  };
}

function core(
  pdfjs: OgePdfJs,
  events: { errors?: OgePdfLoadErrorEvent[] } = {},
) {
  const pages: number[] = [];
  const viewer = new OgePdfViewerCore({
    reactivity: createPlainSpreadsheetReactivity(),
    config: resolveOgePdfViewerConfig({
      pdfjs: async () => pdfjs,
      workerSrc: '/assets/pdf.worker.min.mjs',
    }),
    onPageChange: (index) => pages.push(index),
    onLoadError: (event) => events.errors?.push(event),
  });
  return { viewer, pages };
}

describe('ogePdfFindMatches', () => {
  it('finds folded matches and boxes them from the top-left', () => {
    const matches = ogePdfFindMatches(
      [
        { items: [text('Invoice İSTANBUL invoice', 100, 700)], height: 800 },
        { items: [text('nothing here', 0, 0)], height: 800 },
      ],
      'invoice',
    );
    expect(matches).toHaveLength(2);
    expect(matches[0].page).toBe(0);
    expect(matches[0].rects[0]).toEqual({
      x: 100,
      y: 90,
      width: 35,
      height: 10,
    });
    expect(
      ogePdfFindMatches(
        [{ items: [text('İstanbul', 0, 0)], height: 10 }],
        'istanbul',
      ),
    ).toHaveLength(1);
    expect(ogePdfFindMatches([], '  ')).toEqual([]);
  });
});

describe('ogePdfScale', () => {
  const page = { width: 600, height: 800 };
  it('resolves numbers and the two fits', () => {
    expect(ogePdfScale(1.5, page, { width: 100, height: 100 })).toBe(1.5);
    // 824 px wide minus the 24 px margin over 600 pt × 4/3
    expect(ogePdfScale('fit-width', page, { width: 824, height: 300 })).toBe(1);
    expect(
      ogePdfScale('fit-page', page, { width: 824, height: 424 }),
    ).toBeCloseTo(0.375);
  });
});

describe('OgePdfViewerCore', () => {
  const pages = [
    [text('Quarterly report', 50, 750)],
    [text('Revenue grew', 50, 750)],
    [text('Report appendix', 50, 750)],
  ];

  it('opens a document through the loader and sets the worker', async () => {
    const pdfjs = fakePdfJs(pages);
    const { viewer } = core(pdfjs);
    await viewer.load(new Uint8Array([1, 2, 3]));
    expect(viewer.status()).toBe('ready');
    expect(viewer.pageCount()).toBe(3);
    expect(viewer.pageSizes()[0]).toEqual({ width: 600, height: 800 });
    expect(pdfjs.worker.workerSrc).toBe('/assets/pdf.worker.min.mjs');
    expect(viewer.currentLabel()).toBe('Page 1 of 3');
  });

  it('zooms by steps and fits the width of the container', async () => {
    const { viewer } = core(fakePdfJs(pages));
    await viewer.load(new Uint8Array([1]));
    viewer.setContainer(824, 600);
    expect(viewer.zoomPercent()).toBe(100);
    viewer.zoomIn();
    expect(viewer.zoom()).toBe(1.25);
    expect(viewer.zoomLabel()).toBe('125%');
    viewer.zoomOut();
    viewer.zoomOut();
    expect(viewer.zoom()).toBe(0.75);
    viewer.setZoom(10);
    expect(viewer.zoom()).toBe(4);
    expect(viewer.canZoomIn()).toBe(false);
    expect(viewer.boxOf(0).width).toBe(3200);
    viewer.setZoom('fit-page');
    expect(viewer.zoomPercent()).toBe(54); // 576 px tall / (800 pt × 4/3)
  });

  it('searches every page and steps through the matches', async () => {
    const { viewer, pages: changes } = core(fakePdfJs(pages));
    await viewer.load(new Uint8Array([1]));
    viewer.setZoom(1);
    await viewer.search('REPORT');
    expect(viewer.matches().map((m) => m.page)).toEqual([0, 2]);
    expect(viewer.matchLabel()).toBe('1 of 2');
    viewer.nextMatch();
    expect(viewer.index()).toBe(2);
    expect(changes.at(-1)).toBe(2);
    expect(viewer.highlightsOf(2)[0].current).toBe(true);
    expect(viewer.highlightsOf(2)[0].x).toBeCloseTo(50 * (4 / 3));
    viewer.nextMatch();
    expect(viewer.matchIndex()).toBe(0);
    await viewer.search('missing');
    expect(viewer.matchLabel()).toBe('No matches');
    await viewer.search('');
    expect(viewer.matchLabel()).toBe('');
  });

  it('draws pages near the viewport and renders into a canvas', async () => {
    const pdfjs = fakePdfJs(pages);
    const { viewer } = core(pdfjs);
    await viewer.load(new Uint8Array([1]));
    viewer.viewport({ current: 0, first: 0, last: 0 });
    expect(viewer.isDrawn(2)).toBe(true);
    const canvas = {
      width: 0,
      height: 0,
      style: {} as Record<string, string>,
      getContext: () => ({}),
    } as unknown as HTMLCanvasElement;
    viewer.setZoom(1);
    await viewer.renderPage(0, canvas);
    expect(pdfjs.renders).toBe(1);
    expect(canvas.style.width).toBe('800px');
    await viewer.renderThumbnail(1, canvas, 120);
    expect(canvas.style.width).toBe('120px');
  });

  it('navigates with page keys and zooms with Ctrl + / −', async () => {
    const { viewer } = core(fakePdfJs(pages));
    await viewer.load(new Uint8Array([1]));
    const key = (k: string, ctrlKey = false) => {
      const event = { key: k, ctrlKey, preventDefault: vi.fn() };
      viewer.keydown(event);
      return event.preventDefault.mock.calls.length;
    };
    expect(key('End')).toBe(1);
    expect(viewer.index()).toBe(2);
    key('PageUp');
    expect(viewer.index()).toBe(1);
    viewer.setZoom(1);
    expect(key('+')).toBe(0); // without Ctrl: the page keeps it
    key('+', true);
    expect(viewer.zoom()).toBe(1.25);
    key('0', true);
    expect(viewer.zoom()).toBe('fit-width');
  });

  it('reports a password-protected file and a missing pdf.js', async () => {
    const errors: OgePdfLoadErrorEvent[] = [];
    const { viewer } = core(fakePdfJs(pages, { fail: 'PasswordException' }), {
      errors,
    });
    await viewer.load(new Uint8Array([1]));
    expect(viewer.status()).toBe('error');
    expect(viewer.errorText()).toBe(
      'This PDF is password-protected and cannot be previewed',
    );
    const missing = new OgePdfViewerCore({
      reactivity: createPlainSpreadsheetReactivity(),
      config: resolveOgePdfViewerConfig({
        pdfjs: () => Promise.reject(new Error('not installed')),
      }),
      onLoadError: (event) => errors.push(event),
    });
    await missing.load(new Uint8Array([1]));
    expect(errors.map((e) => e.code)).toEqual(['password', 'pdfjs-missing']);
    await viewer.load(null);
    expect(viewer.status()).toBe('empty');
  });

  it('merges a config over the defaults', () => {
    const config = resolveOgePdfViewerConfig({ messages: { print: 'Yazdır' } });
    expect(config.messages.print).toBe('Yazdır');
    expect(config.messages.search).toBe('Find in document');
    expect(config.pdfjs).toBe(OGE_DEFAULT_PDF_VIEWER_CONFIG.pdfjs);
  });
});

describe('OgePdfViewerCore keys in the find box', () => {
  it('leaves caret keys to an input', async () => {
    const { viewer } = core(fakePdfJs([[], []]));
    await viewer.load(new Uint8Array([1]));
    const input = {
      closest: (s: string) => s.includes('input'),
    } as unknown as EventTarget;
    const preventDefault = vi.fn();
    viewer.keydown({ key: 'End', target: input, preventDefault });
    expect(viewer.index()).toBe(0);
    expect(preventDefault).not.toHaveBeenCalled();
  });
});

describe('OgePdfViewerCore edges', () => {
  const pages = [[text('Alpha beta', 10, 700)], [text('Gamma', 10, 700)]];

  it('reads Blobs, ArrayBuffers and URLs, and reports a failed fetch or a broken file', async () => {
    const errors: OgePdfLoadErrorEvent[] = [];
    const { viewer } = core(fakePdfJs(pages), { errors });
    await viewer.load(new Blob([new Uint8Array([1])]));
    expect(viewer.status()).toBe('ready');
    await viewer.load(new Uint8Array([1]).buffer);
    expect(viewer.pageCount()).toBe(2);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('x', { status: 404 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1])));
    await viewer.load('/missing.pdf');
    expect(viewer.status()).toBe('error');
    expect(viewer.errorText()).toBe('The document could not be opened');
    await viewer.load('/report.pdf');
    expect(viewer.status()).toBe('ready');
    fetchSpy.mockRestore();
    const broken = core(fakePdfJs(pages, { fail: 'InvalidPDFException' }), {
      errors,
    });
    await broken.viewer.load(new Uint8Array([1]));
    expect(errors.map((e) => e.code)).toEqual(['fetch-failed', 'invalid']);
  });

  it('drops a load that a newer one overtook', async () => {
    const { viewer } = core(fakePdfJs(pages));
    const first = viewer.load(new Uint8Array([1]));
    const second = viewer.load(null);
    await Promise.all([first, second]);
    expect(viewer.status()).toBe('empty');
    viewer.destroy();
  });

  it('lays a text layer over a drawn page and cancels an older draw', async () => {
    const rendered: unknown[] = [];
    const pdfjs = Object.assign(fakePdfJs(pages), {
      TextLayer: class {
        constructor(params: unknown) {
          rendered.push(params);
        }
        render = async () => undefined;
        cancel = () => undefined;
      },
    });
    const { viewer } = core(pdfjs);
    await viewer.load(new Uint8Array([1]));
    const canvas = {
      width: 0,
      height: 0,
      style: {} as Record<string, string>,
      ownerDocument: { defaultView: { devicePixelRatio: 2 } },
      getContext: () => ({}),
    } as unknown as HTMLCanvasElement;
    const layer = { replaceChildren: vi.fn() } as unknown as HTMLElement;
    viewer.setZoom(1);
    await viewer.renderPage(0, canvas, layer);
    expect(canvas.width).toBe(1600);
    expect(rendered).toHaveLength(1);
    // no 2D context: nothing drawn, no throw
    await viewer.renderPage(
      1,
      { ...canvas, getContext: () => null } as unknown as HTMLCanvasElement,
      layer,
    );
    // beyond the last page: nothing to draw
    await viewer.renderPage(9, canvas);
    await viewer.renderThumbnail(9, canvas, 100);
    expect(rendered).toHaveLength(1);
  });

  it('prints every page into a hidden frame', async () => {
    const { viewer } = core(fakePdfJs(pages));
    await viewer.print({ ownerDocument: {} as Document }); // not ready yet
    await viewer.load(new Uint8Array([1]));
    const written: string[] = [];
    const listeners: Record<string, () => void> = {};
    const win = {
      addEventListener: (type: string, fn: () => void) =>
        (listeners[type] = fn),
      focus: vi.fn(),
      print: vi.fn(),
    };
    const frame = {
      setAttribute: vi.fn(),
      style: {} as Record<string, string>,
      contentDocument: {
        open: vi.fn(),
        write: (html: string) => written.push(html),
        close: vi.fn(),
      },
      contentWindow: win,
      remove: vi.fn(),
    };
    const owner = {
      createElement: (tag: string) =>
        tag === 'iframe'
          ? frame
          : {
              width: 0,
              height: 0,
              style: {},
              getContext: () => ({}),
              toDataURL: () => 'data:image/png;base64,AA==',
            },
      body: { appendChild: vi.fn() },
    } as unknown as Document;
    await viewer.print({ ownerDocument: owner });
    expect(win.print).toHaveBeenCalled();
    expect(written[0]).toContain('<title>PDF document</title>');
    expect(written[0].match(/<img /g)).toHaveLength(2);
    vi.useFakeTimers();
    listeners['afterprint']();
    vi.runAllTimers();
    vi.useRealTimers();
    expect(frame.remove).toHaveBeenCalled();
    // a frame without a document is removed at once
    frame.contentDocument = null as never;
    frame.remove.mockClear();
    await viewer.print({ ownerDocument: owner });
    expect(frame.remove).toHaveBeenCalled();
  });

  it('walks the pages and clamps at both ends', async () => {
    const { viewer, pages: changes } = core(fakePdfJs(pages));
    await viewer.load(new Uint8Array([1]));
    viewer.previous();
    expect(viewer.index()).toBe(0);
    viewer.next();
    viewer.next();
    expect(viewer.index()).toBe(1);
    expect(viewer.canGoForward()).toBe(false);
    viewer.keydown({ key: 'Home', preventDefault: () => undefined });
    viewer.keydown({ key: 'PageDown', preventDefault: () => undefined });
    viewer.keydown({
      key: '-',
      ctrlKey: true,
      preventDefault: () => undefined,
    });
    viewer.keydown({ key: 'x', preventDefault: () => undefined });
    expect(changes).toContain(1);
    viewer.viewport({ current: 0, first: 0, last: 1 });
    expect(viewer.index()).toBe(0);
    viewer.setConfig(
      resolveOgePdfViewerConfig({
        messages: { pageLabel: '{current}/{total}' },
      }),
    );
    expect(viewer.currentLabel()).toBe('1/2');
    expect(viewer.highlightsOf(0)).toEqual([]);
    viewer.nextMatch(); // no matches: nothing happens
    expect(viewer.matchIndex()).toBe(-1);
  });
});

describe('ogeVisiblePdfPages', () => {
  const box = (top: number, bottom: number) => ({
    getBoundingClientRect: () => ({ top, bottom, height: bottom - top }),
  });
  it('reports the visible range and the page at the middle', () => {
    const scroller = {
      getBoundingClientRect: () => ({ top: 0, bottom: 500, height: 500 }),
      querySelectorAll: () => [box(-900, -100), box(0, 400), box(420, 900)],
    } as unknown as HTMLElement;
    expect(ogeVisiblePdfPages(scroller, '.page')).toEqual({
      current: 1,
      first: 1,
      last: 2,
    });
    const offscreen = {
      getBoundingClientRect: () => ({ top: 0, bottom: 100, height: 100 }),
      querySelectorAll: () => [box(200, 300)],
    } as unknown as HTMLElement;
    expect(ogeVisiblePdfPages(offscreen, '.page')).toEqual({
      current: 0,
      first: 0,
      last: 0,
    });
    const empty = {
      querySelectorAll: () => [],
    } as unknown as HTMLElement;
    expect(ogeVisiblePdfPages(empty, '.page')).toBeNull();
  });
});

describe('PDF core fallbacks', () => {
  it('handles empty runs, odd transforms and an unopened viewer', async () => {
    const matches = ogePdfFindMatches(
      [
        {
          items: [
            { str: '', transform: [], width: 0, height: 0 },
            { str: 'abc abc', transform: [], width: 70, height: 12 },
          ],
          height: 100,
        },
      ],
      'abc',
    );
    expect(matches).toHaveLength(2);
    expect(matches[0].rects[0].y).toBe(88);
    expect(resolveOgePdfViewerConfig(undefined)).toBe(
      OGE_DEFAULT_PDF_VIEWER_CONFIG,
    );
    const { viewer } = core(fakePdfJs([]));
    expect(viewer.scaleOf(0)).toBe(1);
    viewer.setZoom(2);
    expect(viewer.scaleOf(0)).toBe(2);
    expect(viewer.boxOf(3)).toEqual({ width: 0, height: 0 });
    viewer.setContainer(10, 10);
    viewer.setContainer(10, 10);
    await viewer.search('anything'); // not ready: nothing found
    expect(viewer.matches()).toEqual([]);
    viewer.keydown({ key: '=', preventDefault: () => undefined });
    viewer.keydown({ key: '-', preventDefault: () => undefined });
    viewer.keydown({ key: '0', preventDefault: () => undefined });
    viewer.keydown({
      key: '=',
      metaKey: true,
      preventDefault: () => undefined,
    });
    expect(viewer.zoom()).toBe(3);
  });
});

describe('ogePdfScale before measuring', () => {
  it('stays at 100 % until the container has a size', () => {
    expect(
      ogePdfScale(
        'fit-width',
        { width: 600, height: 800 },
        { width: 0, height: 0 },
      ),
    ).toBe(1);
  });
});

describe('OgePdfViewerCore search in flight', () => {
  it('says nothing until the search answers, and survives an unreadable page', async () => {
    let release: ((value: { items: never[] }) => void) | null = null;
    const pdfjs = fakePdfJs([[text('alpha', 0, 0)]]);
    const { viewer } = core(pdfjs);
    await viewer.load(new Uint8Array([1]));
    const page = await (
      viewer as unknown as {
        page(i: number): Promise<{ getTextContent: () => Promise<unknown> }>;
      }
    ).page(0);
    page.getTextContent = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const pending = viewer.search('alpha');
    expect(viewer.matchLabel()).toBe('');
    await vi.waitFor(() => expect(release).not.toBeNull());
    release!({ items: [] });
    await pending;
    expect(viewer.matchLabel()).toBe('No matches');
    page.getTextContent = () => Promise.reject(new Error('gone'));
    await viewer.load(new Uint8Array([1]));
    const again = await (
      viewer as unknown as {
        page(i: number): Promise<{ getTextContent: () => Promise<unknown> }>;
      }
    ).page(0);
    again.getTextContent = () => Promise.reject(new Error('gone'));
    await viewer.search('alpha');
    expect(viewer.matchLabel()).toBe('No matches');
  });
});
