import { fireEvent, getConfig } from '@testing-library/dom';

/** Sort state of one column, read from the header's `aria-sort`. */
export type OgeGridSortDirection = 'asc' | 'desc' | 'none';

/** Filters for {@link getGrid} / {@link getAllGrids}. */
export interface OgeGridQueryFilters {
  /** Only grids with a column whose caption matches. */
  column?: string | RegExp;
}

/**
 * Typed queries and actions over one rendered `<OgeGrid>` — the React
 * counterpart of `OgeGridHarness` from `@oge-ui/grid/testing`, with the same
 * member names. Reads are synchronous DOM reads; actions fire events through
 * Testing Library (act-wrapped once `@testing-library/react` is loaded).
 * Work the grid finishes later — the filter debounce, a remote data source —
 * is asserted with `await waitFor(…)`, as anywhere in RTL.
 *
 * Columns are addressed by caption (exact, trimmed) or by their 0-based
 * position among the data columns; rows are the rendered body rows.
 */
export interface OgeGridQueries {
  /** The grid's root element (`.oge-grid`). */
  readonly element: HTMLElement;
  /** Captions of the data columns, in display order. */
  getColumnCaptions(): string[];
  /** The rendered body rows (`role="row"` elements). */
  getRows(): HTMLElement[];
  /** Number of rendered body rows. */
  getRowCount(): number;
  /** Every rendered row's data-cell texts. */
  getCellTexts(): string[][];
  /** Text of one cell. */
  getCellText(rowIndex: number, column: string | number): string;
  /** The data cell element of one row and column. */
  getCell(rowIndex: number, column: string | number): HTMLElement;
  /** Whether the "no data" row is shown. */
  isEmpty(): boolean;
  /** Clicks a column header — one step of the sort cycle. */
  sortBy(
    column: string | number,
    modifiers?: { shift?: boolean; control?: boolean },
  ): void;
  /** The column's sort state from its header's `aria-sort`. */
  getSortDirection(column: string | number): OgeGridSortDirection;
  /** Whether the filter row is shown. */
  hasFilterRow(): boolean;
  /** Replaces a column's filter-row text (Enter commits a date filter). */
  setFilter(column: string | number, text: string): void;
  /** The current text of a column's filter-row editor. */
  getFilterText(column: string | number): string;
  /** Whether the grid shows a pager. */
  hasPager(): boolean;
  /** The current page, 1-based. */
  getCurrentPage(): number;
  /** Goes to a 1-based page (its button, or the go-to-page input). */
  goToPage(page: number): void;
  /** Clicks the pager's next-page button. */
  nextPage(): void;
  /** Clicks the pager's previous-page button. */
  previousPage(): void;
  /** Toggles one row's selection (its checkbox, or a click on the row). */
  toggleRowSelection(rowIndex: number): void;
  /** Whether one row is selected. */
  isRowSelected(rowIndex: number): boolean;
  /** 0-based indexes of the selected rendered rows. */
  getSelectedRowIndexes(): number[];
  /** Clicks the header's select-all checkbox. */
  toggleSelectAll(): void;
  /** Opens a cell's editor with F2, replaces the text, presses Enter. */
  editCell(rowIndex: number, column: string | number, text: string): void;
  /** Whether a cell currently shows its editor. */
  isCellEditing(rowIndex: number, column: string | number): boolean;
}

const HEADER_ROW = ':scope > .oge-viewport > .oge-header > .oge-header-row';
const FILTER_ROW = ':scope > .oge-viewport > .oge-header > .oge-filter-row';
const ROWS = ':scope > .oge-viewport > .oge-body > .oge-rows';
const PAGER = ':scope > .oge-pager';
const ROW = '.oge-row[role="row"][data-rowindex]:not(.oge-edit-form-row)';
const DATA_HEADER = '.oge-header-cell[data-colid]';
const DATA_CELL = '.oge-cell[data-cell]';

const clean = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const matches = (text: string, pattern: string | RegExp): boolean =>
  typeof pattern === 'string' ? text === pattern : pattern.test(text);

