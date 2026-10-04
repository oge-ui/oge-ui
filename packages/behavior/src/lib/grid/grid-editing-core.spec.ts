import { describe, expect, it, vi } from 'vitest';
import {
  ArrayDataSource,
  createFieldAccessor,
  type RowKey,
  type RowNode,
} from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import type { OgeGridResolvedColumn } from './grid-columns';
import {
  OgeGridEditingCore,
  type OgeGridEditorBridge,
  type OgeGridEditorState,
} from './grid-editing-core';
import { OgeGridEditingState, type OgeEditMode } from './grid-editing-state';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

interface Row {
  id: number;
  name: string;
  qty: number;
}

const column = (
  field: keyof Row,
  dataType: 'string' | 'number',
  editable = true,
): OgeGridResolvedColumn<Row> =>
  ({
    absIndex: 0,
    id: field,
    field,
    caption: field,
    dataType,
    alignment: 'start',
    width: undefined,
    minWidth: undefined,
    sortable: true,
    filterable: true,
    filterOperator: undefined,
    calculateFilterExpression: undefined,
    pinned: false,
    accessor: createFieldAccessor<Row>(field),
    format: undefined,
    editable,
    lookupItems: undefined,
    lookup: undefined,
    bandCaption: undefined,
    hidingPriority: undefined,
    cellTemplate: undefined,
    headerTemplate: undefined,
    editTemplate: undefined,
    source: undefined,
  }) as OgeGridResolvedColumn<Row>;

function setup(
  mode: OgeEditMode,
  bridge: Partial<OgeGridEditorBridge> = {},
): {
  core: OgeGridEditingCore<Row>;
  state: OgeGridEditingState;
  rows: Row[];
  events: { saving: number; updated: Record<string, unknown>[] };
} {
  const rows: Row[] = [
    { id: 1, name: 'Ada', qty: 1 },
    { id: 2, name: 'Bob', qty: 2 },
  ];
  const source = new ArrayDataSource<Row>(rows, { key: 'id' });
  const nodes = (): RowNode<Row>[] =>
    rows.map((data, i) => ({
      kind: 'data',
      key: data.id,
      data,
      sourceIndex: i,
      level: 0,
    }));
  const state = new OgeGridEditingState(rx);
  const events = { saving: 0, updated: [] as Record<string, unknown>[] };
  const core = new OgeGridEditingCore<Row>(
    {
      editing: () => ({ mode, allowUpdating: true }),
      state,
      columns: () => [
        column('name', 'string'),
        column('qty', 'number'),
        column('id', 'number', false),
      ],
      flatNodes: nodes,
      source: () => source,
      confirmDeleteMessage: () => '',
      editors: {
        editorState: () => undefined,
        markTouched: () => undefined,
        rowValues: () => new Map(),
        ...bridge,
      },
      events: {
        savingChanges: () => events.saving++,
        rowUpdated: (event) => events.updated.push(event.values),
      },
      reload: () => undefined,
    },
    rx,
  );
  return { core, state, rows, events };
}

describe('OgeGridEditingCore — paste / fill / undo', () => {
  it('stages a batch write and undoes it back to the stored values', async () => {
    const { core, state } = setup('batch');
    const written = await core.applyCellValues([
      { key: 1, field: 'name', value: 'Zed' },
      { key: 2, field: 'qty', value: 9 },
      // read-only column: skipped
      { key: 2, field: 'id', value: 99 },
    ]);
    expect(written).toBe(2);
    expect(state.changeFor(1, 'name')).toBe('Zed');
    expect(state.changeFor(2, 'qty')).toBe(9);
    expect(state.hasChange(2, 'id')).toBe(false);
    expect(core.history.canUndo()).toBe(true);
    await core.undo();
    // back to the stored value: the staged change is dropped, not re-staged
    expect(state.hasChange(1, 'name')).toBe(false);
    expect(state.hasChange(2, 'qty')).toBe(false);
    await core.redo();
    expect(state.changeFor(1, 'name')).toBe('Zed');
  });

  it('saves a non-batch write as one savingChanges batch', async () => {
    const { core, rows, events } = setup('cell');
    await core.applyCellValues([
      { key: 1, field: 'qty', value: 5 },
      { key: 2, field: 'qty', value: 6 },
    ]);
    expect(events.saving).toBe(1);
    expect(events.updated).toEqual([{ qty: 5 }, { qty: 6 }]);
    expect(rows.map((row) => row.qty)).toEqual([5, 6]);
    await core.undo();
    expect(rows.map((row) => row.qty)).toEqual([1, 2]);
  });

  it('skips values the validators reject (sync or async)', async () => {
    const validateValue = vi.fn(
      (_key: RowKey, field: string, value: unknown) =>
        field === 'qty' ? Promise.resolve((value as number) > 0) : true,
    );
    const { core, state } = setup('batch', { validateValue });
    const written = await core.applyCellValues([
      { key: 1, field: 'qty', value: -1 },
      { key: 2, field: 'qty', value: 3 },
    ]);
    expect(written).toBe(1);
    expect(state.hasChange(1, 'qty')).toBe(false);
    expect(state.changeFor(2, 'qty')).toBe(3);
  });

  it('adds rows past the end only when asked (pasteAddsRows)', async () => {
    const { core, state } = setup('batch');
    await core.applyCellValues([], { newRows: [{ name: 'New', qty: 4 }] });
    expect(state.added()).toHaveLength(1);
    expect(state.changes().get(state.added()[0])).toEqual({
      name: 'New',
      qty: 4,
    });
  });

  it('records committed cell edits in the history', () => {
    let editor: OgeGridEditorState | undefined = {
      value: 'Eve',
      invalid: false,
    };
    const { core, state } = setup('batch', {
      editorState: () => editor,
    });
    state.startCell(1, 'name');
    core.commitActiveCell();
    expect(state.changeFor(1, 'name')).toBe('Eve');
    expect(core.history.canUndo()).toBe(true);
    editor = undefined;
  });

  it('waits for a pending async validator before committing', async () => {
    let resolve!: () => void;
    const settled = new Promise<void>((done) => (resolve = done));
    let editor: OgeGridEditorState = {
      value: 'Eve',
      invalid: false,
      pending: true,
    };
    const { core, state } = setup('batch', {
      editorState: () => editor,
      whenValidated: () => settled,
    });
    state.startCell(1, 'name');
    core.commitActiveCell();
    expect(state.hasChange(1, 'name')).toBe(false);
    editor = { value: 'Eve', invalid: false };
    resolve();
    await settled;
    await Promise.resolve();
    expect(state.changeFor(1, 'name')).toBe('Eve');
  });
});
