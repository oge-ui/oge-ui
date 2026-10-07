import type {
  PivotAxisNode,
  PivotAxisPayloadNode,
  PivotFieldConfig,
  PivotLoadResult,
  PivotPath,
  PivotResult,
} from '@oge-ui/core';
import type { OgePivotMessages } from './pivot-messages';
import type {
  OgePivotAxisLine,
  OgePivotCellPosition,
  OgePivotHeaderCell,
  OgePivotMatrixTemplate,
  OgePivotWindow,
} from './pivot-types';

// virtual-mode fixed track sizes (px)
export const OGE_PIVOT_VIRTUAL_ROW_HEIGHT = 32;
export const OGE_PIVOT_VIRTUAL_COLUMN_WIDTH = 110;
export const OGE_PIVOT_VIRTUAL_ROW_HEADER_WIDTH = 200;
export const OGE_PIVOT_VIRTUAL_HEADER_HEIGHT = 32;
export const OGE_PIVOT_OVERSCAN = 6;

/** A materialized pivot with nothing in it — the remote placeholder. */
export const OGE_EMPTY_PIVOT_RESULT: PivotResult = {
  rowRoot: [],
  columnRoot: [],
  rowLeafCount: 0,
  columnLeafCount: 0,
  values: [],
  measures: [],
};

// --- axis projections ---------------------------------------------------------

/** The display line of one axis node: grand/sub-total labels resolved. */
export function pivotLineOf(
  node: PivotAxisNode,
  level: number,
  messages: OgePivotMessages,
): OgePivotAxisLine {
  const text = node.isGrandTotal
    ? messages.grandTotal
    : node.isTotal && !node.hasChildren
      ? messages.totalPattern.replace('{0}', node.text || messages.blankValue)
      : node.text || messages.blankValue;
  return {
    text,
    path: node.path,
    level,
    expanded: node.expanded,
    // expanded parents keep their expander even though they carry totals
    hasChildren: node.hasChildren && !node.isGrandTotal,
    isTotal: node.isTotal,
    isGrandTotal: node.isGrandTotal,
  };
}

/** Every slot-owning node of an axis, as display lines in matrix order. */
export function pivotAxisLines(
  root: readonly PivotAxisNode[],
  messages: OgePivotMessages,
): OgePivotAxisLine[] {
  const lines: OgePivotAxisLine[] = [];
  const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
    for (const node of nodes) {
      if (node.leafIndex >= 0)
        lines[node.leafIndex] = pivotLineOf(node, level, messages);
      if (node.children.length) visit(node.children, level + 1);
    }
  };
  visit(root, 0);
  return lines;
}

/** Depth of the visible header block of an axis (≥ 1). */
export function pivotAxisDepth(root: readonly PivotAxisNode[]): number {
  let depth = 1;
  const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
    for (const node of nodes) {
      depth = Math.max(depth, level + 1);
      if (node.children.length) visit(node.children, level + 1);
    }
  };
  visit(root, 0);
  return depth;
}

/**
 * Positioned column-header cells: spanning parents, the expanded parent's
 * own subtotal slot under it, and leaves merged down to the full depth.
 */
export function pivotColumnHeaderCells(
  root: readonly PivotAxisNode[],
  depth: number,
  messages: OgePivotMessages,
): OgePivotHeaderCell[] {
  const cells: OgePivotHeaderCell[] = [];
  const startOf = (node: PivotAxisNode): number =>
    node.leafIndex >= 0 ? node.leafIndex : startOf(node.children[0]);
  const visit = (nodes: readonly PivotAxisNode[], level: number): void => {
    for (const node of nodes) {
      const start = startOf(node);
      cells.push({
        ...pivotLineOf(node, level, messages),
        rowStart: level + 1,
        rowEnd: node.children.length ? level + 2 : depth + 1,
        columnStart: start + 1,
        span: Math.max(1, node.leafCount),
      });
      if (node.children.length) {
        // the expanded parent's own subtotal slot needs a header cell under
        // the spanning parent, down to the leaf row
        if (level + 2 <= depth) {
          cells.push({
            text: '',
            path: node.path,
            level: level + 1,
            expanded: false,
            hasChildren: false,
            isTotal: true,
            isGrandTotal: false,
            rowStart: level + 2,
            rowEnd: depth + 1,
            columnStart: start + 1,
            span: 1,
          });
        }
        visit(node.children, level + 1);
      }
    }
  };
  visit(root, 0);
  return cells;
}

/** Stable identity of a header cell (the render layers' list key). */
export function pivotHeaderCellKey(cell: OgePivotHeaderCell): string {
  return (
    cell.path.join('|') +
    (cell.isTotal ? ':t' : '') +
    (cell.isGrandTotal ? ':g' : '') +
    String(cell.rowStart)
  );
}

/** One `role="row"` of the column-header block and the cells it holds. */
export interface OgePivotHeaderRow {
  /** 1-based header row (= `aria-rowindex`). */
  readonly rowIndex: number;
  readonly cells: readonly OgePivotHeaderCell[];
}

