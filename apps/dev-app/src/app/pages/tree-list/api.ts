import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_TREE_LIST_API } from './tree-list-api-data';

const SECTIONS = ['OgeTreeList'] as const;

@Component({
  selector: 'app-tree-list-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree List API"
      category="Tree List"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/tree-list</code>. Columns,
        templates and configuration are shared with the grid — see the
        <a
          routerLink="/components/data-grid/api"
          class="text-indigo-600 dark:text-indigo-400"
          >Data Grid API</a
        >
        for <code>&lt;oge-column&gt;</code> and the option objects; this page
        documents the tree surface and the differences.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeTreeList"
      selector="oge-tree-list"
      [sections]="treeApi"
    />

    <h3>Notes</h3>
    <ul>
      <li>
        Key differences from the grid: <code>keyExpr</code> instead of
        <code>keyField</code>, synchronous export methods, no grouping/master
        detail, and the extra tree inputs/events documented above.
      </li>
      <li>
        <code>expandRow()</code>/<code>collapseRow()</code> are polarity-aware
        under <code>autoExpandAll</code> and do not fire the cancelable
        <code>rowExpanding</code>/<code>rowCollapsing</code> events — those veto
        UI-driven toggles only.
      </li>
    </ul>
  `,
})
export class TreeListApiPage {
  protected readonly sections = SECTIONS;
  protected readonly treeApi = OGE_TREE_LIST_API;
}
