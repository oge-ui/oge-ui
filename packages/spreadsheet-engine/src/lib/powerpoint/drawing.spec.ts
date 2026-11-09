/**
 * The drawing paths the corpus decks do not reach: every preset, colour
 * transform, odd frame and malformed input, on small hand-built packages.
 */
import { writeOgeZipSync } from '../zip/zip';
import { ogeCreateSlideCanvasMeasurer } from './canvas-measurer';
import {
  ogeFindSlideColor,
  ogeReadSlideColor,
  type OgeSlideColorContext,
} from './color';
import { parseOgeXmlTree } from '../codec/xml-tree';
import {
  ogeIsSlideGeometryDrawn,
  ogeIsSlideGeometryOpen,
  ogeSlideGeometryPath,
  ogeSlideGeometryTextInsets,
} from './geometry';
import { OGE_MORE_SLIDE_PRESETS, ogeSlideGeometryFaces } from './geometry-more';
import type {
  OgePresentation,
  OgeSlide,
  OgeSlideElement,
  OgeSlideParagraph,
  OgeSlideShape,
  OgeSlideTextBody,
  OgeSlideTextRun,
} from './model';
import { OgePptxError, readOgePptx, readOgePptxSync } from './read-pptx';
import {
  ogeRenderSlide,
  ogeSlideCustomPath,
  ogeSlideFontFamily,
  ogeSlidePatternTile,
} from './render';
import { ogeLayoutSlideText, type OgeSlideTextMeasurer } from './text-layout';

const measurer: OgeSlideTextMeasurer = {
  width: (text, font) => text.length * font.size * 0.5,
  extent: (font) => ({ ascent: font.size, descent: font.size * 0.2 }),
};

const EMU = 12700;

const run = (extra: Partial<OgeSlideTextRun> = {}): OgeSlideTextRun => ({
  text: 'hello world',
  font: 'Calibri',
  size: 10,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  color: { rgb: '000000', alpha: 1 },
  baseline: 0,
  ...extra,
});

const para = (extra: Partial<OgeSlideParagraph> = {}): OgeSlideParagraph => ({
  level: 0,
  align: 'l',
  rtl: false,
  marginLeft: 0,
  indent: 0,
  lineSpacing: { kind: 'percent', value: 100 },
  spaceBefore: { kind: 'points', value: 0 },
  spaceAfter: { kind: 'points', value: 0 },
  bullet: { kind: 'none' },
  runs: [run()],
  endSize: 10,
  ...extra,
});

const body = (extra: Partial<OgeSlideTextBody> = {}): OgeSlideTextBody => ({
  insets: { left: 0, top: 0, right: 0, bottom: 0 },
  anchor: 't',
  wrap: true,
  vertical: 'horz',
  fontScale: 1,
  lineSpacingReduction: 0,
  paragraphs: [para()],
  ...extra,
});

const frame = {
  x: 0,
  y: 0,
  width: 100 * EMU,
  height: 50 * EMU,
  rotation: 0,
  flipH: false,
  flipV: false,
};

const shape = (extra: Partial<OgeSlideShape> = {}): OgeSlideShape => ({
  kind: 'shape',
  name: 's',
  frame,
  geometry: 'rect',
  adjust: {},
  fill: { kind: 'solid', color: { rgb: '112233', alpha: 1 } },
  line: null,
  text: null,
  ...extra,
});

const presentationOf = (
  ...elements: OgeSlideElement[]
): [OgePresentation, OgeSlide] => {
  const slide: OgeSlide = {
    index: 0,
    hidden: false,
    layoutName: '',
    background: { kind: 'none' },
    backdrop: [],
    elements,
  };
  return [
    { width: 400 * EMU, height: 300 * EMU, slides: [slide], media: new Map() },
    slide,
  ];
};

const render = (...elements: OgeSlideElement[]) => {
  const [p, s] = presentationOf(...elements);
  return ogeRenderSlide(p, s, measurer, { idPrefix: 'x' });
};

const context: OgeSlideColorContext = {
  theme: {
    dk1: '000000',
    lt1: 'FFFFFF',
    dk2: '444444',
    lt2: 'EEEEEE',
    accent1: '4472C4',
    accent2: 'ED7D31',
    accent3: 'A5A5A5',
    accent4: 'FFC000',
    accent5: '5B9BD5',
    accent6: '70AD47',
    hlink: '0563C1',
    folHlink: '954F72',
  },
  map: { tx1: 'dk1', bg1: 'lt1' },
};

const color = (xml: string) => ogeReadSlideColor(parseOgeXmlTree(xml), context);