/**
 * Groups header cells into their header rows (1…depth), so the markup can
 * give the ARIA grid its required `row` level; a cell belongs to the row it
 * starts in, whatever it spans.
 */
export function pivotHeaderRows(
  cells: readonly OgePivotHeaderCell[],
  depth: number,
): OgePivotHeaderRow[] {
  return Array.from({ length: depth }, (_, i) => ({
    rowIndex: i + 1,
    cells: cells.filter((cell) => cell.rowStart === i + 1),
  }));
}

/** Per column slot: is it a subtotal / the grand total. */
export function pivotSlotFlags(
  root: readonly PivotAxisNode[],
  count: number,
): { total: boolean[]; grand: boolean[] } {
  const total = new Array<boolean>(count).fill(false);
  const grand = new Array<boolean>(count).fill(false);
  const visit = (nodes: readonly PivotAxisNode[]): void => {
    for (const node of nodes) {
      if (node.leafIndex >= 0) {
        total[node.leafIndex] = node.isTotal;
        grand[node.leafIndex] = node.isGrandTotal;
      }
      if (node.children.length) visit(node.children);
    }
  };
  visit(root);
  return { total, grand };
}

/** Paths of every expandable node of an axis — "expand all" over loaded data. */
export function pivotExpandablePaths(
  root: readonly PivotAxisNode[],
): PivotPath[] {
  const paths: PivotPath[] = [];
  const visit = (nodes: readonly PivotAxisNode[]): void => {
    for (const node of nodes) {
      if (node.hasChildren && !node.isGrandTotal) paths.push(node.path);
      visit(node.children);
    }
  };
  visit(root);
  return paths;
}

// --- remote payload ---------------------------------------------------------

/**
 * Text of a remote member the payload carries no `text` for: the axis, the
 * member's level on it (0 = outermost field) and its value.
 */
export type OgePivotPayloadMemberText = (
  axis: 'row' | 'column',
  level: number,
  value: unknown,
) => string;

/**
 * Rebuilds a {@link PivotResult} from a remote store's serializable payload
 * (parent-first order), appending grand-total slots when the payload carries
 * them and the grid shows them.
 */
export function pivotResultFromPayload(
  payload: PivotLoadResult,
  measures: readonly PivotFieldConfig[],
  settings: { showRowGrandTotals: boolean; showColumnGrandTotals: boolean },
  memberText?: OgePivotPayloadMemberText,
): PivotResult {
  const buildAxis = (
    nodes: readonly PivotAxisPayloadNode[],
    showGrand: boolean,
    axis: 'row' | 'column',
  ): { nodes: PivotAxisNode[]; count: number } => {
    let slot = 0;
    const visit = (
      payloadNodes: readonly PivotAxisPayloadNode[],
      path: PivotPath,
    ): PivotAxisNode[] =>
      payloadNodes.map((node) => {
        const ownPath = [...path, node.value ?? null];
        const children = node.children ?? [];
        const expanded = children.length > 0;
        const start = slot++;
        const built: PivotAxisNode[] = expanded ? visit(children, ownPath) : [];
        return {
          value: node.value,
          // a server text wins; otherwise the field's header format
          text:
            node.text ??
            (memberText
              ? memberText(axis, path.length, node.value)
              : String(node.value ?? '')),
          path: ownPath,
          children: built,
          expanded,
          hasChildren: node.hasChildren ?? expanded,
          leafIndex: start,
          leafCount: slot - start,
          isTotal: expanded,
          isGrandTotal: false,
        };
      });
    const roots = visit(nodes, []);
    if (showGrand) {
      roots.push({
        value: null,
        text: '',
        path: [],
        children: [],
        expanded: false,
        hasChildren: false,
        leafIndex: slot++,
        leafCount: 1,
        isTotal: false,
        isGrandTotal: true,
      });
    }
    return { nodes: roots, count: slot };
  };

  const showGrandRows = settings.showRowGrandTotals && !!payload.columnTotals;
  const showGrandColumns =
    settings.showColumnGrandTotals && !!payload.rowTotals;
  const rows = buildAxis(payload.rows, showGrandRows, 'row');
  const columns = buildAxis(payload.columns, showGrandColumns, 'column');
  const blank = measures.map(() => null as unknown);

  const values: unknown[][][] = [];
  const bodyRows = rows.count - (showGrandRows ? 1 : 0);
  const bodyColumns = columns.count - (showGrandColumns ? 1 : 0);
  for (let r = 0; r < bodyRows; r++) {
    const line: unknown[][] = [];
    for (let c = 0; c < bodyColumns; c++) {
      line.push([...(payload.values[r]?.[c] ?? blank)]);
    }
    if (showGrandColumns)
      line.push([...(payload.rowTotals?.[r]?.[0] ?? blank)]);
    values.push(line);
  }
  if (showGrandRows) {
    const line: unknown[][] = [];
    for (let c = 0; c < bodyColumns; c++) {
      line.push([...(payload.columnTotals?.[0]?.[c] ?? blank)]);
    }
    if (showGrandColumns) line.push([...(payload.grandTotal ?? blank)]);
    values.push(line);
  }

  return {
    rowRoot: rows.nodes,
    columnRoot: columns.nodes,
    rowLeafCount: rows.count,
    columnLeafCount: columns.count,
    values,
    measures,
  };
}

