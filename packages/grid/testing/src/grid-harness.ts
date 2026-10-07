import {
  ComponentHarness,
  HarnessPredicate,
  TestKey,
  type BaseHarnessFilters,
  type TestElement,
} from '@angular/cdk/testing';

/** Sort state of one column, read from the header's `aria-sort`. */
export type OgeGridSortDirection = 'asc' | 'desc' | 'none';

/** Filters for {@link OgeGridHarness.with}. */
export interface OgeGridHarnessFilters extends BaseHarnessFilters {
  /** Only grids with a column whose caption matches. */
  column?: string | RegExp;
}

/** Filters for {@link OgeGridRowHarness.with}. */
export interface OgeGridRowHarnessFilters extends BaseHarnessFilters {
  /** Only rows whose cell texts, joined with a space, match. */
  text?: string | RegExp;
  /** Only selected (`true`) or unselected (`false`) rows. */
  selected?: boolean;
}

/**
 * Selectors are scoped to this grid's own regions with `:scope >` so a grid
 * rendered inside a detail row never leaks its rows or headers into the
 * outer grid's answers.
 */
const HEADER_ROW = ':scope > .oge-viewport > .oge-header > .oge-header-row';
const FILTER_ROW = ':scope > .oge-viewport > .oge-header > .oge-filter-row';
const ROWS = ':scope > .oge-viewport > .oge-body > .oge-rows';
const PAGER = ':scope > oge-pager';
/** Data columns only — the drag, expander, checkbox and command cells carry no `data-colid`. */
const DATA_HEADER = '.oge-header-cell[data-colid]';
const DATA_CELL = '.oge-cell[data-cell]';

/** Trimmed, whitespace-collapsed text — what a reader sees. */
const clean = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * Harness for one body row of an `oge-grid` (data rows and `rowTemplate`
 * rows; pinned, group and filler rows are not rows here). Get them through
 * {@link OgeGridHarness.getRows}.
 */
export class OgeGridRowHarness extends ComponentHarness {
  static hostSelector =
    '.oge-row[role="row"][data-rowindex]:not(.oge-edit-form-row)';

  static with(
    options: OgeGridRowHarnessFilters = {},
  ): HarnessPredicate<OgeGridRowHarness> {
    return new HarnessPredicate(OgeGridRowHarness, options)
      .addOption('text', options.text, async (harness, text) =>
        HarnessPredicate.stringMatches(
          (await harness.getCellTexts()).join(' '),
          text,
        ),
      )
      .addOption(
        'selected',
        options.selected,
        async (harness, selected) => (await harness.isSelected()) === selected,
      );
  }

  private readonly dataCells = this.locatorForAll(DATA_CELL);
  private readonly checkbox = this.locatorForOptional(
    '.oge-checkbox-cell input[type="checkbox"]',
  );

  /** Text of every data cell, in column order. */
  async getCellTexts(): Promise<string[]> {
    const cells = await this.dataCells();
    return Promise.all(cells.map(async (cell) => clean(await cell.text())));
  }

  /** The data cell at a 0-based column position. */
  async getCell(columnIndex: number): Promise<TestElement> {
    const cells = await this.dataCells();
    const cell = cells[columnIndex];
    if (!cell) {
      throw Error(
        `OgeGridRowHarness: no cell at column ${columnIndex} (the row has ${cells.length})`,
      );
    }
    return cell;
  }

  /** Whether the row is selected (`aria-selected="true"`). */
  async isSelected(): Promise<boolean> {
    return (await (await this.host()).getAttribute('aria-selected')) === 'true';
  }

  /**
   * Toggles the row's selection: its checkbox when the grid shows a checkbox
   * column, otherwise a click on its first data cell (`selectionMode`
   * `'single'` / `'multiple'`).
   */
  async toggleSelection(): Promise<void> {
    const checkbox = await this.checkbox();
    if (checkbox) return checkbox.click();
    const [first] = await this.dataCells();
    return (first ?? (await this.host())).click();
  }
}