describe('slide colours', () => {
  it.each([
    ['<srgbClr val="abcdef"/>', 'ABCDEF'],
    ['<schemeClr val="tx1"/>', '000000'],
    ['<schemeClr val="accent2"/>', 'ED7D31'],
    ['<sysClr val="windowText" lastClr="123456"/>', '123456'],
    ['<sysClr val="window"/>', 'FFFFFF'],
    ['<sysClr val="other"/>', '000000'],
    ['<prstClr val="red"/>', 'FF0000'],
    ['<hslClr hue="0" sat="100000" lum="50000"/>', 'FF0000'],
    ['<scrgbClr r="100000" g="0" b="0"/>', 'FF0000'],
  ])('reads %s', (xml, rgb) => {
    expect(color(xml)?.rgb).toBe(rgb);
  });

  it('gives up on what it cannot name', () => {
    expect(color('<srgbClr val="nope"/>')).toBeUndefined();
    expect(color('<schemeClr/>')).toBeUndefined();
    expect(color('<schemeClr val="unknown"/>')).toBeUndefined();
    expect(color('<prstClr val="chartreuse"/>')).toBeUndefined();
    expect(color('<other/>')).toBeUndefined();
    expect(color('<schemeClr val="phClr"/>')).toBeUndefined();
  });

  it.each([
    ['<alpha val="50000"/>', 'FF0000', 0.5],
    ['<alphaMod val="50000"/>', 'FF0000', 0.5],
    ['<alphaOff val="-25000"/>', 'FF0000', 0.75],
    ['<inv/>', '00FFFF', 1],
    ['<comp/>', '00FFFF', 1],
    ['<gray/>', '363636', 1],
    ['<satMod val="0"/>', '808080', 1],
    ['<satOff val="-100000"/>', '808080', 1],
    ['<hueMod val="100000"/>', 'FF0000', 1],
    ['<hueOff val="7200000"/>', '00FF00', 1],
    ['<lumOff val="50000"/>', 'FFFFFF', 1],
    ['<unknown/>', 'FF0000', 1],
  ])('applies %s', (transform, rgb, alpha) => {
    expect(color(`<srgbClr val="FF0000">${transform}</srgbClr>`)).toEqual({
      rgb,
      alpha,
    });
  });

  it('defaults missing colour attributes', () => {
    expect(color('<hslClr/>')?.rgb).toBe('000000');
    expect(color('<scrgbClr/>')?.rgb).toBe('000000');
    expect(color('<srgbClr/>')).toBeUndefined();
    expect(color('<prstClr/>')).toBeUndefined();
    expect(color('<srgbClr val="808080"><alpha/></srgbClr>')?.alpha).toBe(0);
    expect(color('<srgbClr val="FF0000"><hueOff/></srgbClr>')?.rgb).toBe(
      'FF0000',
    );
    expect(color('<srgbClr val="FF0000"><lumMod/></srgbClr>')?.rgb).toBe(
      '000000',
    );
  });

  it('turns through each hue sector', () => {
    for (const [hex] of [
      ['00FF00'],
      ['0000FF'],
      ['FFFF00'],
      ['00FFFF'],
      ['FF00FF'],
    ]) {
      expect(
        color(`<srgbClr val="${hex}"><lumMod val="100000"/></srgbClr>`)?.rgb,
      ).toBe(hex);
    }
    expect(
      color('<srgbClr val="000000"><lumMod val="100000"/></srgbClr>')?.rgb,
    ).toBe('000000');
  });

  it('finds the colour among children', () => {
    const parent = parseOgeXmlTree('<a><x/><srgbClr val="010203"/></a>');
    expect(ogeFindSlideColor(parent, context)?.rgb).toBe('010203');
    expect(ogeFindSlideColor(undefined, context)).toBeUndefined();
  });
});

describe('preset outlines', () => {
  const all = [
    ...Object.keys(OGE_MORE_SLIDE_PRESETS),
    'rect',
    'roundRect',
    'ellipse',
    'triangle',
    'rtTriangle',
    'diamond',
    'parallelogram',
    'trapezoid',
    'pentagon',
    'hexagon',
    'octagon',
    'homePlate',
    'chevron',
    'plus',
    'rightArrow',
    'leftArrow',
    'upArrow',
    'downArrow',
    'line',
    'straightConnector1',
  ];

  it.each(all)('%s has an outline in any proportion', (name) => {
    expect(ogeIsSlideGeometryDrawn(name)).toBe(true);
    for (const [w, h] of [
      [120, 60],
      [60, 120],
    ]) {
      expect(ogeSlideGeometryPath(name, w, h, {})).toMatch(/^M/);
    }
  });

  it('points a callout at each edge', () => {
    const at = (adj1: number, adj2: number) =>
      ogeSlideGeometryPath('wedgeRectCallout', 100, 60, { adj1, adj2 });
    expect(at(-20000, -90000)).not.toBe(at(20000, 90000));
    expect(at(-90000, 10000)).not.toBe(at(90000, 10000));
  });

  it('falls back to the box for an unknown preset', () => {
    expect(ogeIsSlideGeometryDrawn('cloud')).toBe(false);
    expect(ogeSlideGeometryPath('cloud', 10, 10, {})).toBe(
      ogeSlideGeometryPath('rect', 10, 10, {}),
    );
  });

  it('knows open outlines, shaded faces and text boxes', () => {
    expect(ogeIsSlideGeometryOpen('bentConnector3')).toBe(true);
    expect(ogeIsSlideGeometryOpen('rect')).toBe(false);
    expect(ogeSlideGeometryFaces('rect', 10, 10, {})).toEqual([]);
    expect(ogeSlideGeometryFaces('cube', 50, 50, {})).toHaveLength(2);
    expect(ogeSlideGeometryFaces('can', 50, 50, {})).toHaveLength(1);
    expect(ogeSlideGeometryFaces('foldedCorner', 50, 50, {})).toHaveLength(1);
    expect(ogeSlideGeometryTextInsets('rect', 10, 10, {}).left).toBe(0);
    expect(
      ogeSlideGeometryTextInsets('ellipse', 100, 100, {}).left,
    ).toBeCloseTo(14.64, 1);
    expect(
      ogeSlideGeometryTextInsets('roundRect', 100, 100, {}).left,
    ).toBeGreaterThan(0);
  });
});