// --- two-axis virtualization ------------------------------------------------

/** Fixed column track in virtual mode — widened when several measures share a cell. */
export function pivotVirtualColumnWidth(measureCount: number): number {
  return Math.max(OGE_PIVOT_VIRTUAL_COLUMN_WIDTH, measureCount * 96);
}

/** Visible row-slot window under the header block, with overscan. */
export function pivotRowWindow(
  count: number,
  scrollTop: number,
  viewportHeight: number,
  columnDepth: number,
): OgePivotWindow {
  const headerBlock = columnDepth * OGE_PIVOT_VIRTUAL_HEADER_HEIGHT;
  const start = Math.max(
    0,
    Math.floor((scrollTop - headerBlock) / OGE_PIVOT_VIRTUAL_ROW_HEIGHT) -
      OGE_PIVOT_OVERSCAN,
  );
  const end = Math.min(
    count,
    Math.ceil(
      (scrollTop - headerBlock + viewportHeight) / OGE_PIVOT_VIRTUAL_ROW_HEIGHT,
    ) + OGE_PIVOT_OVERSCAN,
  );
  return { start, end: Math.max(end, start) };
}

/** Visible column-slot window right of the row headers, with overscan. */
export function pivotColumnWindow(
  count: number,
  scrollLeft: number,
  viewportWidth: number,
  columnWidth: number,
): OgePivotWindow {
  const start = Math.max(
    0,
    Math.floor(
      (scrollLeft - OGE_PIVOT_VIRTUAL_ROW_HEADER_WIDTH) / columnWidth,
    ) - OGE_PIVOT_OVERSCAN,
  );
  const end = Math.min(
    count,
    Math.ceil(
      (scrollLeft - OGE_PIVOT_VIRTUAL_ROW_HEADER_WIDTH + viewportWidth) /
        columnWidth,
    ) + OGE_PIVOT_OVERSCAN,
  );
  return { start, end: Math.max(end, start) };
}

/** The indexes of a window, in order. */
export function pivotWindowIndexes(window: OgePivotWindow): number[] {
  return Array.from(
    { length: window.end - window.start },
    (_, i) => window.start + i,
  );
}

/** Header cells intersecting a horizontal window. */
export function pivotHeaderCellsInWindow(
  cells: readonly OgePivotHeaderCell[],
  window: OgePivotWindow,
): OgePivotHeaderCell[] {
  return cells.filter(
    (cell) =>
      cell.columnStart - 1 < window.end &&
      cell.columnStart - 1 + cell.span > window.start,
  );
}

/**
 * Explicit track sizes for the value matrix. Standard mode sizes to content;
 * virtual mode fixes every track so off-window cells keep their place.
 */
export function pivotMatrixTemplate(
  result: Pick<PivotResult, 'rowLeafCount' | 'columnLeafCount'>,
  virtual: boolean,
  columnDepth: number,
  columnWidth: number,
  /** Label columns of the row header (outline / tabular layouts). Default 1. */
  rowHeaderColumns = 1,
): OgePivotMatrixTemplate {
  if (!virtual) {
    return {
      rows: null,
      columns: `minmax(${String(160 * Math.min(rowHeaderColumns, 2))}px, max-content) repeat(${String(result.columnLeafCount)}, minmax(90px, auto))`,
    };
  }
  // each extra label column of a tabular / outline header takes 3/5 of the
  // compact track, so three fields stay inside a laptop viewport
  const headerWidth = Math.round(
    OGE_PIVOT_VIRTUAL_ROW_HEADER_WIDTH * (1 + (rowHeaderColumns - 1) * 0.6),
  );
  return {
    rows: `repeat(${String(columnDepth)}, ${String(OGE_PIVOT_VIRTUAL_HEADER_HEIGHT)}px) repeat(${String(result.rowLeafCount)}, ${String(OGE_PIVOT_VIRTUAL_ROW_HEIGHT)}px)`,
    columns: `${String(headerWidth)}px repeat(${String(result.columnLeafCount)}, ${String(columnWidth)}px)`,
  };
}

// --- keyboard ------------------------------------------------------------------

/**
 * Where an arrow / Home / End key moves the focused matrix cell (clamped, no
 * wrapping). `null` means the key is not one the matrix handles.
 */
export function pivotMatrixKeyTarget(
  key: string,
  cell: OgePivotCellPosition,
  lastRow: number,
  lastCol: number,
): OgePivotCellPosition | null {
  let { row, col } = cell;
  switch (key) {
    case 'ArrowDown':
      row = Math.min(lastRow, row + 1);
      break;
    case 'ArrowUp':
      row = Math.max(0, row - 1);
      break;
    case 'ArrowRight':
      col = Math.min(lastCol, col + 1);
      break;
    case 'ArrowLeft':
      col = Math.max(0, col - 1);
      break;
    case 'Home':
      col = 0;
      break;
    case 'End':
      col = lastCol;
      break;
    default:
      return null;
  }
  return { row, col };
}