/** Runs DOM work inside Testing Library's event wrapper (RTL: `act`). */
const wrap = (work: () => void): void => {
  getConfig().eventWrapper(work);
};

/** Focus, replace the value React-style, as a user typing would. */
function typeInto(input: HTMLInputElement, text: string): void {
  wrap(() => input.focus());
  fireEvent.input(input, { target: { value: text } });
}

function createGridQueries(root: HTMLElement): OgeGridQueries {
  const all = (selector: string): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(selector));
  const one = (selector: string): HTMLElement | null =>
    root.querySelector<HTMLElement>(selector);

  const headerCells = () => all(`${HEADER_ROW} > ${DATA_HEADER}`);
  const captions = () =>
    headerCells().map((cell) =>
      clean(cell.querySelector('.oge-header-caption')?.textContent),
    );
  const rows = () => all(`${ROWS} > ${ROW}`);

  const columnIndex = (column: string | number): number => {
    if (typeof column === 'number') return column;
    const list = captions();
    const index = list.indexOf(column.trim());
    if (index < 0) {
      throw new Error(
        `getGrid: no column "${column}" (columns: ${list.join(', ')})`,
      );
    }
    return index;
  };
  const row = (rowIndex: number): HTMLElement => {
    const list = rows();
    const found = list[rowIndex];
    if (!found) {
      throw new Error(`getGrid: no row ${rowIndex} (${list.length} rendered)`);
    }
    return found;
  };
  const cell = (rowIndex: number, column: string | number): HTMLElement => {
    const position = columnIndex(column);
    const cells = Array.from(
      row(rowIndex).querySelectorAll<HTMLElement>(DATA_CELL),
    );
    const found = cells[position];
    if (!found) throw new Error(`getGrid: no cell at column ${column}`);
    return found;
  };
  const header = (column: string | number): HTMLElement => {
    const found = headerCells()[columnIndex(column)];
    if (!found) throw new Error(`getGrid: no column ${column}`);
    return found;
  };
  /** The filter cell shares the header cell's position in its row. */
  const filterInput = (column: string | number): HTMLInputElement | null => {
    const target = header(column);
    const position = Array.from(target.parentElement?.children ?? []).indexOf(
      target,
    );
    const filterCell = one(FILTER_ROW)?.children[position];
    return (
      filterCell?.querySelector<HTMLInputElement>('input.oge-input-native') ??
      null
    );
  };
  const pagerButtons = (selector: string) =>
    all(`${PAGER} .oge-pager-btn${selector}`);
  const stepButtons = () =>
    pagerButtons('[aria-label]:not(.oge-pager-first):not(.oge-pager-last)');
  const isSelected = (element: HTMLElement) =>
    element.getAttribute('aria-selected') === 'true';

  return {
    element: root,
    getColumnCaptions: captions,
    getRows: rows,
    getRowCount: () => rows().length,
    getCellTexts: () =>
      rows().map((r) =>
        Array.from(r.querySelectorAll(DATA_CELL)).map((c) =>
          clean(c.textContent),
        ),
      ),
    getCellText: (rowIndex, column) =>
      clean(cell(rowIndex, column).textContent),
    getCell: cell,
    isEmpty: () => one(`${ROWS} > .oge-no-data`) !== null,
    sortBy(column, modifiers = {}) {
      fireEvent.click(header(column), {
        shiftKey: modifiers.shift === true,
        ctrlKey: modifiers.control === true,
      });
    },
    getSortDirection(column) {
      const sort = header(column).getAttribute('aria-sort');
      return sort === 'ascending'
        ? 'asc'
        : sort === 'descending'
          ? 'desc'
          : 'none';
    },
    hasFilterRow: () => one(FILTER_ROW) !== null,
    setFilter(column, text) {
      const input = filterInput(column);
      if (!input) {
        throw new Error(
          `getGrid: column "${column}" has no text filter editor in the filter row`,
        );
      }
      typeInto(input, text);
      if (input.closest('.oge-date-box')) {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      }
    },
    getFilterText: (column) => filterInput(column)?.value ?? '',
    hasPager: () => one(PAGER) !== null,
    getCurrentPage() {
      const current = one(`${PAGER} .oge-pager-btn[aria-current="page"]`);
      if (current) return Number(clean(current.textContent));
      const input = one(`${PAGER} .oge-pager-input-field`);
      if (input) return Number((input as HTMLInputElement).value);
      const compact = one(`${PAGER} .oge-pager-compact`);
      if (compact) return Number(clean(compact.textContent).split('/')[0]);
      throw new Error('getGrid: the grid has no pager');
    },
    goToPage(page) {
      const button = pagerButtons(':not([aria-label])').find(
        (b) => clean(b.textContent) === String(page),
      );
      if (button) {
        fireEvent.click(button);
        return;
      }
      const input = one(`${PAGER} .oge-pager-input-field`);
      if (!(input instanceof HTMLInputElement)) {
        throw new Error(`getGrid: the pager offers no way to page ${page}`);
      }
      typeInto(input, String(page));
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    },
    nextPage() {
      const steps = stepButtons();
      const next = steps[steps.length - 1];
      if (!next) throw new Error('getGrid: the grid has no pager');
      fireEvent.click(next);
    },
    previousPage() {
      const [previous] = stepButtons();
      if (!previous) throw new Error('getGrid: the grid has no pager');
      fireEvent.click(previous);
    },
    toggleRowSelection(rowIndex) {
      const target = row(rowIndex);
      const checkbox = target.querySelector<HTMLInputElement>(
        '.oge-checkbox-cell input[type="checkbox"]',
      );
      fireEvent.click(checkbox ?? target.querySelector(DATA_CELL) ?? target);
    },
    isRowSelected: (rowIndex) => isSelected(row(rowIndex)),
    getSelectedRowIndexes: () =>
      rows().flatMap((r, index) => (isSelected(r) ? [index] : [])),
    toggleSelectAll() {
      const box = one(
        `${HEADER_ROW} > .oge-checkbox-cell input[type="checkbox"]`,
      );
      if (!box) throw new Error('getGrid: the grid has no select-all checkbox');
      fireEvent.click(box);
    },
    editCell(rowIndex, column, text) {
      const target = cell(rowIndex, column);
      if (!target.classList.contains('oge-cell-editing')) {
        wrap(() => target.focus());
        fireEvent.keyDown(target, { key: 'F2', code: 'F2' });
      }
      const editor = cell(rowIndex, column).querySelector<HTMLInputElement>(
        'input.oge-input-native',
      );
      if (!editor) {
        throw new Error(
          `getGrid: no text editor opened in row ${rowIndex}, column "${column}" — is the column editable?`,
        );
      }
      typeInto(editor, text);
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    },
    isCellEditing: (rowIndex, column) =>
      cell(rowIndex, column).classList.contains('oge-cell-editing'),
  };
}

