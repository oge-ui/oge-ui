import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactTreeListApiSections } from '../react-tree-list/api';
import { OGE_TREE_LIST_API } from './tree-list-api-data';

const SECTIONS = ['OgeTreeList'] as const;

/** TOC of the React view — must mirror `ReactTreeListApiSections`' titles. */
const SECTIONS_REACT = ['<OgeTreeList>'] as const;

@Component({
  selector: 'app-tree-list-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    RouterLink,
    ReactTreeListApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree List API"
      category="Tree List"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-tree-list</code>.
          Column props, render props and configuration are shared with the React
          grid — see the
          <a
            routerLink="/components/data-grid/api"
            class="text-indigo-600 underline dark:text-indigo-400"
            >Data Grid API</a
          >
          for <code>OgeGridColumnProps</code> and the option objects; this page
          documents the tree surface and the differences.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/tree-list</code>.
          Columns, templates and configuration are shared with the grid — see
          the
          <a
            routerLink="/components/data-grid/api"
            class="text-indigo-600 underline dark:text-indigo-400"
            >Data Grid API</a
          >
          for <code>&lt;oge-column&gt;</code> and the option objects; this page
          documents the tree surface and the differences.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-tree-list-api />
    } @else {
      <app-api-reference
        title="OgeTreeList"
        selector="oge-tree-list"
        [sections]="treeApi"
      />
    }

    <h3>Notes</h3>
    @if (fw.isReact()) {
      <ul>
        <li>
          Key differences from the grid: <code>keyExpr</code> instead of
          <code>keyField</code>, synchronous export methods on the handle, no
          grouping/master detail, and the extra tree props/callbacks documented
          above.
        </li>
        <li>
          <code>expandRow()</code>/<code>collapseRow()</code> are polarity-aware
          under <code>autoExpandAll</code> and do not fire the cancelable
          <code>onRowExpanding</code>/<code>onRowCollapsing</code> callbacks —
          those veto UI-driven toggles only.
        </li>
      </ul>
    } @else {
      <ul>
        <li>
          Key differences from the grid: <code>keyExpr</code> instead of
          <code>keyField</code>, synchronous export methods, no grouping/master
          detail, and the extra tree inputs/events documented above.
        </li>
        <li>
          <code>expandRow()</code>/<code>collapseRow()</code> are polarity-aware
          under <code>autoExpandAll</code> and do not fire the cancelable
          <code>rowExpanding</code>/<code>rowCollapsing</code> events — those
          veto UI-driven toggles only.
        </li>
      </ul>
    }
  `,
})
export class TreeListApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly treeApi = OGE_TREE_LIST_API;
}
