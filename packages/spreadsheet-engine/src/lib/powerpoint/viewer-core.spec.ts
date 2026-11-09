import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPlainSpreadsheetReactivity } from '../view/reactivity';
import type { OgeSlide, OgeSlideTextRun } from './model';
import { ogeRenderSlide } from './render';
import type { OgeSlideTextMeasurer } from './text-layout';
import {
  OGE_DEFAULT_PRESENTATION_MESSAGES,
  OgePresentationCore,
  type OgePresentationCoreOptions,
} from './viewer-core';

const deck = new Uint8Array(
  readFileSync(resolve(__dirname, '../../../testing/corpus/pptx/slides.pptx')),
);
const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size, descent: font.size * 0.2 }),
};

function makeCore(extra: Partial<OgePresentationCoreOptions> = {}) {
  return new OgePresentationCore({
    reactivity: createPlainSpreadsheetReactivity(),
    messages: OGE_DEFAULT_PRESENTATION_MESSAGES,
    idPrefix: 'test',
    measurer,
    ...extra,
  });
}

const press = (core: OgePresentationCore, key: string) => {
  const preventDefault = vi.fn();
  core.keydown({ key, preventDefault });
  return preventDefault;
};

describe('OgePresentationCore', () => {
  it('opens a deck and reports it', async () => {
    const onLoaded = vi.fn();
    const core = makeCore({ onLoaded });
    expect(core.status()).toBe('empty');
    await core.load(deck);
    expect(core.status()).toBe('ready');
    expect(core.slideCount()).toBe(5);
    expect(onLoaded).toHaveBeenCalledWith({ slideCount: 5, issues: [] });
    expect(core.currentLabel()).toBe('Slide 1 of 5');
    expect(core.current()?.nodes.length).toBeGreaterThan(0);
  });

  it('moves with the keyboard and stops at the ends', async () => {
    const onSlideChange = vi.fn();
    const core = makeCore({ onSlideChange });
    await core.load(deck);
    expect(core.canGoBack()).toBe(false);
    press(core, 'ArrowRight');
    press(core, 'PageDown');
    expect(core.index()).toBe(2);
    press(core, 'ArrowLeft');
    expect(core.index()).toBe(1);
    press(core, 'End');
    expect(core.index()).toBe(4);
    expect(core.canGoForward()).toBe(false);
    press(core, 'ArrowRight');
    expect(core.index()).toBe(4);
    press(core, 'Home');
    expect(core.index()).toBe(0);
    expect(onSlideChange).toHaveBeenLastCalledWith(0);
  });

  it('takes every navigation key', async () => {
    const core = makeCore();
    await core.load(deck);
    press(core, 'ArrowDown');
    expect(core.index()).toBe(1);
    press(core, 'ArrowUp');
    expect(core.index()).toBe(0);
    press(core, 'PageDown');
    press(core, 'PageUp');
    expect(core.index()).toBe(0);
  });

  it('leaves other keys to the page', async () => {
    const core = makeCore();
    await core.load(deck);
    expect(press(core, 'a')).not.toHaveBeenCalled();
    expect(press(core, 'Home')).toHaveBeenCalled();
  });

  it('honours an index set before the file opened, clamped', async () => {
    const core = makeCore();
    core.go(99);
    await core.load(deck);
    expect(core.index()).toBe(4);
  });

  it('says why an old or encrypted file cannot open', async () => {
    const onLoadError = vi.fn();
    const core = makeCore({ onLoadError });
    await core.load(
      new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    );
    expect(core.status()).toBe('error');
    expect(core.errorText()).toBe(
      OGE_DEFAULT_PRESENTATION_MESSAGES.encryptedOrLegacy,
    );
    expect(onLoadError.mock.calls[0][0].code).toBe('encrypted-or-legacy');
  });

  it('empties on null and keeps only the newest load', async () => {
    const onLoaded = vi.fn();
    const core = makeCore({ onLoaded });
    const first = core.load(deck);
    const second = core.load(null);
    await Promise.all([first, second]);
    expect(core.status()).toBe('empty');
    expect(onLoaded).not.toHaveBeenCalled();
  });
});

describe('ogeRenderSlide links', () => {
  const run = (link: string): OgeSlideTextRun => ({
    text: 'x',
    font: 'Calibri',
    size: 18,
    bold: false,
    italic: false,
    underline: true,
    strike: false,
    color: { rgb: '000000', alpha: 1 },
    baseline: 0,
    link,
  });
  const slide = (link: string): OgeSlide => ({
    index: 0,
    hidden: false,
    layoutName: '',
    background: { kind: 'none' },
    backdrop: [],
    elements: [
      {
        kind: 'shape',
        name: 'a',
        frame: {
          x: 0,
          y: 0,
          width: 1270000,
          height: 1270000,
          rotation: 0,
          flipH: false,
          flipV: false,
        },
        geometry: 'rect',
        adjust: {},
        fill: { kind: 'none' },
        line: null,
        text: {
          insets: { left: 0, top: 0, right: 0, bottom: 0 },
          anchor: 't',
          wrap: true,
          vertical: 'horz',
          fontScale: 1,
          lineSpacingReduction: 0,
          paragraphs: [
            {
              level: 0,
              align: 'l',
              rtl: false,
              marginLeft: 0,
              indent: 0,
              lineSpacing: { kind: 'percent', value: 100 },
              spaceBefore: { kind: 'points', value: 0 },
              spaceAfter: { kind: 'points', value: 0 },
              bullet: { kind: 'none' },
              runs: [run(link)],
              endSize: 18,
            },
          ],
        },
      },
    ],
  });
  const linkOf = (target: string) => {
    const render = ogeRenderSlide(
      { width: 1270000, height: 1270000, slides: [], media: new Map() },
      slide(target),
      measurer,
      { idPrefix: 'x' },
    );
    const node = render.nodes.find((n) => n.kind === 'text');
    return node?.kind === 'text' ? node.link : undefined;
  };

  it('drops a script link and keeps a web link', () => {
    expect(linkOf('javascript:alert(1)')).toBeNull();
    expect(linkOf('https://example.com/a')).toBe('https://example.com/a');
  });
});