/** Every `.oge-grid` in (or being) the container, optionally filtered. */
export function getAllGrids(
  container: HTMLElement = document.body,
  filters: OgeGridQueryFilters = {},
): OgeGridQueries[] {
  const roots = container.matches('.oge-grid')
    ? [container]
    : Array.from(container.querySelectorAll<HTMLElement>('.oge-grid'));
  return roots
    .map(createGridQueries)
    .filter(
      (grid) =>
        filters.column === undefined ||
        grid
          .getColumnCaptions()
          .some((caption) =>
            matches(caption, filters.column as string | RegExp),
          ),
    );
}

/**
 * The one `<OgeGrid>` in (or being) the container. Throws when there is none
 * or more than one — narrow the container (`within(…)`) or pass a `column`
 * filter.
 *
 * ```tsx
 * const { container } = render(<Orders />);
 * const grid = getGrid(container, { column: 'Total' });
 * grid.sortBy('Total');
 * expect(grid.getSortDirection('Total')).toBe('asc');
 * ```
 */
export function getGrid(
  container: HTMLElement = document.body,
  filters: OgeGridQueryFilters = {},
): OgeGridQueries {
  const grids = getAllGrids(container, filters);
  if (grids.length !== 1) {
    throw new Error(
      `getGrid: expected one grid, found ${grids.length} — narrow the container or pass a column filter`,
    );
  }
  return grids[0];
}
