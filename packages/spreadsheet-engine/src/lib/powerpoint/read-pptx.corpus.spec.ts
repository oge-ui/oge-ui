/**
 * The reader against what PowerPoint itself reports for a deck it created
 * (testing/tools/pptx-capture.ps1, PowerPoint 16.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  OgeSlide,
  OgeSlideElement,
  OgeSlideFill,
  OgeSlideShape,
  OgeSlideTable,
} from './model';
import { OGE_EMU_PER_POINT, readOgePptx, readOgePptxSync } from './read-pptx';

interface CapturedLine {
  text: string;
}
interface CapturedParagraph {
  text: string;
  level: number;
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: number;
  bullet: boolean;
  lines: CapturedLine[];
}
interface CapturedShape {
  name: string;
  type: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  fillVisible?: boolean;
  fill?: string;
  fillTransparency?: number;
  lineVisible?: boolean;
  line?: string;
  lineWeight?: number;
  lineDash?: number;
  text: {
    anchor: number;
    marginLeft: number;
    marginTop: number;
    wordWrap: boolean;
    paragraphs: CapturedParagraph[];
  } | null;
  table?: {
    columns: number[];
    rows: {
      height: number;
      cells: { text: string; fill: string; font: string; bold: boolean }[];
    }[];
  };
  items?: CapturedShape[];
}
interface Capture {
  slideWidth: number;
  slideHeight: number;
  slides: {
    index: number;
    layout: string;
    hidden: boolean;
    background: string;
    shapes: CapturedShape[];
  }[];
}

const folder = resolve(__dirname, '../../../testing/corpus/pptx');
const capture = JSON.parse(
  readFileSync(resolve(folder, 'slides.powerpoint.json'), 'utf8'),
) as Capture;
const file = readFileSync(resolve(folder, 'slides.pptx'));
const { presentation, issues } = readOgePptxSync(new Uint8Array(file));

const flat = (shapes: CapturedShape[]): CapturedShape[] =>
  shapes.flatMap((s) => (s.items ? s.items : [s]));
const ALIGN: Readonly<Record<number, string>> = { 1: 'l', 2: 'ctr', 3: 'r' };
const ANCHOR: Readonly<Record<number, string>> = { 1: 't', 3: 'ctr', 4: 'b' };
const pts = (emu: number): number => emu / OGE_EMU_PER_POINT;
const solid = (fill: OgeSlideFill): string | undefined =>
  fill.kind === 'solid' ? fill.color.rgb : undefined;

function element(slide: OgeSlide, name: string): OgeSlideElement {
  const found = slide.elements.find((e) => e.name === name);
  if (!found) throw new Error(`no element ${name}`);
  return found;
}

/** Channel distance between two `RRGGBB` values. */
function distance(a: string, b: string): number {
  return Math.max(
    ...[0, 2, 4].map((i) =>
      Math.abs(
        parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16),
      ),
    ),
  );
}

