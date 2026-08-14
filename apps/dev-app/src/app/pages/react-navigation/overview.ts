import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import {
  OgeTreeView,
  type OgeTreeItemRenderContext,
  type OgeTreeReorderedEvent,
  type RowKey,
} from '@oge-ui/react-navigation';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { NAVIGATION_TREE_VIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same eight sections as the Angular tree view
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_NAVIGATION_TREE_VIEW_SECTIONS = [
  'Flat data',
  'Nested data',
  'Checkboxes & cascade',
  'Search',
  'Lazy load on demand',
  'Virtual scrolling',
  'Drag & drop reparenting',
  'Custom node template',
] as const;

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

/** Instantiation expressions, so the demos keep their row type end to end. */
const FolderTree = OgeTreeView<Folder>;
const NestedTreeView = OgeTreeView<NestedFolder>;

const loadChildren = (parent: Folder): Promise<Folder[]> =>
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

/** The docs' plain button chrome, shared by the interactive demos. */
const demoButton = (label: string, onClick: () => void) =>
  createElement(
    'button',
    {
      type: 'button',
      className: 'rounded border px-2 py-1 text-sm',
      onClick,
    },
    label,
  );

const keyLine = (...children: ReactNode[]) =>
  createElement(
    'p',
    { className: 'mt-2 text-sm opacity-70' },
    ...(children as ReactNode[]),
  );

const codeOf = (keys: readonly RowKey[]) =>
  createElement('code', null, keys.join(', ') || '(none)');

function FlatDemo(): ReactNode {
  const [open, setOpen] = useState<readonly RowKey[]>([1]);
  const [picked, setPicked] = useState<readonly RowKey[]>([]);
  return createElement(
    'div',
    null,
    createElement(FolderTree, {
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      selectionMode: 'single',
      expandedKeys: open,
      onExpandedKeysChange: setOpen,
      selectedKeys: picked,
      onSelectedKeysChange: setPicked,
      height: '240px',
    }),
    keyLine(
      'expandedKeys: ',
      codeOf(open),
      ' · selectedKeys: ',
      codeOf(picked),
    ),
  );
}

function CheckBoxesDemo(): ReactNode {
  const [checked, setChecked] = useState<readonly RowKey[]>([]);
  return createElement(
    'div',
    null,
    createElement(FolderTree, {
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      selectionMode: 'multiple',
      showCheckBoxes: 'selectAll',
      selectedKeys: checked,
      onSelectedKeysChange: setChecked,
      expandedKeys: [1, 2, 6],
      height: '260px',
    }),
    keyLine('selectedKeys: ', codeOf(checked)),
  );
}

function DragDemo(): ReactNode {
  const [rows, setRows] = useState<readonly Folder[]>(FOLDERS);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const reparent = (event: OgeTreeReorderedEvent<Folder>): void => {
    const parentId =
      event.position === 'inside' ? event.dropKey : event.dropItem.parentId;
    setRows((current) =>
      current.map((row) =>
        row.id === event.dragKey
          ? { ...row, parentId: parentId as number | null }
          : row,
      ),
    );
    setLastMove(
      `${event.dragItem.name} → ${event.position} ${event.dropItem.name}`,
    );
  };
  return createElement(
    'div',
    null,
    createElement(FolderTree, {
      items: rows,
      displayExpr: 'name',
      rootValue: null,
      allowDragging: true,
      expandedKeys: [1, 2, 6],
      onItemReordered: reparent,
      height: '280px',
    }),
    createElement(
      'div',
      { className: 'mt-2 flex items-center gap-3' },
      demoButton('Reset', () => {
        setRows(FOLDERS);
        setLastMove(null);
      }),
      lastMove
        ? createElement('span', { className: 'text-sm opacity-70' }, lastMove)
        : null,
    ),
  );
}

/**
 * The React half of the tree view page — the same eight demo sections as the
 * Angular page, with the same example data, rendered as real React trees
 * inside `/components/tree-view` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-navigation-tree-view-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React tree view carries the class names but no styles of its own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/navigation/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['keyExpr', 'parentIdExpr', 'expandedKeys', 'selectionMode']"
      heading="Flat data"
      description="The canonical shape: rows carrying a parent reference. <code>expandedKeys</code> and <code>selectedKeys</code> are controlled pairs keyed by identity, so they survive reordering. The disabled node is skipped by both clicks and arrow keys."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="flat" />
    </app-demo-card>

    <app-demo-card
      [chips]="['itemsExpr']"
      heading="Nested data"
      description="Point <code>itemsExpr</code> at the children field and the parent links are derived for you — behavior's <code>flattenNestedTree</code> normalizes the payload into the same single pipeline the flat shape uses."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="nested" />
    </app-demo-card>

    <app-demo-card
      [chips]="['showCheckBoxes', 'tri-state', 'selectedKeysMode']"
      heading="Checkboxes & cascade"
      description='Checking a node cascades down to its descendants and normalizes up: a parent is checked only when every child is, and indeterminate whenever some are. The checkbox is an <code>aria-hidden</code> glyph and the state lives on the row as <code>aria-checked</code> — a real checkbox inside <code>role="treeitem"</code> would be a nested-interactive violation.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="checkBoxes" />
    </app-demo-card>

    <app-demo-card
      [chips]="['searchEnabled', 'filterMode', 'highlight']"
      heading="Search"
      description="Matching is accent- and locale-insensitive (behavior's <code>foldText</code>), the ancestors of a hit are auto-expanded so it is reachable, and the matched substring is wrapped in <code>&amp;lt;mark&amp;gt;</code>. <code>filterMode: 'fullBranch'</code> also keeps a match's descendants."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="search" />
    </app-demo-card>

    <app-demo-card
      [chips]="['loadChildren', 'hasItemsExpr', 'skeleton row']"
      heading="Lazy load on demand"
      description="Only the roots are bound; <code>hasItemsExpr</code> tells the tree which of them can expand. The first expand calls <code>loadChildren</code> and the engine renders a placeholder row until it resolves. Fetched children are folded into the index, so cascading selection reaches them."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <app-demo-card
      [chips]="['virtualScroll', '10 000 nodes']"
      heading="Virtual scrolling"
      description="Because the tree renders a flat list with <code>aria-level</code> rather than nested groups, it can window the DOM. Built on behavior's <code>OffsetTree</code> + <code>computeWindow</code>; keyboard focus moves scroll the target into view first, since the row may not exist yet."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="virtual" />
    </app-demo-card>

    <app-demo-card
      [chips]="['allowDragging', 'inside / before / after', 'cycle guard']"
      heading="Drag & drop reparenting"
      description="Drag a node onto the middle of another to make it a child, or onto an edge to place it as a sibling. Hovering a collapsed parent opens it, Escape cancels, and a node can never be dropped into its own subtree. The tree calls <code>onItemReordered</code> and leaves the data change to you."
      [code]="demos[6].source"
      language="tsx"
    >
      <app-react-host [render]="drag" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderItem']"
      heading="Custom node template"
      description='The <code>renderItem</code> prop replaces the built-in label. It renders inside the <code>role="treeitem"</code> row, so it must stay free of focusable controls.'
      [code]="demos[7].source"
      language="tsx"
    >
      <app-react-host [render]="renderItem" />
    </app-demo-card>
  `,
})
export class ReactNavigationTreeViewDemos {
  protected readonly demos = NAVIGATION_TREE_VIEW_DEMOS;

  protected readonly flat = () => createElement(FlatDemo);
  protected readonly checkBoxes = () => createElement(CheckBoxesDemo);
  protected readonly drag = () => createElement(DragDemo);

  protected readonly nested = () =>
    createElement(NestedTreeView, {
      items: NESTED_TREE,
      itemsExpr: 'children',
      displayExpr: 'name',
      expandedKeys: [1, 2],
      height: '220px',
    });

  protected readonly search = () =>
    createElement(FolderTree, {
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      searchEnabled: true,
      height: '260px',
    });

  protected readonly lazy = () =>
    createElement(FolderTree, {
      items: LAZY_ROOTS,
      displayExpr: 'name',
      rootValue: null,
      hasItemsExpr: 'hasItems',
      loadChildren,
      selectionMode: 'multiple',
      showCheckBoxes: 'normal',
      height: '240px',
    });

  protected readonly virtual = () =>
    createElement(FolderTree, {
      items: MANY,
      displayExpr: 'name',
      rootValue: null,
      virtualScroll: true,
      height: '320px',
    });

  protected readonly renderItem = () =>
    createElement(FolderTree, {
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      expandedKeys: [1],
      height: '220px',
      renderItem: (context: OgeTreeItemRenderContext<Folder>) =>
        createElement(
          'span',
          null,
          createElement('strong', null, context.item.name),
          ' ',
          createElement(
            'small',
            { className: 'opacity-60' },
            `level ${context.level}`,
          ),
        ),
    });
}
