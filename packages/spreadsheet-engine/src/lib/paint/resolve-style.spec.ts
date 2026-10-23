import { createOgeWorkbook } from '../model/workbook';
import type { OgeBorderStyle, OgePatternType } from '../model/style';
import { ogeFormatLocale } from '../format/format-locale';
import {
  OgeStyleResolver,
  ogeBorderRank,
  ogeFontFamily,
} from './resolve-style';

describe('ogeFontFamily', () => {
  it('adds a metric-compatible substitute and a generic family', () => {
    expect(ogeFontFamily('Calibri')).toBe('"Calibri", Carlito, sans-serif');
    expect(ogeFontFamily('Times New Roman')).toBe(
      '"Times New Roman", "Liberation Serif", Tinos, serif',
    );
    expect(ogeFontFamily('Consolas')).toBe('"Consolas", monospace');
    expect(ogeFontFamily('My "Odd" Font')).toBe('"My Odd Font", sans-serif');
  });
});

describe('OgeStyleResolver', () => {
  it('resolves fonts over the Normal font, theme faces and colours', () => {
    const workbook = createOgeWorkbook();
    workbook.themeFonts = { major: 'Cambria', minor: 'Calibri' };
    const resolver = new OgeStyleResolver(workbook);
    expect(resolver.normalFont).toMatchObject({
      name: 'Calibri',
      sizePt: 11,
      maxDigitWidth: 7,
      lineHeight: 20,
      color: '#000000',
    });
    const heading = resolver.font({
      scheme: 'major',
      size: 18,
      bold: true,
      italic: true,
      color: { theme: 4 },
    });
    expect(heading).toMatchObject({
      name: 'Cambria',
      sizePt: 18,
      bold: true,
      italic: true,
      color: '#4472C4',
    });
    expect(heading.css).toBe('italic bold 24px "Cambria", Caladea, serif');
    expect(resolver.font({ vertAlign: 'superscript' }).css).toBe(
      '9.9px "Calibri", Carlito, sans-serif',
    );
    expect(resolver.font({ color: { auto: true } }).color).toBeNull();
    expect(resolver.font({ color: { indexed: 64 } }).color).toBeNull();
    expect(resolver.font({ underline: 'double', strike: true })).toMatchObject({
      underline: 'double',
      strike: true,
    });
    // fonts are cached
    expect(resolver.font({ size: 12 })).toBe(resolver.font({ size: 12 }));
  });

  it('turns every pattern into a CSS background with a representative colour', () => {
    const resolver = new OgeStyleResolver(createOgeWorkbook());
    const patterns: OgePatternType[] = [
      'solid',
      'mediumGray',
      'darkGray',
      'lightGray',
      'darkHorizontal',
      'darkVertical',
      'darkDown',
      'darkUp',
      'darkGrid',
      'darkTrellis',
      'lightHorizontal',
      'lightVertical',
      'lightDown',
      'lightUp',
      'lightGrid',
      'lightTrellis',
      'gray125',
      'gray0625',
    ];
    for (const pattern of patterns) {
      const fill = resolver.fill({
        type: 'pattern',
        pattern,
        fgColor: { rgb: 'FF000000' },
        bgColor: { rgb: 'FFFFFFFF' },
      });
      expect(fill?.css.length).toBeGreaterThan(0);
      expect(fill?.color).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(
      resolver.fill({
        type: 'pattern',
        pattern: 'mediumGray',
        fgColor: { rgb: 'FF000000' },
        bgColor: { rgb: 'FFFFFFFF' },
      })?.color,
    ).toBe('#808080');
    expect(resolver.fill({ type: 'pattern', pattern: 'none' })).toBeNull();
    expect(resolver.fill(undefined)).toBeNull();
    expect(resolver.fill({ type: 'pattern', pattern: 'solid' })?.css).toBe(
      '#000000',
    );
  });

  it('draws linear and path gradients', () => {
    const resolver = new OgeStyleResolver(createOgeWorkbook());
    const stops = [
      { position: 0, color: { rgb: 'FFFFFFFF' } },
      { position: 1, color: { rgb: 'FF4472C4' } },
    ];
    expect(
      resolver.fill({ type: 'gradient', gradient: 'linear', degree: 90, stops })
        ?.css,
    ).toBe('linear-gradient(180deg, #FFFFFF 0%, #4472C4 100%)');
    expect(
      resolver.fill({
        type: 'gradient',
        gradient: 'path',
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
        stops,
      })?.css,
    ).toBe(
      'radial-gradient(farthest-corner at 50% 50%, #FFFFFF 0%, #4472C4 100%)',
    );
  });

  it('ranks, sizes and dashes border edges as Excel draws them', () => {
    const resolver = new OgeStyleResolver(createOgeWorkbook());
    const order: OgeBorderStyle[] = [
      'hair',
      'dashDotDot',
      'dashDot',
      'dotted',
      'dashed',
      'thin',
      'mediumDashDotDot',
      'slantDashDot',
      'mediumDashDot',
      'mediumDashed',
      'medium',
      'thick',
      'double',
    ];
    expect(order.map(ogeBorderRank)).toEqual(order.map((_, i) => i + 1));
    expect(
      resolver.edge({ style: 'thick', color: { rgb: 'FFFF0000' } }),
    ).toEqual({
      style: 'thick',
      color: '#FF0000',
      width: 3,
      dash: [],
      rank: 12,
    });
    expect(resolver.edge({ style: 'dashDot' })).toMatchObject({
      width: 1,
      dash: [9, 3, 3, 3],
      color: null,
    });
    expect(resolver.edge(undefined)).toBeNull();
  });

  it('resolves number formats, built-ins through the locale', () => {
    const workbook = createOgeWorkbook();
    const tr = new OgeStyleResolver(workbook, {
      locale: { ...ogeFormatLocale('tr-TR'), builtins: { 44: '0.00 "TL"' } },
    });
    expect(
      tr.numberFormat({ numberFormatId: 14, numberFormat: 'm/d/yyyy' })?.code,
    ).toBe(ogeFormatLocale('tr-TR').shortDate);
    expect(
      tr.numberFormat({ numberFormatId: 44, numberFormat: 'x' })?.code,
    ).toBe('0.00 "TL"');
    expect(
      tr.numberFormat({ numberFormatId: 3, numberFormat: '#,##0' })?.code,
    ).toBe('#,##0');
    expect(tr.numberFormat({ numberFormatId: 30 })).toBeNull();
    expect(tr.numberFormat({ numberFormat: 'General' })).toBeNull();
    expect(tr.numberFormat({})).toBeNull();
  });

  it('resolves alignment, protection and merges differential formats', () => {
    const workbook = createOgeWorkbook();
    const id = workbook.styles.intern({
      alignment: {
        horizontal: 'justify',
        indent: 1,
        textRotation: 90,
        readingOrder: 'rtl',
        shrinkToFit: true,
      },
      protection: { hidden: true },
      numberFormat: 'h:mm AM/PM',
      numberFormatId: 18,
      quotePrefix: true,
      border: { top: { style: 'thin' } },
    });
    const resolver = new OgeStyleResolver(workbook);
    const style = resolver.get(id);
    expect(style).toMatchObject({
      horizontal: 'justify',
      wrap: true,
      // shrink and wrap exclude each other; justify wraps
      shrink: true,
      indent: 1,
      rotation: 90,
      readingOrder: 'rtl',
      formulaHidden: true,
      localeMarkers: true,
      quotePrefix: true,
      visibleWhenEmpty: true,
    });
    expect(resolver.get(id)).toBe(style);
    const patched = resolver.withPatch(id, {
      font: { bold: true },
      border: { bottom: { style: 'double' } },
    });
    expect(patched.font.bold).toBe(true);
    expect(patched.top?.style).toBe('thin');
    expect(patched.bottom?.style).toBe('double');
    expect(resolver.withPatch(undefined, {}).visibleWhenEmpty).toBe(false);
  });
});

describe('OgeStyleResolver — named faces over a theme Normal font', () => {
  it('keeps a font that names its face out of the theme', async () => {
    const { createOgeWorkbook } = await import('../model/workbook');
    const workbook = createOgeWorkbook();
    workbook.defaultFont = { ...workbook.defaultFont, scheme: 'minor' };
    workbook.themeFonts = { ...workbook.themeFonts, minor: 'Aptos Narrow' };
    const resolver = new OgeStyleResolver(workbook);
    expect(resolver.font({ name: 'Arial' }).name).toBe('Arial');
    expect(resolver.font({ bold: true }).name).toBe('Aptos Narrow');
    expect(resolver.font({ name: 'Calibri', scheme: 'minor' }).name).toBe(
      'Aptos Narrow',
    );
    // the same face with and without a scheme are two fonts, not one cached
    expect(resolver.font({ name: 'Cambria', scheme: 'minor' }).name).toBe(
      'Aptos Narrow',
    );
    expect(resolver.font({ name: 'Cambria' }).name).toBe('Cambria');
  });

  it('gives a rich-text run that names its face that face, over a theme cell font', async () => {
    const { createOgeWorkbook } = await import('../model/workbook');
    const workbook = createOgeWorkbook();
    workbook.defaultFont = { ...workbook.defaultFont, scheme: 'minor' };
    workbook.themeFonts = { ...workbook.themeFonts, minor: 'Aptos Narrow' };
    const resolver = new OgeStyleResolver(workbook);
    const cell = resolver.font({ size: 12 });
    expect(cell.name).toBe('Aptos Narrow');
    // Excel writes rFont per run: the cell's theme does not carry over
    const run = resolver.runFont(cell, { name: 'Cambria', italic: true });
    expect([run.name, run.sizePt, run.italic]).toEqual(['Cambria', 12, true]);
    // a run with its own scheme, or no face, keeps the theme's
    expect(
      resolver.runFont(cell, { name: 'Calibri', scheme: 'minor' }).name,
    ).toBe('Aptos Narrow');
    expect(resolver.runFont(cell, { bold: true }).name).toBe('Aptos Narrow');
    // and a run over a cell in a named face keeps that face
    const arial = resolver.font({ name: 'Arial' });
    expect(resolver.runFont(arial, { bold: true }).name).toBe('Arial');
  });
});
