import { demoSource } from '../../shared/demo-source';

export const WORD_GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/word': ['OgeWordDocument'] },
  template: `<!-- One element shows a .docx file the way Word does, page by page.
     [source] takes a URL, the file's bytes or a File; reading happens in the
     browser, with no dependency. Page Up/Down, Home and End move between
     pages. -->
<oge-word-document
  source="/demo/spreadsheet/document.docx"
  style="height: 640px"
/>`,
});

export const WORD_CONTROLLED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet/word': ['OgeWordDocument'] },
  body: `readonly page = signal(1);`,
  template: `<!-- [(pageIndex)] keeps the page in your own state: it follows the
     scrolling and scrolls when you set it. -->
<oge-word-document
  source="/demo/spreadsheet/document.docx"
  [(pageIndex)]="page"
  style="height: 480px"
/>`,
});
