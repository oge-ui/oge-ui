import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTreeView } from './tree-view';
import type {
  OgeTreeCheckBoxesMode,
  OgeTreeExpandEvent,
  OgeTreeExpandingEvent,
  OgeTreeLoadChildren,
  OgeTreeReorderedEvent,
  OgeTreeSearchMode,
  OgeTreeSelectedKeysMode,
  OgeTreeSelectionChangedEvent,
  OgeTreeSelectionMode,
  RowKey,
  TreeFilterMode,
} from './tree-view-types';

/** Flat fixture row. */
export interface Node {
  id: number;
  parentId: number | null;
  name: string;
  disabled?: boolean;
  hasItems?: boolean;
}

/** Nested fixture row. */
export interface NestedNode {
  id: number;
  name: string;
  children?: NestedNode[];
}

/**
 * ```
 * 1 Documents        4 Photos
 *   2 Reports          5 Holiday
 *     3 Q1.pdf
 * ```
 */
export const FLAT: Node[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

export const NESTED: NestedNode[] = [
  {
    id: 1,
    name: 'Documents',
    children: [
      { id: 2, name: 'Reports', children: [{ id: 3, name: 'Q1.pdf' }] },
    ],
  },
  { id: 4, name: 'Photos', children: [{ id: 5, name: 'Holiday' }] },
];

export async function settle(
  fixture: ComponentFixture<unknown>,
): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeView],
  template: `
    <oge-tree-view
      [items]="items()"
      [itemsExpr]="itemsExpr()"
      displayExpr="name"
      [rootValue]="null"
      [selectionMode]="selectionMode()"
      [showCheckBoxes]="showCheckBoxes()"
      [selectNodesRecursive]="selectNodesRecursive()"
      [selectedKeysMode]="selectedKeysMode()"
      [expandEvent]="expandEvent()"
      [searchEnabled]="searchEnabled()"
      [searchMode]="searchMode()"
      [filterMode]="filterMode()"
      [loadChildren]="loadChildren()"
      [virtualScroll]="virtualScroll()"
      [height]="height()"
      [allowDragging]="allowDragging()"
      [allowDropInside]="allowDropInside()"
      [disabled]="disabled()"
      [(expandedKeys)]="expandedKeys"
      [(selectedKeys)]="selectedKeys"
      [(focusedKey)]="focusedKey"
      [(searchValue)]="searchValue"
      (itemExpanding)="expanding.push($event)"
      (selectionChanged)="selectionChanged.push($event)"
      (itemReordered)="reordered.push($event)"
    />
  `,
})
export class Host {
  readonly tree = viewChild.required(OgeTreeView<Node>);
  readonly items = signal<readonly Node[] | undefined>(FLAT);
  readonly itemsExpr = signal<string | undefined>(undefined);
  readonly selectionMode = signal<OgeTreeSelectionMode>('none');
  readonly showCheckBoxes = signal<OgeTreeCheckBoxesMode>('none');
  readonly selectNodesRecursive = signal(true);
  readonly selectedKeysMode = signal<OgeTreeSelectedKeysMode>('all');
  readonly expandEvent = signal<OgeTreeExpandEvent>('click');
  readonly searchEnabled = signal(false);
  readonly searchMode = signal<OgeTreeSearchMode>('contains');
  readonly filterMode = signal<TreeFilterMode>('withAncestors');
  readonly loadChildren = signal<OgeTreeLoadChildren<Node> | undefined>(
    undefined,
  );
  readonly virtualScroll = signal<boolean>(false);
  readonly height = signal<string | undefined>(undefined);
  readonly allowDragging = signal(false);
  readonly allowDropInside = signal(true);
  readonly disabled = signal(false);
  readonly expandedKeys = signal<readonly RowKey[]>([]);
  readonly selectedKeys = signal<readonly RowKey[]>([]);
  readonly focusedKey = signal<RowKey | undefined>(undefined);
  readonly searchValue = signal('');
  readonly expanding: OgeTreeExpandingEvent<Node>[] = [];
  readonly selectionChanged: OgeTreeSelectionChangedEvent<Node>[] = [];
  readonly reordered: OgeTreeReorderedEvent<Node>[] = [];
}

/** Creates the host, applies `setup` before the first render, and settles. */
export async function render(setup?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  setup?.(host);
  await settle(fixture);
  const el: HTMLElement = fixture.nativeElement;
  const rows = () =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-tree-view-item'));
  return {
    fixture,
    host,
    el,
    rows,
    /** Visible node labels, in render order. */
    labels: () =>
      rows()
        .filter((r) => !r.classList.contains('oge-tree-view-item-filler'))
        .map((r) => r.textContent?.trim() ?? ''),
    rowFor: (name: string) =>
      rows().find((r) => r.textContent?.trim().startsWith(name)),
    checkStates: () =>
      rows().map(
        (r) =>
          r.querySelector('.oge-tree-view-check')?.getAttribute('data-state') ??
          null,
      ),
  };
}

/** Dispatches a bubbling keydown on `target`. */
export function key(
  target: Element,
  keyName: string,
  init: KeyboardEventInit = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}
