import { describe, expect, it, vi } from 'vitest';
import type { OgeTreeViewNode } from './tree-view-core';
import {
  isTreeEditKey,
  planTreeEditKey,
  runTreeEditCommit,
  runTreeEditStart,
  treeCanEditNode,
  type OgeTreeEditingEvent,
} from './tree-view-editing';

interface Row {
  id: number;
  name: string;
  locked?: boolean;
}

function node(
  overrides: Partial<OgeTreeViewNode<Row>> = {},
): OgeTreeViewNode<Row> {
  return {
    id: '1',
    key: 1,
    filler: false,
    failed: false,
    item: { id: 1, name: 'Docs' },
    text: 'Docs',
    level: 0,
    posInSet: 1,
    setSize: 1,
    hasChildren: false,
    expanded: false,
    disabled: false,
    selected: false,
    loading: false,
    checkState: 'unchecked',
    highlighted: null,
    ...overrides,
  };
}

describe('treeCanEditNode', () => {
  it('honours the boolean and the per-item predicate', () => {
    expect(treeCanEditNode(true, node(), false)).toBe(true);
    expect(treeCanEditNode(false, node(), false)).toBe(false);
    const allow = (row: Row) => !row.locked;
    expect(treeCanEditNode(allow, node(), false)).toBe(true);
    expect(
      treeCanEditNode(
        allow,
        node({ item: { id: 1, name: 'x', locked: true } }),
        false,
      ),
    ).toBe(false);
  });

  it('never edits fillers, Load more rows, disabled rows or a disabled tree', () => {
    expect(treeCanEditNode(true, node({ filler: true }), false)).toBe(false);
    expect(
      treeCanEditNode(
        true,
        node({ more: { parentKey: null, shown: 1, total: 2 } }),
        false,
      ),
    ).toBe(false);
    expect(treeCanEditNode(true, node({ disabled: true }), false)).toBe(false);
    expect(treeCanEditNode(true, node(), true)).toBe(false);
    expect(treeCanEditNode(true, undefined, false)).toBe(false);
  });
});

describe('runTreeEditStart', () => {
  it('fires the cancelable itemEditStarting with the current label', () => {
    const emitStarting = vi.fn();
    expect(
      runTreeEditStart({
        node: node(),
        allow: true,
        treeDisabled: false,
        emitStarting,
      }),
    ).toBe(true);
    expect(emitStarting).toHaveBeenCalledWith(
      expect.objectContaining({ key: 1, value: 'Docs', cancel: false }),
    );
  });

  it('stays closed when the pre-event cancels or editing is off', () => {
    expect(
      runTreeEditStart({
        node: node(),
        allow: true,
        treeDisabled: false,
        emitStarting: (e) => (e.cancel = true),
      }),
    ).toBe(false);
    const emitStarting = vi.fn();
    expect(
      runTreeEditStart({
        node: node(),
        allow: false,
        treeDisabled: false,
        emitStarting,
      }),
    ).toBe(false);
    expect(emitStarting).not.toHaveBeenCalled();
  });
});

describe('editor keys', () => {
  it('maps Enter / Escape and only plain F2 opens', () => {
    expect(planTreeEditKey('Enter')).toBe('commit');
    expect(planTreeEditKey('Escape')).toBe('cancel');
    expect(planTreeEditKey('a')).toBeNull();
    expect(isTreeEditKey({ key: 'F2' })).toBe(true);
    expect(isTreeEditKey({ key: 'F2', ctrlKey: true })).toBe(false);
    expect(isTreeEditKey({ key: 'Enter' })).toBe(false);
  });
});

describe('runTreeEditCommit', () => {
  function commit(
    value: string,
    extra: Partial<Parameters<typeof runTreeEditCommit<Row>>[0]> = {},
  ) {
    const editing = vi.fn<(e: OgeTreeEditingEvent<Row>) => void>();
    const edited = vi.fn();
    const result = runTreeEditCommit<Row>({
      key: 1,
      item: { id: 1, name: 'Docs' },
      previousValue: 'Docs',
      value,
      invalidMessage: 'Invalid',
      emitEditing: editing,
      emitEdited: edited,
      ...extra,
    });
    return { result, editing, edited };
  }

  it('commits through itemEditing then itemEdited', () => {
    const { result, editing, edited } = commit('Documents');
    expect(result.status).toBe('committed');
    expect(editing).toHaveBeenCalledWith(
      expect.objectContaining({ previousValue: 'Docs', value: 'Documents' }),
    );
    expect(edited).toHaveBeenCalledWith(
      expect.objectContaining({ previousValue: 'Docs', value: 'Documents' }),
    );
  });

  it('closes quietly on an unchanged or blank label', () => {
    expect(commit('Docs').result.status).toBe('unchanged');
    const blank = commit('   ');
    expect(blank.result.status).toBe('empty');
    expect(blank.editing).not.toHaveBeenCalled();
  });

  it('keeps the editor open with the validator message', () => {
    const rejected = commit('x', { validate: () => false });
    expect(rejected.result).toEqual({ status: 'invalid', error: 'Invalid' });
    const custom = commit('x', { validate: () => 'Too short' });
    expect(custom.result).toEqual({ status: 'invalid', error: 'Too short' });
    expect(custom.editing).not.toHaveBeenCalled();
    expect(commit('long name', { validate: () => null }).result.status).toBe(
      'committed',
    );
  });

  it('honours a cancelled itemEditing', () => {
    const { result, edited } = commit('Documents', {
      emitEditing: (e) => (e.cancel = true),
    });
    expect(result.status).toBe('cancelled');
    expect(edited).not.toHaveBeenCalled();
  });
});
