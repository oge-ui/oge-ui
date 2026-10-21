import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ogeSheetHeaders } from './viewport';

interface HeaderSample {
  readonly font: string;
  readonly size: number;
  readonly zoom: number;
  readonly lastVisibleRow: number;
  readonly width: number;
  readonly height: number;
}

// Measured off Excel's own window by testing/tools/header-capture.ps1: the
// row-number column's width and the letter row's height per Normal font,
// zoom and the last row in view (1-based, as Excel reports it).
const samples = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../testing/captures/headers.json'),
    'utf8',
  ),
) as HeaderSample[];

describe('header sizes against Excel', () => {
  it('covers six Normal fonts, zoom 50–200% and three to seven digits', () => {
    expect(new Set(samples.map((s) => `${s.font} ${s.size}`)).size).toBe(6);
    expect(
      new Set(samples.map((s) => String(s.lastVisibleRow).length)),
    ).toEqual(new Set([3, 4, 5, 6, 7]));
    expect(samples.length).toBeGreaterThan(150);
  });

  it.each(
    samples.map(
      (s) =>
        [
          `${s.font} ${s.size}pt at ${s.zoom}%, row ${s.lastVisibleRow}`,
          s,
        ] as const,
    ),
  )('%s', (_, s) => {
    const headers = ogeSheetHeaders(
      { name: s.font, sizePt: s.size },
      s.zoom,
      s.lastVisibleRow - 1,
    );
    expect({
      width: headers.rowHeaderWidth,
      height: headers.columnHeaderHeight,
    }).toEqual({
      width: s.width,
      height: s.height,
    });
  });
});
