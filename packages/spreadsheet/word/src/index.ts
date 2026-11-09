// @oge-ui/spreadsheet/word — the Word document viewer (ADR 0006). Its own
// entry so spreadsheet-only applications never load it. Explicit named
// exports only (house rule).
export { OgeWordDocument } from './word-document';
export {
  OGE_WORD_DOCUMENT_CONFIG,
  provideOgeWordDocumentConfig,
} from './config';
export {
  OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
  type OgeWordDocumentConfig,
  type OgeWordDocumentConfigInput,
  type OgeWordDocumentErrorCode,
  type OgeWordDocumentLoadErrorEvent,
  type OgeWordDocumentLoadedEvent,
  type OgeWordDocumentMessages,
  type OgeWordDocumentSource,
} from '@oge-ui/spreadsheet-engine/word';
