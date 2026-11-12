/**
 * The import wizard's state machine, shared by both render layers: a file is
 * read, its columns matched to fields, every row converted and checked, and
 * the valid records handed to the application.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import type {
  OgeSpreadsheetReactiveCell,
  OgeSpreadsheetReactivity,
} from '../view/reactivity';
import {
  OGE_DEFAULT_IMPORT_VALIDATION_MESSAGES,
  ogeAutoMapColumns,
  ogeValidateImportRows,
  type OgeImportField,
  type OgeImportParseOptions,
  type OgeImportRowResult,
  type OgeImportValidationMessages,
} from './fields';
import {
  ogeReadImportFile,
  type OgeImportBook,
  type OgeImportCellValue,
} from './read-table';

/** The four steps, in order. */
export type OgeImportStep = 'file' | 'map' | 'review' | 'done';

/** The wizard's text. ICU plurals where a count is shown. */
export interface OgeImportWizardMessages extends OgeImportValidationMessages {
  readonly wizardLabel: string;
  readonly stepFile: string;
  readonly stepMap: string;
  readonly stepReview: string;
  readonly stepDone: string;
  readonly dropHint: string;
  readonly browse: string;
  readonly fileTypes: string;
  readonly reading: string;
  readonly readError: string;
  readonly noRows: string;
  readonly sheet: string;
  readonly hasHeader: string;
  readonly columnHeader: string;
  readonly sampleHeader: string;
  readonly fieldHeader: string;
  readonly ignoreColumn: string;
  readonly columnName: string;
  readonly requiredMark: string;
  readonly missingRequired: string;
  readonly rowsSummary: string;
  readonly problemsSummary: string;
  readonly showProblemsOnly: string;
  readonly skipInvalid: string;
  readonly previewLimited: string;
  readonly rowHeader: string;
  readonly problemsHeader: string;
  readonly back: string;
  readonly next: string;
  readonly importRows: string;
  readonly doneSummary: string;
  readonly startOver: string;
}

export const OGE_DEFAULT_IMPORT_WIZARD_MESSAGES: OgeImportWizardMessages = {
  ...OGE_DEFAULT_IMPORT_VALIDATION_MESSAGES,
  wizardLabel: 'Import data',
  stepFile: 'Choose a file',
  stepMap: 'Match columns',
  stepReview: 'Review',
  stepDone: 'Done',
  dropHint: 'Drop a file here, or',
  browse: 'choose a file',
  fileTypes: 'CSV, TSV or Excel (.xlsx)',
  reading: 'Reading {name}…',
  readError: 'The file could not be read',
  noRows: 'The file has no rows to import',
  sheet: 'Sheet',
  hasHeader: 'The first row holds column names',
  columnHeader: 'File column',
  sampleHeader: 'Sample',
  fieldHeader: 'Import as',
  ignoreColumn: 'Do not import',
  columnName: 'Column {index}',
  requiredMark: '(required)',
  missingRequired: 'Match the required fields: {fields}',
  rowsSummary: '{valid} of {total, plural, one {# row} other {# rows}} ready',
  problemsSummary:
    '{count, plural, =0 {No problems} one {# row has problems} other {# rows have problems}}',
  showProblemsOnly: 'Show only rows with problems',
  skipInvalid: 'Skip rows with problems',
  previewLimited: 'Showing the first {shown} of {total} rows',
  rowHeader: 'Row',
  problemsHeader: 'Problems',
  back: 'Back',
  next: 'Next',
  importRows: '{count, plural, one {Import # row} other {Import # rows}}',
  doneSummary:
    '{count, plural, one {# row imported} other {# rows imported}}{skipped, plural, =0 {} other {, # skipped}}',
  startOver: 'Import another file',
};

/** Resolved wizard defaults. */
export interface OgeImportWizardConfig {
  readonly messages: OgeImportWizardMessages;
  /** How text cells are parsed: decimal separator, date order, boolean words. */
  readonly parse: OgeImportParseOptions;
}

