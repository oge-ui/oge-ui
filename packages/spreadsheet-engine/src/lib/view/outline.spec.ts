import { createOgeWorkbook } from '../model/workbook';
import type { OgeWorksheet } from '../model/worksheet';
import {
  ogeApplyOutlineEdit,
  ogeAxisOutline,
  ogeOutlineGutter,
  ogeOutlineLevel,
  ogeOutlineToggle,
} from './outline';

/** The corpus's Main sheet: rows 13–18 at level 1 with 15–16 at level 2, summaries below; columns E:F at level 1. */
function grouped(): OgeWorksheet {
  const sheet = createOgeWorkbook().sheets[0];
  for (const row of [12, 13, 14, 15, 16, 17])
    sheet.setRow(row, { outlineLevel: row === 14 || row === 15 ? 2 : 1 });
  sheet.setColumns(4, 5, { width: 12, outlineLevel: 1 });
  return sheet;
}

const hidden = (sheet: OgeWorksheet) =>
  [12, 13, 14, 15, 16, 17].filter((row) => sheet.getRow(row)?.hidden);

describe('ogeAxisOutline', () => {
  it('finds each level’s runs, their summaries and the level buttons', () => {
    const rows = ogeAxisOutline(grouped(), 'rows');
    expect(rows.buttons).toBe(3);
    expect(rows.groups).toEqual([
      { level: 1, first: 12, last: 17, summary: 18, collapsed: false },
      { level: 2, first: 14, last: 15, summary: 16, collapsed: false },
    ]);
    const cols = ogeAxisOutline(grouped(), 'columns');
    expect(cols.buttons).toBe(2);
    expect(cols.groups).toEqual([
      { level: 1, first: 4, last: 5, summary: 6, collapsed: false },
    ]);
    // 12 px a level button, plus two: the measured gutter
    expect(ogeOutlineGutter(rows)).toBe(38);
    expect(
      ogeOutlineGutter(ogeAxisOutline(createOgeWorkbook().sheets[0], 'rows')),
    ).toBe(0);
  });

  it('puts summaries before their details when the sheet says so, and none past its edge', () => {
    const sheet = grouped();
    sheet.outline = { summaryBelow: false, summaryRight: true };
    expect(ogeAxisOutline(sheet, 'rows').groups[0]).toMatchObject({
      summary: 11,
    });
    sheet.setColumns(16383, 16383, { outlineLevel: 1 });
    expect(ogeAxisOutline(sheet, 'columns').groups.at(-1)).toMatchObject({
      first: 16383,
      summary: -1,
    });
  });

  it('reads a collapsed group from its summary, or from details a file only hid', () => {
    const sheet = grouped();
    sheet.setRow(18, { collapsed: true });
    expect(ogeAxisOutline(sheet, 'rows').groups[0].collapsed).toBe(true);
    const plain = grouped();
    for (const row of [14, 15])
      plain.setRow(row, { outlineLevel: 2, hidden: true });
    expect(
      ogeAxisOutline(plain, 'rows').groups.map((g) => g.collapsed),
    ).toEqual([false, true]);
  });
});

describe('outline edits', () => {
  it('collapses a group and expands it again, keeping its inner groups as they were', () => {
    const sheet = grouped();
    const toggle = (index: number) => {
      const outline = ogeAxisOutline(sheet, 'rows');
      ogeApplyOutlineEdit(
        sheet,
        'rows',
        ogeOutlineToggle(outline, outline.groups[index]),
      );
    };
    toggle(0);
    expect(hidden(sheet)).toEqual([12, 13, 14, 15, 16, 17]);
    expect(sheet.getRow(18)?.collapsed).toBe(true);
    // the inner group is hidden by the outer one, not collapsed itself
    expect(ogeAxisOutline(sheet, 'rows').groups[1].collapsed).toBe(false);
    toggle(0);
    expect(hidden(sheet)).toEqual([]);
    expect(sheet.getRow(18)).toBeUndefined();
    // collapse the inner one, then the outer one, then expand the outer one
    toggle(1);
    toggle(0);
    toggle(0);
    expect(hidden(sheet)).toEqual([14, 15]);
    expect(sheet.getRow(16)).toEqual({ outlineLevel: 1, collapsed: true });
  });

  it('shows a level: deeper rows hide, their groups collapse', () => {
    const sheet = grouped();
    const outline = ogeAxisOutline(sheet, 'rows');
    ogeApplyOutlineEdit(
      sheet,
      'rows',
      ogeOutlineLevel(sheet, 'rows', outline, 2),
    );
    expect(hidden(sheet)).toEqual([14, 15]);
    ogeApplyOutlineEdit(
      sheet,
      'rows',
      ogeOutlineLevel(sheet, 'rows', outline, 1),
    );
    expect(hidden(sheet)).toEqual([12, 13, 14, 15, 16, 17]);
    ogeApplyOutlineEdit(
      sheet,
      'rows',
      ogeOutlineLevel(sheet, 'rows', outline, 3),
    );
    expect(hidden(sheet)).toEqual([]);
    expect(sheet.getRow(18)).toBeUndefined();
    // columns: a level hides the column records, keeping their widths
    const cols = ogeAxisOutline(sheet, 'columns');
    ogeApplyOutlineEdit(
      sheet,
      'columns',
      ogeOutlineLevel(sheet, 'columns', cols, 1),
    );
    expect(sheet.getColumn(4)).toEqual({
      width: 12,
      outlineLevel: 1,
      hidden: true,
    });
    expect(sheet.getColumn(6)).toEqual({ collapsed: true });
  });
});
