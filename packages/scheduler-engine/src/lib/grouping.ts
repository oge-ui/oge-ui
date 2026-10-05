/**
 * Resource grouping, framework-free: the `groups` fields resolve to levels
 * (one resource kind each), the levels multiply into leaves (Room A · Ada,
 * Room A · Grace, Room B · Ada, …), and a layout places every
 * (day, leaf) pair in a column — side by side (`horizontal`, resource-major
 * or date-major via `groupByDate`) or as stacked row blocks (`vertical`).
 * The header rows for nested headers come from the same placement, so the
 * views of both render layers draw one structure.
 */
import type {
  OgeSchedulerResource,
  OgeSchedulerResourceItem,
  OgeSchedulerWorkHours,
} from './scheduler-types';

/** One combination of grouped resource items — a column / row / block. */
export interface SchedulerGroupLeaf {
  readonly index: number;
  /** `fieldExpr → id` of every level (the values a create / drop prefills). */
  readonly values: Readonly<Record<string, unknown>>;
  /** The item of each level, outermost first. */
  readonly path: readonly OgeSchedulerResourceItem[];
  /** The innermost item's text. */
  readonly text: string;
  /** Every level's text, outermost first, joined for aria labels. */
  readonly label: string;
  /** The innermost color any level defines. */
  readonly color: string | undefined;
}

/**
 * The grouping levels: each `groups` field naming a resource with items, in
 * `groups` order, each field once.
 */
export function resolveGroupLevels(
  resources: readonly OgeSchedulerResource[],
  groups: readonly string[],
): readonly OgeSchedulerResource[] {
  const levels: OgeSchedulerResource[] = [];
  for (const field of groups) {
    if (levels.some((level) => level.fieldExpr === field)) continue;
    const resource = resources.find((entry) => entry.fieldExpr === field);
    if (resource !== undefined && resource.items.length > 0) {
      levels.push(resource);
    }
  }
  return levels;
}

/** The leaves of the grouping levels (cartesian product); `[]` ungrouped. */
export function buildGroupLeaves(
  levels: readonly OgeSchedulerResource[],
): readonly SchedulerGroupLeaf[] {
  if (levels.length === 0) return [];
  let paths: OgeSchedulerResourceItem[][] = [[]];
  for (const level of levels) {
    const next: OgeSchedulerResourceItem[][] = [];
    for (const path of paths) {
      for (const item of level.items) next.push([...path, item]);
    }
    paths = next;
  }
  return paths.map((path, index) => {
    const values: Record<string, unknown> = {};
    levels.forEach((level, depth) => {
      values[level.fieldExpr] = path[depth].id;
    });
    let color: string | undefined;
    for (let depth = path.length - 1; depth >= 0; depth--) {
      if (path[depth].color !== undefined) {
        color = path[depth].color;
        break;
      }
    }
    return {
      index,
      values,
      path,
      text: path[path.length - 1].text,
      label: path.map((item) => item.text).join(', '),
      color,
    };
  });
}

/**
 * Maps an item to its leaf index (`-1` when an assigned id matches no item
 * of a level). Lookups are nested maps — O(levels) per item, exact on ids
 * of any type.
 */
export function groupLeafMatcher<T>(
  levels: readonly OgeSchedulerResource[],
  leaves: readonly SchedulerGroupLeaf[],
): (item: T) => number {
  if (levels.length === 0) return () => 0;
  type Node = Map<unknown, Node | number>;
  const root: Node = new Map();
  for (const leaf of leaves) {
    let node = root;
    levels.forEach((level, depth) => {
      const id = leaf.values[level.fieldExpr];
      if (depth === levels.length - 1) {
        node.set(id, leaf.index);
        return;
      }
      let child = node.get(id);
      if (!(child instanceof Map)) {
        child = new Map();
        node.set(id, child);
      }
      node = child;
    });
  }
  return (item) => {
    let node: Node | number | undefined = root;
    for (const level of levels) {
      if (!(node instanceof Map)) return -1;
      node = node.get((item as Record<string, unknown>)[level.fieldExpr]);
    }
    return typeof node === 'number' ? node : -1;
  };
}

/** The assigned id of every resource field of an item. */
export function resourceValuesOfItem<T>(
  item: T,
  resources: readonly OgeSchedulerResource[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const resource of resources) {
    const value = (item as Record<string, unknown>)[resource.fieldExpr];
    if (value !== undefined) values[resource.fieldExpr] = value;
  }
  return values;
}

/**
 * A leaf's working hours: the innermost level whose item sets `workHours`
 * gives the hours, the innermost that sets `workDays` the days; a leaf no
 * level configures falls back to the scheduler-wide `workHours`.
 */
