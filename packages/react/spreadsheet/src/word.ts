// @oge-ui/react-spreadsheet/word — the Word document viewer (ADR 0006).
// Its own entry so spreadsheet-only applications never load it.
export {
  OgeWordDocument,
  type OgeWordDocumentProps,
} from './lib/word-document';
export {
  OgeWordDocumentConfigProvider,
  useOgeWordDocumentConfig,
} from './lib/word-document-config';
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