/**
 * Harness for `oge-grid` — rows and cells as text, header sorting, the filter
 * row, the pager, row selection and cell editing, driven through the same
 * ARIA and `.oge-*` structure a user's assistive technology sees.
 *
 * ```ts
 * const grid = await loader.getHarness(OgeGridHarness.with({ column: 'Name' }));
 * await grid.sortBy('Name');
 * expect(await grid.getSortDirection('Name')).toBe('asc');
 * expect(await grid.getCellTexts()).toEqual([['1', 'Ada'], ['2', 'Linus']]);
 * ```
 *
 * Columns are addressed by caption (exact, trimmed) or by their 0-based
 * position among the data columns. Body rows are the rendered ones: a
 * virtualized grid exposes its window, a paged grid its page.
 */
export class OgeGridHarness extends ComponentHarness {
  static hostSelector = 'oge-grid';

  static with(
    options: OgeGridHarnessFilters = {},
  ): HarnessPredicate<OgeGridHarness> {
    return new HarnessPredicate(OgeGridHarness, options).addOption(
      'column',
      options.column,
      async (harness, column) => {
        const captions = await harness.getColumnCaptions();
        for (const caption of captions) {
          if (await HarnessPredicate.stringMatches(caption, column)) {
            return true;
          }
        }
        return false;
      },
    );
  }

  private readonly headerCells = this.locatorForAll(
    `${HEADER_ROW} > ${DATA_HEADER}`,
  );
  private readonly headerCaptions = this.locatorForAll(
    `${HEADER_ROW} > ${DATA_HEADER} .oge-header-caption`,
  );
  private readonly filterRow = this.locatorForOptional(FILTER_ROW);
  private readonly selectAllBox = this.locatorForOptional(
    `${HEADER_ROW} > .oge-checkbox-cell input[type="checkbox"]`,
  );
  private readonly pager = this.locatorForOptional(PAGER);
  private readonly pagerCurrent = this.locatorForOptional(
    `${PAGER} .oge-pager-btn[aria-current="page"]`,
  );
  private readonly pagerInput = this.locatorForOptional(
    `${PAGER} .oge-pager-input-field`,
  );
  private readonly pagerCompact = this.locatorForOptional(
    `${PAGER} .oge-pager-compact`,
  );
  private readonly pagerPageButtons = this.locatorForAll(
    `${PAGER} .oge-pager-btn:not([aria-label])`,
  );
  /** Previous and next: the labelled pager buttons other than first / last. */
  private readonly pagerStepButtons = this.locatorForAll(
    `${PAGER} .oge-pager-btn[aria-label]:not(.oge-pager-first):not(.oge-pager-last)`,
  );
  private readonly noData = this.locatorForOptional(`${ROWS} > .oge-no-data`);

  // --- structure -------------------------------------------------------------

  /** Captions of the data columns, in display order. */
  async getColumnCaptions(): Promise<string[]> {
    const captions = await this.headerCaptions();
    return Promise.all(captions.map(async (c) => clean(await c.text())));
  }

  /** The rendered body rows, optionally filtered. */
  async getRows(
    filter: OgeGridRowHarnessFilters = {},
  ): Promise<OgeGridRowHarness[]> {
    return this.locatorForAll(
      OgeGridRowHarness.with({ ...filter, ancestor: ROWS }),
    )();
  }

  /** Number of rendered body rows. */
  async getRowCount(): Promise<number> {
    return (await this.getRows()).length;
  }

  /** Every rendered row's data-cell texts — the grid as a table of strings. */
  async getCellTexts(): Promise<string[][]> {
    const rows = await this.getRows();
    return Promise.all(rows.map((row) => row.getCellTexts()));
  }

  /** Text of one cell. */
  async getCellText(
    rowIndex: number,
    column: string | number,
  ): Promise<string> {
    const cell = await this.cellAt(rowIndex, column);
    return clean(await cell.text());
  }

  /** Whether the "no data" row is shown. */
  async isEmpty(): Promise<boolean> {
    return (await this.noData()) !== null;
  }

  // --- sorting ---------------------------------------------------------------

  /**
   * Clicks a column header — one step of the sort cycle (asc → desc → none
   * with the default `sorting`). Pass `{ shift: true }` to add the column to
   * a multi-column sort.
   */
  async sortBy(
    column: string | number,
    modifiers: { shift?: boolean; control?: boolean } = {},
  ): Promise<void> {
    const header = await this.headerCell(column);
    return modifiers.shift || modifiers.control
      ? header.click(modifiers)
      : header.click();
  }