describe('patterns, outlines and fonts', () => {
  it.each(['pct25', 'ltDnDiag', 'dkUpDiag', 'horz', 'vert', 'cross', 'zigZag'])(
    'has a tile for %s',
    (preset) => {
      const tile = ogeSlidePatternTile(preset);
      expect(tile.size).toBeGreaterThan(0);
      expect(tile.d).toMatch(/^M/);
    },
  );

  it('scales every custom path command', () => {
    expect(
      ogeSlideCustomPath(
        {
          width: 100,
          height: 100,
          filled: true,
          stroked: true,
          commands: [
            { op: 'M', x: 0, y: 0 },
            { op: 'L', x: 100, y: 0 },
            { op: 'C', points: [100, 50, 50, 100, 0, 100] },
            { op: 'Q', points: [0, 50, 10, 10] },
            { op: 'A', rx: 10, ry: 10, start: 0, sweep: 270 },
            { op: 'A', rx: 10, ry: 10, start: 0, sweep: -90 },
            { op: 'Z' },
          ],
        },
        200,
        50,
      ),
    ).toMatch(/^M0 0 L200 0 C.* Q.* A.* 0 1 1 .* A.* 0 0 0 .* Z$/);
    expect(
      ogeSlideCustomPath(
        {
          width: 0,
          height: 0,
          filled: true,
          stroked: true,
          commands: [{ op: 'L', x: EMU, y: EMU }],
        },
        10,
        10,
      ),
    ).toBe('L1 1');
  });

  it('adds a metric-compatible family where one exists', () => {
    expect(ogeSlideFontFamily('Calibri')).toBe(
      '"Calibri", "Carlito", sans-serif',
    );
    expect(ogeSlideFontFamily('My"Font')).toBe('"MyFont", sans-serif');
  });
});

