/**
 * Every user-facing string of the spreadsheet (house rule: messages live in
 * the engine's catalog; `@oge-ui/locales` ships a typed `spreadsheet` slice).
 * Entries are plain templates: `{name}` placeholders and ICU plurals, filled
 * by `ogeFormatMessage` from `@oge-ui/core` in the viewer's locale — so a
 * translation pack is data, checked by the locale gate like every family's.
 */
import type { OgeImportIssueCode } from '../codec/import-issues';
import type { OgeXlsxErrorCode } from '../codec/read-xlsx';

/** The spreadsheet's messages. */
export interface OgeSpreadsheetMessages {
  /** Accessible name of the grid. */
  readonly gridLabel: string;
  /** Accessible name of the sheet tab strip. */
  readonly sheetTabsLabel: string;
  readonly nameBoxLabel: string;
  readonly formulaBarLabel: string;
  /** Tooltip of the select-all corner. */
  readonly selectAllLabel: string;
  readonly loading: string;
  readonly empty: string;
  /** Why a workbook could not be opened, per `OgeXlsxErrorCode`. */
  readonly errors: Readonly<Record<OgeXlsxErrorCode, string>>;
  /** What an import issue means, per `OgeImportIssueCode` — for a host's banner or log. */
  readonly issues: Readonly<Record<OgeImportIssueCode, string>>;
  /** How many things are shown differently from Excel: `{count}`. */
  readonly issuesSummary: string;
  readonly find: string;
  readonly findPlaceholder: string;
  readonly findNext: string;
  readonly findPrevious: string;
  readonly matchCase: string;
  readonly matchEntireCell: string;
  readonly searchWorkbook: string;
  readonly close: string;
  /** The current match: `{index}` of `{total}` (1-based). */
  readonly findResult: string;
  readonly noMatches: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  /** The zoom slider's name and the zoom announcement: `{percent}`. */
  readonly zoomLabel: string;
  /** After a copy: `{cells}`. */
  readonly copied: string;
  readonly multipleSelectionCopy: string;
  /** The active cell, as a screen reader hears it: `{address}`, `{text}` (what it shows). */
  readonly cellAnnouncement: string;
  /** `{text}` of an empty cell. */
  readonly emptyCell: string;
  /** Joins the parts of an announcement — the cell, its formula, merge, link and note; a find result and its cell. */
  readonly announcementSeparator: string;
  /** The cell's note: `{text}`. */
  readonly hasNote: string;
  /** The cell's note with its author: `{author}`, `{text}`. */
  readonly hasNoteBy: string;
  /** The cell's hyperlink: `{target}`. */
  readonly hasLink: string;
  /** The merge the cell belongs to: `{range}`. */
  readonly mergedCell: string;
  /** The cell's formula: `{formula}`. */
  readonly hasFormula: string;
  /** A range selection: `{range}`, `{cells}`. */
  readonly selectionAnnouncement: string;
  /** A sheet switch: `{name}`, `{index}` of `{total}` visible sheets. */
  readonly sheetAnnouncement: string;
  /** Accessible name of a note shown over the grid. */
  readonly notePopupLabel: string;
  readonly macrosNotice: string;
  /** Accessible name of the status bar. */
  readonly statusBarLabel: string;
  /** Status bar items: the selection's average and sum (`{value}`, formatted), its count (`{count}`). */
  readonly statusAverage: string;
  readonly statusCount: string;
  readonly statusSum: string;
  /** The sheet strip's scroll buttons. */
  readonly previousSheets: string;
  readonly nextSheets: string;
}

