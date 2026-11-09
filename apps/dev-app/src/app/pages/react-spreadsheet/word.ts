import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeWordDocument } from '@oge-ui/react-spreadsheet/word';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { WORD_DEMOS } from './word-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_WORD_SECTIONS = [
  'Getting started',
  'Controlled page',
] as const;

const SOURCE = '/demo/spreadsheet/document.docx';

function ControlledDemo(): ReactNode {
  const [page, setPage] = useState(1);
  return createElement(OgeWordDocument, {
    source: SOURCE,
    pageIndex: page,
    onPageIndexChange: setPage,
    style: { height: 480 },
  });
}

@Component({
  selector: 'app-react-word-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React viewer carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrls: ['../../../../../../packages/react/spreadsheet/src/styles.scss'],
  template: `
    <app-demo-card
      [chips]="['source', 'pages', 'keyboard']"
      heading="Getting started"
      description="Point <code>source</code> at a document. Page Up, Page Down, Home and End move between pages, and pages are drawn only when they come near the viewport."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pageIndex']"
      heading="Controlled page"
      description="<code>pageIndex</code> with <code>onPageIndexChange</code> keeps the page in your own state: it follows the scrolling and scrolls when you set it."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="controlled" />
    </app-demo-card>
  `,
})
export class ReactWordDemos {
  protected readonly demos = WORD_DEMOS;
  protected readonly gettingStarted = () =>
    createElement(OgeWordDocument, { source: SOURCE, style: { height: 640 } });
  protected readonly controlled = () => createElement(ControlledDemo);
}
