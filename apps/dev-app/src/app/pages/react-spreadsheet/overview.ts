import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeSpreadsheet } from '@oge-ui/react-spreadsheet';
import { OgeFileUploader } from '@oge-ui/react-upload';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { OPEN_FILE_MESSAGES } from '../spreadsheet/overview-snippets';
import { SPREADSHEET_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_SPREADSHEET_OVERVIEW_SECTIONS = [
  'Getting started',
  'Open your own file',
] as const;

const SAMPLES = [
  { file: 'structure.xlsx', label: 'Frozen panes, links, notes, filters' },
  { file: 'styles.xlsx', label: 'Fonts, fills, borders, alignment, formats' },
  { file: 'formulas.xlsx', label: 'Formulas and dynamic arrays' },
  { file: 'pictures.xlsx', label: 'Pictures' },
  { file: 'charts.xlsx', label: 'Charts' },
  { file: 'tables.xlsx', label: 'Tables' },
] as const;

const BUTTON = 'rounded border px-2 py-1 text-sm';

function GettingStartedDemo(): ReactNode {
  const [current, setCurrent] = useState<string>(SAMPLES[0].file);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      SAMPLES.map((sample) =>
        createElement(
          'button',
          {
            key: sample.file,
            type: 'button',
            className:
              sample.file === current ? `${BUTTON} font-semibold` : BUTTON,
            onClick: () => setCurrent(sample.file),
          },
          sample.label,
        ),
      ),
    ),
    createElement(OgeSpreadsheet, {
      source: `/demo/spreadsheet/${current}`,
      style: { height: 520 },
    }),
  );
}

function OpenFileDemo(): ReactNode {
  const [files, setFiles] = useState<readonly File[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  return createElement(
    'div',
    null,
    createElement(
      'div',
      { className: 'mb-3' },
      createElement(OgeFileUploader, {
        accept: '.xlsx,.xlsm',
        multiple: false,
        value: files,
        onValueChange: setFiles,
        messages: OPEN_FILE_MESSAGES,
      }),
    ),
    createElement(OgeSpreadsheet, {
      source: files[0] ?? null,
      onLoaded: (event) =>
        setIssues(
          event.issues.map(
            (issue) => `${issue.code}${issue.sheet ? ` (${issue.sheet})` : ''}`,
          ),
        ),
      style: { height: 520 },
    }),
    issues.length
      ? createElement(
          'ul',
          { className: 'mt-2 list-disc ps-5 text-sm text-slate-500' },
          issues.map((issue, i) => createElement('li', { key: i }, issue)),
        )
      : null,
  );
}

@Component({
  selector: 'app-react-spreadsheet-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React viewer carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/spreadsheet/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['source', 'frozen panes', 'notes', 'links', 'status bar']"
      heading="Getting started"
      description="Point <code>source</code> at a workbook. Arrows, Ctrl+arrows, Shift to extend, Ctrl+A, Ctrl+F, Ctrl+C, Ctrl+Page Down and Ctrl+wheel work as in Excel; the status bar sums the selection."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['File', 'onLoaded', 'issues']"
      heading="Open your own file"
      description="Pick any workbook — it is read in your browser and never uploaded. <code>onLoaded</code> lists what could not be shown as Excel shows it."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="openFile" />
    </app-demo-card>
  `,
})
export class ReactSpreadsheetOverviewDemos {
  protected readonly demos = SPREADSHEET_OVERVIEW_DEMOS;

  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly openFile = () => createElement(OpenFileDemo);
}
