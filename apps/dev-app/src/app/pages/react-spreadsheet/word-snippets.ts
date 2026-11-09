import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React Word preview. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 * Section-for-section mirror of `../spreadsheet/word.ts`.
 */
export const WORD_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/word': ['OgeWordDocument'] },
      name: 'DocumentViewer',
      jsx: `<>
  {/* One element shows a .docx file the way Word does, page by page.
      source takes a URL, the file's bytes or a File; reading happens in the
      browser, with no dependency. Page Up/Down, Home and End move between
      pages. */}
  <OgeWordDocument
    source="/demo/spreadsheet/document.docx"
    style={{ height: 640 }}
  />
</>`,
    }),
  },
  {
    title: 'Controlled page',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet/word': ['OgeWordDocument'] },
      react: ['useState'],
      name: 'ControlledDocument',
      body: `const [page, setPage] = useState(1);`,
      jsx: `<>
  {/* pageIndex keeps the page in your own state: it follows the scrolling
      and scrolls when you set it. */}
  <OgeWordDocument
    source="/demo/spreadsheet/document.docx"
    pageIndex={page}
    onPageIndexChange={setPage}
    style={{ height: 480 }}
  />
</>`,
    }),
  },
];
