import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_PDF_VIEWER_API,
  OGE_REACT_PRESENTATION_API,
  OGE_REACT_SPREADSHEET_API,
  OGE_REACT_WORD_DOCUMENT_API,
} from './react-spreadsheet-api-data';

/**
 * The React half of the Spreadsheet API reference.
 *
 * Not a route of its own — it renders inside `/components/spreadsheet/api`
 * when the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table. The block mirrors the Angular page exactly, so the two views read as
 * one page across the switch and the parity gate can diff them member by
 * member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-spreadsheet`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-spreadsheet-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgeSpreadsheet&gt;"
      [sections]="spreadsheetApi"
    />
    <app-api-reference
      title="&lt;OgePresentation&gt;"
      [sections]="presentationApi"
    />
    <app-api-reference title="&lt;OgeWordDocument&gt;" [sections]="wordApi" />
    <app-api-reference title="&lt;OgePdfViewer&gt;" [sections]="pdfApi" />
  `,
})
export class ReactSpreadsheetApiSections {
  protected readonly spreadsheetApi = OGE_REACT_SPREADSHEET_API;
  protected readonly presentationApi = OGE_REACT_PRESENTATION_API;
  protected readonly wordApi = OGE_REACT_WORD_DOCUMENT_API;
  protected readonly pdfApi = OGE_REACT_PDF_VIEWER_API;
}
