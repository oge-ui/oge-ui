import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OgePresentation } from '@oge-ui/spreadsheet/powerpoint';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_PRESENTATION_SECTIONS,
  ReactPresentationDemos,
} from '../react-spreadsheet/powerpoint';
import {
  PRESENTATION_CONTROLLED_SNIPPET,
  PRESENTATION_GETTING_STARTED_SNIPPET,
} from './powerpoint-snippets';

const SECTIONS = ['Getting started', 'Controlled slide'] as const;

@Component({
  selector: 'app-presentation-page',
  imports: [
    DemoCard,
    DocHeader,
    OgePresentation,
    PageToc,
    ReactPresentationDemos,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="PowerPoint preview"
      category="Spreadsheet"
      categoryLink="/components/spreadsheet"
      [chips]="['pptx viewer', 'PowerPoint-measured', 'no dependencies']"
    >
      <p>
        A read-only viewer that shows <code>.pptx</code> presentations the way
        PowerPoint does. Inheritance from the theme, master and layout, colour
        arithmetic, table styles, line breaks and line spacing are measured
        against PowerPoint itself. The file is read in the browser by a
        dependency-free reader; macros and embedded objects never run and
        external links are never fetched.
      </p>
      <p>
        It ships as its own entry point of the spreadsheet packages, so an
        application that only shows workbooks never loads it, and it is covered
        by the same
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >license</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-presentation-demos />
    } @else {
      <app-demo-card
        [chips]="['source', 'thumbnails', 'keyboard']"
        heading="Getting started"
        description="Point <code>source</code> at a presentation. Arrow keys, Page Up, Page Down, Home and End move between slides, and every slide is announced to screen readers."
        [code]="gettingStartedSnippet"
        language="ts"
      >
        <oge-presentation
          source="/demo/spreadsheet/slides.pptx"
          style="height: 520px"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['slideIndex', 'thumbnails']"
        heading="Controlled slide"
        description="<code>[(slideIndex)]</code> keeps the current slide in your own state, and <code>[thumbnails]</code> hides the slide rail."
        [code]="controlledSnippet"
        language="ts"
      >
        <oge-presentation
          source="/demo/spreadsheet/slides.pptx"
          style="height: 420px"
          [thumbnails]="false"
          [(slideIndex)]="slide"
        />
      </app-demo-card>
    }
  `,
})
export class PresentationPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_PRESENTATION_SECTIONS;
  protected readonly slide = signal(2);
  protected readonly gettingStartedSnippet =
    PRESENTATION_GETTING_STARTED_SNIPPET;
  protected readonly controlledSnippet = PRESENTATION_CONTROLLED_SNIPPET;
}