  /** The column's sort state from its header's `aria-sort`. */
  async getSortDirection(
    column: string | number,
  ): Promise<OgeGridSortDirection> {
    const header = await this.headerCell(column);
    const sort = await header.getAttribute('aria-sort');
    return sort === 'ascending'
      ? 'asc'
      : sort === 'descending'
        ? 'desc'
        : 'none';
  }

  // --- filtering -------------------------------------------------------------

  /** Whether the filter row is shown. */
  async hasFilterRow(): Promise<boolean> {
    return (await this.filterRow()) !== null;
  }

  /**
   * Types into a column's filter-row editor (text, number or date — a date
   * filter is committed with Enter), replacing what it held. An empty string
   * clears the filter. The harness waits for the filter debounce.
   *
   * Boolean and lookup columns filter through a select box: drive it with
   * `OgeSelectBoxHarness.with({ label: 'Filter <caption>' })` from
   * `@oge-ui/inputs/testing`.
   */
  async setFilter(column: string | number, text: string): Promise<void> {
    const nth = (await this.headerIndex(column)) + 1;
    const cell = `${FILTER_ROW} > [role="gridcell"]:nth-child(${nth})`;
    const input = await this.locatorForOptional(
      `${cell} input.oge-input-native`,
    )();
    if (!input) {
      throw Error(
        `OgeGridHarness: column "${column}" has no text filter editor in the filter row`,
      );
    }
    await input.clear();
    if (text !== '') await input.sendKeys(text);
    const dateBox = await this.locatorForOptional(`${cell} oge-date-box`)();
    if (dateBox) await input.sendKeys(TestKey.ENTER);
  }

  /** The current text of a column's filter-row editor. */
  async getFilterText(column: string | number): Promise<string> {
    const nth = (await this.headerIndex(column)) + 1;
    const input = await this.locatorForOptional(
      `${FILTER_ROW} > [role="gridcell"]:nth-child(${nth}) input.oge-input-native`,
    )();
    return input ? String((await input.getProperty('value')) ?? '') : '';
  }

  // --- paging ----------------------------------------------------------------

  /** Whether the grid shows a pager. */
  async hasPager(): Promise<boolean> {
    return (await this.pager()) !== null;
  }

  /** The current page, 1-based, as the pager shows it. */
  async getCurrentPage(): Promise<number> {
    const current = await this.pagerCurrent();
    if (current) return Number(clean(await current.text()));
    const input = await this.pagerInput();
    if (input) return Number(await input.getProperty('value'));
    const compact = await this.pagerCompact();
    if (compact) return Number(clean(await compact.text()).split('/')[0]);
    throw Error('OgeGridHarness: the grid has no pager');
  }

  /**
   * Goes to a 1-based page: its page button when the pager lists it,
   * otherwise the go-to-page input (`showPageInput`).
   */
  async goToPage(page: number): Promise<void> {
    for (const button of await this.pagerPageButtons()) {
      if (clean(await button.text()) === String(page)) return button.click();
    }
    const input = await this.pagerInput();
    if (input) {
      await input.clear();
      return input.sendKeys(String(page), TestKey.ENTER);
    }
    throw Error(`OgeGridHarness: the pager offers no way to page ${page}`);
  }

  /** Clicks the pager's next-page button. */
  async nextPage(): Promise<void> {
    const steps = await this.pagerStepButtons();
    const next = steps[steps.length - 1];
    if (!next) throw Error('OgeGridHarness: the grid has no pager');
    return next.click();
  }

  /** Clicks the pager's previous-page button. */
  async previousPage(): Promise<void> {
    const [previous] = await this.pagerStepButtons();
    if (!previous) throw Error('OgeGridHarness: the grid has no pager');
    return previous.click();
  }

  // --- selection -------------------------------------------------------------

  /** Toggles one row's selection (see {@link OgeGridRowHarness.toggleSelection}). */
  async toggleRowSelection(rowIndex: number): Promise<void> {
    return (await this.row(rowIndex)).toggleSelection();
  }

