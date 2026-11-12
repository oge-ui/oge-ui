/**
 * Shapes against Excel: `testing/corpus/shapes.xlsx` was drawn and saved by
 * Excel (`testing/tools/shapes-capture.ps1`) — a small flowchart and every
 * flowchart preset — and `shapes.excel.json` holds what
 * Excel's object model reported for each shape. Reading the file must find
 * every one, with Excel's preset, box, text, dash and arrowheads, and report
 * nothing as not shown.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OgeWorksheet } from '../model/worksheet';
import type { OgeSlideShape } from '../powerpoint/model';
import { ogeRenderDrawing } from '../powerpoint/render';
import { ogeAnchorBox } from '../paint/pictures';
import { OgeStyleResolver } from '../paint/resolve-style';
import { OgeSheetLayout } from '../paint/sheet-layout';
import {
  captureLocale,
  gdiCalibriMeasurer,
  readCapture,
  type CaptureEnvironment,
} from '../../testing/excel-capture';
import { readOgeXlsxSync } from './read-xlsx';

interface CapturedShape {
  readonly name: string;
  readonly type: number;
  readonly autoShapeType: number;
  readonly connector: boolean;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Degrees; Excel reports the frame before it is turned. */
  readonly rotation: number;
  readonly text?: string;
  readonly lineDash?: number;
  readonly beginArrow?: number;
  readonly endArrow?: number;
  readonly items?: readonly string[];
}

interface Captured {
  readonly sheets: readonly {
    readonly name: string;
    readonly shapes: readonly CapturedShape[];
  }[];
}

const corpus = (file: string) =>
  resolve(__dirname, `../../../testing/corpus/${file}`);
const captured = JSON.parse(
  readFileSync(corpus('shapes.excel.json'), 'utf8'),
) as Captured;
const { workbook, issues } = readOgeXlsxSync(
  readFileSync(corpus('shapes.xlsx')),
);
const resolver = new OgeStyleResolver(workbook, {
  locale: captureLocale(
    readCapture<CaptureEnvironment>('captures', 'environment.json'),
  ),
});
const measurer = gdiCalibriMeasurer();

/** `MsoAutoShapeType` of the flowchart set → the DrawingML preset Excel writes. */
const PRESETS: Readonly<Record<number, string>> = {
  1: 'rect',
  61: 'flowChartProcess',
  62: 'flowChartAlternateProcess',
  63: 'flowChartDecision',
  64: 'flowChartInputOutput',
  65: 'flowChartPredefinedProcess',
  66: 'flowChartInternalStorage',
  67: 'flowChartDocument',
  68: 'flowChartMultidocument',
  69: 'flowChartTerminator',
  70: 'flowChartPreparation',
  71: 'flowChartManualInput',
  72: 'flowChartManualOperation',
  73: 'flowChartConnector',
  74: 'flowChartOffpageConnector',
  75: 'flowChartPunchedCard',
  76: 'flowChartPunchedTape',
  77: 'flowChartSummingJunction',
  78: 'flowChartOr',
  79: 'flowChartCollate',
  80: 'flowChartSort',
  81: 'flowChartExtract',
  82: 'flowChartMerge',
  83: 'flowChartOnlineStorage',
  84: 'flowChartDelay',
  85: 'flowChartMagneticTape',
  86: 'flowChartMagneticDisk',
  87: 'flowChartMagneticDrum',
  88: 'flowChartDisplay',
};
/** `MsoArrowheadStyle` → the `headEnd` / `tailEnd` type. */
const ARROWS: Readonly<Record<number, string | undefined>> = {
  1: undefined,
  2: 'triangle',
  3: 'arrow',
  4: 'stealth',
  5: 'diamond',
  6: 'oval',
};
/** `MsoLineDashStyle` → the preset dash. */
const DASHES: Readonly<Record<number, string>> = { 1: 'solid', 4: 'dash' };

const textOf = (shape: OgeSlideShape): string =>
  (shape.text?.paragraphs ?? [])
    .map((p) => p.runs.map((r) => r.text).join(''))
    .join('\r');