/** What a config provider accepts. */
export interface OgeImportWizardConfigInput {
  readonly messages?: Partial<OgeImportWizardMessages>;
  readonly parse?: OgeImportParseOptions;
}

export const OGE_DEFAULT_IMPORT_WIZARD_CONFIG: OgeImportWizardConfig = {
  messages: OGE_DEFAULT_IMPORT_WIZARD_MESSAGES,
  parse: {},
};

/** Merges a config input over `base`. */
export function resolveOgeImportWizardConfig(
  config: OgeImportWizardConfigInput | undefined,
  base: OgeImportWizardConfig = OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
): OgeImportWizardConfig {
  if (config === undefined) return base;
  return {
    messages: { ...base.messages, ...config.messages },
    parse: { ...base.parse, ...config.parse },
  };
}

/** Rows shown in the review step at most. */
export const OGE_IMPORT_PREVIEW_LIMIT = 200;

/** What the wizard hands over when the user imports. */
export interface OgeImportEvent<T = Record<string, unknown>> {
  /** The valid records, in file order. */
  readonly records: readonly T[];
  /** Every converted row with its problems (skipped ones included). */
  readonly rows: readonly OgeImportRowResult<T>[];
  /** Rows left out because they had problems. */
  readonly skipped: number;
  /** The file's name. */
  readonly fileName: string;
}

export interface OgeImportWizardCoreOptions<T> {
  readonly reactivity: OgeSpreadsheetReactivity;
  readonly messages: OgeImportWizardMessages;
  readonly fields: readonly OgeImportField<T>[];
  readonly onImport?: (event: OgeImportEvent<T>) => void;
  readonly onStepChange?: (step: OgeImportStep) => void;
}

const STEPS: readonly OgeImportStep[] = ['file', 'map', 'review', 'done'];

/** The wizard's state machine. */
export class OgeImportWizardCore<T = Record<string, unknown>> {
  private readonly stepCell: OgeSpreadsheetReactiveCell<OgeImportStep>;
  private readonly statusCell: OgeSpreadsheetReactiveCell<
    'idle' | 'reading' | 'error'
  >;
  private readonly errorCell: OgeSpreadsheetReactiveCell<string>;
  private readonly fileNameCell: OgeSpreadsheetReactiveCell<string>;
  private readonly bookCell: OgeSpreadsheetReactiveCell<OgeImportBook | null>;
  private readonly sheetCell: OgeSpreadsheetReactiveCell<number>;
  private readonly headerCell: OgeSpreadsheetReactiveCell<boolean>;
  private readonly mappingCell: OgeSpreadsheetReactiveCell<
    readonly (string | null)[]
  >;
  private readonly resultsCell: OgeSpreadsheetReactiveCell<
    readonly OgeImportRowResult<T>[]
  >;
  private readonly problemsOnlyCell: OgeSpreadsheetReactiveCell<boolean>;
  private readonly skipCell: OgeSpreadsheetReactiveCell<boolean>;
  private readonly importedCell: OgeSpreadsheetReactiveCell<{
    count: number;
    skipped: number;
  }>;
  private readonly messagesCell: OgeSpreadsheetReactiveCell<OgeImportWizardMessages>;
  private readonly fieldsCell: OgeSpreadsheetReactiveCell<
    readonly OgeImportField<T>[]
  >;
  private parse: OgeImportParseOptions = {};
  private readId = 0;

