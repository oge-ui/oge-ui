/**
 * The paint model against Excel: border precedence for all 169 pairs of
 * border styles, conditional formatting against the colours Excel reported
 * for each cell (`Range.DisplayFormat`), and row heights of wrapped text.
 */
import { readOgeXlsxSync } from '../codec/read-xlsx';
import { parseOgeCellAddress } from '../address/address';
import { createOgeWorkbook } from '../model/workbook';
import type { OgeBorderStyle } from '../model/style';
import type { OgeWorksheet } from '../model/worksheet';
import { readCapture } from '../../testing/excel-capture';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { OGE_ESTIMATING_MEASURER } from './cell-text';
import { OgeConditionalFormatter } from './conditional';
import { ogePaintWindow } from './paint-window';
import { ogePlacePictures } from './pictures';
import { OgeStyleResolver } from './resolve-style';
import { OgeSheetLayout } from './sheet-layout';
import { OGE_EN_US_FORMAT_LOCALE } from '../format/format-locale';

interface Winner {
  readonly first: OgeBorderStyle;
  readonly second: OgeBorderStyle;
  readonly horizontal: 'first' | 'second';
  readonly vertical: 'first' | 'second';
}

const winners = readCapture<Winner[]>('captures', 'border-precedence.json');

const paintOptions = {
  measurer: OGE_ESTIMATING_MEASURER,
  locale: OGE_EN_US_FORMAT_LOCALE,
  dateSystem: '1900' as const,
};

describe('border precedence', () => {
  it.each(winners.map((w) => [w.first, w.second, w] as const))(
    '%s against %s',
    (_first, _second, { first, second, horizontal, vertical }) => {
      const workbook = createOgeWorkbook();
      const sheet = workbook.sheets[0];
      const right = workbook.styles.intern({
        border: { right: { style: first, color: { rgb: 'FFFF0000' } } },
      });
      const left = workbook.styles.intern({
        border: { left: { style: second, color: { rgb: 'FF0000FF' } } },
      });
      const bottom = workbook.styles.intern({
        border: { bottom: { style: first, color: { rgb: 'FFFF0000' } } },
      });
      const top = workbook.styles.intern({
        border: { top: { style: second, color: { rgb: 'FF0000FF' } } },
      });
      sheet.setCell(0, 0, { value: 1, style: right });
      sheet.setCell(0, 1, { value: 2, style: left });
      sheet.setCell(2, 0, { value: 1, style: bottom });
      sheet.setCell(3, 0, { value: 2, style: top });
      const resolver = new OgeStyleResolver(workbook);
      const layout = new OgeSheetLayout(sheet, resolver);
      const cells = ogePaintWindow(
        sheet,
        layout,
        resolver,
        { top: 0, left: 0, bottom: 4, right: 2 },
        paintOptions,
      );
      const at = (row: number, col: number) =>
        cells.find((c) => c.row === row && c.col === col);
      const h = at(0, 0)?.right ? 'first' : at(0, 1)?.left ? 'second' : 'none';
      const v = at(2, 0)?.bottom ? 'first' : at(3, 0)?.top ? 'second' : 'none';
      // exactly one of the two draws the shared edge
      expect(!!at(0, 0)?.right).not.toBe(!!at(0, 1)?.left);
      expect({ horizontal: h, vertical: v }).toEqual({ horizontal, vertical });
    },
  );
});

interface CapturedCell {
  readonly a: string;
  readonly cfFill?: string;
  readonly cfFont?: string;
  readonly cfBold?: boolean;
}

