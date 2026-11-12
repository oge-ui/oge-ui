// @oge-ui/spreadsheet-engine/import — the import wizard's reader (CSV, TSV,
// xlsx), column matching, conversion and validation, and its state machine.
// A separate entry so applications without an import screen never load it.
// Explicit named exports only (house rule).

export { ogeCheckSpreadsheetLicense } from './lib/license';

export {
  ogeDetectCsvDelimiter,
  ogeImportSheetRows,
  ogeParseCsv,
  ogeReadImportFile,
  type OgeImportBook,
  type OgeImportCellValue,
  type OgeImportSheet,
  type OgeReadImportOptions,
} from './lib/import/read-table';

export {
  OGE_DEFAULT_IMPORT_VALIDATION_MESSAGES,
  ogeAutoMapColumns,
  ogeConvertImportValue,
  ogeValidateImportRows,
  type OgeImportCellError,
  type OgeImportField,
  type OgeImportFieldType,
  type OgeImportParseOptions,
  type OgeImportRowResult,
  type OgeImportValidationMessages,
} from './lib/import/fields';

export {
  OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
  OGE_DEFAULT_IMPORT_WIZARD_MESSAGES,
  OGE_IMPORT_PREVIEW_LIMIT,
  OgeImportWizardCore,
  resolveOgeImportWizardConfig,
  type OgeImportEvent,
  type OgeImportStep,
  type OgeImportWizardConfig,
  type OgeImportWizardConfigInput,
  type OgeImportWizardCoreOptions,
  type OgeImportWizardMessages,
} from './lib/import/wizard-core';
