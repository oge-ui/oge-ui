import type { OgeSlideTextMeasurer } from '../powerpoint/text-layout';
import { ogeLayoutWordDocument } from './layout';
import type {
  OgeWordBlock,
  OgeWordCell,
  OgeWordDocument,
  OgeWordInline,
  OgeWordParagraph,
  OgeWordRunStyle,
  OgeWordTable,
} from './model';

const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size * 0.8, descent: font.size * 0.2 }),
};

const style: OgeWordRunStyle = {
  font: 'Calibri',
  size: 10,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  caps: false,
  color: '000000',
  background: null,
  vertAlign: 'baseline',
};

const text = (value: string): OgeWordInline => ({
  kind: 'text',
  text: value,
  style,
});

function paragraph(
  inlines: OgeWordInline[],
  extra: Partial<OgeWordParagraph> = {},
): OgeWordParagraph {
  return {
    kind: 'paragraph',
    styleId: 'Normal',
    align: 'left',
    left: 0,
    right: 0,
    first: 0,
    before: 0,
    after: 0,
    line: { rule: 'auto', value: 240 },
    keepNext: false,
    keepLines: false,
    widowControl: true,
    pageBreakBefore: false,
    contextualSpacing: false,
    tabs: [],
    shading: null,
    borders: {},
    label: null,
    inlines,
    mark: style,
    ...extra,
  };
}

function documentOf(
  blocks: OgeWordBlock[],
  extra: Partial<OgeWordDocument> = {},
): OgeWordDocument {
  return {
    sections: [
      {
        page: {
          width: 300,
          height: 200,
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
          header: 10,
          footer: 10,
          columns: 1,
          columnGap: 0,
        },
        type: 'nextPage',
        titlePage: false,
        headers: {},
        footers: {},
        blocks,
      },
    ],
    defaultTab: 36,
    evenAndOddHeaders: false,
    footnotes: new Map(),
    endnotes: new Map(),
    media: new Map(),
    ...extra,
  };
}

const layout = (document: OgeWordDocument) =>
  ogeLayoutWordDocument(document, measurer, {
    idPrefix: 't',
    fontFamily: (name) => name,
  });

const cell = (blocks: OgeWordBlock[]): OgeWordCell => ({
  columnSpan: 1,
  verticalMerge: 'none',
  shading: null,
  borders: {},
  margins: { left: 0, top: 0, right: 0, bottom: 0 },
  verticalAlign: 'top',
  blocks,
});

function tableOf(lines: number, cantSplit: boolean): OgeWordTable {
  return {
    kind: 'table',
    columns: [260],
    indent: 0,
    align: 'left',
    rows: [
      {
        height: 0,
        heightRule: 'auto',
        header: false,
        cantSplit,
        skipBefore: 0,
        cells: [
          cell(
            Array.from({ length: lines }, (_, i) =>
              paragraph([text(`line ${i}`)]),
            ),
          ),
        ],
      },
    ],
  };
}

const textsOf = (page: { render: { nodes: readonly unknown[] } }) =>
  (page.render.nodes as { kind: string; text?: string }[])
    .filter((node) => node.kind === 'text')
    .map((node) => node.text);

describe('table rows across pages', () => {
  it('runs a tall row over the page, each cell keeping its lines in order', () => {
    const pages = layout(documentOf([tableOf(30, false)]));
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.flatMap(textsOf);
    expect(all).toEqual(Array.from({ length: 30 }, (_, i) => `line ${i}`));
  });

  it('keeps a row marked cantSplit whole', () => {
    const pages = layout(
      documentOf([
        ...Array.from({ length: 8 }, (_, i) => paragraph([text(`p${i}`)])),
        tableOf(8, true),
      ]),
    );
    const second = textsOf(pages[1]);
    expect(second).toContain('line 0');
    expect(second).toContain('line 7');
    expect(textsOf(pages[0])).not.toContain('line 0');
  });
});

describe('endnotes', () => {
  it('follows the last paragraph, numbered in lower-case roman', () => {
    const pages = layout(
      documentOf(
        [paragraph([text('Body'), { kind: 'endnote', id: '2', style }])],
        {
          endnotes: new Map([
            ['2', [paragraph([text('\u0001'), text(' The note')])]],
          ]),
        },
      ),
    );
    const all = textsOf(pages[pages.length - 1]);
    expect(all.join(' ')).toContain('Body');
    expect(all).toContain('i');
    expect(all.join('')).toContain('The note');
  });
});

describe('floating shapes', () => {
  const float = (wrap: 'square' | 'none'): OgeWordInline => ({
    kind: 'float',
    float: {
      shape: {
        geometry: 'rect',
        adjust: {},
        fill: 'FF0000',
        line: null,
        blocks: [paragraph([text('Inside')])],
        insets: { left: 2, top: 2, right: 2, bottom: 2 },
        anchor: 'top',
      },
      width: 100,
      height: 40,
      horizontal: { from: 'column', offset: 160, align: null },
      vertical: { from: 'paragraph', offset: 0, align: null },
      wrap,
      behind: false,
      distance: { left: 0, top: 0, right: 0, bottom: 0 },
    },
  });
  const words = 'word '.repeat(30);

  it('draws the shape and its text', () => {
    const pages = layout(documentOf([paragraph([float('none'), text('x')])]));
    expect(textsOf(pages[0])).toContain('Inside');
    const nodes = pages[0].render.nodes as {
      kind: string;
      fill?: { paint: string } | null;
    }[];
    expect(nodes.some((n) => n.fill?.paint === '#FF0000')).toBe(true);
  });

  it('narrows the lines beside a square-wrapped object only', () => {
    const lines = (wrap: 'square' | 'none') =>
      layout(documentOf([paragraph([float(wrap), text(words)])]))[0].lines;
    const wrapped = lines('square');
    const free = lines('none');
    expect(wrapped[0].text.length).toBeLessThan(free[0].text.length);
    expect(wrapped.length).toBeGreaterThan(free.length);
  });
});
