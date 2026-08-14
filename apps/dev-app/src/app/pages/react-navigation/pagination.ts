import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgePagination,
  OgePaginationConfigProvider,
} from '@oge-ui/react-navigation';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_PAGINATION_DEMOS } from './pagination-snippets';

/**
 * TOC of the React view — the same six sections as the Angular pagination page
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_PAGINATION_SECTIONS = [
  'Getting started',
  'Page sizes and info',
  'Jump controls',
  'Unknown total',
  'Adaptive display',
  'Configuration',
] as const;

function BasicDemo(): ReactNode {
  const [page, setPage] = useState(0);
  return createElement(
    'div',
    null,
    createElement(OgePagination, {
      pageIndex: page,
      onPageIndexChange: setPage,
      itemCount: 400,
      pageSize: 20,
      messages: { paginationLabel: 'Basic pagination' },
    }),
    createElement(
      'p',
      { className: 'mt-3 text-sm' },
      'Page index: ',
      createElement('code', { 'data-testid': 'page-value' }, page),
    ),
  );
}

function SizesDemo(): ReactNode {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  return createElement(OgePagination, {
    pageIndex: page,
    onPageIndexChange: setPage,
    pageSize,
    onPageSizeChange: setPageSize,
    itemCount: 97,
    pageSizes: [10, 20, 50, 'all'],
    showInfo: true,
    messages: { paginationLabel: 'Page size pagination' },
  });
}

function JumpDemo(): ReactNode {
  const [page, setPage] = useState(41);
  return createElement(OgePagination, {
    pageIndex: page,
    onPageIndexChange: setPage,
    itemCount: 1000,
    pageSize: 10,
    showFirstLastButtons: true,
    showJumpToPageInput: true,
    messages: { paginationLabel: 'Jump pagination' },
  });
}

function UnknownDemo(): ReactNode {
  const [page, setPage] = useState(3);
  return createElement(OgePagination, {
    pageIndex: page,
    onPageIndexChange: setPage,
    pageSize: 20,
    messages: { paginationLabel: 'Cursor pagination' },
  });
}

function AdaptiveDemo(): ReactNode {
  const [page, setPage] = useState(4);
  return createElement(
    'div',
    { style: { maxWidth: 320 }, 'data-testid': 'narrow-box' },
    createElement(OgePagination, {
      pageIndex: page,
      onPageIndexChange: setPage,
      itemCount: 400,
      pageSize: 20,
      displayMode: 'adaptive',
      messages: { paginationLabel: 'Adaptive pagination' },
    }),
  );
}

function ConfigDemo(): ReactNode {
  const [page, setPage] = useState(0);
  return createElement(
    OgePaginationConfigProvider,
    {
      config: {
        maxButtons: 9,
        messages: {
          pageSizeLabel: 'Sayfa başına',
          info: '{itemCount} kayıttan {from}–{to}',
        },
      },
    },
    createElement(OgePagination, {
      pageIndex: page,
      onPageIndexChange: setPage,
      itemCount: 250,
      pageSize: 25,
      showInfo: true,
      messages: { paginationLabel: 'Configured pagination' },
    }),
  );
}

/**
 * The React half of the pagination page — the same six demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/pagination` when the reader has chosen React (ADR 0002).
 *
 * One honest idiom difference is called out in the "Jump controls" copy: React
 * has no `onChange` bound to the native `change` event, so the jump input is
 * uncontrolled and commits on **blur or Enter** — same clamping, same 1-based
 * re-sync. The ref handle also carries `pageCount()`, because React has no
 * signal to read off the instance.
 */
@Component({
  selector: 'app-react-navigation-pagination-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React pagination carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/navigation/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['pageIndex', 'maxButtons', 'ellipsis']"
      heading="Getting started"
      description="Numeric buttons in a constant-width window with real ellipsis markers. <code>onPageChanged</code> reports <code>previousPageIndex</code> and fires only on user interaction — programmatic writes and auto-clamps update the state silently."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pageSizes', 'all option', 'showInfo']"
      heading="Page sizes and info"
      description="Presence of <code>pageSizes</code> shows the selector; <code>'all'</code> commits <code>pageSize: 0</code>. <code>showInfo</code> renders the <code>{from}–{to} of {itemCount}</code> range from messages, in a polite live region. Shrinking the count auto-clamps <code>pageIndex</code>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="sizes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showFirstLastButtons', 'showJumpToPageInput']"
      heading="Jump controls"
      description="First/last buttons and the jump-to-page input are opt-in — the numeric rails already render both ends, so the defaults stay lean. The jump input displays 1-based and clamps into range. <strong>React idiom difference:</strong> React has no <code>onChange</code> mapping to the native <code>change</code> event, so the input is uncontrolled and commits on <strong>blur or Enter</strong> (Angular commits on <code>(change)</code> or <code>(keydown.enter)</code>) — the same clamping and the same 1-based re-sync after a clamp."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="jump" />
    </app-demo-card>

    <app-demo-card
      [chips]="['itemCount: undefined', 'cursor paging']"
      heading="Unknown total"
      description='Without <code>itemCount</code> the total is unknown: only prev/next and a "Page N" indicator render, and <strong>next never disables</strong> — the component cannot know the end. Clamp <code>pageIndex</code> at the app level when the server reports the last page; the handle&#39;s <code>pageCount()</code> returns <code>undefined</code> here.'
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="unknown" />
    </app-demo-card>

    <app-demo-card
      [chips]="['displayMode', 'container width']"
      heading="Adaptive display"
      description="<code>displayMode: 'adaptive'</code> collapses to the compact <code>N / M</code> indicator below the container threshold (<code>compactBelow</code>, default 480px) — measured against the bar's <strong>own</strong> box, never the window. <code>'compact'</code> forces the indicator."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="adaptive" />
    </app-demo-card>

    <app-demo-card
      [chips]="['OgePaginationConfigProvider', 'messages']"
      heading="Configuration"
      description="Every string — the <code>&amp;lt;nav&amp;gt;</code> label, button aria labels, the info template — lives in <code>OgePaginationMessages</code>: override for a subtree via <code>&lt;OgePaginationConfigProvider&gt;</code> or per instance via the <code>messages</code> prop. <code>maxButtons</code>, <code>displayMode</code> and <code>compactBelow</code> carry config defaults too."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactNavigationPaginationDemos {
  protected readonly demos = NAVIGATION_PAGINATION_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly sizes = () => createElement(SizesDemo);
  protected readonly jump = () => createElement(JumpDemo);
  protected readonly unknown = () => createElement(UnknownDemo);
  protected readonly adaptive = () => createElement(AdaptiveDemo);
  protected readonly config = () => createElement(ConfigDemo);
}
