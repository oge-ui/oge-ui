import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPlainSpreadsheetReactivity } from '../view/reactivity';
import type { OgeSlideTextMeasurer } from '../powerpoint/text-layout';
import {
  OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
  OgeWordDocumentCore,
  resolveOgeWordDocumentConfig,
  type OgeWordDocumentCoreOptions,
} from './viewer-core';

const file = new Uint8Array(
  readFileSync(
    resolve(__dirname, '../../../testing/corpus/docx/document.docx'),
  ),
);
const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.47,
  extent: (font) => ({ ascent: font.size * 0.95, descent: font.size * 0.25 }),
};

const makeCore = (extra: Partial<OgeWordDocumentCoreOptions> = {}) =>
  new OgeWordDocumentCore({
    reactivity: createPlainSpreadsheetReactivity(),
    messages: OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
    idPrefix: 'test',
    measurer,
    ...extra,
  });

const press = (core: OgeWordDocumentCore, key: string) => {
  const preventDefault = vi.fn();
  core.keydown({ key, preventDefault });
  return preventDefault;
};

describe('OgeWordDocumentCore', () => {
  it('opens a document and reports it', async () => {
    const onLoaded = vi.fn();
    const core = makeCore({ onLoaded });
    await core.load(file);
    expect(core.status()).toBe('ready');
    expect(core.pageCount()).toBeGreaterThan(1);
    expect(onLoaded.mock.calls[0][0].pageCount).toBe(core.pageCount());
    expect(core.currentLabel()).toBe(`Page 1 of ${core.pageCount()}`);
  });

  it('asks the layer to scroll and tracks the page', async () => {
    const scrollToPage = vi.fn();
    const onPageChange = vi.fn();
    const core = makeCore({ scrollToPage, onPageChange });
    await core.load(file);
    expect(core.canGoBack()).toBe(false);
    press(core, 'PageDown');
    expect(scrollToPage).toHaveBeenLastCalledWith(1);
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    press(core, 'End');
    expect(core.index()).toBe(core.pageCount() - 1);
    expect(core.canGoForward()).toBe(false);
    press(core, 'Home');
    expect(core.index()).toBe(0);
  });

  it('leaves arrows to native scrolling', async () => {
    const core = makeCore();
    await core.load(file);
    expect(press(core, 'ArrowDown')).not.toHaveBeenCalled();
  });

  it('draws only pages near the viewport', async () => {
    const core = makeCore();
    await core.load(file);
    core.viewport({ current: 4, first: 4, last: 4 });
    expect(core.isDrawn(4)).toBe(true);
    expect(core.isDrawn(2)).toBe(true);
    expect(core.isDrawn(0)).toBe(false);
  });

  it('says why an old or encrypted file cannot open', async () => {
    const onLoadError = vi.fn();
    const core = makeCore({ onLoadError });
    await core.load(
      new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    );
    expect(core.status()).toBe('error');
    expect(core.errorText()).toBe(
      OGE_DEFAULT_WORD_DOCUMENT_MESSAGES.encryptedOrLegacy,
    );
    expect(onLoadError.mock.calls[0][0].code).toBe('encrypted-or-legacy');
  });

  it('keeps only the newest load', async () => {
    const onLoaded = vi.fn();
    const core = makeCore({ onLoaded });
    const first = core.load(file);
    const second = core.load(null);
    await Promise.all([first, second]);
    expect(core.status()).toBe('empty');
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('merges config messages over the defaults', () => {
    const config = resolveOgeWordDocumentConfig({
      messages: { nextPage: 'Sonraki' },
    });
    expect(config.messages.nextPage).toBe('Sonraki');
    expect(config.messages.previousPage).toBe('Previous page');
  });
});
