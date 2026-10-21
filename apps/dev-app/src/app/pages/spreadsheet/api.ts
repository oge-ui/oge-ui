import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactSpreadsheetApiSections } from '../react-spreadsheet/api';
import { OGE_SPREADSHEET_API } from './spreadsheet-api-data';

const SECTIONS = ['OgeSpreadsheet'] as const;

/** TOC of the React view — must mirror `ReactSpreadsheetApiSections`' titles. */
const SECTIONS_REACT = ['<OgeSpreadsheet>'] as const;

@Component({
  selector: 'app-spreadsheet-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactSpreadsheetApiSections,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Spreadsheet API"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-spreadsheet</code>.
          Everything that is not markup — the xlsx reader, the Excel-measured
          layout and paint, the selection, keyboard map, find, copy and the
          announcements — is the framework-free
          <code>&#64;oge-ui/spreadsheet-engine</code>, shared with the Angular
          viewer; live demos are on the
          <a
            routerLink="/components/spreadsheet"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/spreadsheet</code>.
          Everything that is not markup — the xlsx reader, the Excel-measured
          layout and paint, the selection, keyboard map, find, copy and the
          announcements — is the framework-free
          <code>&#64;oge-ui/spreadsheet-engine</code>, shared with the React
          viewer; live demos are on the
          <a
            routerLink="/components/spreadsheet"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          page.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-spreadsheet-api />
    } @else {
      <app-api-reference
        title="OgeSpreadsheet"
        selector="oge-spreadsheet"
        [sections]="spreadsheetApi"
      />
    }

    <h3>Notes</h3>
    <ul>
      <li>
        The grid is a <code>role="grid"</code> whose active cell is its
        <code>aria-activedescendant</code>: a screen reader hears the address,
        what the cell shows, its formula, a merge, a link and a note as you
        move. Range selections, sheet switches, copying, zooming and find
        results are announced through a polite live region; the sheet tabs are a
        <code>role="tablist"</code> with one Tab stop.
      </li>
      <li>
        What you see is measured, not approximated: column widths and row
        heights come from Excel's own font metrics, text fitting and number
        formats from thousands of samples captured on a real Excel, and borders,
        fills, gridlines and the selection were diffed against Excel's screen
        pixel by pixel.
      </li>
      <li>
        Macros are kept and never run; the viewer says so in a message bar.
        Charts and shapes are kept for saving but not drawn yet — the
        @if (fw.isReact()) {
          <code>onLoaded</code>
        } @else {
          <code>loaded</code>
        }
        event's <code>issues</code> lists everything shown differently from
        Excel.
      </li>
      <li>
        Pictures are shown from <code>blob:</code> URLs and the cells' pattern
        fills from <code>data:</code> SVGs: a strict CSP needs
        <code>img-src 'self' data: blob:</code>.
      </li>
    </ul>
  `,
})
export class SpreadsheetApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly spreadsheetApi = OGE_SPREADSHEET_API;
}
