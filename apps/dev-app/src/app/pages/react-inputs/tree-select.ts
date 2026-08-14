import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeTreeSelect } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_TREE_SELECT_DEMOS } from './tree-select-snippets';

/**
 * TOC of the React view — the same four sections as the Angular tree select
 * page (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_INPUTS_TREE_SELECT_SECTIONS = [
  'Basic usage',
  'Nested data & search',
  'Multiple selection',
  'Lazy load on demand',
] as const;

/** The `value: …` readout beside a demo editor, as on the Angular page. */
const readout = (label: string, value: string) =>
  createElement(
    'p',
    { key: 'readout', className: 'mt-2 text-sm opacity-70' },
    `${label} `,
    createElement('code', null, value),
  );

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

/** Called once per node, on first expand — a placeholder row shows meanwhile. */
const loadChildren = (parent: Folder): Promise<Folder[]> =>
  new Promise((resolve) =>
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

function BasicDemo(): ReactNode {
  const [folderId, setFolderId] = useState<unknown>(null);
  return createElement(
    'div',
    null,
    createElement(OgeTreeSelect<Folder>, {
      key: 'folder',
      label: 'Folder',
      placeholder: 'Pick a folder',
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      showClearButton: true,
      defaultExpandedKeys: [1],
      value: folderId,
      onValueChange: setFolderId,
    }),
    readout('value:', folderId === null ? 'null' : String(folderId)),
  );
}

function NestedDemo(): ReactNode {
  const [fileId, setFileId] = useState<unknown>(null);
  return createElement(
    'div',
    null,
    createElement(OgeTreeSelect<NestedFile>, {
      key: 'file',
      label: 'Source file',
      placeholder: 'Pick a file',
      items: FILE_TREE,
      itemsExpr: 'children',
      displayExpr: 'name',
      searchEnabled: true,
      showClearButton: true,
      defaultExpandedKeys: [1, 2],
      value: fileId,
      onValueChange: setFileId,
    }),
    readout('value:', fileId === null ? 'null' : String(fileId)),
  );
}

function MultipleDemo(): ReactNode {
  const [permissions, setPermissions] = useState<unknown>([]);
  const text =
    Array.isArray(permissions) && permissions.length
      ? permissions.join(', ')
      : '(none)';
  return createElement(
    'div',
    null,
    createElement(OgeTreeSelect<Folder>, {
      key: 'permissions',
      label: 'Permissions',
      placeholder: 'Grant access',
      items: FOLDERS,
      displayExpr: 'name',
      rootValue: null,
      selectionMode: 'multiple',
      showCheckBoxes: 'selectAll',
      selectedKeysMode: 'leavesOnly',
      showClearButton: true,
      defaultExpandedKeys: [1, 2, 6],
      value: permissions,
      onValueChange: setPermissions,
    }),
    readout('value:', text),
  );
}

function LazyDemo(): ReactNode {
  const [remoteId, setRemoteId] = useState<unknown>(null);
  return createElement(OgeTreeSelect<Folder>, {
    label: 'Remote folder',
    placeholder: 'Browse the server',
    items: REMOTE_ROOTS,
    displayExpr: 'name',
    rootValue: null,
    hasItemsExpr: 'hasItems',
    loadChildren,
    showClearButton: true,
    value: remoteId,
    onValueChange: setRemoteId,
  });
}

/**
 * The React half of the tree select page — the same four demo sections as the
 * Angular page, over the same trees, rendered as real React trees inside
 * `/components/inputs/tree-select` when the reader has chosen React (ADR 0002).
 *
 * The popup tree's markup comes from `@oge-ui/react-navigation`'s stylesheet,
 * so both package stylesheets load here.
 */
@Component({
  selector: 'app-react-inputs-tree-select-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editor carries the class names but no styles of its own — the
  // docs pull the same SCSS the package builds compile. The field chrome and
  // the popup box ship in `@oge-ui/react-inputs`; the tree inside the popup is
  // the navigation package's markup, so its stylesheet comes too.
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/navigation/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="[
        'value + onValueChange',
        'keyExpr / parentIdExpr',
        'clear button',
      ]"
      heading="Basic usage"
      description="The committed value is the selected node's key. A single click picks a node and closes the popup; the chevron expands, so choosing never fights with browsing. Double-click also expands — <code>expandEvent</code> changes that."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['itemsExpr', 'searchEnabled']"
      heading="Nested data & search"
      description="Point <code>itemsExpr</code> at the children field for hierarchical payloads. <code>searchEnabled</code> puts the tree's own search box inside the popup — accent-insensitive, auto-expanding to matches and highlighting them."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="nested" />
    </app-demo-card>

    <app-demo-card
      [chips]="['selectionMode', 'showCheckBoxes', 'selectedKeysMode']"
      heading="Multiple selection"
      description="With <code>multiple</code> the value becomes an array of keys and the popup stays open while you pick. Checking a node cascades to its descendants and normalizes up, so <code>selectedKeysMode: 'leavesOnly'</code> is often what you actually want to store."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="multiple" />
    </app-demo-card>

    <app-demo-card
      [chips]="['loadChildren', 'hasItemsExpr']"
      heading="Lazy load on demand"
      description="Bind only the roots and let <code>loadChildren</code> fetch the rest on first expand; a placeholder row shows while the promise is pending. Fetched nodes join the index, so a cascading selection reaches them too."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="lazy" />
    </app-demo-card>

    <p class="mt-6 text-sm opacity-80">
      Two members of the Angular editor have no React counterpart, on purpose.
      <code>inputChange</code> is inherited from Angular's
      <code>OgeInputBase</code>, but the tree select's native input is
      <code>readonly</code> — the event can never fire in either layer, so the
      React port omits it rather than shipping a callback that is never called.
      Angular's <code>panel</code> field and its
      <code>dropdown</code> (<code>OgeInputDropDownApi</code>) are DI plumbing
      for the <code>OGE_INPUT_HOST</code> token that the field chrome reads; the
      React chrome takes a plain per-render host object instead, so there is
      nothing user-facing to mirror. Imperative popup control lives on the
      handle: <code>open()</code>, <code>close()</code> and
      <code>toggle()</code> via <code>ref</code>.
    </p>
  `,
})
export class ReactInputsTreeSelectDemos {
  protected readonly demos = INPUTS_TREE_SELECT_DEMOS;

  protected readonly basic = () => createElement(BasicDemo);
  protected readonly nested = () => createElement(NestedDemo);
  protected readonly multiple = () => createElement(MultipleDemo);
  protected readonly lazy = () => createElement(LazyDemo);
}