  /** Whether one row is selected. */
  async isRowSelected(rowIndex: number): Promise<boolean> {
    return (await this.row(rowIndex)).isSelected();
  }

  /** 0-based indexes of the selected rendered rows. */
  async getSelectedRowIndexes(): Promise<number[]> {
    const rows = await this.getRows();
    const selected = await Promise.all(rows.map((row) => row.isSelected()));
    return selected.flatMap((isSelected, index) => (isSelected ? [index] : []));
  }

  /** Clicks the header's select-all checkbox (`selectionMode: 'checkbox'`). */
  async toggleSelectAll(): Promise<void> {
    const box = await this.selectAllBox();
    if (!box) {
      throw Error('OgeGridHarness: the grid has no select-all checkbox');
    }
    return box.click();
  }

  // --- editing ---------------------------------------------------------------

  /**
   * Edits one cell the way a keyboard user does: focuses it, opens its
   * editor with F2 (unless the row is already in edit mode), replaces the
   * text and presses Enter, which commits per the grid's edit mode (a save
   * in `cell` mode, a pending change in `batch` mode).
   *
   * Text, number and date editors only — a boolean or lookup editor is a
   * checkbox or select box; drive those with the inputs harnesses.
   */
  async editCell(
    rowIndex: number,
    column: string | number,
    text: string,
  ): Promise<void> {
    const cell = await this.cellAt(rowIndex, column);
    if (!(await cell.hasClass('oge-cell-editing'))) {
      await cell.focus();
      await cell.sendKeys(TestKey.F2);
    }
    const address = await cell.getAttribute('data-cell');
    const editor = await this.locatorForOptional(
      `${ROWS} [data-cell="${address}"].oge-cell-editing input.oge-input-native`,
    )();
    if (!editor) {
      throw Error(
        `OgeGridHarness: no text editor opened in row ${rowIndex}, column "${column}" — is the column editable?`,
      );
    }
    await editor.clear();
    if (text !== '') await editor.sendKeys(text);
    await editor.sendKeys(TestKey.ENTER);
  }

  /** Whether a cell currently shows its editor. */
  async isCellEditing(
    rowIndex: number,
    column: string | number,
  ): Promise<boolean> {
    return (await this.cellAt(rowIndex, column)).hasClass('oge-cell-editing');
  }

  // --- internals -------------------------------------------------------------

  private async row(rowIndex: number): Promise<OgeGridRowHarness> {
    const rows = await this.getRows();
    const row = rows[rowIndex];
    if (!row) {
      throw Error(
        `OgeGridHarness: no row ${rowIndex} (${rows.length} rendered)`,
      );
    }
    return row;
  }

  private async cellAt(
    rowIndex: number,
    column: string | number,
  ): Promise<TestElement> {
    const position = await this.headerIndexAmongData(column);
    return (await this.row(rowIndex)).getCell(position);
  }

  /** 0-based position of a column among the data columns. */
  private async headerIndexAmongData(column: string | number): Promise<number> {
    if (typeof column === 'number') return column;
    const captions = await this.getColumnCaptions();
    const index = captions.indexOf(column.trim());
    if (index < 0) {
      throw Error(
        `OgeGridHarness: no column "${column}" (columns: ${captions.join(', ')})`,
      );
    }
    return index;
  }

  private async headerCell(column: string | number): Promise<TestElement> {
    const cells = await this.headerCells();
    const cell = cells[await this.headerIndexAmongData(column)];
    if (!cell) throw Error(`OgeGridHarness: no column ${column}`);
    return cell;
  }

  /**
   * 0-based position of a column's header among *all* header-row cells. The
   * filter row renders the same leading cells (drag, expander, checkbox,
   * spacer) in the same order, so this is also its filter cell's position.
   */
  private async headerIndex(column: string | number): Promise<number> {
    const target = await this.headerCell(column);
    const all = await this.locatorForAll(`${HEADER_ROW} > *`)();
    const colId = await target.getAttribute('data-colid');
    for (let i = 0; i < all.length; i++) {
      if ((await all[i].getAttribute('data-colid')) === colId) return i;
    }
    throw Error(`OgeGridHarness: no column ${column}`);
  }
}
