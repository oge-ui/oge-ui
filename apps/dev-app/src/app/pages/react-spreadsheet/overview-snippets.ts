import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React Spreadsheet overview. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Section-for-section mirror of `../spreadsheet/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): the same sections, same order, same
 * example content, React idiom.
 */
export const SPREADSHEET_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      use: { '@oge-ui/react-spreadsheet': ['OgeSpreadsheet'] },
      name: 'WorkbookViewer',
      jsx: `<>
  {/* One element shows an .xlsx file the way Excel does: its fonts,
      number formats, borders, fills, conditional formats, frozen panes,
      merges, notes, links and pictures. source takes a URL, the file's
      bytes or a File; reading happens in the browser, with no dependency. */}
  <OgeSpreadsheet
    source="/demo/spreadsheet/structure.xlsx"
    style={{ height: 520 }}
  />
</>`,
    }),
  },
  {
    title: 'Open your own file',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-spreadsheet': ['OgeSpreadsheet'] },
      name: 'OpenWorkbook',
      body: `const [file, setFile] = useState<File | null>(null);
const [issues, setIssues] = useState(0);`,
      jsx: `<>
  {/* Pick or drop any workbook: nothing leaves the browser. What the
      reader could not show as Excel does arrives in onLoaded's issues. */}
  <input
    type="file"
    accept=".xlsx,.xlsm"
    onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
  />
  <OgeSpreadsheet
    source={file}
    onLoaded={(event) => setIssues(event.issues.length)}
    style={{ height: 520 }}
  />
  <p>{issues} things shown differently from Excel</p>
</>`,
    }),
  },
];