export function leafWorkHours(
  leaf: SchedulerGroupLeaf | null | undefined,
  global: OgeSchedulerWorkHours | null,
): OgeSchedulerWorkHours | null {
  if (leaf === null || leaf === undefined) return global;
  let hours: Pick<OgeSchedulerWorkHours, 'start' | 'end'> | undefined;
  let days: readonly number[] | undefined;
  for (let depth = leaf.path.length - 1; depth >= 0; depth--) {
    const item = leaf.path[depth];
    hours ??= item.workHours;
    days ??= item.workDays;
  }
  if (hours === undefined && days === undefined) return global;
  return {
    start: hours?.start ?? global?.start ?? 0,
    end: hours?.end ?? global?.end ?? 24,
    ...((days ?? global?.days) !== undefined
      ? { days: days ?? global?.days }
      : {}),
  };
}

/* ---------- day/week column layout ---------- */

/** One rendered time-grid column of a block: a day, maybe one leaf of it. */
export interface DayWeekColumn {
  readonly day: Date;
  readonly dayIndex: number;
  /** The leaf rendered in this column (`0` ungrouped or vertical). */
  readonly resIndex: number;
  readonly colIndex: number;
  /** The first grouping level's id (the single-level resource id). */
  readonly resourceId: unknown;
  /** The leaf's label (every level's text). */
  readonly resourceText: string;
  /** `fieldExpr → id` of the column's leaf (`{}` ungrouped / vertical). */
  readonly values: Readonly<Record<string, unknown>>;
}

/** Where every (day, leaf) of a day/week view renders. */
export interface DayWeekGroupLayout {
  readonly leaves: readonly SchedulerGroupLeaf[];
  /** Leaves stack as row blocks (`groupOrientation: 'vertical'`). */
  readonly vertical: boolean;
  /** Horizontal leaves sit inside each day (date-major columns). */
  readonly groupByDate: boolean;
  readonly dayCount: number;
  /** `max(1, leaves.length)`. */
  readonly leafCount: number;
  /** Columns of one block. */
  readonly colCount: number;
  /** Stacked blocks (`leafCount` when vertical, else 1). */
  readonly blockCount: number;
  readonly columns: readonly DayWeekColumn[];
}

/** Builds the column layout of a day/week grid. */
export function buildDayWeekGroupLayout(
  days: readonly Date[],
  leaves: readonly SchedulerGroupLeaf[],
  options: { readonly vertical?: boolean; readonly groupByDate?: boolean } = {},
): DayWeekGroupLayout {
  const grouped = leaves.length > 0;
  const vertical = grouped && options.vertical === true;
  const groupByDate = options.groupByDate !== false;
  const dayCount = days.length;
  const leafCount = Math.max(1, leaves.length);
  const perBlockLeaves = grouped && !vertical ? leafCount : 1;
  const colCount = dayCount * perBlockLeaves;
  const columns: DayWeekColumn[] = [];
  for (let colIndex = 0; colIndex < colCount; colIndex++) {
    const dayIndex = groupByDate
      ? Math.floor(colIndex / perBlockLeaves)
      : colIndex % dayCount;
    const resIndex =
      perBlockLeaves === 1
        ? 0
        : groupByDate
          ? colIndex % perBlockLeaves
          : Math.floor(colIndex / dayCount);
    const leaf = grouped && !vertical ? leaves[resIndex] : undefined;
    columns.push({
      day: days[dayIndex],
      dayIndex,
      resIndex,
      colIndex,
      resourceId: leaf?.path[0].id,
      resourceText: leaf?.label ?? '',
      values: leaf?.values ?? {},
    });
  }
  return {
    leaves,
    vertical,
    groupByDate,
    dayCount,
    leafCount,
    colCount,
    blockCount: vertical ? leafCount : 1,
    columns,
  };
}

/** The column and block a (day, leaf) pair renders in. */
export function dayWeekPlacement(
  layout: DayWeekGroupLayout,
  dayIndex: number,
  leafIndex: number,
): { readonly col: number; readonly block: number } {
  const leaf = Math.min(Math.max(0, leafIndex), layout.leafCount - 1);
  if (layout.vertical || layout.leaves.length === 0) {
    return { col: dayIndex, block: layout.vertical ? leaf : 0 };
  }
  return {
    col: layout.groupByDate
      ? dayIndex * layout.leafCount + leaf
      : leaf * layout.dayCount + dayIndex,
    block: 0,
  };
}

/** The leaf a cell at (`colIndex`, `block`) belongs to; `-1` ungrouped. */
export function dayWeekCellLeaf(
  layout: DayWeekGroupLayout,
  colIndex: number,
  block: number,
): number {
  if (layout.leaves.length === 0) return -1;
  return layout.vertical ? block : (layout.columns[colIndex]?.resIndex ?? 0);
}

/** The group values of a cell (`{}` ungrouped). */
export function dayWeekCellValues(
  layout: DayWeekGroupLayout,
  colIndex: number,
  block: number,
): Readonly<Record<string, unknown>> {
  const leaf = dayWeekCellLeaf(layout, colIndex, block);
  return leaf === -1 ? {} : (layout.leaves[leaf]?.values ?? {});
}

