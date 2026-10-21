// Explicit named exports only (house rule). The engine is its own package,
// `@oge-ui/spreadsheet-engine` (ADR 0003); the types and defaults a viewer
// consumer needs are re-exported here.
export {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  OGE_SPREADSHEET_CONFIG,
  provideOgeSpreadsheetConfig,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
  type OgeSpreadsheetMessages,
} from './lib/config';
export { OgeSpreadsheet } from './lib/spreadsheet/spreadsheet';
export type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadedEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
  OgeSpreadsheetSource,
} from './lib/spreadsheet/spreadsheet-types';
export type {
  OgeFindOptions,
  OgeImportIssue,
  OgeImportIssueCode,
  OgeWorkbook,
  OgeXlsxError,
} from '@oge-ui/spreadsheet-engine';
