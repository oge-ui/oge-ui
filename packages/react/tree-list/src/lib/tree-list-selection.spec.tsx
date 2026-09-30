import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { createRef, useState } from 'react';
import type { RowKey } from '@oge-ui/core';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import {
  COLUMNS,
  makeRows,
  rowByName,
  settled,
  type Node,
} from './tree-list.test-utils';

const checkboxOf = (name: string): HTMLInputElement =>
  rowByName(name).querySelector('.oge-checkbox-cell input') as HTMLInputElement;

describe('OgeTreeList selection', () => {
  it('recursive checkbox selection cascades down and turns ancestors tri-state', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    const changes: RowKey[][] = [];
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        autoExpandAll
        selectionMode="checkbox"
        selectionRecursive
        onSelectionChanged={(event) => changes.push(event.addedKeys)}
      />,
    );
    await settled();
    fireEvent.click(checkboxOf('Child A1'));
    await waitFor(() => expect(checkboxOf('Grand A1a').checked).toBe(true));
    expect(checkboxOf('Root A').indeterminate).toBe(true);
    expect(checkboxOf('Root A').checked).toBe(false);
    expect(changes.at(-1)?.sort()).toEqual([2, 3]);
    fireEvent.click(checkboxOf('Child A2'));
    await waitFor(() => expect(checkboxOf('Root A').checked).toBe(true));
    const handle = ref.current as OgeTreeListHandle<Node>;
    expect(handle.getSelectedRowKeys('leavesOnly').sort()).toEqual([3, 4]);
    expect(handle.getSelectedRowKeys('excludeRecursive')).toEqual([1]);
    expect(handle.getSelectedRowsData('excludeRecursive')[0].name).toBe(
      'Root A',
    );
  });

  it('select-all cascades to collapsed descendants in recursive mode', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        selectionMode="checkbox"
        selectionRecursive
      />,
    );
    await settled();
    act(() => ref.current?.selectAll());
    await waitFor(() =>
      expect(ref.current?.getSelectedRowKeys().length).toBe(5),
    );
    act(() => ref.current?.deselectAll());
    expect(ref.current?.isRowSelected(1)).toBe(false);
  });

  it('multiple mode: click selects one, ctrl toggles, shift ranges; Space toggles', async () => {
    function Host() {
      const [keys, setKeys] = useState<readonly RowKey[]>([]);
      return (
        <>
          <output data-testid="keys">{[...keys].sort().join(',')}</output>
          <OgeTreeList
            data={makeRows()}
            columns={COLUMNS}
            autoExpandAll
            selectionMode="multiple"
            selectedKeys={keys}
            onSelectedKeysChange={setKeys}
          />
        </>
      );
    }
    const view = render(<Host />);
    await settled();
    const keys = () => view.getByTestId('keys').textContent;
    fireEvent.click(rowByName('Child A1'));
    await waitFor(() => expect(keys()).toBe('2'));
    fireEvent.click(rowByName('Root B'), { ctrlKey: true });
    await waitFor(() => expect(keys()).toBe('2,5'));
    fireEvent.click(rowByName('Root A'));
    fireEvent.click(rowByName('Grand A1a'), { shiftKey: true });
    await waitFor(() => expect(keys()).toBe('1,2,3'));
    const cell = rowByName('Child A2').querySelector(
      '.oge-cell',
    ) as HTMLElement;
    act(() => cell.focus());
    fireEvent.keyDown(cell, { key: ' ' });
    await waitFor(() => expect(keys()).toBe('1,2,3,4'));
    expect(rowByName('Child A2')).toHaveAttribute('aria-selected', 'true');
  });

  it('tracks a focused row as a controlled pair', async () => {
    const focused: (RowKey | null)[] = [];
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        focusedRowEnabled
        onFocusedRowChanged={(event) => focused.push(event.key)}
      />,
    );
    await settled();
    fireEvent.click(rowByName('Root B'));
    await waitFor(() =>
      expect(rowByName('Root B').classList.contains('oge-row-focused')).toBe(
        true,
      ),
    );
    expect(focused).toEqual([5]);
  });

  it('autoNavigateToFocusedRow expands the path to a focused key', async () => {
    const view = render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        focusedRowEnabled
        focusedRowKey={null}
        autoNavigateToFocusedRow
      />,
    );
    await settled();
    view.rerender(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        focusedRowEnabled
        focusedRowKey={3}
        autoNavigateToFocusedRow
      />,
    );
    await waitFor(() =>
      expect(rowByName('Grand A1a').classList.contains('oge-row-focused')).toBe(
        true,
      ),
    );
  });
});
