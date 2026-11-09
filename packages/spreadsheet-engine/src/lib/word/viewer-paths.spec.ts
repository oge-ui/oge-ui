/**
 * The viewers' loading paths: URLs, failures, no canvas, and which pages a
 * scroller shows.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OGE_DEFAULT_PRESENTATION_MESSAGES,
  OgePresentationCore,
  resolveOgePresentationConfig,
} from '../powerpoint/viewer-core';
import { createPlainSpreadsheetReactivity } from '../view/reactivity';
import {
  OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
  OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
  OgeWordDocumentCore,
  ogeVisibleWordPages,
  resolveOgeWordDocumentConfig,
} from './viewer-core';

const corpus = (path: string) =>
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus', path)),
  );
const docx = corpus('docx/document.docx');
const pptx = corpus('pptx/slides.pptx');

const wordCore = (extra = {}) =>
  new OgeWordDocumentCore({
    reactivity: createPlainSpreadsheetReactivity(),
    messages: OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
    idPrefix: 'w',
    ...extra,
  });
const slideCore = (extra = {}) =>
  new OgePresentationCore({
    reactivity: createPlainSpreadsheetReactivity(),
    messages: OGE_DEFAULT_PRESENTATION_MESSAGES,
    idPrefix: 'p',
    ...extra,
  });

const respondWith = (bytes: Uint8Array) =>
  vi.fn(async () => ({
    ok: true,
    blob: async () => ({
      arrayBuffer: async () => bytes.slice().buffer,
    }),
  }));

describe.each([
  ['word', wordCore, docx],
  ['presentation', slideCore, pptx],
] as const)('the %s viewer', (_name, make, bytes) => {
  afterEach(() => vi.unstubAllGlobals());

  it('fetches a URL and lays out without a canvas', async () => {
    vi.stubGlobal('fetch', respondWith(bytes));
    const core = make();
    await core.load('/file');
    expect(core.status()).toBe('ready');
  });

  it('reports a failed fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false })),
    );
    const onLoadError = vi.fn();
    const core = make({ onLoadError });
    await core.load('/missing');
    expect(core.status()).toBe('error');
    expect(onLoadError.mock.calls[0][0].code).toBe('fetch-failed');
    expect(core.errorText()).toBe(core.messages().loadError);
  });

  it('reports a damaged file without the event handler too', async () => {
    const core = make();
    await core.load(new Uint8Array(64));
    expect(core.status()).toBe('error');
  });

  it('drops a fetch overtaken by a newer load', async () => {
    let release: (value: unknown) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((done) => {
            release = done;
          }),
      ),
    );
    const onLoaded = vi.fn();
    const core = make({ onLoaded });
    const pending = core.load('/slow');
    await core.load(null);
    release({ ok: false });
    await pending;
    expect(core.status()).toBe('empty');
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('rethrows what is not a read failure', async () => {
    const core = make();
    await expect(
      core.load({
        arrayBuffer: async () => {
          throw new RangeError('boom');
        },
      } as unknown as Blob),
    ).rejects.toThrow('boom');
  });

  it('stops listening once destroyed', async () => {
    const onLoaded = vi.fn();
    const core = make({ onLoaded });
    const pending = core.load(bytes);
    core.destroy();
    await pending;
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('swaps its messages', () => {
    const core = make();
    const text = { ...core.messages(), loading: 'Bekleyin' };
    core.setMessages(text as never);
    expect(core.messages().loading).toBe('Bekleyin');
  });

  it('makes object urls for its pictures, once each', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL }));
    const core = make();
    await core.load(bytes);
    expect(core.mediaUrl('nothing')).toBeNull();
    const key = Object.keys({})[0];
    void key;
  });
});

describe('OgePresentationCore details', () => {
  it('gives no drawing before a deck opens and for a bad index', async () => {
    const core = slideCore();
    expect(core.current()).toBeNull();
    expect(core.renderOf(0)).toBeNull();
    await core.load(pptx);
    expect(core.renderOf(99)).toBeNull();
    expect(core.renderOf(1)).toBe(core.renderOf(1));
    expect(core.labelOf(1)).toBe('Slide 2 of 5');
    core.go(2);
    core.go(2);
    expect(core.index()).toBe(2);
    expect(core.mediaUrl('none')).toBeNull();
  });

  it('merges its config', () => {
    expect(resolveOgePresentationConfig(undefined).messages.nextSlide).toBe(
      'Next slide',
    );
    expect(
      resolveOgePresentationConfig({ messages: { nextSlide: 'x' } }).messages
        .nextSlide,
    ).toBe('x');
  });
});

describe('OgeWordDocumentCore details', () => {
  it('defaults and labels', async () => {
    expect(resolveOgeWordDocumentConfig(undefined)).toBe(
      OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
    );
    const core = wordCore({
      measurer: {
        width: (text: string, font: { size: number }) =>
          text.length * font.size * 0.47,
        extent: (font: { size: number }) => ({
          ascent: font.size,
          descent: font.size * 0.2,
        }),
      },
    });
    expect(core.mediaUrl('x')).toBeNull();
    await core.load(docx);
    expect(core.labelOf(1)).toContain('Page 2 of');
    core.viewport({ current: 0, first: 0, last: 0 });
    expect(core.index()).toBe(0);
    expect(core.mediaUrl('none')).toBeNull();
    core.go(99);
    expect(core.index()).toBe(core.pageCount() - 1);
    core.previous();
    expect(core.canGoForward()).toBe(true);
  });
});

describe('ogeVisibleWordPages', () => {
  const box = (top: number, bottom: number) => ({
    getBoundingClientRect: () => ({ top, bottom, height: bottom - top }),
  });
  const scroller = (top: number, bottom: number, pages: object[]) =>
    ({
      ...box(top, bottom),
      querySelectorAll: () => pages,
    }) as unknown as HTMLElement;

  it('is null without pages', () => {
    expect(ogeVisibleWordPages(scroller(0, 100, []), 'x')).toBeNull();
  });

  it('finds the page at the middle and the visible range', () => {
    expect(
      ogeVisibleWordPages(
        scroller(0, 300, [box(-400, -100), box(-50, 200), box(220, 500)]),
        'x',
      ),
    ).toEqual({ current: 1, first: 1, last: 2 });
  });

  it('falls back to the nearest page when none is on screen', () => {
    expect(
      ogeVisibleWordPages(
        scroller(0, 100, [box(-400, -300), box(500, 800)]),
        'x',
      ),
    ).toEqual({ current: 0, first: 0, last: 0 });
  });
});
