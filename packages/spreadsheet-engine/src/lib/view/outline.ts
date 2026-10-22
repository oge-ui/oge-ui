/**
 * A sheet's outline (ADR 0005, P1b): the row and column groups Excel draws
 * as brackets in a gutter beside the headers, with a button on each group's
 * summary row or column and one level button per outline level — and what
 * clicking them does to the rows and columns. Pure functions over the
 * worksheet model; the grid view places the marks, the core applies them.
 *
 * The gutter is the current Excel's (measured in Excel for the web,
 * 16.0.20611): 12 px per level button, a 13 px button sharing its border with
 * the next, the bracket of level `k` on the centre of button `k`.
 */
import { OGE_SHEET_MAX_COLUMNS, OGE_SHEET_MAX_ROWS } from '../address/address';
import type { OgeWorksheet } from '../model/worksheet';

/** One group of rows or columns — an outline bracket. */
export interface OgeOutlineGroup {
  /** Outline level, 1–7. */
  readonly level: number;
  /** The detail rows or columns, inclusive. */
  readonly first: number;
  readonly last: number;
  /** The summary row or column its button sits on; `-1` when the sheet has none there. */
  readonly summary: number;
  /** The details are hidden (the button shows a plus). */
  readonly collapsed: boolean;
}

/** A sheet's outline along one axis. */
export interface OgeAxisOutline {
  /** Level buttons: the deepest level plus one; 0 without groups. */
  readonly buttons: number;
  /** Every group, outer levels first, each level in order. */
  readonly groups: readonly OgeOutlineGroup[];
  /** Summary rows below their details / columns right of theirs (`outlinePr`). */
  readonly summaryAfter: boolean;
}

/** Pixels per outline level in the gutter. */
export const OGE_OUTLINE_LEVEL_SIZE = 12;

/** The gutter an axis outline takes beside its headers, px: 0 without groups. */
export function ogeOutlineGutter(outline: OgeAxisOutline): number {
  return outline.buttons ? outline.buttons * OGE_OUTLINE_LEVEL_SIZE + 2 : 0;
}

/** The levels set along an axis: index → outline level (1–7), ascending. */
function levelsOf(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
): [number, number][] {
  const out: [number, number][] = [];
  if (axis === 'rows') {
    for (const row of sheet.formattedRows()) {
      const level = sheet.getRow(row)?.outlineLevel ?? 0;
      if (level > 0) out.push([row, Math.min(level, 7)]);
    }
  } else {
    for (const span of sheet.columnSpans()) {
      const level = span.outlineLevel ?? 0;
      if (level <= 0) continue;
      for (let col = span.first; col <= span.last; col++)
        out.push([col, Math.min(level, 7)]);
    }
  }
  return out;
}

function hiddenAt(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
  index: number,
): boolean {
  return axis === 'rows'
    ? !!sheet.getRow(index)?.hidden
    : !!sheet.getColumn(index)?.hidden;
}

function collapsedAt(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
  index: number,
): boolean {
  return axis === 'rows'
    ? !!sheet.getRow(index)?.collapsed
    : !!sheet.getColumn(index)?.collapsed;
}

/**
 * The groups of an axis: each run of consecutive rows (columns) at a level
 * or deeper is a group of that level. A group is collapsed when its summary
 * says so (`collapsed`, as Excel writes it), or — for a file that only hid
 * the rows — when every one of its details is hidden and no group around it
 * is collapsed (inside a collapsed group the details are hidden by that one).
 */
