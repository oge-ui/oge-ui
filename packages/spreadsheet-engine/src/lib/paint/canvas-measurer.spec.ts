import { ogeCreateCanvasMeasurer } from './canvas-measurer';
import { OgeStyleResolver } from './resolve-style';
import { createOgeWorkbook } from '../model/workbook';

const font = new OgeStyleResolver(createOgeWorkbook()).normalFont;

describe('ogeCreateCanvasMeasurer', () => {
  const global = globalThis as { OffscreenCanvas?: unknown };
  afterEach(() => {
    delete global.OffscreenCanvas;
  });

  it('is null without OffscreenCanvas (Node, old browsers)', () => {
    expect(ogeCreateCanvasMeasurer()).toBeNull();
  });

  it('is null when the canvas has no 2D context or throws', () => {
    global.OffscreenCanvas = class {
      getContext() {
        return null;
      }
    };
    expect(ogeCreateCanvasMeasurer()).toBeNull();
    global.OffscreenCanvas = class {
      constructor() {
        throw new Error('blocked');
      }
    };
    expect(ogeCreateCanvasMeasurer()).toBeNull();
  });

  it('measures with the paint font and caches per font and text', () => {
    const calls: string[] = [];
    const fonts: string[] = [];
    global.OffscreenCanvas = class {
      getContext() {
        const context = {
          _font: '',
          get font() {
            return this._font;
          },
          set font(value: string) {
            fonts.push(value);
            this._font = value;
          },
          measureText(text: string) {
            calls.push(text);
            return { width: text.length * 7.5 };
          },
        };
        return context;
      }
    };
    const measurer = ogeCreateCanvasMeasurer();
    expect(measurer).not.toBeNull();
    expect(measurer?.measure('', font)).toBe(0);
    expect(measurer?.measure('abcd', font)).toBe(30);
    expect(measurer?.measure('abcd', font)).toBe(30);
    expect(measurer?.measure('ab', { ...font, css: 'bold 15px Carlito' })).toBe(
      15,
    );
    expect(calls).toEqual(['abcd', 'ab']);
    // the context's font is only set when it changes
    expect(fonts).toEqual([font.css, 'bold 15px Carlito']);
  });
});
