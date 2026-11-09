/**
 * Charts, SmartArt, free-form outlines, effects and vertical text in a deck
 * PowerPoint built itself.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OgeSlideElement, OgeSlideShape } from './model';
import { readOgePptxSync } from './read-pptx';
import { ogeRenderSlide, ogeSlideCustomPath } from './render';
import type { OgeSlideTextMeasurer } from './text-layout';

const { presentation, issues } = readOgePptxSync(
  new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/pptx/more.pptx')),
  ),
);
const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size, descent: font.size * 0.2 }),
};
const named = (slide: number, name: string): OgeSlideElement => {
  const found = presentation.slides[slide].elements.find(
    (e) => e.name === name,
  );
  if (!found) throw new Error(`no element ${name}`);
  return found;
};
const shape = (slide: number, name: string): OgeSlideShape =>
  named(slide, name) as OgeSlideShape;

describe('readOgePptx: the rest of a deck', () => {
  it('has nothing to report', () => {
    expect(issues).toEqual([]);
  });

  it('reads a free-form outline', () => {
    const free = shape(1, 'free');
    expect(free.geometry).toBe('custom');
    const path = free.customPaths?.[0];
    expect(path?.commands.map((c) => c.op)).toEqual(['M', 'L', 'C', 'Z']);
    if (path) expect(ogeSlideCustomPath(path, 200, 160)).toMatch(/^M0 0 L/);
  });

  it('reads an outer shadow', () => {
    const shadow = shape(1, 'shadowed').shadow;
    expect(shadow?.color).toEqual({ rgb: '000000', alpha: 0.5 });
    expect(shadow?.direction).toBeCloseTo(45, 0);
  });

  it('reads a pattern fill', () => {
    expect(shape(1, 'pattern').fill).toMatchObject({
      kind: 'pattern',
      preset: 'ltDnDiag',
    });
  });

  it('keeps the text direction', () => {
    expect(shape(1, 'vertical').text?.vertical).toBe('vert');
    expect(shape(1, 'vertical270').text?.vertical).toBe('vert270');
  });

  it('reads a chart and gives its empty title the automatic text', () => {
    const chart = named(2, 'chart');
    if (chart.kind !== 'chart') throw new Error('not a chart');
    expect(chart.chart.groups[0].series).toHaveLength(3);
    expect(chart.chart.title?.text?.text).toBe('Chart Title');
  });

  it('draws SmartArt from the shapes PowerPoint cached', () => {
    const texts = presentation.slides[3].elements.flatMap((e) =>
      e.kind === 'shape' ? (e.text?.paragraphs[0].runs[0].text ?? []) : [],
    );
    expect(texts).toEqual(['Plan', 'Build', 'Ship']);
  });

  it('turns every slide into drawing instructions', () => {
    for (const slide of presentation.slides) {
      const render = ogeRenderSlide(presentation, slide, measurer, {
        idPrefix: 't',
      });
      expect(render.nodes.length).toBeGreaterThan(1);
    }
  });
});
