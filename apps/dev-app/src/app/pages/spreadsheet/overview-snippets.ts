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

export const OPEN_FILE_SNIPPET = demoSource({
  use: { '@oge-ui/spreadsheet': ['OgeSpreadsheet'] },
  template: `<!-- Pick or drop any workbook: nothing leaves the browser. What the
     reader could not show as Excel does arrives in (loaded)'s issues. -->
<input type="file" accept=".xlsx,.xlsm" (change)="pick($event)" />
<oge-spreadsheet
  [source]="file()"
  (loaded)="issues.set($event.issues.length)"
  style="height: 520px"
/>
<p>{{ issues() }} things shown differently from Excel</p>`,
  body: `protected readonly file = signal<File | null>(null);
protected readonly issues = signal(0);

protected pick(event: Event): void {
  this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
}`,
});