describe('ogeRenderSlide', () => {
  it('declares gradients and patterns once each', () => {
    const r = render(
      shape({
        fill: {
          kind: 'gradient',
          angle: 90,
          stops: [
            { position: 0, color: { rgb: '000000', alpha: 1 } },
            { position: 1, color: { rgb: 'FFFFFF', alpha: 0.5 } },
          ],
        },
      }),
      shape({
        fill: { kind: 'gradient', angle: null, stops: [] },
      }),
      shape({
        fill: {
          kind: 'pattern',
          preset: 'pct50',
          foreground: { rgb: '000000', alpha: 1 },
          background: { rgb: 'FFFFFF', alpha: 1 },
        },
      }),
    );
    expect(r.gradients).toHaveLength(1);
    expect(r.gradients[0].transform).toBe('rotate(90 0.5 0.5)');
    expect(r.patterns).toHaveLength(1);
  });

  it('flips the outline but not the text', () => {
    const r = render(
      shape({
        frame: { ...frame, rotation: 45, flipH: true, flipV: true },
        text: body(),
      }),
    );
    const path = r.nodes.filter((n) => n.kind === 'path')[1];
    const text = r.nodes.find((n) => n.kind === 'text');
    expect(path?.transform).toContain('scale(-1 1)');
    expect(path?.transform).toContain('scale(1 -1)');
    expect(text?.transform).toContain('rotate(180');
    expect(text?.transform).not.toContain('scale');
  });

  it('dashes, caps and shadows an outline', () => {
    const r = render(
      shape({
        line: {
          fill: { kind: 'solid', color: { rgb: '000000', alpha: 1 } },
          width: 2 * EMU,
          dash: 'dash',
          cap: 'rnd',
        },
        shadow: {
          blur: 4 * EMU,
          distance: 2 * EMU,
          direction: 0,
          color: { rgb: '102030', alpha: 0.5 },
        },
      }),
    );
    const path = r.nodes[1];
    if (path.kind !== 'path') throw new Error('no path');
    expect(path.dash).toBe('8 6');
    expect(path.cap).toBe('round');
    expect(path.filter).toBe('drop-shadow(2px 0px 1px rgba(16, 32, 48, 0.5))');
  });

  it('draws a picture fill and an outlined, cropped picture', () => {
    const picture = {
      media: 'm',
      crop: { left: 0.1, top: 0, right: 0, bottom: 0.2 },
    };
    const r = render(shape({ fill: { kind: 'picture', picture } }), {
      kind: 'picture',
      name: 'p',
      description: 'alt',
      frame,
      picture,
      line: {
        fill: { kind: 'solid', color: { rgb: '000000', alpha: 1 } },
        width: EMU,
        dash: 'solid',
        cap: 'flat',
      },
    });
    const images = r.nodes.filter((n) => n.kind === 'image');
    expect(images).toHaveLength(2);
    expect(images[1].kind === 'image' && images[1].viewBox).toBe(
      '0.1 0 0.9 0.8',
    );
    expect(images[1].kind === 'image' && images[1].label).toBe('alt');
  });

  it('skips an open line’s fill and stacks a shaded face', () => {
    const open = render(shape({ geometry: 'line' }));
    expect(open.nodes).toHaveLength(1);
    const cube = render(shape({ geometry: 'cube' }));
    expect(cube.nodes.length).toBe(4);
  });

  it('draws a background picture', () => {
    const [p, s] = presentationOf();
    const r = ogeRenderSlide(
      p,
      {
        ...s,
        background: {
          kind: 'picture',
          picture: {
            media: 'm',
            crop: { left: 0, top: 0, right: 0, bottom: 0 },
          },
        },
      },
      measurer,
      { idPrefix: 'x' },
    );
    expect(r.nodes[0].kind).toBe('image');
  });

  it('honours a shape’s own text box', () => {
    const r = render(
      shape({
        text: body(),
        textFrame: { ...frame, x: 10 * EMU, y: 5 * EMU },
      }),
    );
    const text = r.nodes.find((n) => n.kind === 'text');
    expect(text?.kind === 'text' && text.x).toBe(10);
  });

  it('turns vertical text', () => {
    const turned = (vertical: string) =>
      render(shape({ text: body({ vertical }) })).nodes.find(
        (n) => n.kind === 'text',
      )?.transform;
    expect(turned('vert')).toContain('rotate(90)');
    expect(turned('vert270')).toContain('rotate(-90)');
  });

  it('writes text decoration, baseline and links', () => {
    const r = render(
      shape({
        text: body({
          paragraphs: [
            para({
              runs: [
                run({
                  underline: true,
                  strike: true,
                  bold: true,
                  italic: true,
                  baseline: 30,
                  link: 'https://x.example/',
                }),
              ],
            }),
          ],
        }),
      }),
    );
    const text = r.nodes.find((n) => n.kind === 'text');
    if (text?.kind !== 'text') throw new Error('no text');
    expect(text.decoration).toBe('underline line-through');
    expect(text.fontWeight).toBe('bold');
    expect(text.fontStyle).toBe('italic');
    expect(text.fontSize).toBeCloseTo(6.67, 1);
    expect(text.link).toBe('https://x.example/');
  });

  it('draws a table with merged cells, borders and grown rows', () => {
    const cell = (extra = {}) => ({
      fill: { kind: 'solid' as const, color: { rgb: 'EEEEEE', alpha: 1 } },
      text: body({ paragraphs: [para()] }),
      columnSpan: 1,
      rowSpan: 1,
      merged: false,
      borders: {
        left: null,
        top: {
          fill: {
            kind: 'solid' as const,
            color: { rgb: '000000', alpha: 1 },
          },
          width: EMU,
          dash: 'solid',
          cap: 'flat',
        },
        right: null,
        bottom: null,
      },
      ...extra,
    });
    const r = render({
      kind: 'table',
      name: 't',
      frame,
      columns: [20 * EMU, 20 * EMU],
      rows: [
        {
          height: EMU,
          cells: [cell({ columnSpan: 2 }), cell({ merged: true })],
        },
        { height: 40 * EMU, cells: [cell({ rowSpan: 1 }), cell()] },
      ],
    });
    expect(r.nodes.filter((n) => n.kind === 'path').length).toBeGreaterThan(3);
    expect(r.nodes.filter((n) => n.kind === 'text').length).toBeGreaterThan(1);
  });
});

