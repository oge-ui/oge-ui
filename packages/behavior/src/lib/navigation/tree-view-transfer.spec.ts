import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RowKey } from '@oge-ui/core';
import {
  fillTreeViewMessages,
  OGE_TREE_DRAG_HOVER_EXPAND_MS,
  type OgeTreeDropPosition,
} from './tree-view-core';
import {
  beginOgeTreeDrag,
  ogeTreeCancelCut,
  ogeTreeCommitMove,
  ogeTreeCut,
  ogeTreeCutKey,
  ogeTreeDragGroupOf,
  ogeTreeDragPeerAt,
  ogeTreeDragPeerCount,
  ogeTreeHasCut,
  ogeTreeLocateDrop,
  ogeTreePaste,
  planTreeTransferKey,
  registerOgeTreeDragPeer,
  type OgeTreeDragPeer,
} from './tree-view-transfer';

interface FakeTree {
  peer: OgeTreeDragPeer;
  host: HTMLElement;
  rows: HTMLElement[];
  events: { kind: string; payload: unknown }[];
  previews: unknown[];
  cut: RowKey | null;
  expanded: RowKey[];
  announced: string[];
}

const unregister: (() => void)[] = [];

afterEach(() => {
  unregister.splice(0).forEach((fn) => fn());
  document.body.innerHTML = '';
  vi.useRealTimers();
});

/** A tree of rows `keys`, laid out as 20px slots from `top`. */
function fakeTree(
  id: string,
  keys: number[],
  options: {
    group?: string;
    top?: number;
    cancel?: boolean;
    parentOf?: Record<number, number>;
    register?: boolean;
  } = {},
): FakeTree {
  const host = document.createElement('div');
  host.className = 'oge-tree-view';
  const top = options.top ?? 0;
  const rows = keys.map((key, index) => {
    const row = document.createElement('div');
    row.className = 'oge-tree-view-item';
    row.setAttribute('data-key', String(key));
    row.getBoundingClientRect = () =>
      ({
        top: top + index * 20,
        bottom: top + index * 20 + 20,
        height: 20,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: top + index * 20,
        toJSON: () => ({}),
      }) as DOMRect;
    host.appendChild(row);
    return row;
  });
  document.body.appendChild(host);
  const tree: FakeTree = {
    host,
    rows,
    events: [],
    previews: [],
    cut: null,
    expanded: [],
    announced: [],
    peer: undefined as unknown as OgeTreeDragPeer,
  };
  const ancestors = (key: number): number[] => {
    const out: number[] = [];
    let current = options.parentOf?.[key];
    while (current !== undefined) {
      out.push(current);
      current = options.parentOf?.[current];
    }
    return out;
  };
  tree.peer = {
    treeId: () => id,
    group: () => ogeTreeDragGroupOf(options.group, id),
    element: () => host,
    rows: () => rows,
    rowInfo: (dataKey) => {
      const key = Number(dataKey);
      return keys.includes(key)
        ? { key, hasChildren: key === 1, expanded: false }
        : null;
    },
    itemOf: (key) =>
      keys.includes(Number(key))
        ? { id: key, name: `${id}-${key}` }
        : undefined,
    textOf: (key) => `${id}-${key}`,
    canDrop: (source, dropKey) =>
      source.treeId !== id ||
      (source.key !== dropKey &&
        !ancestors(Number(dropKey)).includes(Number(source.key))),
    allowDropInside: () => true,
    preview: (target) => tree.previews.push(target),
    expand: (key) => tree.expanded.push(key),
    setCut: (key) => (tree.cut = key),
    announce: (text) => tree.announced.push(text),
    messages: () => fillTreeViewMessages(undefined),
    emitReordering: (event) => {
      tree.events.push({ kind: 'reordering', payload: { ...event } });
      if (options.cancel) event.cancel = true;
    },
    emitReordered: (event) =>
      tree.events.push({ kind: 'reordered', payload: event }),
    emitTransferred: (event) =>
      tree.events.push({ kind: 'transferred', payload: event }),
  };
  if (options.register !== false) {
    unregister.push(registerOgeTreeDragPeer(tree.peer));
  }
  return tree;
}

