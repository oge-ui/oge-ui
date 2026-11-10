import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgeWordDocument } from '@oge-ui/spreadsheet/word';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { REACT_WORD_SECTIONS, ReactWordDemos } from '../react-spreadsheet/word';
import {
  WORD_CONTROLLED_SNIPPET,
  WORD_GETTING_STARTED_SNIPPET,
} from './word-snippets';

const SECTIONS = ['Getting started', 'Controlled page'] as const;

@Component({
  selector: 'app-word-page',
  imports: [
    DemoCard,
    DocHeader,
    OgeWordDocument,
    PageToc,
    ReactWordDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Word preview"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="['docx viewer', 'Word-measured', 'no dependencies']"
    >
      <p>
        A read-only viewer that shows <code>.docx</code> documents the way Word
        does, page by page. The style chain, numbering, table styles, line
        spacing, line breaks and page breaks are measured against Word itself.
        The file is read in the browser by a dependency-free reader; macros and
        embedded objects never run and external links are never fetched.
        Hyperlinks to external targets are drawn as links that open in a new tab
        (<code>rel="noopener noreferrer"</code>); only <code>http</code>,
        <code>https</code>, <code>mailto</code>, <code>tel</code>,
        <code>ftp</code> and <code>sms</code> targets become links, so a
        <code>javascript:</code> or <code>data:</code> target stays plain text.
      </p>
      <p>
        It ships as its own entry point of the spreadsheet packages, so an
        application that only shows workbooks never loads it, and it is covered
        by the same
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >license</a
        >. Line and page breaks follow the fonts the browser has: where a
        document's fonts are missing, a metric-compatible face is used when
        there is one.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-word-demos />
    } @else {
      <app-demo-card
        [chips]="['source', 'pages', 'keyboard']"
        heading="Getting started"
        description="Point <code>source</code> at a document. Page Up, Page Down, Home and End move between pages, and pages are drawn only when they come near the viewport."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-word-document
          source="/demo/spreadsheet/document.docx"
          style="height: 640px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['pageIndex']"
        heading="Controlled page"
        description="<code>[(pageIndex)]</code> keeps the page in your own state: it follows the scrolling and scrolls when you set it."
        [code]="controlledSnippet"
        language="ts"
      >
        <oge-word-document
          source="/demo/spreadsheet/document.docx"
          style="height: 480px"
          [(pageIndex)]="page"
        />
      </app-demo-card>
    }
  `,
})
export class WordPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_WORD_SECTIONS;
  protected readonly page = signal(1);
  protected readonly gettingStartedSnippet = WORD_GETTING_STARTED_SNIPPET;
  protected readonly controlledSnippet = WORD_CONTROLLED_SNIPPET;
}