  readonly step: () => OgeImportStep;
  readonly status: () => 'idle' | 'reading' | 'error';
  readonly errorText: () => string;
  readonly fileName: () => string;
  readonly messages: () => OgeImportWizardMessages;
  readonly fields: () => readonly OgeImportField<T>[];
  /** Sheet names (one for a CSV file). */
  readonly sheetNames: () => readonly string[];
  readonly sheetIndex: () => number;
  readonly hasHeader: () => boolean;
  /** Column → field key (or `null`, not imported). */
  readonly mapping: () => readonly (string | null)[];
  /** The column titles: the header row, or `Column 1`, `Column 2`… */
  readonly headers: () => readonly string[];
  /** The rows below the header row. */
  readonly dataRows: () => readonly (readonly OgeImportCellValue[])[];
  /** Required fields no column is matched to. */
  readonly missingRequired: () => readonly OgeImportField<T>[];
  readonly canGoNext: () => boolean;
  readonly results: () => readonly OgeImportRowResult<T>[];
  readonly problemCount: () => number;
  readonly validCount: () => number;
  readonly problemsOnly: () => boolean;
  readonly skipInvalid: () => boolean;
  /** The review step's rows (problems only when asked), at most the preview limit. */
  readonly previewRows: () => readonly OgeImportRowResult<T>[];
  /** How many rows the preview would list without the limit. */
  readonly previewTotal: () => number;
  /** The fields that have a column, in mapping order: the review columns. */
  readonly mappedFields: () => readonly OgeImportField<T>[];
  readonly canImport: () => boolean;
  readonly importLabel: () => string;
  readonly rowsSummary: () => string;
  readonly problemsSummary: () => string;
  readonly missingText: () => string;
  readonly doneText: () => string;
  /** `Reading people.csv…` while a file is read. */
  readonly readingText: () => string;
  /** `Showing the first 200 of 950 rows` when the preview is cut short. */
  readonly previewNote: () => string;

