import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeTreeItemTemplate,
  OgeTreeView,
  type OgeTreeChildPageEvent,
  type OgeTreeEditedEvent,
  type OgeTreeReorderedEvent,
  type OgeTreeSelectionChangedEvent,
  type OgeTreeTransferredEvent,
} from '@oge-ui/navigation';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_NAVIGATION_TREE_VIEW_SECTIONS,
  ReactNavigationTreeViewDemos,
} from '../react-navigation/overview';
import {
  BETWEEN_SNIPPET,
  CHECK_SNIPPET,
  DND_SNIPPET,
  EDITING_SNIPPET,
  PAGING_SNIPPET,
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
  'Drag between trees',
  'Label editing (F2)',
  'Load more paging',
  'Custom node template',
] as const;

type TransferList = 'projects' | 'archive';

const PROJECTS: Folder[] = [
  { id: 101, parentId: null, name: 'Website' },
  { id: 102, parentId: 101, name: 'Landing page' },
  { id: 103, parentId: 101, name: 'Pricing page' },
  { id: 104, parentId: null, name: 'Mobile app' },
  { id: 105, parentId: 104, name: 'Onboarding' },
];

const ARCHIVE: Folder[] = [
  { id: 201, parentId: null, name: '2024' },
  { id: 202, parentId: null, name: '2023' },
];

const MAIL: Folder[] = [
  { id: 1, parentId: null, name: 'Inbox' },
  ...Array.from({ length: 23 }, (_, i) => ({
    id: 100 + i,
    parentId: 1,
    name: `Message ${i + 1}`,
  })),
  { id: 2, parentId: null, name: 'Sent' },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: 200 + i,
    parentId: 2,
    name: `Reply ${i + 1}`,
  })),
];

