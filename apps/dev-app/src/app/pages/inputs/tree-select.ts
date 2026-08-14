import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeTreeSelect } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_TREE_SELECT_SECTIONS,
  ReactInputsTreeSelectDemos,
} from '../react-inputs/tree-select';
import {
  BASIC_SNIPPET,
  LAZY_SNIPPET,
  MULTIPLE_SNIPPET,
  NESTED_SNIPPET,
} from './tree-select-snippets';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
  hasItems?: boolean;
}

interface NestedFile {
  id: number;
  name: string;
  children?: NestedFile[];
}

const SECTIONS = [
  'Basic usage',
  'Nested data & search',
  'Multiple selection',
  'Lazy load on demand',
] as const;

const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: 2, name: 'Q2.pdf' },
  { id: 5, parentId: 1, name: 'Contracts' },
  { id: 6, parentId: null, name: 'Photos' },
  { id: 7, parentId: 6, name: 'Holiday' },
];

const FILE_TREE: NestedFile[] = [
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

const REMOTE_ROOTS: Folder[] = [
  { id: 1, parentId: null, name: 'Server root', hasItems: true },
  { id: 2, parentId: null, name: 'Backups', hasItems: true },
  { id: 3, parentId: null, name: 'readme.txt', hasItems: false },
];

@Component({
  selector: 'app-inputs-tree-select',
  imports: [
    OgeTreeSelect,
    DemoCard,
    DocHeader,
    PageToc,
    ReactInputsTreeSelectDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree Select"
      category="Inputs"
      [chips]="['combobox', 'signals', 'tri-state', 'lazy load']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeTreeSelect /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is the hierarchical counterpart
          of <code>&lt;OgeSelectBox /&gt;</code>: the same field chrome — label
          modes, validation subscript, clear button, the controlled
          <code>value</code> + <code>onValueChange</code> pair — with a full
          <a href="/components/tree-view"><code>OgeTreeView</code></a> as the
          popup. It is a WAI-ARIA combobox with
          <code>aria-haspopup="tree"</code>; opening moves real DOM focus into
          the tree, so the tree's own APG keyboard map (arrows, Home/End,
          type-ahead, <code>*</code>) keeps working. Traversal, the search
          filter and the tri-state cascade are
          <code>&#64;oge-ui/behavior</code>'s tree engine — the same code the
          Angular editor runs.
        </p>
      } @else {
        <p>
          <code>&lt;oge-tree-select&gt;</code> is the hierarchical counterpart
          of <code>&lt;oge-select-box&gt;</code>: the same field chrome — label
          modes, validation subscript, clear button, Signal Forms and reactive
          forms — with a full
          <a href="/components/tree-view"><code>oge-tree-view</code></a> as the
          popup. It is a WAI-ARIA combobox with
          <code>aria-haspopup="tree"</code>; opening moves real DOM focus into
          the tree, so the tree's own APG keyboard map (arrows, Home/End,
          type-ahead, <code>*</code>) keeps working.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-tree-select-demos />
    } @else {
      <app-demo-card
        [chips]="['[(value)]', 'keyExpr / parentIdExpr', 'clear button']"
        heading="Basic usage"
        description="The committed value is the selected node's key. A single click picks a node and closes the popup; the chevron expands, so choosing never fights with browsing. Double-click also expands — <code>expandEvent</code> changes that."
        [code]="basicSnippet"
      >
        <oge-tree-select
          label="Folder"
          placeholder="Pick a folder"
          [items]="folders"
          displayExpr="name"
          [rootValue]="null"
          [showClearButton]="true"
          [expandedKeys]="[1]"
          [(value)]="folderId"
        />
        <p class="mt-2 text-sm opacity-70">
          value: <code>{{ folderId() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['itemsExpr', 'searchEnabled']"
        heading="Nested data & search"
        description="Point <code>itemsExpr</code> at the children field for hierarchical payloads. <code>searchEnabled</code> puts the tree's own search box inside the popup — accent-insensitive, auto-expanding to matches and highlighting them."
        [code]="nestedSnippet"
      >
        <oge-tree-select
          label="Source file"
          placeholder="Pick a file"
          [items]="fileTree"
          itemsExpr="children"
          displayExpr="name"
          [searchEnabled]="true"
          [showClearButton]="true"
          [expandedKeys]="[1, 2]"
          [(value)]="fileId"
        />
        <p class="mt-2 text-sm opacity-70">
          value: <code>{{ fileId() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['selectionMode', 'showCheckBoxes', 'selectedKeysMode']"
        heading="Multiple selection"
        description="With <code>multiple</code> the value becomes an array of keys and the popup stays open while you pick. Checking a node cascades to its descendants and normalizes up, so <code>selectedKeysMode: 'leavesOnly'</code> is often what you actually want to store."
        [code]="multipleSnippet"
      >
        <oge-tree-select
          label="Permissions"
          placeholder="Grant access"
          [items]="folders"
          displayExpr="name"
          [rootValue]="null"
          selectionMode="multiple"
          showCheckBoxes="selectAll"
          selectedKeysMode="leavesOnly"
          [showClearButton]="true"
          [expandedKeys]="[1, 2, 6]"
          [(value)]="permissions"
        />
        <p class="mt-2 text-sm opacity-70">
          value: <code>{{ permissionsText() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['loadChildren', 'hasItemsExpr']"
        heading="Lazy load on demand"
        description="Bind only the roots and let <code>loadChildren</code> fetch the rest on first expand; a placeholder row shows while the promise is pending. Fetched nodes join the index, so a cascading selection reaches them too."
        [code]="lazySnippet"
      >
        <oge-tree-select
          label="Remote folder"
          placeholder="Browse the server"
          [items]="remoteRoots"
          displayExpr="name"
          [rootValue]="null"
          hasItemsExpr="hasItems"
          [loadChildren]="loadChildren"
          [showClearButton]="true"
          [(value)]="remoteId"
        />
      </app-demo-card>
    }
  `,
})
export class InputsTreeSelectPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_TREE_SELECT_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly nestedSnippet = NESTED_SNIPPET;
  protected readonly multipleSnippet = MULTIPLE_SNIPPET;
  protected readonly lazySnippet = LAZY_SNIPPET;

  protected readonly folders = FOLDERS;
  protected readonly fileTree = FILE_TREE;
  protected readonly remoteRoots = REMOTE_ROOTS;

  protected readonly folderId = signal<unknown>(null);
  protected readonly fileId = signal<unknown>(null);
  protected readonly permissions = signal<unknown>([]);
  protected readonly remoteId = signal<unknown>(null);

  protected readonly permissionsText = () => {
    const value = this.permissions();
    return Array.isArray(value) && value.length ? value.join(', ') : '(none)';
  };

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
        700,
      ),
    );
}