  constructor(private readonly options: OgeImportWizardCoreOptions<T>) {
    const rx = options.reactivity;
    this.stepCell = rx.cell<OgeImportStep>('file');
    this.statusCell = rx.cell<'idle' | 'reading' | 'error'>('idle');
    this.errorCell = rx.cell('');
    this.fileNameCell = rx.cell('');
    this.bookCell = rx.cell<OgeImportBook | null>(null);
    this.sheetCell = rx.cell(0);
    this.headerCell = rx.cell(true);
    this.mappingCell = rx.cell<readonly (string | null)[]>([]);
    this.resultsCell = rx.cell<readonly OgeImportRowResult<T>[]>([]);
    this.problemsOnlyCell = rx.cell(false);
    this.skipCell = rx.cell(true);
    this.importedCell = rx.cell({ count: 0, skipped: 0 });
    this.messagesCell = rx.cell(options.messages);
    this.fieldsCell = rx.cell(options.fields);

    this.step = () => this.stepCell();
    this.status = () => this.statusCell();
    this.errorText = () => this.errorCell();
    this.fileName = () => this.fileNameCell();
    this.messages = () => this.messagesCell();
    this.fields = () => this.fieldsCell();
    this.sheetNames = rx.derived(
      () => this.bookCell()?.sheets.map((s) => s.name) ?? [],
    );
    this.sheetIndex = () => this.sheetCell();
    this.hasHeader = () => this.headerCell();
    this.mapping = () => this.mappingCell();
    const rows = rx.derived(
      () => this.bookCell()?.sheets[this.sheetCell()]?.rows ?? [],
    );
    const width = rx.derived(() =>
      rows().reduce((max, row) => Math.max(max, row.length), 0),
    );
    this.headers = rx.derived(() => {
      const first = this.headerCell() ? rows()[0] : undefined;
      return Array.from({ length: width() }, (_, i) => {
        const text = first?.[i];
        const title =
          text === null || text === undefined ? '' : cellText(text).trim();
        return (
          title ||
          ogeFormatMessage(this.messagesCell().columnName, { index: i + 1 })
        );
      });
    });
    this.dataRows = rx.derived(() =>
      this.headerCell() ? rows().slice(1) : rows(),
    );
    this.missingRequired = rx.derived(() => {
      const mapped = new Set(this.mappingCell());
      return this.fieldsCell().filter(
        (f) => f.required && !mapped.has(f.field),
      );
    });
    this.canGoNext = rx.derived(() => {
      switch (this.stepCell()) {
        case 'map':
          return (
            this.missingRequired().length === 0 &&
            this.mappingCell().some((m) => m !== null) &&
            this.dataRows().length > 0
          );
        default:
          return false;
      }
    });
    this.results = () => this.resultsCell();
    this.problemCount = rx.derived(
      () => this.resultsCell().filter((r) => r.errors.length).length,
    );
    this.validCount = rx.derived(
      () => this.resultsCell().length - this.problemCount(),
    );
    this.problemsOnly = () => this.problemsOnlyCell();
    this.skipInvalid = () => this.skipCell();
    const listed = rx.derived(() =>
      this.problemsOnlyCell()
        ? this.resultsCell().filter((r) => r.errors.length)
        : this.resultsCell(),
    );
    this.previewRows = rx.derived(() =>
      listed().slice(0, OGE_IMPORT_PREVIEW_LIMIT),
    );
    this.previewTotal = () => listed().length;
    this.mappedFields = rx.derived(() => {
      const byKey = new Map(this.fieldsCell().map((f) => [f.field, f]));
      return this.mappingCell()
        .filter((m): m is string => m !== null)
        .map((m) => byKey.get(m as keyof T & string))
        .filter((f): f is OgeImportField<T> => f !== undefined);
    });
    this.canImport = rx.derived(
      () =>
        this.validCount() > 0 && (this.skipCell() || this.problemCount() === 0),
    );
    this.importLabel = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().importRows, {
        count: this.validCount(),
      }),
    );
    this.rowsSummary = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().rowsSummary, {
        valid: this.validCount(),
        total: this.resultsCell().length,
      }),
    );
    this.problemsSummary = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().problemsSummary, {
        count: this.problemCount(),
      }),
    );
    this.missingText = rx.derived(() =>
      this.missingRequired().length
        ? ogeFormatMessage(this.messagesCell().missingRequired, {
            fields: this.missingRequired()
              .map((f) => f.label)
              .join(', '),
          })
        : '',
    );
    this.readingText = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().reading, {
        name: this.fileNameCell(),
      }),
    );
    this.previewNote = rx.derived(() =>
      listed().length > OGE_IMPORT_PREVIEW_LIMIT
        ? ogeFormatMessage(this.messagesCell().previewLimited, {
            shown: OGE_IMPORT_PREVIEW_LIMIT,
            total: listed().length,
          })
        : '',
    );
    this.doneText = rx.derived(() =>
      ogeFormatMessage(this.messagesCell().doneSummary, this.importedCell()),
    );
  }

  /** The step's position, 0–3. */
  stepIndex(step: OgeImportStep = this.stepCell()): number {
    return STEPS.indexOf(step);
  }

  setMessages(messages: OgeImportWizardMessages): void {
    this.messagesCell.set(messages);
  }

  setFields(fields: readonly OgeImportField<T>[]): void {
    if (fields === this.fieldsCell()) return;
    this.fieldsCell.set(fields);
    if (this.bookCell()) this.autoMap();
  }

  setParseOptions(options: OgeImportParseOptions): void {
    this.parse = options;
  }

  /** Reads a file and moves to the mapping step. */
  async load(
    file: Blob | ArrayBuffer | Uint8Array,
    name?: string,
  ): Promise<void> {
    const id = ++this.readId;
    const fileName = name ?? (file as { name?: string }).name ?? '';
    this.fileNameCell.set(fileName);
    this.statusCell.set('reading');
    this.errorCell.set('');
    let book: OgeImportBook;
    try {
      book = await ogeReadImportFile(file, { name: fileName });
    } catch {
      if (id !== this.readId) return;
      this.fail(this.messagesCell().readError);
      return;
    }
    if (id !== this.readId) return;
    if (!book.sheets.some((sheet) => sheet.rows.length > 0)) {
      this.fail(this.messagesCell().noRows);
      return;
    }
    this.bookCell.set(book);
    this.sheetCell.set(
      Math.max(
        0,
        book.sheets.findIndex((sheet) => sheet.rows.length > 0),
      ),
    );
    this.headerCell.set(true);
    this.autoMap();
    this.statusCell.set('idle');
    this.goTo('map');
  }

  selectSheet(index: number): void {
    if (index === this.sheetCell() || !this.bookCell()?.sheets[index]) return;
    this.sheetCell.set(index);
    this.autoMap();
  }

  setHasHeader(hasHeader: boolean): void {
    if (hasHeader === this.headerCell()) return;
    this.headerCell.set(hasHeader);
    this.autoMap();
  }

  /** Matches `column` to a field (`null`: not imported); a field moves off any other column. */
  setMapping(column: number, field: string | null): void {
    const next = this.mappingCell().map((m, i) =>
      i === column ? field : field !== null && m === field ? null : m,
    );
    this.mappingCell.set(next);
  }

  /** A few non-empty values of a column, for the mapping step. */
  sampleOf(column: number, count = 3): string {
    const out: string[] = [];
    for (const row of this.dataRows()) {
      const value = row[column];
      if (value !== null && value !== undefined && cellText(value).trim()) {
        out.push(cellText(value));
        if (out.length === count) break;
      }
    }
    return out.join(', ');
  }

  /** The text a review cell shows: the converted value, or the raw one for a problem. */
  cellOf(result: OgeImportRowResult<T>, field: OgeImportField<T>): string {
    if (this.errorOf(result, field)) {
      const column = this.mappingCell().indexOf(field.field);
      const raw = this.dataRows()[result.index]?.[column];
      return raw === null || raw === undefined ? '' : cellText(raw);
    }
    const value = (result.record as Record<string, unknown>)[field.field];
    return value === null || value === undefined ? '' : cellText(value);
  }

  /** The problem of a review cell, `''` when there is none. */
  errorOf(result: OgeImportRowResult<T>, field: OgeImportField<T>): string {
    return result.errors.find((e) => e.field === field.field)?.message ?? '';
  }

  setProblemsOnly(value: boolean): void {
    this.problemsOnlyCell.set(value);
  }

  setSkipInvalid(value: boolean): void {
    this.skipCell.set(value);
  }

  next(): void {
    if (this.stepCell() === 'map' && this.canGoNext()) {
      this.resultsCell.set(
        ogeValidateImportRows(
          this.dataRows(),
          this.mappingCell(),
          this.fieldsCell(),
          {
            ...this.parse,
            messages: this.messagesCell(),
          },
        ),
      );
      this.problemsOnlyCell.set(false);
      this.goTo('review');
    }
  }

  back(): void {
    const step = this.stepCell();
    if (step === 'review') this.goTo('map');
    else if (step === 'map') this.reset();
  }

  /** Hands the valid records over and shows the summary. */
  import(): void {
    if (this.stepCell() !== 'review' || !this.canImport()) return;
    const rows = this.resultsCell();
    const valid = rows.filter((r) => r.errors.length === 0);
    const skipped = rows.length - valid.length;
    this.importedCell.set({ count: valid.length, skipped });
    this.options.onImport?.({
      records: valid.map((r) => r.record as T),
      rows,
      skipped,
      fileName: this.fileNameCell(),
    });
    this.goTo('done');
  }

  /** Back to the file step, forgetting the file. */
  reset(): void {
    this.readId++;
    this.bookCell.set(null);
    this.mappingCell.set([]);
    this.resultsCell.set([]);
    this.fileNameCell.set('');
    this.statusCell.set('idle');
    this.errorCell.set('');
    this.goTo('file');
  }

  private autoMap(): void {
    const headers = this.headers();
    this.mappingCell.set(
      this.headerCell()
        ? ogeAutoMapColumns(
            headers,
            this.fieldsCell() as readonly OgeImportField<never>[],
          )
        : headers.map(() => null),
    );
  }

  private fail(message: string): void {
    this.errorCell.set(message);
    this.statusCell.set('error');
  }

  private goTo(step: OgeImportStep): void {
    if (step === this.stepCell()) return;
    this.stepCell.set(step);
    this.options.onStepChange?.(step);
  }
}

function cellText(value: unknown): string {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    return value.getHours() || value.getMinutes()
      ? `${day} ${pad(value.getHours())}:${pad(value.getMinutes())}`
      : day;
  }
  return String(value);
}
