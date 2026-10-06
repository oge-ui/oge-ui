import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { createElement, type ReactNode } from 'react';
import type { TreeFilterMode } from '@oge-ui/core';
import { OgeTreeList, type OgeGridColumnProps } from '@oge-ui/react-tree-list';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { makeOrgTree, type OrgNode } from '../tree-list/tree-data';
import { TREE_FILTERING_DEMOS } from './filtering-snippets';

const org = makeOrgTree(5, 3, 6);

const COLUMNS: OgeGridColumnProps<OrgNode>[] = [
  { field: 'name', caption: 'Name' },
  { field: 'title', caption: 'Title', width: 140 },
  { field: 'office', caption: 'Office', width: 160 },
];

/**
 * The React half of the tree-list filtering page — the same org chart and
 * the same filterMode switch as the Angular page. The switch stays Angular
 * chrome above the demo; `filterMode` flows into the React tree through the
 * host's signal, exactly like the Angular demo's binding.
 */
@Component({
  selector: 'app-react-tree-filtering-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/tree-list/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../shared/react-layout-demo-base.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['ancestors preserved', 'fullBranch']"
      [code]="demos[0].source"
      language="tsx"
    >
      <div class="mb-3 flex items-center gap-2 text-sm">
        <span class="text-gray-500 dark:text-gray-400">filterMode:</span>
        @for (mode of modes; track mode) {
          <button
            type="button"
            class="rounded-md border px-2 py-1 text-xs"
            [class.border-indigo-500]="filterMode() === mode"
            [class.text-indigo-600]="filterMode() === mode"
            [class.border-gray-300]="filterMode() !== mode"
            (click)="filterMode.set(mode)"
          >
            {{ mode }}
          </button>
        }
      </div>
      <app-react-host [render]="filtering" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        <code>'withAncestors'</code> (default) shows matches plus their ancestor
        rows; <code>'fullBranch'</code> additionally keeps every descendant of a
        match.
      </li>
      <li>
        The DataSource never receives filter or search — matching runs over the
        rows already loaded, and lazily fetched children stay cached across
        filter changes.
      </li>
      <li>
        The search box matches any visible column, locale-safe (İ/i folding
        included).
      </li>
      <li>
        Text inputs debounce (<code>filterDebounce</code>, default 300 ms).
      </li>
    </ul>
  `,
})
export class ReactTreeFilteringDemos {
  protected readonly demos = TREE_FILTERING_DEMOS;
  protected readonly modes: TreeFilterMode[] = ['withAncestors', 'fullBranch'];
  protected readonly filterMode = signal<TreeFilterMode>('withAncestors');

  protected readonly filtering = (): ReactNode =>
    createElement(OgeTreeList<OrgNode>, {
      style: { maxHeight: 480 },
      data: org,
      keyExpr: 'id',
      parentIdExpr: 'parentId',
      autoExpandAll: true,
      filterRow: true,
      searchPanel: true,
      headerFilter: true,
      filterMode: this.filterMode(),
      columns: COLUMNS,
    });
}