/** A node plus every descendant, in `rows` order. */
function subtreeOf(rows: readonly Folder[], id: number): Folder[] {
  const ids = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (row.parentId !== null && ids.has(row.parentId) && !ids.has(row.id)) {
        ids.add(row.id);
        grew = true;
      }
    }
  }
  return rows.filter((row) => ids.has(row.id));
}

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
  imports: [
    OgeTreeView,
    OgeTreeItemTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactNavigationTreeViewDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree View"
      category="Navigation"
      [chips]="['APG pattern', 'signals', 'virtual scroll', 'lazy load']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTreeView&gt;</code> from
          <code>&#64;oge-ui/react-navigation</code> renders a hierarchy from
          either a flat parent-referencing array or nested children. It follows
          the WAI-ARIA APG treeview pattern — a roving tabindex over
          <code>role="treeitem"</code> rows, arrow / Home / End / type-ahead
          navigation and <code>*</code> to open a level — and expresses depth
          with <code>aria-level</code> / <code>aria-posinset</code> /
          <code>aria-setsize</code> over a flat DOM, which is what lets it
          virtualize. The engine is <code>&#64;oge-ui/behavior</code>'s tree —
          the exact code the Angular component runs.
        </p>
      } @else {
        <p>
          <code>&lt;oge-tree-view&gt;</code> renders a hierarchy from either a
          flat parent-referencing array or nested children. It follows the
          WAI-ARIA APG treeview pattern — a roving tabindex over
          <code>role="treeitem"</code> rows, arrow / Home / End / type-ahead
          navigation and <code>*</code> to open a level — and expresses depth
          with <code>aria-level</code> / <code>aria-posinset</code> /
          <code>aria-setsize</code> over a flat DOM, which is what lets it
          virtualize.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-navigation-tree-view-demos />
    } @else {
      <app-demo-card
        [chips]="[
          'keyExpr',
          'parentIdExpr',
          '[(expandedKeys)]',
          'selectionMode',
        ]"
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
        [chips]="['dragGroup', 'itemTransferred', 'Ctrl+X / Ctrl+V']"
        heading="Drag between trees"
        description="Trees that share a <code>dragGroup</code> accept each other's nodes. The target previews the drop zone and fires the cancelable <code>itemReordering</code> and <code>itemReordered</code> with <code>sourceTreeId</code> / <code>targetTreeId</code>; the source fires <code>itemTransferred</code>. Neither tree moves data. The keyboard twin is Ctrl+X on a node and Ctrl+V on the target (Ctrl+Shift+V places it after), announced through the live region; <code>cutItem()</code> / <code>pasteItem()</code> wire the same move to buttons."
        [code]="betweenSnippet"
        language="ts"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <oge-tree-view
            treeId="docs-tree-projects"
            [items]="transfer.projects()"
            displayExpr="name"
            [rootValue]="null"
            [allowDragging]="true"
            dragGroup="docs-files"
            ariaLabel="Projects"
            [expandedKeys]="[101, 104]"
            (itemReordered)="received('projects', $event)"
            (itemTransferred)="removed('projects', $event)"
            height="220px"
          />
          <oge-tree-view
            treeId="docs-tree-archive"
            [items]="transfer.archive()"
            displayExpr="name"
            [rootValue]="null"
            [allowDragging]="true"
            dragGroup="docs-files"
            ariaLabel="Archive"
            (itemReordered)="received('archive', $event)"
            (itemTransferred)="removed('archive', $event)"
            height="220px"
          />
        </div>
        <div class="mt-2 flex items-center gap-3">
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            (click)="resetTransfer()"
          >
            Reset
          </button>
          @if (lastTransfer(); as move) {
            <span class="text-sm opacity-70" data-testid="tree-transfer-log">{{
              move
            }}</span>
          }
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['allowEditing', 'F2', 'validateEdit', 'itemEdited']"
        heading="Label editing (F2)"
        description="F2 — or a double-click with <code>editOnDblClick</code> — turns the label into a text field. Enter or blur commits, Escape cancels, and the focus returns to the node. <code>itemEditStarting</code> and <code>itemEditing</code> are cancelable, <code>validateEdit</code> keeps the field open with its message, and <code>itemEdited</code> carries <code>previousValue</code> / <code>value</code> — the tree leaves the data change to you."
        [code]="editingSnippet"
        language="ts"
      >
        <oge-tree-view
          [items]="editable()"
          displayExpr="name"
          [rootValue]="null"
          [allowEditing]="true"
          [editOnDblClick]="true"
          [validateEdit]="validateName"
          [expandedKeys]="[1]"
          ariaLabel="Renamable folders"
          (itemEdited)="rename($event)"
          height="220px"
        />
        @if (lastEdit(); as edit) {
          <p class="mt-2 text-sm opacity-70" data-testid="tree-edit-log">
            {{ edit }}
          </p>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="['childPageSize', 'Load more', 'aria-setsize']"
        heading="Load more paging"
        description="With <code>childPageSize</code> a parent renders its first page of children and a “Show N more items” row, which Enter, Space or a click expands by one more page — the focus lands on the first new child. The row is in the arrow-key order, <code>aria-setsize</code> keeps reporting the real total, and paging pauses while searching. Works with <code>virtualScroll</code> too."
        [code]="pagingSnippet"
        language="ts"
      >
        <oge-tree-view
          [items]="mail"
          displayExpr="name"
          [rootValue]="null"
          [childPageSize]="5"
          [expandedKeys]="[1]"
          ariaLabel="Mail folders"
          (childPageShown)="pageShown($event)"
          height="260px"
        />
        @if (lastPage(); as page) {
          <p class="mt-2 text-sm opacity-70">{{ page }}</p>
        }
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
    }
  `,
})
export class NavigationOverviewPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_NAVIGATION_TREE_VIEW_SECTIONS;
  protected readonly flatSnippet = FLAT_SNIPPET;
  protected readonly nestedSnippet = NESTED_SNIPPET;
  protected readonly checkSnippet = CHECK_SNIPPET;
  protected readonly searchSnippet = SEARCH_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;
  protected readonly virtualSnippet = VIRTUAL_SNIPPET;
  protected readonly dndSnippet = DND_SNIPPET;
  protected readonly templateSnippet = TEMPLATE_SNIPPET;
  protected readonly betweenSnippet = BETWEEN_SNIPPET;
  protected readonly editingSnippet = EDITING_SNIPPET;
  protected readonly pagingSnippet = PAGING_SNIPPET;

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

  protected readonly transfer = {
    projects: signal<readonly Folder[]>(PROJECTS),
    archive: signal<readonly Folder[]>(ARCHIVE),
  };
  protected readonly lastTransfer = signal<string | null>(null);
  protected readonly editable = signal<readonly Folder[]>(FOLDERS);
  protected readonly lastEdit = signal<string | null>(null);
  protected readonly mail = MAIL;
  protected readonly lastPage = signal<string | null>(null);
  protected readonly validateName = (value: string): string | null =>
    value.length > 40 ? 'Keep names under 40 characters.' : null;

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

  /** The target tree's side of a move: (re)insert the node and its subtree. */
  protected received(
    list: TransferList,
    event: OgeTreeReorderedEvent<Folder>,
  ): void {
    const parentId =
      event.position === 'inside'
        ? (event.dropKey as number)
        : event.dropItem.parentId;
    const moved =
      event.sourceTreeId === event.targetTreeId
        ? subtreeOf(this.transfer[list](), event.dragKey as number)
        : subtreeOf(
            this.transfer[list === 'projects' ? 'archive' : 'projects'](),
            event.dragKey as number,
          );
    const movedIds = new Set(moved.map((row) => row.id));
    this.transfer[list].update((rows) => [
      ...rows.filter((row) => !movedIds.has(row.id)),
      ...moved.map((row) =>
        row.id === event.dragKey ? { ...row, parentId } : row,
      ),
    ]);
    this.lastTransfer.set(
      `${event.dragItem.name} → ${event.position} ${event.dropItem.name} (${event.trigger})`,
    );
  }

  /** The source tree's side of a cross-tree move: drop the subtree. */
  protected removed(
    list: TransferList,
    event: OgeTreeTransferredEvent<Folder>,
  ): void {
    const ids = new Set(
      subtreeOf(this.transfer[list](), event.dragKey as number).map(
        (row) => row.id,
      ),
    );
    this.transfer[list].update((rows) =>
      rows.filter((row) => !ids.has(row.id)),
    );
  }

  protected resetTransfer(): void {
    this.transfer.projects.set(PROJECTS);
    this.transfer.archive.set(ARCHIVE);
    this.lastTransfer.set(null);
  }

  protected rename(event: OgeTreeEditedEvent<Folder>): void {
    this.editable.update((rows) =>
      rows.map((row) =>
        row.id === event.key ? { ...row, name: event.value } : row,
      ),
    );
    this.lastEdit.set(`“${event.previousValue}” → “${event.value}”`);
  }

  protected pageShown(event: OgeTreeChildPageEvent<Folder>): void {
    this.lastPage.set(
      `${event.parentItem?.name ?? 'Root'}: ${event.shown} of ${event.total} shown`,
    );
  }
}
