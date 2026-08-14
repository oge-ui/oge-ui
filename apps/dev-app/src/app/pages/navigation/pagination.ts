import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgePagination } from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_NAVIGATION_PAGINATION_SECTIONS,
  ReactNavigationPaginationDemos,
} from '../react-navigation/pagination';
import {
  ADAPTIVE_SNIPPET,
  BASIC_SNIPPET,
  CONFIG_SNIPPET,
  JUMP_SNIPPET,
  SIZES_SNIPPET,
  UNKNOWN_SNIPPET,
} from './pagination-snippets';

const SECTIONS = [
  'Getting started',
  'Page sizes and info',
  'Jump controls',
  'Unknown total',
  'Adaptive display',
  'Configuration',
] as const;

@Component({
  selector: 'app-navigation-pagination',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgePagination,
    ReactNavigationPaginationDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pagination"
      category="Navigation"
      [chips]="['nav landmark', 'aria-current', 'constant-width window']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgePagination&gt;</code> from
          <code>&#64;oge-ui/react-navigation</code> is a standalone pagination
          bar around the controlled <code>pageIndex</code>/<code
            >onPageIndexChange</code
          >
          and <code>pageSize</code>/<code>onPageSizeChange</code> pairs (pass
          <code>defaultPageIndex</code>/<code>defaultPageSize</code> for the
          uncontrolled mode) — <strong>0-based</strong>, with
          <code>pageSize: 0</code> meaning "all items" (the grid pager's
          contracts, kept aligned by design). The numeric window holds a
          <strong>constant width</strong>: ellipsis slots count toward
          <code>maxButtons</code>, so the bar never jitters while paging, and an
          ellipsis never hides a single page.
        </p>
        <p>
          No WAI-ARIA APG pagination pattern exists, so the markup is composed
          from primitives: a <code>&amp;lt;nav&amp;gt;</code> landmark named by
          messages, real buttons with <code>aria-current="page"</code> on the
          active page, and the info range in an
          <code>aria-live="polite"</code> region. Keyboard is the native Tab
          order — every control is a native element, and the APG defines no
          arrow-key behavior to invent. Rendering several bars on one page? Give
          each a distinct <code>paginationLabel</code> via the
          <code>messages</code> prop — landmarks must be unique.
        </p>
        <p>
          Two members read differently in React, on purpose: the jump-to-page
          input is <strong>uncontrolled and commits on blur or Enter</strong> —
          React has no <code>onChange</code> mapping to the native
          <code>change</code> event the Angular version listens to — with the
          same clamping and the same 1-based re-sync; and the
          <code>ref</code> handle carries <code>pageCount()</code>, because
          React has no signal to read off the instance.
        </p>
      } @else {
        <p>
          A standalone pagination bar around two-way
          <code>[(pageIndex)]</code>/<code>[(pageSize)]</code> models —
          <strong>0-based</strong>, with <code>pageSize: 0</code> meaning "all
          items" (the grid pager's contracts, kept aligned by design). The
          numeric window holds a <strong>constant width</strong>: ellipsis slots
          count toward <code>maxButtons</code>, so the bar never jitters while
          paging, and an ellipsis never hides a single page.
        </p>
        <p>
          No WAI-ARIA APG pagination pattern exists, so the markup is composed
          from primitives: a <code>&amp;lt;nav&amp;gt;</code> landmark named by
          messages, real buttons with <code>aria-current="page"</code> on the
          active page, and the info range in an
          <code>aria-live="polite"</code> region. Keyboard is the native Tab
          order — every control is a native element, and the APG defines no
          arrow-key behavior to invent. Rendering several bars on one page? Give
          each a distinct <code>paginationLabel</code> via
          <code>[messages]</code> — landmarks must be unique.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-navigation-pagination-demos />
    } @else {
      <app-demo-card
        [chips]="['pageIndex', 'maxButtons', 'ellipsis']"
        heading="Getting started"
        description="Numeric buttons in a constant-width window with real ellipsis markers. <code>pageChanged</code> reports <code>previousPageIndex</code> and fires only on user interaction — programmatic writes and auto-clamps update the model silently."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-pagination
          [(pageIndex)]="page"
          [itemCount]="400"
          [pageSize]="20"
          [messages]="{ paginationLabel: 'Basic pagination' }"
        />
        <p class="mt-3 text-sm">
          Page index: <code data-testid="page-value">{{ page() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['pageSizes', 'all option', 'showInfo']"
        heading="Page sizes and info"
        description="Presence of <code>pageSizes</code> shows the selector; <code>'all'</code> commits <code>pageSize: 0</code>. <code>showInfo</code> renders the <code>{from}–{to} of {itemCount}</code> range from messages, in a polite live region. Shrinking the count auto-clamps <code>pageIndex</code>."
        [code]="sizesSnippet"
        language="ts"
      >
        <oge-pagination
          [(pageIndex)]="sizedPage"
          [(pageSize)]="pageSize"
          [itemCount]="97"
          [pageSizes]="[10, 20, 50, 'all']"
          [showInfo]="true"
          [messages]="{ paginationLabel: 'Page size pagination' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['showFirstLastButtons', 'showJumpToPageInput']"
        heading="Jump controls"
        description="First/last buttons and the jump-to-page input are opt-in — the numeric rails already render both ends, so the defaults stay lean. The jump input displays 1-based, commits on Enter/change and clamps into range."
        [code]="jumpSnippet"
        language="ts"
      >
        <oge-pagination
          [(pageIndex)]="jumpPage"
          [itemCount]="1000"
          [pageSize]="10"
          [showFirstLastButtons]="true"
          [showJumpToPageInput]="true"
          [messages]="{ paginationLabel: 'Jump pagination' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['itemCount: undefined', 'cursor paging']"
        heading="Unknown total"
        description='Without <code>itemCount</code> the total is unknown: only prev/next and a "Page N" indicator render, and <strong>next never disables</strong> — the component cannot know the end. Clamp <code>pageIndex</code> at the app level when the server reports the last page.'
        [code]="unknownSnippet"
        language="ts"
      >
        <oge-pagination
          [(pageIndex)]="cursorPage"
          [pageSize]="20"
          [messages]="{ paginationLabel: 'Cursor pagination' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['displayMode', 'container width']"
        heading="Adaptive display"
        description="<code>displayMode: 'adaptive'</code> collapses to the compact <code>N / M</code> indicator below the container threshold (<code>compactBelow</code>, default 480px) — measured against the bar's <strong>own</strong> box, never the window. <code>'compact'</code> forces the indicator."
        [code]="adaptiveSnippet"
        language="ts"
      >
        <div style="max-width: 320px" data-testid="narrow-box">
          <oge-pagination
            [(pageIndex)]="adaptivePage"
            [itemCount]="400"
            [pageSize]="20"
            displayMode="adaptive"
            [messages]="{ paginationLabel: 'Adaptive pagination' }"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['provideOgePaginationConfig', 'messages']"
        heading="Configuration"
        description="Every string — the <code>&amp;lt;nav&amp;gt;</code> label, button aria labels, the info template — lives in <code>OgePaginationMessages</code>: override globally via <code>provideOgePaginationConfig()</code> or per instance via <code>[messages]</code>. <code>maxButtons</code>, <code>displayMode</code> and <code>compactBelow</code> carry config defaults too."
        [code]="configSnippet"
        language="ts"
      >
        <oge-pagination
          [(pageIndex)]="configPage"
          [itemCount]="250"
          [pageSize]="25"
          [showInfo]="true"
          [messages]="{
            paginationLabel: 'Configured pagination',
            pageSizeLabel: 'Sayfa başına',
            info: '{itemCount} kayıttan {from}–{to}',
          }"
        />
      </app-demo-card>
    }
  `,
})
export class NavigationPaginationPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_NAVIGATION_PAGINATION_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly sizesSnippet = SIZES_SNIPPET;
  protected readonly jumpSnippet = JUMP_SNIPPET;
  protected readonly unknownSnippet = UNKNOWN_SNIPPET;
  protected readonly adaptiveSnippet = ADAPTIVE_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly page = signal(0);
  protected readonly sizedPage = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly jumpPage = signal(41);
  protected readonly cursorPage = signal(3);
  protected readonly adaptivePage = signal(4);
  protected readonly configPage = signal(0);
}