describe('ogeLayoutSlideText', () => {
  const lines = (b: OgeSlideTextBody, w = 200, h = 100) =>
    ogeLayoutSlideText(b, w, h, measurer);

  it('aligns right and centre, and anchors vertically', () => {
    expect(lines(body({ paragraphs: [para({ align: 'r' })] }))[0].x).toBe(145);
    expect(lines(body({ paragraphs: [para({ align: 'ctr' })] }))[0].x).toBe(
      72.5,
    );
    expect(lines(body({ anchor: 'b' }))[0].top).toBeCloseTo(88, 0);
    expect(lines(body({ anchor: 'ctr' }))[0].top).toBeCloseTo(44, 0);
  });

  it('breaks a too-long word and honours forced breaks', () => {
    const long = lines(
      body({
        paragraphs: [para({ runs: [run({ text: 'x'.repeat(30) })] })],
      }),
      40,
    );
    expect(long.length).toBeGreaterThan(1);
    const forced = lines(
      body({
        paragraphs: [
          para({
            runs: [run({ text: 'a' }), run({ text: '\n' }), run({ text: 'b' })],
          }),
        ],
      }),
    );
    expect(forced).toHaveLength(2);
  });

  it('never wraps without wrap, and keeps a word across runs together', () => {
    expect(
      lines(
        body({
          wrap: false,
          paragraphs: [para({ runs: [run({ text: 'a '.repeat(99) })] })],
        }),
        20,
      ),
    ).toHaveLength(1);
    const across = lines(
      body({
        paragraphs: [
          para({
            runs: [
              run({ text: 'aaaaaaa ' }),
              run({ text: 'bbb', bold: true }),
              run({ text: 'ccc' }),
            ],
          }),
        ],
      }),
      60,
    );
    expect(across[1].fragments.map((f) => f.text).join('')).toBe('bbbccc');
  });

  it('applies exact, percent and paragraph spacing, and an empty paragraph', () => {
    const out = lines(
      body({
        paragraphs: [
          para({ lineSpacing: { kind: 'points', value: 30 } }),
          para({
            runs: [],
            endSize: 20,
            spaceBefore: { kind: 'percent', value: 100 },
            spaceAfter: { kind: 'points', value: 3 },
          }),
          para({ spaceBefore: { kind: 'points', value: 2 } }),
        ],
      }),
    );
    expect(out[0].height).toBe(30);
    expect(out[1].top).toBeCloseTo(54, 0);
    expect(out[2].top - out[1].top - out[1].height).toBeCloseTo(5, 0);
  });

  it('scales with autofit', () => {
    const out = lines(body({ fontScale: 0.5, lineSpacingReduction: 0.1 }));
    expect(out[0].fragments[0].font.size).toBe(5);
    expect(out[0].height).toBeCloseTo(6 * 0.9, 3);
  });

  it.each([
    ['arabicPeriod', 1, '1.'],
    ['arabicParenR', 2, '2)'],
    ['arabicParenBoth', 3, '(3)'],
    ['arabicPlain', 4, '4'],
    ['romanLcPeriod', 4, 'iv.'],
    ['romanUcPeriod', 9, 'IX.'],
    ['alphaLcPeriod', 2, 'b.'],
    ['alphaUcPeriod', 3, 'C.'],
  ])('numbers %s', (scheme, startAt, label) => {
    const out = lines(
      body({
        paragraphs: [
          para({
            indent: -18 * EMU,
            marginLeft: 18 * EMU,
            bullet: { kind: 'number', scheme, startAt, size: 100 },
          }),
        ],
      }),
    );
    expect(out[0].bullet?.text).toBe(label);
    expect(out[0].x).toBe(18);
  });

  it('counts consecutive numbers and restarts after a gap', () => {
    const numbered = para({
      bullet: {
        kind: 'number',
        scheme: 'arabicPeriod',
        startAt: 1,
        size: 100,
      },
    });
    const out = lines(
      body({ paragraphs: [numbered, numbered, para(), numbered] }),
    );
    expect(out.flatMap((l) => l.bullet?.text ?? [])).toEqual([
      '1.',
      '2.',
      '1.',
    ]);
  });

  it('gives a character bullet its own font, colour and size', () => {
    const out = lines(
      body({
        paragraphs: [
          para({
            bullet: {
              kind: 'char',
              char: '*',
              font: 'Arial',
              color: { rgb: 'FF0000', alpha: 1 },
              size: 50,
            },
          }),
        ],
      }),
    );
    expect(out[0].bullet?.font.family).toBe('Arial');
    expect(out[0].bullet?.font.size).toBe(5);
    expect(out[0].bullet?.run.color.rgb).toBe('FF0000');
    expect(out[0].x).toBeGreaterThan(0);
  });
});

describe('ogeCreateSlideCanvasMeasurer', () => {
  afterEach(() => vi.unstubAllGlobals());

  const stub = (context: unknown) => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return context;
        }
      },
    );
  };

  it('is null where there is no canvas', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    expect(ogeCreateSlideCanvasMeasurer()).toBeNull();
  });

  it('is null when no context comes back or the canvas throws', () => {
    stub(null);
    expect(ogeCreateSlideCanvasMeasurer()).toBeNull();
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor() {
          throw new Error('nope');
        }
      },
    );
    expect(ogeCreateSlideCanvasMeasurer()).toBeNull();
  });

  it('measures, caches and estimates what the canvas does not report', () => {
    const measureText = vi.fn((text: string) => ({ width: text.length * 2 }));
    stub({ font: '', measureText });
    const m = ogeCreateSlideCanvasMeasurer();
    const font = { family: 'Calibri', size: 10, bold: true, italic: true };
    expect(m?.width('', font)).toBe(0);
    expect(m?.width('ab', font)).toBe(4);
    expect(m?.width('ab', font)).toBe(4);
    expect(measureText).toHaveBeenCalledTimes(1);
    expect(m?.extent(font)).toEqual({ ascent: 9.5, descent: 2.5 });
    m?.extent(font);
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('uses the canvas’s font extents when it has them', () => {
    stub({
      font: '',
      measureText: () => ({
        width: 1,
        fontBoundingBoxAscent: 8,
        fontBoundingBoxDescent: 2,
      }),
    });
    expect(
      ogeCreateSlideCanvasMeasurer()?.extent({
        family: 'x',
        size: 10,
        bold: false,
        italic: false,
      }),
    ).toEqual({ ascent: 8, descent: 2 });
  });
});