function pointer(
  target: Element,
  type: string,
  clientY: number,
  pointerType?: string,
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 10,
    clientY,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  if (pointerType)
    Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

function startDrag(tree: FakeTree, rowIndex: number, y: number) {
  const row = tree.rows[rowIndex];
  const down = new MouseEvent('pointerdown', { clientX: 10, clientY: y });
  Object.defineProperty(down, 'pointerId', { value: 1 });
  Object.defineProperty(down, 'target', { value: row });
  return beginOgeTreeDrag(down as unknown as PointerEvent, {
    peer: tree.peer,
    key: Number(row.getAttribute('data-key')),
    row,
  });
}

describe('groups and the registry', () => {
  it('gives an ungrouped tree a private group', () => {
    expect(ogeTreeDragGroupOf(undefined, 'a')).not.toBe(
      ogeTreeDragGroupOf(undefined, 'b'),
    );
    expect(ogeTreeDragGroupOf('g', 'a')).toBe(ogeTreeDragGroupOf('g', 'b'));
  });

  it('registers and unregisters peers', () => {
    const before = ogeTreeDragPeerCount();
    const tree = fakeTree('a', [1], { register: false });
    const off = registerOgeTreeDragPeer(tree.peer);
    expect(ogeTreeDragPeerCount()).toBe(before + 1);
    off();
    expect(ogeTreeDragPeerCount()).toBe(before);
  });

  it('hit-tests peers of the same group only', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7, 8], { group: 'g' });
    const c = fakeTree('c', [9], { group: 'other' });
    expect(ogeTreeDragPeerAt(a.peer, b.rows[0])).toBe(b.peer);
    expect(ogeTreeDragPeerAt(a.peer, c.rows[0])).toBeNull();
    expect(ogeTreeDragPeerAt(a.peer, null)).toBe(a.peer);
    expect(ogeTreeDragPeerAt(a.peer, document.body)).toBeNull();
  });
});

describe('ogeTreeLocateDrop', () => {
  it('maps the pointer to a row and a drop zone', () => {
    const a = fakeTree('a', [1, 2, 3]);
    const source = { treeId: 'x', key: 9, item: {}, text: 'x' };
    expect(ogeTreeLocateDrop(a.peer, source, 21)).toMatchObject({
      treeId: 'a',
      key: 2,
      position: 'before',
    });
    expect(ogeTreeLocateDrop(a.peer, source, 30)).toMatchObject({
      key: 2,
      position: 'inside',
    });
    expect(ogeTreeLocateDrop(a.peer, source, 500)).toBeNull();
  });

  it('applies the peer veto (own subtree)', () => {
    const a = fakeTree('a', [1, 2], { parentOf: { 2: 1 } });
    const source = { treeId: 'a', key: 1, item: {}, text: 'a-1' };
    expect(ogeTreeLocateDrop(a.peer, source, 30)).toBeNull();
  });
});

describe('ogeTreeCommitMove', () => {
  it('fires reordering + reordered on the target and transferred on the source', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7], { group: 'g' });
    expect(
      ogeTreeCommitMove({
        source: a.peer,
        target: b.peer,
        dragKey: 2,
        dropKey: 7,
        position: 'inside',
        trigger: 'pointer',
      }),
    ).toBe(true);
    expect(b.events.map((e) => e.kind)).toEqual(['reordering', 'reordered']);
    expect(b.events[1].payload).toMatchObject({
      dragKey: 2,
      dropKey: 7,
      sourceTreeId: 'a',
      targetTreeId: 'b',
      trigger: 'pointer',
      dragItem: { id: 2 },
    });
    expect(a.events.map((e) => e.kind)).toEqual(['transferred']);
    expect(b.announced).toEqual(['a-2 moved into b-7.']);
  });

  it('does not fire transferred for a move inside one tree', () => {
    const a = fakeTree('a', [1, 2]);
    ogeTreeCommitMove({
      source: a.peer,
      target: a.peer,
      dragKey: 2,
      dropKey: 1,
      position: 'after',
      trigger: 'api',
      announce: false,
    });
    expect(a.events.map((e) => e.kind)).toEqual(['reordering', 'reordered']);
    expect(a.announced).toEqual([]);
  });

  it('stops at a cancelled itemReordering', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7], { group: 'g', cancel: true });
    expect(
      ogeTreeCommitMove({
        source: a.peer,
        target: b.peer,
        dragKey: 2,
        dropKey: 7,
        position: 'before',
        trigger: 'pointer',
      }),
    ).toBe(false);
    expect(b.events.map((e) => e.kind)).toEqual(['reordering']);
    expect(a.events).toEqual([]);
  });
});

