import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeTreeItemTemplate,
  OgeTreeView,
  type OgeTreeReorderedEvent,
  type OgeTreeSelectionChangedEvent,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  CHECK_SNIPPET,
  DND_SNIPPET,
  FLAT_SNIPPET,
  LAZY_SNIPPET,
  NESTED_SNIPPET,
  SEARCH_SNIPPET,
  TEMPLATE_SNIPPET,
  VIRTUAL_SNIPPET,
} from './overview-snippets';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
  hasItems?: boolean;
  disabled?: boolean;
}

interface NestedFolder {
  id: number;
  name: string;
  children?: NestedFolder[];
}

const SECTIONS = [
  'Flat data',
  'Nested data',
  'Checkboxes & cascade',
  'Search',
  'Lazy load on demand',
  'Virtual scrolling',
  'Drag & drop reparenting',
  'Custom node template',
] as const;

const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: 2, name: 'Q2.pdf' },
  { id: 5, parentId: 1, name: 'Contracts' },
  { id: 6, parentId: null, name: 'Photos' },
  { id: 7, parentId: 6, name: 'Holiday' },
  { id: 8, parentId: 6, name: 'Archive', disabled: true },
];

const NESTED_TREE: NestedFolder[] = [
  {
    id: 1,
    name: 'src',
    children: [
      {
        id: 2,
        name: 'app',
        children: [
          { id: 3, name: 'app.ts' },
          { id: 4, name: 'app.routes.ts' },
        ],
      },
      { id: 5, name: 'main.ts' },
    ],
  },
  { id: 6, name: 'package.json' },
];

const LAZY_ROOTS: Folder[] = [
  { id: 1, parentId: null, name: 'Server root', hasItems: true },
  { id: 2, parentId: null, name: 'Backups', hasItems: true },
  { id: 3, parentId: null, name: 'readme.txt', hasItems: false },
];

const MANY: Folder[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i + 1,
  parentId: null,
  name: `Item ${i + 1}`,
}));

