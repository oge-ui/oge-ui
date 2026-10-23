import { demoSource } from '../../shared/demo-source';

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet': ['OgeSpreadsheet'] },
  template: `<!-- One element shows an .xlsx file the way Excel does: its fonts,
     number formats, borders, fills, conditional formats, frozen panes,
     merges, notes, links and pictures. [source] takes a URL, the file's
     bytes or a File; reading happens in the browser, with no dependency. -->
<oge-spreadsheet
  source="/demo/spreadsheet/structure.xlsx"
  style="height: 520px"
/>`,
});

/**
 * The uploader's words for a workbook opened in the page: it only collects
 * the File, and nothing is sent.
 */
export const OPEN_FILE_MESSAGES = {
  empty: 'No workbook open',
  buttons: { selectSingle: 'Choose a workbook' },
  dropZone: { labelSingle: 'Drop a workbook here or {browse}' },
};

export const OPEN_FILE_SNIPPET = demoSource({
  use: {
    '@oge-ui/spreadsheet': ['OgeSpreadsheet'],
    '@oge-ui/upload': ['OgeFileUploader'],
  },
  template: `<!-- Pick or drop any workbook: nothing leaves the browser — the
     uploader only collects the File. What the reader could not show as
     Excel does arrives in (loaded)'s issues. -->
<oge-file-uploader
  accept=".xlsx,.xlsm"
  [multiple]="false"
  [(value)]="files"
  [messages]="messages"
/>
<oge-spreadsheet
  [source]="files()[0] ?? null"
  (loaded)="issues.set($event.issues.length)"
  style="height: 520px"
/>
<p>{{ issues() }} things shown differently from Excel</p>`,
  body: `protected readonly files = signal<readonly File[]>([]);
protected readonly issues = signal(0);
protected readonly messages = {
  empty: 'No workbook open',
  buttons: { selectSingle: 'Choose a workbook' },
  dropZone: { labelSingle: 'Drop a workbook here or {browse}' },
};`,
});
