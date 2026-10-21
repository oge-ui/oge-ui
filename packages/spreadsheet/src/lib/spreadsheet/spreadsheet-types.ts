// The viewer's source and event payloads are the engine's, shared with the
// React layer (ADR 0003); the Angular package re-exports them by name.
export type {
  OgeSpreadsheetCellClickEvent,
  OgeSpreadsheetHyperlinkClickEvent,
  OgeSpreadsheetLoadedEvent,
  OgeSpreadsheetLoadErrorEvent,
  OgeSpreadsheetSelectionChangeEvent,
  OgeSpreadsheetSource,
} from '@oge-ui/spreadsheet-engine';