// --- a hand-built package ----------------------------------------------------

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const P =
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const R =
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const RT =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const encode = (text: string) => new TextEncoder().encode(text);

const types = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="emf" ContentType="image/x-emf"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`;

const rels = (items: [string, string, string, boolean?][]) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items
    .map(
      ([id, type, target, external]) =>
        `<Relationship Id="${id}" Type="${RT}/${type}" Target="${target}"${external ? ' TargetMode="External"' : ''}/>`,
    )
    .join('')}</Relationships>`;

const spTree = (inner: string) =>
  `<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${inner}</p:spTree></p:cSld>`;

const xfrm = (extra = '') =>
  `<a:xfrm ${extra}><a:off x="12700" y="12700"/><a:ext cx="127000" cy="127000"/></a:xfrm>`;

const sp = (name: string, spPr: string, tx = '') =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="${name}" descr="alt"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm()}${spPr}</p:spPr>${tx}</p:sp>`;

const THEME = `<a:theme ${A} name="t"><a:themeElements><a:clrScheme name="c"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:hlink><a:srgbClr val="0000FF"/></a:hlink></a:clrScheme><a:fontScheme name="f"><a:majorFont><a:latin typeface="Major"/></a:majorFont><a:minorFont><a:latin typeface="Minor"/></a:minorFont></a:fontScheme><a:fmtScheme name="s"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst><a:outerShdw blurRad="12700"><a:schemeClr val="phClr"/></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const MASTER = `<p:sldMaster ${A} ${P}>${spTree(
  `<p:sp><p:nvSpPr><p:cNvPr id="9" name="deco"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm()}<a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="AABBCC"/></a:solidFill></p:spPr></p:sp>`,
)}<p:clrMap bg1="lt1" tx1="dk1"/><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;

function packageOf(
  slide: string,
  extra: Record<string, string> = {},
  slideRels: [string, string, string, boolean?][] = [],
  options: { attributes?: string; bg?: string; layout?: string } = {},
): Uint8Array {
  const files: Record<string, string> = {
    '[Content_Types].xml': types,
    '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
    'ppt/presentation.xml': `<p:presentation ${P} ${R}><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rIdMissing"/></p:sldIdLst></p:presentation>`,
    'ppt/_rels/presentation.xml.rels': rels([
      ['rId2', 'slide', 'slides/slide1.xml'],
    ]),
    'ppt/slides/slide1.xml': `<p:sld ${A} ${P} ${R} ${options.attributes ?? ''}>${options.bg ?? ''}${spTree(slide)}</p:sld>`,
    'ppt/slides/_rels/slide1.xml.rels': rels([
      ['rId1', 'slideLayout', '../slideLayouts/layout1.xml'],
      ...slideRels,
    ]),
    'ppt/slideLayouts/layout1.xml':
      options.layout ?? `<p:sldLayout ${A} ${P}>${spTree('')}</p:sldLayout>`,
    'ppt/slideLayouts/_rels/layout1.xml.rels': rels([
      ['rId1', 'slideMaster', '../slideMasters/master1.xml'],
    ]),
    'ppt/slideMasters/master1.xml': MASTER,
    'ppt/slideMasters/_rels/master1.xml.rels': rels([
      ['rId1', 'theme', '../theme/theme1.xml'],
    ]),
    'ppt/theme/theme1.xml': THEME,
    ...extra,
  };
  return writeOgeZipSync(
    Object.entries(files).map(([name, text]) => ({
      name,
      data: encode(text),
    })),
  );
}