export function ogeAxisOutline(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
): OgeAxisOutline {
  const summaryAfter =
    axis === 'rows' ? sheet.outline.summaryBelow : sheet.outline.summaryRight;
  const levels = levelsOf(sheet, axis);
  const deepest = levels.reduce((max, [, level]) => Math.max(max, level), 0);
  const limit = axis === 'rows' ? OGE_SHEET_MAX_ROWS : OGE_SHEET_MAX_COLUMNS;
  const groups: OgeOutlineGroup[] = [];
  for (let level = 1; level <= deepest; level++) {
    let first = -1;
    let last = -1;
    const close = () => {
      if (first < 0) return;
      const at = summaryAfter ? last + 1 : first - 1;
      const summary = at >= 0 && at < limit ? at : -1;
      let collapsed = summary >= 0 && collapsedAt(sheet, axis, summary);
      if (!collapsed) {
        const start = first;
        const end = last;
        const insideCollapsed = groups.some(
          (g) => g.collapsed && g.first <= start && g.last >= end,
        );
        let hidden = !insideCollapsed;
        for (let i = first; i <= last && hidden; i++)
          hidden = hiddenAt(sheet, axis, i);
        collapsed = hidden;
      }
      groups.push({ level, first, last, summary, collapsed });
      first = -1;
    };
    for (const [index, at] of levels) {
      if (at < level) continue;
      if (first >= 0 && index === last + 1) last = index;
      else {
        close();
        first = index;
        last = index;
      }
    }
    close();
  }
  return { buttons: deepest ? deepest + 1 : 0, groups, summaryAfter };
}

/** A row's or column's new visibility, as `ogeOutlineToggle` / `ogeOutlineLevel` give it. */
export interface OgeOutlineChange {
  readonly index: number;
  readonly hidden: boolean;
}

/** A summary's collapsed flag, as the change records it. */
export interface OgeOutlineSummaryChange {
  readonly index: number;
  readonly collapsed: boolean;
}

/** What a click on an outline button does: the visibility and summary flags that change. */
export interface OgeOutlineEdit {
  readonly visibility: readonly OgeOutlineChange[];
  readonly summaries: readonly OgeOutlineSummaryChange[];
}

/**
 * A group button: an expanded group hides its details; a collapsed one shows
 * them again — except the details of groups inside it that are collapsed
 * themselves, as Excel's Show Detail does.
 */
export function ogeOutlineToggle(
  outline: OgeAxisOutline,
  group: OgeOutlineGroup,
): OgeOutlineEdit {
  const visibility: OgeOutlineChange[] = [];
  if (!group.collapsed) {
    for (let i = group.first; i <= group.last; i++)
      visibility.push({ index: i, hidden: true });
  } else {
    const inner = outline.groups.filter(
      (g) =>
        g.level > group.level &&
        g.collapsed &&
        g.first >= group.first &&
        g.last <= group.last,
    );
    for (let i = group.first; i <= group.last; i++)
      visibility.push({
        index: i,
        hidden: inner.some((g) => i >= g.first && i <= g.last),
      });
  }
  return {
    visibility,
    summaries:
      group.summary >= 0
        ? [{ index: group.summary, collapsed: !group.collapsed }]
        : [],
  };
}

/**
 * A level button: rows (columns) deeper than `level - 1` hide and the others
 * show — level 1 leaves only the outermost summaries, the last level shows
 * everything — and every group at the level or deeper is marked collapsed.
 */
export function ogeOutlineLevel(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
  outline: OgeAxisOutline,
  level: number,
): OgeOutlineEdit {
  const visibility = levelsOf(sheet, axis).map(([index, at]) => ({
    index,
    hidden: at >= level,
  }));
  const summaries = outline.groups
    .filter((g) => g.summary >= 0)
    .map((g) => ({ index: g.summary, collapsed: g.level >= level }));
  return { visibility, summaries };
}

/** Writes an outline edit into the sheet's rows or columns. */
export function ogeApplyOutlineEdit(
  sheet: OgeWorksheet,
  axis: 'rows' | 'columns',
  edit: OgeOutlineEdit,
): void {
  // a flag that turns off is dropped, so records stay as Excel writes them
  const update = (
    index: number,
    patch: { hidden?: true; collapsed?: true },
    key: 'hidden' | 'collapsed',
  ) => {
    if (axis === 'rows') {
      sheet.setRow(index, {
        ...sheet.getRow(index),
        [key]: undefined,
        ...patch,
      });
    } else {
      sheet.setColumns(index, index, {
        ...sheet.getColumn(index),
        [key]: undefined,
        ...patch,
      });
    }
  };
  for (const { index, hidden } of edit.visibility)
    update(index, hidden ? { hidden: true } : {}, 'hidden');
  for (const { index, collapsed } of edit.summaries)
    update(index, collapsed ? { collapsed: true } : {}, 'collapsed');
}