@Component({
  selector: 'app-navigation-overview',
  imports: [OgeTreeView, OgeTreeItemTemplate, DemoCard, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree View"
      category="Navigation"
      [chips]="['APG pattern', 'signals', 'virtual scroll', 'lazy load']"
    >
      <p>
        <code>&lt;oge-tree-view&gt;</code> renders a hierarchy from either a
        flat parent-referencing array or nested children. It follows the
        WAI-ARIA APG treeview pattern — a roving tabindex over
        <code>role="treeitem"</code> rows, arrow / Home / End / type-ahead
        navigation and <code>*</code> to open a level — and expresses depth with
        <code>aria-level</code> / <code>aria-posinset</code> /
        <code>aria-setsize</code> over a flat DOM, which is what lets it
        virtualize.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['keyExpr', 'parentIdExpr', '[(expandedKeys)]', 'selectionMode']"
      heading="Flat data"
      description="The canonical shape: rows carrying a parent reference. <code>expandedKeys</code> and <code>selectedKeys</code> are two-way models keyed by identity, so they survive reordering. The disabled node is skipped by both clicks and arrow keys."
      [code]="flatSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="folders"
        displayExpr="name"
        [rootValue]="null"
        selectionMode="single"
        [(expandedKeys)]="open"
        [(selectedKeys)]="picked"
        (selectionChanged)="lastSelection.set($event)"
        height="240px"
      />
      <p class="mt-2 text-sm opacity-70">
        expandedKeys: <code>{{ open().join(', ') || '(none)' }}</code> ·
        selectedKeys: <code>{{ picked().join(', ') || '(none)' }}</code>
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['itemsExpr']"
      heading="Nested data"
      description="Point <code>itemsExpr</code> at the children field and the parent links are derived for you — core's <code>flattenNestedTree</code> normalizes the payload into the same single pipeline the flat shape uses."
      [code]="nestedSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="nested"
        itemsExpr="children"
        displayExpr="name"
        [expandedKeys]="[1, 2]"
        height="220px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['showCheckBoxes', 'tri-state', 'selectedKeysMode']"
      heading="Checkboxes & cascade"
      description='Checking a node cascades down to its descendants and normalizes up: a parent is checked only when every child is, and indeterminate whenever some are. The checkbox is an <code>aria-hidden</code> glyph and the state lives on the row as <code>aria-checked</code> — a real checkbox inside <code>role="treeitem"</code> would be a nested-interactive violation.'
      [code]="checkSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="folders"
        displayExpr="name"
        [rootValue]="null"
        selectionMode="multiple"
        showCheckBoxes="selectAll"
        [(selectedKeys)]="checked"
        [expandedKeys]="[1, 2, 6]"
        height="260px"
      />
      <p class="mt-2 text-sm opacity-70">
        selectedKeys: <code>{{ checked().join(', ') || '(none)' }}</code>
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['searchEnabled', 'filterMode', 'highlight']"
      heading="Search"
      description="Matching is accent- and locale-insensitive (core's <code>foldText</code>), the ancestors of a hit are auto-expanded so it is reachable, and the matched substring is wrapped in <code>&amp;lt;mark&amp;gt;</code>. <code>filterMode: 'fullBranch'</code> also keeps a match's descendants."
      [code]="searchSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="folders"
        displayExpr="name"
        [rootValue]="null"
        [searchEnabled]="true"
        height="260px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['loadChildren', 'hasItemsExpr', 'skeleton row']"
      heading="Lazy load on demand"
      description="Only the roots are bound; <code>hasItemsExpr</code> tells the tree which of them can expand. The first expand calls <code>loadChildren</code> and the engine renders a placeholder row until it resolves. Fetched children are folded into the index, so cascading selection reaches them."
      [code]="lazySnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="lazyRoots"
        displayExpr="name"
        [rootValue]="null"
        hasItemsExpr="hasItems"
        [loadChildren]="loadChildren"
        selectionMode="multiple"
        showCheckBoxes="normal"
        height="240px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['virtualScroll', '10 000 nodes']"
      heading="Virtual scrolling"
      description="Because the tree renders a flat list with <code>aria-level</code> rather than nested groups, it can window the DOM. Built on core's <code>OffsetTree</code> + <code>computeWindow</code>; keyboard focus moves scroll the target into view first, since the row may not exist yet."
      [code]="virtualSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="many"
        displayExpr="name"
        [rootValue]="null"
        [virtualScroll]="true"
        height="320px"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['allowDragging', 'inside / before / after', 'cycle guard']"
      heading="Drag & drop reparenting"
      description="Drag a node onto the middle of another to make it a child, or onto an edge to place it as a sibling. Hovering a collapsed parent opens it, Escape cancels, and a node can never be dropped into its own subtree. The tree emits <code>itemReordered</code> and leaves the data change to you."
      [code]="dndSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="draggable()"
        displayExpr="name"
        [rootValue]="null"
        [allowDragging]="true"
        [expandedKeys]="[1, 2, 6]"
        (itemReordered)="reparent($event)"
        height="280px"
      />
      <div class="mt-2 flex items-center gap-3">
        <button
          type="button"
          class="rounded border px-2 py-1 text-sm"
          (click)="resetDraggable()"
        >
          Reset
        </button>
        @if (lastMove(); as move) {
          <span class="text-sm opacity-70">{{ move }}</span>
        }
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeTreeItemTemplate']"
      heading="Custom node template"
      description='The item template replaces the built-in label. It renders inside the <code>role="treeitem"</code> row, so it must stay free of focusable controls.'
      [code]="templateSnippet"
      language="ts"
    >
      <oge-tree-view
        [items]="folders"
        displayExpr="name"
        [rootValue]="null"
        [expandedKeys]="[1]"
        height="220px"
      >
        <ng-template
          ogeTreeItemTemplate
          [ogeTreeItemTemplateTypeFor]="folders"
          let-item
          let-level="level"
        >
          <strong>{{ item.name }}</strong>
          <small class="opacity-60">level {{ level }}</small>
        </ng-template>
      </oge-tree-view>
    </app-demo-card>
  `,
})
export class NavigationOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly flatSnippet = FLAT_SNIPPET;
  protected readonly nestedSnippet = NESTED_SNIPPET;
  protected readonly checkSnippet = CHECK_SNIPPET;
  protected readonly searchSnippet = SEARCH_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly virtualSnippet = VIRTUAL_SNIPPET;
  protected readonly dndSnippet = DND_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;

  protected readonly folders = FOLDERS;
  protected readonly nested = NESTED_TREE;
  protected readonly lazyRoots = LAZY_ROOTS;
  protected readonly many = MANY;

  protected readonly open = signal<readonly (string | number)[]>([1]);
  protected readonly picked = signal<readonly (string | number)[]>([]);
  protected readonly checked = signal<readonly (string | number)[]>([]);
  protected readonly lastSelection =
    signal<OgeTreeSelectionChangedEvent<Folder> | null>(null);
  protected readonly draggable = signal<readonly Folder[]>(FOLDERS);
  protected readonly lastMove = signal<string | null>(null);

  protected readonly loadChildren = (parent: Folder) =>
    new Promise<Folder[]>((resolve) =>
      setTimeout(
        () =>
          resolve([
            {
              id: parent.id * 100 + 1,
              parentId: parent.id,
              name: `${parent.name} / logs`,
            },
            {
              id: parent.id * 100 + 2,
              parentId: parent.id,
              name: `${parent.name} / data`,
            },
          ]),
        800,
      ),
    );

  protected reparent(event: OgeTreeReorderedEvent<Folder>): void {
    const parentId =
      event.position === 'inside' ? event.dropKey : event.dropItem.parentId;
    this.draggable.update((rows) =>
      rows.map((row) =>
        row.id === event.dragKey
          ? { ...row, parentId: parentId as number | null }
          : row,
      ),
    );
    this.lastMove.set(
      `${event.dragItem.name} → ${event.position} ${event.dropItem.name}`,
    );
  }

  protected resetDraggable(): void {
    this.draggable.set(FOLDERS);
    this.lastMove.set(null);
  }
}