/** English defaults. */
export const OGE_DEFAULT_SPREADSHEET_MESSAGES: OgeSpreadsheetMessages = {
  gridLabel: 'Spreadsheet',
  sheetTabsLabel: 'Sheets',
  nameBoxLabel: 'Name box',
  formulaBarLabel: 'Formula bar',
  selectAllLabel: 'Select all',
  loading: 'Opening workbook…',
  empty: 'No workbook',
  errors: {
    'not-xlsx': 'This is not an Excel workbook (.xlsx, .xlsm).',
    'encrypted-or-legacy':
      'The workbook is password-protected or in the old .xls format.',
    xlsb: 'Binary workbooks (.xlsb) cannot be opened.',
    corrupt: 'The workbook is damaged and cannot be opened.',
    'too-large': 'The workbook is too large to open.',
    aborted: 'Opening the workbook was cancelled.',
    'fetch-failed': 'The workbook could not be downloaded.',
  },
  issues: {
    'missing-part': 'A part of the file is missing',
    'malformed-part': 'A part of the file is damaged and was skipped',
    'invalid-reference': 'Unreadable cell references were skipped',
    'invalid-style': 'Unknown cell styles show as the default style',
    'invalid-shared-string': 'Missing shared texts show empty',
    'invalid-value': 'Unreadable values were skipped',
    'invalid-sheet-name': 'Sheets with invalid names were renamed',
    'invalid-defined-name': 'Invalid defined names were dropped',
    'overlapping-merge': 'Overlapping merged cells were unmerged',
    'orphan-shared-formula':
      'Some formulas have no source and show values only',
    'uncalculated-formulas': 'Formulas without a saved result show empty',
    'drawing-not-shown': 'Charts and shapes are not shown yet',
    'picture-format-not-shown': 'EMF/WMF pictures cannot be shown',
    'table-style-not-shown': 'Table styles are not shown yet',
    'pivot-style-not-shown': 'Pivot table styles are not shown yet',
    'extension-not-shown': 'Sparklines are not shown yet',
    'conditional-format-needs-formulas':
      'Conditional formats with formulas are not applied yet',
    'threaded-comments-as-notes': 'Threaded comments show as notes',
    'split-pane-ignored': 'The split window shows unsplit',
    'external-link': 'Links to other workbooks are kept but not updated',
    'macros-kept': 'Macros are kept but never run',
    truncated: 'The workbook is too large and was cut short',
    'strict-conformance': 'Strict Open XML file',
  },
  issuesSummary:
    '{count, plural, one {# thing is not shown as in Excel} other {# things are not shown as in Excel}}',
  find: 'Find',
  findPlaceholder: 'Find in sheet',
  findNext: 'Find next',
  findPrevious: 'Find previous',
  matchCase: 'Match case',
  matchEntireCell: 'Match entire cell',
  searchWorkbook: 'Search all sheets',
  close: 'Close',
  findResult: '{index} of {total}',
  noMatches: 'No matches',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomLabel: 'Zoom {percent}%',
  copied: '{cells, plural, one {Copied # cell} other {Copied # cells}}',
  multipleSelectionCopy: 'Copy works on one selected range at a time',
  cellAnnouncement: '{address}, {text}',
  announcementSeparator: ', ',
  emptyCell: 'blank',
  hasNote: 'Note: {text}',
  hasNoteBy: 'Note by {author}: {text}',
  hasLink: 'Link to {target}, Alt+Enter to open',
  mergedCell: 'merged {range}',
  hasFormula: 'formula {formula}',
  selectionAnnouncement:
    '{range} selected, {cells, plural, one {# cell} other {# cells}}',
  sheetAnnouncement: 'Sheet {name}, {index} of {total}',
  notePopupLabel: 'Note',
  macrosNotice: 'This workbook has macros. They are kept and never run.',
  statusBarLabel: 'Status bar',
  statusAverage: 'Average: {value}',
  statusCount: 'Count: {count}',
  statusSum: 'Sum: {value}',
  previousSheets: 'Scroll to the previous sheets',
  nextSheets: 'Scroll to the next sheets',
};

/** Merges a partial catalog over the defaults (a nested block replaces the default block whole). */
export function resolveOgeSpreadsheetMessages(
  messages: Partial<OgeSpreadsheetMessages> | undefined,
): OgeSpreadsheetMessages {
  return messages
    ? { ...OGE_DEFAULT_SPREADSHEET_MESSAGES, ...messages }
    : OGE_DEFAULT_SPREADSHEET_MESSAGES;
}