/* ---------- nested header rows ---------- */

/** One header cell over `span` columns starting at column `start`. */
export interface SchedulerHeaderCell {
  readonly key: string;
  readonly kind: 'date' | 'group';
  /** 0-based first column. */
  readonly start: number;
  readonly span: number;
  readonly text: string;
  /** Date cells: the day. */
  readonly date?: Date;
  /** Group cells: the level (0 = outermost), its resource and item. */
  readonly level?: number;
  readonly resource?: OgeSchedulerResource;
  readonly item?: OgeSchedulerResourceItem;
}

/**
 * The header rows above a grouped (or plain) column set. Resource-major
 * (`groupByDate: false`): one row per level, outermost first, each item
 * spanning its sub-leaves × days, then the dates. Date-major: the dates
 * first (each spanning every leaf), then the levels inside each day.
 * Ungrouped: the date row only.
 */
export function buildColumnHeaderRows(
  days: readonly Date[],
  levels: readonly OgeSchedulerResource[],
  leaves: readonly SchedulerGroupLeaf[],
  groupByDate: boolean,
  dateText: (day: Date) => string,
): readonly (readonly SchedulerHeaderCell[])[] {
  const dayCount = days.length;
  if (leaves.length === 0 || levels.length === 0) {
    return [
      days.map((day, index) => ({
        key: `d${index}`,
        kind: 'date' as const,
        start: index,
        span: 1,
        text: dateText(day),
        date: day,
      })),
    ];
  }
  const leafCount = leaves.length;
  // runs of leaves sharing the path prefix up to `level`
  const levelRuns = (level: number): { from: number; count: number }[] => {
    const runs: { from: number; count: number }[] = [];
    leaves.forEach((leaf, index) => {
      const previous = leaves[index - 1];
      const same =
        previous !== undefined &&
        leaf.path
          .slice(0, level + 1)
          .every((item, depth) => item === previous.path[depth]);
      if (same) runs[runs.length - 1].count++;
      else runs.push({ from: index, count: 1 });
    });
    return runs;
  };
  const groupRow = (
    level: number,
    offset: number,
    scale: number,
    keyPrefix: string,
  ): SchedulerHeaderCell[] =>
    levelRuns(level).map((run) => {
      const item = leaves[run.from].path[level];
      return {
        key: `${keyPrefix}g${level}-${run.from}`,
        kind: 'group' as const,
        start: offset + run.from * scale,
        span: run.count * scale,
        text: item.text,
        level,
        resource: levels[level],
        item,
      };
    });
  if (!groupByDate) {
    const rows: SchedulerHeaderCell[][] = levels.map((_, level) =>
      groupRow(level, 0, dayCount, ''),
    );
    rows.push(
      leaves.flatMap((leaf) =>
        days.map((day, dayIndex) => ({
          key: `d${leaf.index}-${dayIndex}`,
          kind: 'date' as const,
          start: leaf.index * dayCount + dayIndex,
          span: 1,
          text: dateText(day),
          date: day,
        })),
      ),
    );
    return rows;
  }
  const rows: SchedulerHeaderCell[][] = [
    days.map((day, dayIndex) => ({
      key: `d${dayIndex}`,
      kind: 'date' as const,
      start: dayIndex * leafCount,
      span: leafCount,
      text: dateText(day),
      date: day,
    })),
  ];
  levels.forEach((_, level) => {
    rows.push(
      days.flatMap((_day, dayIndex) =>
        groupRow(level, dayIndex * leafCount, 1, `${dayIndex}-`),
      ),
    );
  });
  return rows;
}

/**
 * The row headers of vertically stacked blocks: one entry per leaf with
 * the cells of every level that starts at it (nested headers down the
 * side). `span` counts leaves.
 */
export function buildRowHeaderBlocks(
  levels: readonly OgeSchedulerResource[],
  leaves: readonly SchedulerGroupLeaf[],
): readonly (readonly SchedulerHeaderCell[])[] {
  return leaves.map((leaf, index) => {
    const previous = leaves[index - 1];
    const cells: SchedulerHeaderCell[] = [];
    levels.forEach((resource, level) => {
      const starts =
        previous === undefined ||
        !leaf.path
          .slice(0, level + 1)
          .every((item, depth) => item === previous.path[depth]);
      if (!starts) return;
      let span = 1;
      while (
        leaves[index + span] !== undefined &&
        leaf.path
          .slice(0, level + 1)
          .every((item, depth) => item === leaves[index + span].path[depth])
      ) {
        span++;
      }
      cells.push({
        key: `r${level}-${index}`,
        kind: 'group',
        start: index,
        span,
        text: leaf.path[level].text,
        level,
        resource,
        item: leaf.path[level],
      });
    });
    return cells;
  });
}
