export { OgeSpreadsheet } from './lib/spreadsheet';
export type {
  OgeSpreadsheetHandle,
  OgeSpreadsheetProps,
} from './lib/spreadsheet-types';
export {
  OgeSpreadsheetConfigProvider,
  useOgeSpreadsheetConfig,
} from './lib/spreadsheet-config';
// The engine is shared with the Angular package via `@oge-ui/spreadsheet-engine`;
// the types and defaults a viewer consumer needs are re-exported so React
// consumers import one package — the surface the Angular barrel exposes.
export {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  OGE_DEFAULT_SPREADSHEET_MESSAGES,
  type OgeFindOptions,
  type OgeImportIssue,
  type OgeImportIssueCode,
  type OgeSpreadsheetCellClickEvent,
  type OgeSpreadsheetConfig,
  type OgeSpreadsheetConfigInput,
  type OgeSpreadsheetHyperlinkClickEvent,
  type OgeSpreadsheetLoadedEvent,
  type OgeSpreadsheetLoadErrorEvent,
  type OgeSpreadsheetMessages,
  type OgeSpreadsheetSelectionChangeEvent,
  type OgeSpreadsheetSource,
  type OgeWorkbook,
  type OgeXlsxError,
} from '@oge-ui/spreadsheet-engine';