describe('keyboard twin', () => {
  it('maps the shortcuts', () => {
    expect(planTreeTransferKey({ key: 'x', ctrlKey: true })).toBe('cut');
    expect(planTreeTransferKey({ key: 'X', metaKey: true })).toBe('cut');
    expect(planTreeTransferKey({ key: 'v', ctrlKey: true })).toBe('paste');
    expect(
      planTreeTransferKey({ key: 'V', ctrlKey: true, shiftKey: true }),
    ).toBe('paste-after');
    expect(planTreeTransferKey({ key: 'x' })).toBeNull();
    expect(
      planTreeTransferKey({ key: 'x', ctrlKey: true, altKey: true }),
    ).toBeNull();
  });

  it('cuts in one tree and pastes in another of the group', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7], { group: 'g' });
    expect(ogeTreeCut(a.peer, 2)).toBe(true);
    expect(a.cut).toBe(2);
    expect(ogeTreeCutKey(a.peer)).toBe(2);
    expect(ogeTreeHasCut(b.peer)).toBe(true);
    expect(a.announced[0]).toContain('a-2 cut');
    expect(ogeTreePaste(b.peer, 7, 'inside')).toBe(true);
    expect(a.cut).toBeNull();
    expect(ogeTreeHasCut(b.peer)).toBe(false);
    expect(b.events[1].payload).toMatchObject({
      trigger: 'keyboard',
      sourceTreeId: 'a',
      targetTreeId: 'b',
    });
    expect(a.events.map((e) => e.kind)).toEqual(['transferred']);
  });

  it('keeps the cut and announces when the target cannot take it', () => {
    const a = fakeTree('a', [1, 2], { parentOf: { 2: 1 } });
    ogeTreeCut(a.peer, 1);
    expect(ogeTreePaste(a.peer, 2, 'inside')).toBe(false);
    expect(a.announced.at(-1)).toBe('a-1 cannot be moved here.');
    expect(ogeTreeCutKey(a.peer)).toBe(1);
  });

  it('cancels a pending cut', () => {
    const a = fakeTree('a', [1]);
    ogeTreeCut(a.peer, 1);
    expect(ogeTreeCancelCut(a.peer)).toBe(true);
    expect(a.cut).toBeNull();
    expect(a.announced.at(-1)).toBe('Move cancelled.');
    expect(ogeTreeCancelCut(a.peer)).toBe(false);
  });

  it('a new cut replaces the previous one', () => {
    const a = fakeTree('a', [1], { group: 'g' });
    const b = fakeTree('b', [7], { group: 'g' });
    ogeTreeCut(a.peer, 1);
    ogeTreeCut(b.peer, 7);
    expect(a.cut).toBeNull();
    expect(b.cut).toBe(7);
  });

  it('drops a cut when its tree unregisters', () => {
    const a = fakeTree('a', [1], { group: 'g', register: false });
    const b = fakeTree('b', [7], { group: 'g' });
    const off = registerOgeTreeDragPeer(a.peer);
    ogeTreeCut(a.peer, 1);
    off();
    expect(ogeTreePaste(b.peer, 7, 'inside')).toBe(false);
    expect(ogeTreeHasCut(b.peer)).toBe(false);
  });

  it('ignores a paste with nothing cut', () => {
    const a = fakeTree('a', [1]);
    expect(ogeTreePaste(a.peer, 1, 'inside' as OgeTreeDropPosition)).toBe(
      false,
    );
  });
});

describe('beginOgeTreeDrag', () => {
  it('drags a node from one tree onto a row of another', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7, 8], { group: 'g', top: 100 });
    const onStart = vi.fn();
    const down = new MouseEvent('pointerdown', { clientX: 10, clientY: 30 });
    Object.defineProperty(down, 'pointerId', { value: 1 });
    Object.defineProperty(down, 'target', { value: a.rows[1] });
    beginOgeTreeDrag(down as unknown as PointerEvent, {
      peer: a.peer,
      key: 2,
      row: a.rows[1],
      onStart,
    });
    pointer(b.rows[1], 'pointermove', 130);
    expect(onStart).toHaveBeenCalled();
    expect(b.previews.at(-1)).toMatchObject({ key: 8, position: 'inside' });
    pointer(b.rows[1], 'pointerup', 130);
    expect(b.events.map((e) => e.kind)).toEqual(['reordering', 'reordered']);
    expect(a.events.map((e) => e.kind)).toEqual(['transferred']);
    expect(b.previews.at(-1)).toBeNull();
  });

  it('clears the previous peer’s preview when the pointer moves on', () => {
    const a = fakeTree('a', [1, 2], { group: 'g' });
    const b = fakeTree('b', [7], { group: 'g', top: 100 });
    startDrag(a, 0, 10);
    pointer(a.rows[1], 'pointermove', 30);
    expect(a.previews.at(-1)).toMatchObject({ key: 2 });
    pointer(b.rows[0], 'pointermove', 110);
    expect(a.previews.at(-1)).toBeNull();
    expect(b.previews.at(-1)).toMatchObject({ key: 7 });
    pointer(b.rows[0], 'pointerup', 110);
  });

  it('expands a collapsed parent hovered long enough', () => {
    vi.useFakeTimers();
    const a = fakeTree('a', [1, 2]);
    startDrag(a, 1, 30);
    pointer(a.rows[0], 'pointermove', 10);
    vi.advanceTimersByTime(OGE_TREE_DRAG_HOVER_EXPAND_MS + 1);
    expect(a.expanded).toEqual([1]);
    pointer(a.rows[0], 'pointerup', 10);
  });

  it('Escape cancels without a drop', () => {
    const a = fakeTree('a', [1, 2]);
    startDrag(a, 1, 30);
    pointer(a.rows[0], 'pointermove', 10);
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    pointer(a.rows[0], 'pointerup', 10);
    expect(a.events).toEqual([]);
    expect(a.previews.at(-1)).toBeNull();
  });

  it('returns null for an unknown key', () => {
    const a = fakeTree('a', [1]);
    const down = new MouseEvent('pointerdown');
    Object.defineProperty(down, 'pointerId', { value: 1 });
    expect(
      beginOgeTreeDrag(down as unknown as PointerEvent, {
        peer: a.peer,
        key: 42,
        row: null,
      }),
    ).toBeNull();
  });
});