describe.each(captured.sheets)('corpus shapes.xlsx › $name', (expected) => {
  const sheet = workbook.sheet(expected.name) as OgeWorksheet;
  const layout = new OgeSheetLayout(sheet, resolver, { measurer });
  const byName = new Map(sheet.shapes.map((s) => [s.name, s]));

  it('reads every shape, with nothing reported as not shown', () => {
    expect(sheet.shapes.map((s) => s.name)).toEqual(
      expected.shapes.map((s) => s.name),
    );
    expect(issues.filter((i) => i.code === 'drawing-not-shown')).toEqual([]);
  });

  it('puts each shape in the box Excel reports', () => {
    for (const shape of expected.shapes) {
      const box = ogeAnchorBox(layout, byName.get(shape.name)!.anchor);
      const px = (points: number) => Math.round((points * 4) / 3);
      // a quarter turn swaps the frame's sides about its centre
      const quarter = shape.rotation % 180 === 90;
      const turned = quarter
        ? {
            left: shape.left + (shape.width - shape.height) / 2,
            top: shape.top + (shape.height - shape.width) / 2,
            width: shape.height,
            height: shape.width,
          }
        : shape;
      expect({ name: shape.name, box: rounded(box) }).toEqual({
        name: shape.name,
        box: {
          x: near(box.x, px(turned.left)),
          y: near(box.y, px(turned.top)),
          width: near(box.width, px(turned.width)),
          height: near(box.height, px(turned.height)),
        },
      });
    }
  });

  it("matches Excel's preset, text, dash and arrowheads", () => {
    for (const shape of expected.shapes) {
      const model = byName.get(shape.name)!;
      if (shape.items) {
        // a group: its items, each drawn
        expect(model.elements.map((e) => e.name)).toEqual(shape.items);
        continue;
      }
      const element = model.elements[0] as OgeSlideShape;
      expect(model.elements).toHaveLength(1);
      if (shape.connector) {
        expect(element.geometry).toMatch(/Connector/);
      } else if (PRESETS[shape.autoShapeType]) {
        expect({ name: shape.name, geometry: element.geometry }).toEqual({
          name: shape.name,
          geometry: PRESETS[shape.autoShapeType],
        });
      }
      if (shape.text !== undefined) expect(textOf(element)).toBe(shape.text);
      if (shape.lineDash !== undefined && DASHES[shape.lineDash])
        expect(element.line?.dash).toBe(DASHES[shape.lineDash]);
      if (shape.beginArrow !== undefined)
        expect(element.line?.head?.type).toBe(ARROWS[shape.beginArrow]);
      if (shape.endArrow !== undefined)
        expect(element.line?.tail?.type).toBe(ARROWS[shape.endArrow]);
    }
  });

  it('draws every shape, connectors ending in their arrowheads', () => {
    const fixed = {
      width: (text: string, font: { size: number }) =>
        text.length * font.size * 0.5,
      extent: (font: { size: number }) => ({
        ascent: font.size * 0.9,
        descent: font.size * 0.2,
      }),
    };
    for (const shape of sheet.shapes) {
      const view = ogeRenderDrawing(
        shape.elements,
        shape.width,
        shape.height,
        fixed,
        {
          idPrefix: 't',
        },
      );
      expect(view.nodes.length).toBeGreaterThan(0);
      const element = shape.elements[0];
      if (element.kind !== 'shape' || !element.line) continue;
      const heads = Number(!!element.line.head) + Number(!!element.line.tail);
      // the outline plus one node per arrowhead
      const paths = view.nodes.filter((n) => n.kind === 'path');
      expect(paths.length).toBeGreaterThanOrEqual(1 + heads);
    }
  });
});

function rounded(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/** Excel's value when ours is within 2 px of it (anchors snap to whole EMUs). */
function near(actual: number, excel: number): number {
  return Math.abs(Math.round(actual) - excel) <= 2 ? Math.round(actual) : excel;
}