describe('conditional formatting as Excel displays it', () => {
  const bytes = new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/structure.xlsx')),
  );
  const { workbook } = readOgeXlsxSync(bytes);
  const sheet = workbook.sheet('CF') as OgeWorksheet;
  const captured = readCapture<{
    sheets: { name: string; cells: CapturedCell[] }[];
  }>('corpus', 'structure.excel.json');
  const cells = captured.sheets.find((s) => s.name === 'CF')?.cells ?? [];
  const resolver = new OgeStyleResolver(workbook);
  const formatter = new OgeConditionalFormatter(workbook, sheet, resolver);

  it('captured every cell', () => {
    expect(
      cells.filter((c) => c.cfFill !== undefined).length,
    ).toBeGreaterThanOrEqual(90);
  });

  it('gives each cell the fill, font colour and weight Excel shows', () => {
    const mismatches: string[] = [];
    for (const item of cells) {
      const ref = parseOgeCellAddress(item.a);
      if (!ref || ref.row === 0 || item.cfFill === undefined) continue;
      // data bars and icons are drawn, not reported by DisplayFormat
      if (ref.col === 6 || ref.col === 7) continue;
      const cell = sheet.getCell(ref.row, ref.col);
      const paint = formatter.paint(ref.row, ref.col, cell);
      const style = paint?.style ?? resolver.get(cell?.style);
      const fill = (paint?.fill ?? style.fill)?.color.slice(1) ?? 'FFFFFF';
      const font = style.font.color?.slice(1) ?? '000000';
      const ours = { fill, font, bold: style.font.bold };
      const excel = { fill: item.cfFill, font: item.cfFont, bold: item.cfBold };
      if (JSON.stringify(ours) !== JSON.stringify(excel))
        mismatches.push(
          `${item.a}: Excel ${JSON.stringify(excel)}, ours ${JSON.stringify(ours)}`,
        );
    }
    expect(mismatches).toEqual([]);
  });

  it('draws data bars and icons for every number in their ranges', () => {
    for (let row = 1; row <= 10; row++) {
      const bar = formatter.paint(row, 6, sheet.getCell(row, 6))?.dataBar;
      expect(bar?.to).toBeGreaterThan(0);
      const icon = formatter.paint(row, 7, sheet.getCell(row, 7))?.icon;
      expect(icon?.set).toBe('3Arrows');
    }
    // the lowest value gets the shortest bar, the highest the longest
    const length = (row: number) =>
      formatter.paint(row, 6, sheet.getCell(row, 6))?.dataBar?.to ?? 0;
    expect(length(8)).toBeCloseTo(0.1); // 3, the minimum
    expect(length(9)).toBeCloseTo(0.9); // 99, the maximum
  });
});

describe('row heights of wrapped text', () => {
  const wrap = readCapture<{
    wrap: { fonts: [string, number][]; heightsPx: number[] };
  }>('captures', 'font-metrics.json').wrap;

  it('is the line count times the font row height, as Excel fits it', () => {
    // the corpus's Normal font, Calibri 11: rows are 20 px at least
    const workbook = createOgeWorkbook({
      defaultFont: { name: 'Calibri', size: 11 },
    });
    const sheet = workbook.sheets[0];
    sheet.setColumns(0, 0, { width: 30 });
    let row = 0;
    for (const [name, size] of wrap.fonts) {
      const style = workbook.styles.intern({
        font: { name, size },
        alignment: { wrapText: true },
      });
      for (let lines = 1; lines <= 6; lines++) {
        sheet.setCell(row++, 0, {
          value: Array.from({ length: lines }, (_, i) => `L${i + 1}`).join(
            '\n',
          ),
          style,
        });
      }
    }
    const layout = new OgeSheetLayout(sheet, new OgeStyleResolver(workbook));
    const heights = wrap.heightsPx.map((_, r) => layout.rows.size(r));
    expect(heights).toEqual(wrap.heightsPx.map((h) => Math.round(h)));
  });
});

describe('pictures as Excel places them', () => {
  interface Shape {
    readonly name: string;
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
    readonly alt: string;
  }
  const bytes = new Uint8Array(
    readFileSync(resolve(__dirname, '../../../testing/corpus/pictures.xlsx')),
  );
  const { workbook, issues } = readOgeXlsxSync(bytes);
  const captured = readCapture<{ sheets: { shapes: Shape[] }[] }>(
    'corpus',
    'pictures.excel.json',
  );

  it('reads every picture without an import issue', () => {
    expect(issues).toEqual([]);
    expect(workbook.sheets[0].pictures).toHaveLength(
      captured.sheets[0].shapes.length,
    );
  });

  it('puts each picture where Excel does', () => {
    const sheet = workbook.sheets[0];
    const resolver = new OgeStyleResolver(workbook);
    const placed = ogePlacePictures(sheet, new OgeSheetLayout(sheet, resolver));
    expect(
      placed.map((p) => ({
        name: p.picture.name,
        left: Math.round(p.x),
        top: Math.round(p.y),
        width: Math.round(p.width),
        height: Math.round(p.height),
        rotation: p.picture.rotation ?? 0,
        alt: p.picture.description,
      })),
    ).toEqual(
      captured.sheets[0].shapes.map(
        ({ name, left, top, width, height, rotation, alt }) => ({
          name,
          left,
          top,
          width,
          height,
          rotation,
          alt,
        }),
      ),
    );
    expect(placed[3].picture.crop).toEqual({
      left: 0.25,
      top: 0.1,
      right: 0.25,
      bottom: 0.1,
    });
    // the media are in the opaque parts, ready for an object URL
    expect(
      workbook.opaqueParts.find((p) => p.path === placed[0].picture.image)
        ?.contentType,
    ).toBe('image/png');
  });
});
