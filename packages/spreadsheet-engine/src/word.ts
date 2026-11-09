// @oge-ui/spreadsheet-engine/word — the docx reader, the Word page layout and
// the viewer core (ADR 0006). A separate entry so spreadsheet-only
// applications never load it. Explicit named exports only (house rule).

export {
  OgeDocxError,
  readOgeDocx,
  readOgeDocxSync,
  type OgeDocxErrorCode,
  type OgeDocxReadOptions,
  type OgeDocxReadResult,
  type OgeDocxSource,
} from './lib/word/read-docx';

export {
  ogeLayoutWordDocument,
  type OgeWordLaidLine,
  type OgeWordLaidPage,
  type OgeWordLayoutOptions,
} from './lib/word/layout';

export { ogeCheckSpreadsheetLicense } from './lib/license';

export {
  OGE_DEFAULT_WORD_DOCUMENT_CONFIG,
  OGE_DEFAULT_WORD_DOCUMENT_MESSAGES,
  OgeWordDocumentCore,
  ogeVisibleWordPages,
  resolveOgeWordDocumentConfig,
  type OgeWordDocumentConfig,
  type OgeWordDocumentConfigInput,
  type OgeWordDocumentCoreOptions,
  type OgeWordDocumentErrorCode,
  type OgeWordDocumentLoadErrorEvent,
  type OgeWordDocumentLoadedEvent,
  type OgeWordDocumentMessages,
  type OgeWordDocumentSource,
} from './lib/word/viewer-core';

export type {
  OgeWordBlock,
  OgeWordBorder,
  OgeWordCell,
  OgeWordDocument,
  OgeWordEdge,
  OgeWordFloat,
  OgeWordFloatPosition,
  OgeWordHeaderSet,
  OgeWordInline,
  OgeWordLineSpacing,
  OgeWordPageSetup,
  OgeWordParagraph,
  OgeWordPicture,
  OgeWordRow,
  OgeWordRunStyle,
  OgeWordSection,
  OgeWordTab,
  OgeWordTable,
  OgeWordWrap,
} from './lib/word/model';