describe('readOgePptx against PowerPoint', () => {
  it('reads the slide size and every slide', () => {
    expect(pts(presentation.width)).toBe(capture.slideWidth);
    expect(pts(presentation.height)).toBe(capture.slideHeight);
    expect(presentation.slides.map((s) => s.layoutName)).toEqual(
      capture.slides.map((s) => s.layout),
    );
    expect(presentation.slides.map((s) => s.hidden)).toEqual(
      capture.slides.map((s) => s.hidden),
    );
  });

  it('has nothing to report for this deck', () => {
    expect(issues).toEqual([]);
  });

  it('gives the async reader the same result', async () => {
    const result = await readOgePptx(new Uint8Array(file));
    expect(result.presentation.slides).toEqual(presentation.slides);
  });

  it('resolves backgrounds through the master', () => {
    presentation.slides.forEach((slide, i) => {
      expect(solid(slide.background)).toBe(capture.slides[i].background);
    });
  });

  for (const slide of capture.slides) {
    for (const shape of flat(slide.shapes)) {
      const model = (): OgeSlideElement =>
        element(presentation.slides[slide.index - 1], shape.name);

      describe(`slide ${slide.index} ${shape.name}`, () => {
        it('sits where PowerPoint puts it', () => {
          const { frame } = model();
          expect(pts(frame.x)).toBeCloseTo(shape.left, 2);
          expect(pts(frame.y)).toBeCloseTo(shape.top, 2);
          expect(pts(frame.width)).toBeCloseTo(shape.width, 2);
          expect(pts(frame.height)).toBeCloseTo(shape.height, 2);
          expect(frame.rotation).toBeCloseTo(shape.rotation, 3);
          expect(frame.flipH).toBe(shape.flipH);
          expect(frame.flipV).toBe(shape.flipV);
        });

        if (shape.fillVisible !== undefined) {
          it('has PowerPoint’s fill and outline', () => {
            const m = model() as OgeSlideShape;
            if (shape.fillVisible) {
              expect(solid(m.fill)).toBe(shape.fill);
              const alpha =
                m.fill.kind === 'solid' ? m.fill.color.alpha : undefined;
              expect(alpha).toBeCloseTo(1 - (shape.fillTransparency ?? 0), 3);
            } else {
              expect(m.fill.kind).toBe('none');
            }
            if (shape.lineVisible) {
              expect(m.line).not.toBeNull();
              expect(solid(m.line?.fill ?? { kind: 'none' })).toBe(shape.line);
              expect(pts(m.line?.width ?? 0)).toBeCloseTo(
                shape.lineWeight ?? 0,
                3,
              );
            } else {
              expect(m.line).toBeNull();
            }
          });
        }

        if (shape.text) {
          const captured = shape.text;
          it('has PowerPoint’s resolved text', () => {
            const body = (model() as OgeSlideShape).text;
            expect(body?.anchor).toBe(ANCHOR[captured.anchor]);
            expect(pts(body?.insets.left ?? 0)).toBeCloseTo(
              captured.marginLeft,
              3,
            );
            expect(pts(body?.insets.top ?? 0)).toBeCloseTo(
              captured.marginTop,
              3,
            );
            expect(body?.wrap).toBe(captured.wordWrap);
            expect(body?.paragraphs).toHaveLength(captured.paragraphs.length);
            captured.paragraphs.forEach((p, i) => {
              const m = body?.paragraphs[i];
              const run = m?.runs[0];
              expect(m?.runs.map((r) => r.text).join('')).toBe(p.text);
              expect((m?.level ?? 0) + 1).toBe(p.level);
              expect(m?.align).toBe(ALIGN[p.align]);
              expect(m?.bullet.kind !== 'none').toBe(p.bullet);
              expect(run?.font).toBe(p.font);
              expect(run?.size).toBe(p.size);
              expect(run?.bold).toBe(p.bold);
              expect(run?.italic).toBe(p.italic);
              expect(run?.color.rgb).toBe(p.color);
            });
          });
        }

        if (shape.table) {
          const captured = shape.table;
          it('has PowerPoint’s table grid and cell styles', () => {
            const m = model() as OgeSlideTable;
            expect(m.columns.map(pts)).toEqual(captured.columns);
            expect(m.rows.map((r) => pts(r.height))).toEqual(
              captured.rows.map((r) => r.height),
            );
            captured.rows.forEach((row, r) => {
              row.cells.forEach((cell, c) => {
                const got = m.rows[r].cells[c];
                const run = got.text.paragraphs[0]?.runs[0];
                expect(run?.text).toBe(cell.text);
                expect(run?.bold).toBe(cell.bold);
                expect(run?.color.rgb).toBe(cell.font);
                // PowerPoint's tint rounding is within one level per channel
                expect(
                  distance(solid(got.fill) ?? '000000', cell.fill),
                ).toBeLessThanOrEqual(1);
              });
            });
          });
        }
      });
    }
  }

  it('keeps the picture bytes', () => {
    const picture = element(presentation.slides[3], 'picture');
    if (picture.kind !== 'picture') throw new Error('not a picture');
    const media = presentation.media.get(picture.picture.media);
    expect(media?.contentType).toBe('image/png');
    expect(media?.bytes[1]).toBe(0x50); // the P of the PNG signature
  });
});

describe('readOgePptx refusals', () => {
  it('refuses a legacy or encrypted container', () => {
    const ole = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0,
    ]);
    expect(() => readOgePptxSync(ole)).toThrowError(
      expect.objectContaining({ code: 'encrypted-or-legacy' }),
    );
  });

  it('refuses what is not a package', () => {
    expect(() => readOgePptxSync(new Uint8Array(64))).toThrowError(
      expect.objectContaining({ name: 'OgePptxError' }),
    );
  });
});
