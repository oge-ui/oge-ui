/**
 * Line breaking and vertical layout against PowerPoint. The measurer uses
 * the word widths PowerPoint reported, so a difference here is a difference
 * in the rules, never in a font rasteriser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OgeSlideShape, OgeSlide } from './model';
import { OGE_EMU_PER_POINT, readOgePptxSync } from './read-pptx';
import {
  ogeLayoutSlideText,
  type OgeSlideFont,
  type OgeSlideTextMeasurer,
} from './text-layout';

interface Line {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Shape {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text: { paragraphs: { lines: Line[] }[] } | null;
}
interface Capture {
  slides: { index: number; shapes: Shape[] }[];
  metrics: Record<
    string,
    {
      overhead: number;
      space: number;
      height: number;
      words: Record<string, number>;
    }
  >;
}

const folder = resolve(__dirname, '../../../testing/corpus/pptx');
const capture = JSON.parse(
  readFileSync(resolve(folder, 'slides.powerpoint.json'), 'utf8'),
) as Capture;
const { presentation } = readOgePptxSync(
  new Uint8Array(readFileSync(resolve(folder, 'slides.pptx'))),
);

const metricsOf = (font: OgeSlideFont) => {
  const key = `${font.family}|${font.size}|${Number(font.bold)}|${Number(font.italic)}`;
  const entry = capture.metrics[key];
  if (!entry) throw new Error(`no metrics for ${key}`);
  return entry;
};

/** PowerPoint's own numbers; the bullet glyph is not in the table. */
const measurer: OgeSlideTextMeasurer = {
  width(text, font) {
    const entry =
      capture.metrics[
        `${font.family}|${font.size}|${Number(font.bold)}|${Number(font.italic)}`
      ];
    if (!entry) return 0;
    return text
      .split(/( +)/)
      .filter(Boolean)
      .reduce(
        (sum, part) =>
          sum +
          (part.trim() === ''
            ? part.length * entry.space
            : (entry.words[part] ?? entry.overhead) - entry.overhead),
        0,
      );
  },
  extent(font) {
    const { height } = metricsOf(font);
    return { ascent: height * 0.75, descent: height * 0.25 };
  },
};

const element = (slide: OgeSlide, name: string): OgeSlideShape => {
  const found = slide.elements.find((e) => e.name === name);
  if (found?.kind !== 'shape') throw new Error(`no shape ${name}`);
  return found;
};

describe('ogeLayoutSlideText against PowerPoint', () => {
  for (const slide of capture.slides) {
    for (const shape of slide.shapes) {
      if (!shape.text) continue;
      const expected = shape.text.paragraphs.flatMap((p) => p.lines);
      describe(`slide ${slide.index} ${shape.name}`, () => {
        const model = element(presentation.slides[slide.index - 1], shape.name);
        const lines = ogeLayoutSlideText(
          model.text ?? ({} as never),
          model.frame.width / OGE_EMU_PER_POINT,
          model.frame.height / OGE_EMU_PER_POINT,
          measurer,
        );

        it('breaks the lines where PowerPoint does', () => {
          expect(
            lines.map((l) => l.fragments.map((f) => f.text).join('')),
          ).toEqual(expected.map((l) => l.text));
        });

        it('starts each line where PowerPoint does', () => {
          lines.forEach((line, i) => {
            expect(shape.left + line.x).toBeCloseTo(expected[i].left, 0);
          });
        });

        it('stacks the lines where PowerPoint does', () => {
          lines.forEach((line, i) => {
            const bottom = expected[i].top + expected[i].height;
            // PowerPoint rounds a last line's box by up to a quarter point
            expect(
              Math.abs(shape.top + line.top + line.height - bottom),
            ).toBeLessThan(0.3);
          });
        });
      });
    }
  }
});