describe('readOgePptx on unusual packages', () => {
  it('refuses a zip that is not a presentation, and a broken main part', () => {
    const bare = writeOgeZipSync([{ name: 'a.txt', data: encode('x') }]);
    expect(() => readOgePptxSync(bare)).toThrowError(
      expect.objectContaining({ code: 'not-pptx' }),
    );
    const broken = writeOgeZipSync([
      { name: '[Content_Types].xml', data: encode(types) },
      {
        name: '_rels/.rels',
        data: encode(
          rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
        ),
      },
      { name: 'ppt/presentation.xml', data: encode('<not') },
    ]);
    expect(() => readOgePptxSync(broken)).toThrowError(
      expect.objectContaining({ code: 'corrupt' }),
    );
  });

  it('accepts a blob and an array buffer, and honours abort', async () => {
    const bytes = packageOf('');
    const blobbed = await readOgePptx({
      arrayBuffer: async () => bytes.slice().buffer,
    } as unknown as Blob);
    expect(blobbed.presentation.slides).toHaveLength(1);
    const copy = bytes.slice().buffer;
    expect((await readOgePptx(copy)).presentation.slides).toHaveLength(1);
    expect(
      readOgePptxSync(bytes.slice().buffer).presentation.slides,
    ).toHaveLength(1);
    const aborted = new AbortController();
    aborted.abort();
    await expect(
      readOgePptx(bytes, { signal: aborted.signal }),
    ).rejects.toBeInstanceOf(OgePptxError);
  });

  it('maps zip limits to too-large', () => {
    expect(() =>
      readOgePptxSync(packageOf(''), { limits: { maxEntries: 1 } }),
    ).toThrowError(expect.objectContaining({ code: 'too-large' }));
  });

  it('reports a missing slide, macros and the master’s shapes', () => {
    const bytes = packageOf('', { 'ppt/vbaProject.bin': 'x' });
    const { presentation, issues } = readOgePptxSync(bytes);
    expect(issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['missing-part', 'macros-kept']),
    );
    expect(presentation.slides[0].backdrop.map((e) => e.name)).toEqual([
      'deco',
    ]);
  });

  it('hides the master’s shapes when asked', () => {
    const { presentation } = readOgePptxSync(
      packageOf('', {}, [], { attributes: 'showMasterSp="0"' }),
    );
    expect(presentation.slides[0].backdrop).toEqual([]);
  });

  it.each([
    ['preset geometry cloud', sp('a', '<a:prstGeom prst="cloud"/>')],
    ['group fill', sp('b', '<a:grpFill/>')],
    [
      'shape without a position',
      '<p:sp><p:nvSpPr><p:cNvPr id="3" name="n"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>',
    ],
    [
      'group',
      '<p:grpSp><p:nvGrpSpPr><p:cNvPr id="4" name="g"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:grpSp>',
    ],
    [
      'ole',
      `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="5" name="o"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>${xfrm().replace(/a:xfrm/g, 'p:xfrm')}<a:graphic><a:graphicData uri="x/ole"/></a:graphic></p:graphicFrame>`,
    ],
    [
      'effect glow',
      sp(
        'c',
        '<a:effectLst><a:glow rad="1"><a:srgbClr val="000000"/></a:glow></a:effectLst>',
      ),
    ],
    [
      'text direction wordArtVert',
      sp(
        't',
        '',
        '<p:txBody><a:bodyPr vert="wordArtVert"/><a:p><a:r><a:t>x</a:t></a:r></a:p></p:txBody>',
      ),
    ],
    [
      'right-to-left paragraph layout',
      sp(
        't',
        '',
        '<p:txBody><a:bodyPr/><a:p><a:pPr rtl="1"/><a:r><a:t>x</a:t></a:r></a:p></p:txBody>',
      ),
    ],
  ])('reports %s', (detail, xml) => {
    const { issues } = readOgePptxSync(packageOf(xml));
    expect(issues.map((i) => i.detail)).toContain(detail);
  });

  it('reads pictures: linked, missing, metafile and embedded', () => {
    const pic = (name: string, blip: string) =>
      `<p:pic><p:nvPicPr><p:cNvPr id="6" name="${name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill>${blip}<a:srcRect l="10000" r="20000"/></p:blipFill><p:spPr>${xfrm()}</p:spPr></p:pic>`;
    const { presentation, issues } = readOgePptxSync(
      packageOf(
        [
          pic('linked', '<a:blip r:link="rId5"/>'),
          pic('none', '<a:blip r:embed="rId404"/>'),
          pic('ext', '<a:blip r:embed="rId7"/>'),
          pic('gone', '<a:blip r:embed="rId8"/>'),
          pic('meta', '<a:blip r:embed="rId9"/>'),
          pic('good', '<a:blip r:embed="rId6"/>'),
        ].join(''),
        { 'ppt/media/a.png': 'PNG', 'ppt/media/b.emf': 'EMF' },
        [
          ['rId6', 'image', '../media/a.png'],
          ['rId7', 'image', 'https://x.example/a.png', true],
          ['rId8', 'image', '../media/missing.png'],
          ['rId9', 'image', '../media/b.emf'],
        ],
      ),
    );
    const codes = issues.map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'external-link',
        'missing-part',
        'picture-format-not-shown',
      ]),
    );
    const good = presentation.slides[0].elements.find((e) => e.name === 'good');
    expect(good?.kind === 'picture' && good.picture.crop.left).toBe(0.1);
  });

  it('applies a style’s fill, line, font and shadow from the theme', () => {
    const { presentation } = readOgePptxSync(
      packageOf(
        `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm()}</p:spPr><p:style><a:lnRef idx="1"><a:srgbClr val="111111"/></a:lnRef><a:fillRef idx="1"><a:srgbClr val="222222"/></a:fillRef><a:effectRef idx="1"><a:srgbClr val="333333"/></a:effectRef><a:fontRef idx="major"><a:srgbClr val="444444"/></a:fontRef></p:style><p:txBody><a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p></p:txBody></p:sp>`,
      ),
    );
    const s = presentation.slides[0].elements[0] as OgeSlideShape;
    expect(s.fill).toEqual({
      kind: 'solid',
      color: { rgb: '222222', alpha: 1 },
    });
    expect(s.line?.width).toBe(6350);
    expect(s.shadow?.color.rgb).toBe('333333');
    expect(s.text?.paragraphs[0].runs[0].font).toBe('Major');
    expect(s.text?.paragraphs[0].runs[0].color.rgb).toBe('444444');
  });

  it('reads text details: links, fields, breaks, bullets, autofit', () => {
    const tx = `<p:txBody><a:bodyPr anchor="b" wrap="none" lIns="0"><a:normAutofit fontScale="50000" lnSpcReduction="10000"/></a:bodyPr><a:lstStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="900"/></a:lvl1pPr></a:lstStyle>
<a:p><a:pPr marL="12700" indent="-12700"><a:lnSpc><a:spcPts val="1200"/></a:lnSpc><a:buClr><a:srgbClr val="FF0000"/></a:buClr><a:buSzPct val="50000"/><a:buFont typeface="+mj-lt"/><a:buChar char="-"/></a:pPr><a:r><a:rPr b="1" i="0" u="sng" strike="sngStrike" baseline="30000"><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill><a:latin typeface="+mn-lt"/><a:hlinkClick r:id="rId6"/></a:rPr><a:t>link</a:t></a:r><a:br/><a:fld id="x" type="slidenum"><a:t>7</a:t></a:fld></a:p>
<a:p><a:pPr><a:buAutoNum type="romanUcPeriod" startAt="3"/></a:pPr><a:r><a:t>n</a:t></a:r><a:endParaRPr sz="500"/></a:p>
<a:p><a:pPr><a:buNone/></a:pPr><a:r><a:rPr u="none" strike="noStrike"><a:hlinkClick r:id="rId7"/></a:rPr><a:t>x</a:t></a:r></a:p>
</p:txBody>`;
    const { presentation } = readOgePptxSync(
      packageOf(sp('t', '', tx), {}, [
        ['rId6', 'hyperlink', 'https://x.example/', true],
        ['rId7', 'slide', 'slide2.xml'],
      ]),
    );
    const body = (presentation.slides[0].elements[0] as OgeSlideShape).text;
    expect(body?.anchor).toBe('b');
    expect(body?.wrap).toBe(false);
    expect(body?.fontScale).toBe(0.5);
    expect(body?.lineSpacingReduction).toBe(0.1);
    const [first, second, third] = body?.paragraphs ?? [];
    expect(first.align).toBe('ctr');
    expect(first.lineSpacing).toEqual({ kind: 'points', value: 12 });
    expect(first.bullet).toMatchObject({
      kind: 'char',
      char: '-',
      font: 'Major',
      size: 50,
    });
    expect(first.runs.map((r) => r.text)).toEqual(['link', '\n', '7']);
    expect(first.runs[0]).toMatchObject({
      link: 'https://x.example/',
      underline: true,
      strike: true,
      bold: true,
      baseline: 30,
      font: 'Minor',
    });
    expect(first.runs[0].color.rgb).toBe('0000FF');
    expect(second.bullet).toMatchObject({
      kind: 'number',
      scheme: 'romanUcPeriod',
      startAt: 3,
    });
    expect(second.endSize).toBe(5);
    expect(third.bullet.kind).toBe('none');
    expect(third.runs[0].link).toBeUndefined();
  });

  it('turns a rotated group’s children about its centre', () => {
    const { presentation } = readOgePptxSync(
      packageOf(
        `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="4" name="g"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm rot="5400000" flipH="1"><a:off x="0" y="0"/><a:ext cx="254000" cy="254000"/><a:chOff x="0" y="0"/><a:chExt cx="127000" cy="127000"/></a:xfrm></p:grpSpPr>${sp('c', '')}</p:grpSp>`,
      ),
    );
    const child = presentation.slides[0].elements[0];
    expect(child.frame.rotation).toBe(90);
    expect(child.frame.width).toBe(254000);
  });

  it('prefers AlternateContent’s fallback and overrides the colour map', () => {
    const { presentation } = readOgePptxSync(
      packageOf(
        `<mc:AlternateContent xmlns:mc="m"><mc:Choice Requires="x">${sp('choice', '')}</mc:Choice><mc:Fallback>${sp('fallback', '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill>')}</mc:Fallback></mc:AlternateContent>`,
        {},
        [],
        { bg: '' },
      ).slice(),
    );
    expect(presentation.slides[0].elements.map((e) => e.name)).toEqual([
      'fallback',
    ]);
  });

  it('inherits a placeholder from its layout and the master’s style', () => {
    const placeholder = (idx: string, position: string) =>
      `<p:sp><p:nvSpPr><p:cNvPr id="2" name="ph"/><p:cNvSpPr/><p:nvPr><p:ph type="dt" idx="${idx}"/></p:nvPr></p:nvSpPr><p:spPr>${position}</p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:t>d</a:t></a:r></a:p></p:txBody></p:sp>`;
    const { presentation } = readOgePptxSync(
      packageOf(placeholder('7', ''), {}, [], {
        layout: `<p:sldLayout ${A} ${P}>${spTree(placeholder('7', xfrm()))}</p:sldLayout>`,
      }),
    );
    const el = presentation.slides[0].elements[0] as OgeSlideShape;
    expect(el.placeholder).toBe('dt');
    expect(el.frame.x).toBe(12700);
    expect(presentation.slides[0].backdrop.map((e) => e.name)).toEqual([
      'deco',
    ]);
  });

  it('reads backgrounds and hidden slides', () => {
    const { presentation } = readOgePptxSync(
      packageOf('', {}, [], {
        attributes: 'show="0"',
        bg: `<p:cSld/>`,
      }).slice(),
    );
    expect(presentation.slides).toHaveLength(1);
  });
});
