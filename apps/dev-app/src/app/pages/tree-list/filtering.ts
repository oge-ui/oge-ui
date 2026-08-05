import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import type { TreeFilterMode } from '@oge-ui/core';
import { OgeColumn, OgeTreeList } from '@oge-ui/tree-list';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeOrgTree } from './tree-data';

const SNIPPET = `<oge-tree-list
  [data]="org"
  keyExpr="id"
  parentIdExpr="parentId"
  [autoExpandAll]="true"
  [filterRow]="true"
  [searchPanel]="true"
  filterMode="withAncestors"
>
  <oge-column field="name" caption="Name" />
  <oge-column field="office" caption="Office" />
</oge-tree-list>`;

@Component({
  selector: 'app-tree-filtering',
  imports: [OgeTreeList, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Filtering & Search"
      [chips]="['filterRow', 'searchPanel', 'filterMode']"
    >
      <p>
        Filtering runs client-side over the loaded rows and always keeps the
        ancestor chain of a match visible — a filtered tree stays a tree.
        <code>filterMode</code> switches between showing just the matched paths
        and whole matched branches.
      </p>
    </app-doc-header>

    <app-demo-card
      [chips]="['ancestors preserved', 'fullBranch']"
      [code]="snippet"
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
      <oge-tree-list
        [data]="org"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        [filterRow]="true"
        [searchPanel]="true"
        [filterMode]="filterMode()"
      >
        <oge-column field="name" caption="Name" />
        <oge-column field="title" caption="Title" [width]="140" />
        <oge-column field="office" caption="Office" [width]="160" />
      </oge-tree-list>
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
export class TreeFilteringPage {
  protected readonly org = makeOrgTree(5, 3, 6);
  protected readonly snippet = SNIPPET;
  protected readonly modes: TreeFilterMode[] = ['withAncestors', 'fullBranch'];
  protected readonly filterMode = signal<TreeFilterMode>('withAncestors');
}
