import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeSpreadsheet,
  type OgeSpreadsheetLoadedEvent,
} from '@oge-ui/spreadsheet';
import { OgeFileUploader } from '@oge-ui/upload';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SPREADSHEET_OVERVIEW_SECTIONS,
  ReactSpreadsheetOverviewDemos,
} from '../react-spreadsheet/overview';
import {
  GETTING_STARTED_SNIPPET,
  OPEN_FILE_MESSAGES,
  OPEN_FILE_SNIPPET,
} from './overview-snippets';

const SECTIONS = ['Getting started', 'Open your own file'] as const;

const SAMPLES = [
  { file: 'structure.xlsx', label: 'Frozen panes, links, notes, filters' },
  { file: 'styles.xlsx', label: 'Fonts, fills, borders, alignment, formats' },
  { file: 'formulas.xlsx', label: 'Formulas and dynamic arrays' },
  { file: 'pictures.xlsx', label: 'Pictures' },
  { file: 'charts.xlsx', label: 'Charts' },
  { file: 'tables.xlsx', label: 'Tables' },
  { file: 'sparklines.xlsx', label: 'Sparklines' },
] as const;

@Component({
  selector: 'app-spreadsheet-overview',
  imports: [
    DemoCard,
    DocHeader,
    OgeFileUploader,
    OgeSpreadsheet,
    PageToc,
    ReactSpreadsheetOverviewDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Spreadsheet"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="[
        'xlsx viewer',
        'Excel-measured',
        'frozen panes',
        'no dependencies',
      ]"
    >
      <p>
        A spreadsheet viewer that shows <code>.xlsx</code> workbooks the way
        Excel does. Column widths, row heights, text fitting, number formats,
        border precedence, the gridlines and the selection are measured from
        Excel itself — thousands of samples captured on a real Excel — not
        approximated. The workbook is read in the browser by a dependency-free
        reader; macros are kept and never run.
      </p>
      <p>
        The same engine — <code>&#64;oge-ui/spreadsheet-engine</code>,
        framework-free — runs the Angular
        <code>&lt;oge-spreadsheet&gt;</code> and the React
        <code>&lt;OgeSpreadsheet&gt;</code>, with the same markup and
        stylesheet: a workbook looks and works the same in both.
      </p>
      <p>
        @if (fw.isReact()) {
          <code>&#64;oge-ui/react-spreadsheet</code>
        } @else {
          <code>&#64;oge-ui/spreadsheet</code>
        }
        is a commercial package — free for evaluation and development, with no
        notice on development hosts; production use needs a license key. See
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-spreadsheet-overview-demos />
    } @else {
      <app-demo-card
        [chips]="['source', 'frozen panes', 'notes', 'links', 'status bar']"
        heading="Getting started"
        description="Point <code>source</code> at a workbook. Arrows, Ctrl+arrows, Shift to extend, Ctrl+A, Ctrl+F, Ctrl+C, Ctrl+Page Down and Ctrl+wheel work as in Excel; the status bar sums the selection."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          @for (sample of samples; track sample.file) {
            <button
              type="button"
              class="rounded border px-2 py-1 text-sm"
              [class.font-semibold]="sample.file === current()"
              (click)="current.set(sample.file)"
            >
              {{ sample.label }}
            </button>
          }
        </div>
        <oge-spreadsheet
          [source]="'/demo/spreadsheet/' + current()"
          style="height: 520px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['File', 'loaded', 'issues']"
        heading="Open your own file"
        description="Pick any workbook — it is read in your browser and never uploaded. <code>(loaded)</code> lists what could not be shown as Excel shows it."
        [code]="openFileSnippet"
        language="ts"
      >
        <oge-file-uploader
          class="mb-3 block"
          accept=".xlsx,.xlsm"
          [multiple]="false"
          [(value)]="files"
          [messages]="uploadMessages"
        />
        <oge-spreadsheet
          [source]="files()[0] ?? null"
          (loaded)="onLoaded($event)"
          style="height: 520px"
        />
        @if (issues().length) {
          <ul class="mt-2 list-disc ps-5 text-sm text-slate-500">
            @for (issue of issues(); track $index) {
              <li>{{ issue }}</li>
            }
          </ul>
        }
      </app-demo-card>
    }
  `,
})
export class SpreadsheetOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SPREADSHEET_OVERVIEW_SECTIONS;
  protected readonly samples = SAMPLES;
  protected readonly current = signal<string>(SAMPLES[0].file);
  protected readonly files = signal<readonly File[]>([]);
  protected readonly issues = signal<string[]>([]);
  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly openFileSnippet = OPEN_FILE_SNIPPET;
  /** The file is opened here, never sent anywhere. */
  protected readonly uploadMessages = OPEN_FILE_MESSAGES;

  protected onLoaded(event: OgeSpreadsheetLoadedEvent): void {
    this.issues.set(
      event.issues.map(
        (issue) => `${issue.code}${issue.sheet ? ` (${issue.sheet})` : ''}`,
      ),
    );
  }
}
