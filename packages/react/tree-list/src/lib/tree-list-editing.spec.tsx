import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createRef } from 'react';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import {
  COLUMNS,
  makeRows,
  names,
  rowByName,
  settled,
  type Node,
} from './tree-list.test-utils';

describe('OgeTreeList editing', () => {
  it('cell mode edits on click and saves into the backing array', async () => {
    const data = makeRows();
    const updated = vi.fn();
    render(
      <OgeTreeList
        data={data}
        columns={COLUMNS}
        autoExpandAll
        editing={{ mode: 'cell', allowUpdating: true }}
        onRowUpdated={updated}
      />,
    );
    await settled();
    const cell = rowByName('Root B').querySelectorAll('.oge-cell')[1];
    fireEvent.click(cell);
    const input = await waitFor(() => {
      const found = document.querySelector<HTMLInputElement>(
        '.oge-cell-editing input',
      );
      expect(found).not.toBeNull();
      return found as HTMLInputElement;
    });
    fireEvent.input(input, { target: { value: 'Paris' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(updated).toHaveBeenCalled());
    await waitFor(() => expect(data[4].office).toBe('Paris'));
  });

  it('batch mode stages changes behind Save / Discard in the toolbar', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    const saving = vi.fn();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        editing={{
          mode: 'batch',
          allowUpdating: true,
          allowDeleting: true,
          confirmDelete: false,
        }}
        onSavingChanges={saving}
      />,
    );
    await settled();
    fireEvent.click(
      rowByName('Root B').querySelector('.oge-command-delete') as HTMLElement,
    );
    await waitFor(() =>
      expect(rowByName('Root B').classList.contains('oge-row-removed')).toBe(
        true,
      ),
    );
    expect(ref.current?.hasChanges()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(ref.current?.hasChanges()).toBe(false));
    fireEvent.click(
      rowByName('Root B').querySelector('.oge-command-delete') as HTMLElement,
    );
    act(() => ref.current?.saveChanges());
    await waitFor(() => expect(saving).toHaveBeenCalled());
    await waitFor(() => expect(names()).toEqual(['Root A']));
  });

  it('addRow(parentKey) stages the parent and onInitNewRow prefills', async () => {
    const data = makeRows();
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={data}
        columns={COLUMNS}
        editing={{ mode: 'row', allowAdding: true, allowUpdating: true }}
        onInitNewRow={(event) => {
          expect(event.parentKey).toBe(5);
          event.values['name'] = 'New hire';
        }}
      />,
    );
    await settled();
    act(() => ref.current?.addRow(5));
    await waitFor(() =>
      expect(document.querySelector('.oge-row-new')).not.toBeNull(),
    );
    act(() => ref.current?.saveChanges());
    await waitFor(() =>
      expect(data.some((row) => row.name === 'New hire')).toBe(true),
    );
    expect(data.find((row) => row.name === 'New hire')?.parentId).toBe(5);
  });

  it('form mode renders the row as an OgeForm with the formItems layout', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        editing={{
          mode: 'form',
          allowUpdating: true,
          formItems: ['name', { field: 'effort', label: 'Effort (days)' }],
        }}
      />,
    );
    await settled();
    fireEvent.click(
      rowByName('Root B').querySelector(
        '.oge-command-btn[aria-label="Edit"]',
      ) as HTMLElement,
    );
    await waitFor(() =>
      expect(document.querySelector('.oge-edit-form-row')).not.toBeNull(),
    );
    const labels = [
      ...document.querySelectorAll('.oge-edit-form-row label'),
    ].map((label) => label.textContent?.replace('*', '').trim());
    expect(labels).toContain('Effort (days)');
    expect(labels).not.toContain('Office');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(document.querySelector('.oge-edit-form-row')).toBeNull(),
    );
  });

  it('popup mode edits in a modal', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        editing={{ mode: 'popup', allowUpdating: true }}
      />,
    );
    await settled();
    act(() => ref.current?.editRow(5));
    await waitFor(() =>
      expect(document.querySelector('.oge-edit-modal')).not.toBeNull(),
    );
    act(() => ref.current?.discardChanges());
    await waitFor(() =>
      expect(document.querySelector('.oge-edit-modal')).toBeNull(),
    );
  });
});
