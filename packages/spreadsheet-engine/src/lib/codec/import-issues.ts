/**
 * What the reader could not take over exactly. ADR 0005: import never
 * truncates or approximates silently — every dropped, repaired or not-yet-
 * shown construct is reported here, once per kind and place, with a count.
 */

/** Why an issue was raised. */
export type OgeImportIssueCode =
  /** A part a relationship points at is missing; the reader went on without it. */
  | 'missing-part'
  /** A part is not well-formed XML; it was skipped. */
  | 'malformed-part'
  /** A cell, range or reference could not be read; it was skipped. */
  | 'invalid-reference'
  /** A cell points past the style table; it shows with the default style. */
  | 'invalid-style'
  /** A cell points past the shared-string table; it shows empty. */
  | 'invalid-shared-string'
  /** A value could not be read as its type (`t="n"` holding text, an unknown error). */
  | 'invalid-value'
  /** A sheet name Excel refuses; the sheet was renamed. */
  | 'invalid-sheet-name'
  /** A defined name Excel refuses; it was dropped. */
  | 'invalid-defined-name'
  /** A merge overlapping an earlier one; Excel would repair it, the reader drops it. */
  | 'overlapping-merge'
  /** A shared formula's master is missing; the cell keeps its value only. */
  | 'orphan-shared-formula'
  /** Formulas saved without a calculated value show empty until the formula engine (P3). */
  | 'uncalculated-formulas'
  /** Shapes, linked pictures and chart sheets are kept for saving but not shown yet. */
  | 'drawing-not-shown'
  /**
   * Charts of a kind the viewer does not draw yet — radar, stock, surface,
   * pie of pie, and Excel 2016's (waterfall, treemap, …) — are kept for saving.
   */
  | 'chart-type-not-shown'
  /** Pictures in a format browsers cannot show (EMF, WMF) are kept but not shown. */
  | 'picture-format-not-shown'
  /**
   * A table (ListObject) names a style neither the workbook nor Excel's
   * built-ins define; it shows without the style.
   */
  | 'table-style-not-shown'
  /** Pivot table styling is kept but not shown yet. */
  | 'pivot-style-not-shown'
  /** Sparklines, extended data bars and other `extLst` formatting are kept but not shown. */
  | 'extension-not-shown'
  /** Conditional-format rules that need the formula engine (P3) are kept but not applied. */
  | 'conditional-format-needs-formulas'
  /** Threaded comments are shown as notes (their legacy copy). */
  | 'threaded-comments-as-notes'
  /** A split (not frozen) window is shown unsplit. */
  | 'split-pane-ignored'
  /** External workbook links are kept and never fetched. */
  | 'external-link'
  /** The workbook has macros (`vbaProject.bin`): kept, never run. */
  | 'macros-kept'
  /** Cells beyond the reader's `maxCells` limit were not read. */
  | 'truncated'
  /** The file is Strict Open XML; read with the Transitional mapping. */
  | 'strict-conformance';

/** How much it matters. */
export type OgeImportIssueSeverity = 'info' | 'warning' | 'error';

/** One reported issue (aggregated: `count` occurrences, the first one's place). */
export interface OgeImportIssue {
  readonly code: OgeImportIssueCode;
  readonly severity: OgeImportIssueSeverity;
  /** Sheet the issue belongs to, when it belongs to one. */
  readonly sheet?: string;
  /** Package part (`xl/worksheets/sheet2.xml`). */
  readonly part?: string;
  /** A1 reference of the first occurrence. */
  readonly ref?: string;
  readonly count: number;
  /** Technical detail in English, for logs (hosts show their own text per `code`). */
  readonly detail?: string;
}

const SEVERITY: Readonly<Record<OgeImportIssueCode, OgeImportIssueSeverity>> = {
  'missing-part': 'warning',
  'malformed-part': 'error',
  'invalid-reference': 'warning',
  'invalid-style': 'warning',
  'invalid-shared-string': 'warning',
  'invalid-value': 'warning',
  'invalid-sheet-name': 'warning',
  'invalid-defined-name': 'warning',
  'overlapping-merge': 'warning',
  'orphan-shared-formula': 'warning',
  'uncalculated-formulas': 'warning',
  'drawing-not-shown': 'warning',
  'chart-type-not-shown': 'warning',
  'picture-format-not-shown': 'warning',
  'table-style-not-shown': 'warning',
  'pivot-style-not-shown': 'info',
  'extension-not-shown': 'info',
  'conditional-format-needs-formulas': 'info',
  'threaded-comments-as-notes': 'info',
  'split-pane-ignored': 'info',
  'external-link': 'info',
  'macros-kept': 'info',
  truncated: 'error',
  'strict-conformance': 'info',
};

/** Collects issues, folding repeats of a code at one place into a count. */
export class OgeImportIssueLog {
  private readonly entries = new Map<
    string,
    { -readonly [K in keyof OgeImportIssue]: OgeImportIssue[K] }
  >();

  add(
    code: OgeImportIssueCode,
    where: {
      sheet?: string;
      part?: string;
      ref?: string;
      detail?: string;
    } = {},
  ): void {
    const key = JSON.stringify([code, where.sheet ?? '', where.part ?? '']);
    const known = this.entries.get(key);
    if (known) {
      known.count++;
      return;
    }
    this.entries.set(key, {
      code,
      severity: SEVERITY[code],
      ...(where.sheet !== undefined ? { sheet: where.sheet } : {}),
      ...(where.part !== undefined ? { part: where.part } : {}),
      ...(where.ref !== undefined ? { ref: where.ref } : {}),
      count: 1,
      ...(where.detail !== undefined ? { detail: where.detail } : {}),
    });
  }

  /** The issues, in the order first seen. */
  list(): OgeImportIssue[] {
    return [...this.entries.values()].map((issue) => ({ ...issue }));
  }
}
