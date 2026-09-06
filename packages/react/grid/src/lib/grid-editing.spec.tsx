import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createRef } from 'react';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Person {
  id: number;
  name: string;
  city: string;
  age: number;
}

const seed = (): Person[] => [
  { id: 1, name: 'Ada', city: 'London', age: 36 },
  { id: 2, name: 'Grace', city: 'New York', age: 85 },
  { id: 3, name: 'Linus', city: 'London', age: 54 },
];

const columns = [
  { field: 'name', caption: 'Name' },
  { field: 'city', caption: 'City' },
  { field: 'age', caption: 'Age', dataType: 'number' as const },
];

const dataRows = () => document.querySelectorAll('.oge-rows .oge-row');
const cellsOf = (row: Element) => row.querySelectorAll('.oge-cell');
const editorInput = () =>
  document.querySelector<HTMLInputElement>('.oge-editor input');

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('<OgeGrid> editing', () => {
  it('cell mode: click opens an editor, Enter commits and writes back', async () => {
    const rows = seed();
    const source = new ArrayDataSource(rows, { key: 'id' });
    render(
      <OgeGrid
        data={source}
        keyField="id"
        columns={columns}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    const nameCell = cellsOf(dataRows()[0])[0];
    fireEvent.click(nameCell);
    await settle();

    const input = editorInput();
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: { value: 'Ada L.' },
    });
    fireEvent.keyDown(input as HTMLInputElement, { key: 'Enter' });
    await settle();

    expect(editorInput()).toBeNull();
    await waitFor(() => expect(rows[0].name).toBe('Ada L.'));
  });

  it('Escape abandons the edit and leaves the row untouched', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    const input = editorInput() as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    await settle();

    expect(editorInput()).toBeNull();
    expect(rows[0].name).toBe('Ada');
  });

  it('batch mode stages changes and only the toolbar Save writes them', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'batch', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    const input = editorInput() as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ada B.' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();

    // staged, not saved: the cell reads the pending value and is marked dirty
    expect(rows[0].name).toBe('Ada');
    expect(document.querySelector('.oge-cell-dirty')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await settle();
    await waitFor(() => expect(rows[0].name).toBe('Ada B.'));
    expect(document.querySelector('.oge-cell-dirty')).toBeNull();
  });

  it('batch mode: Discard drops the staged change', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'batch', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    const input = editorInput() as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ada B.' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await settle();
    expect(rows[0].name).toBe('Ada');
    expect(document.querySelector('.oge-cell-dirty')).toBeNull();
  });

  it('row mode: the command column opens every editable cell, Save commits', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'row', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await settle();
    // one editor per editable column
    expect(document.querySelectorAll('.oge-editor').length).toBe(3);

    const [nameInput] =
      document.querySelectorAll<HTMLInputElement>('.oge-editor input');
    fireEvent.change(nameInput, { target: { value: 'Ada R.' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
    await settle();

    await waitFor(() => expect(rows[0].name).toBe('Ada R.'));
    expect(document.querySelectorAll('.oge-editor').length).toBe(0);
  });

  it('a required column rejects an empty value and keeps the editor open', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={[
          { field: 'name', caption: 'Name', required: true },
          ...columns.slice(1),
        ]}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    const input = editorInput() as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();

    expect(editorInput()).not.toBeNull(); // still open
    expect(document.querySelector('.oge-editor-invalid')).not.toBeNull();
    expect(rows[0].name).toBe('Ada');
  });

  it('a custom validator rejects with its own message', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={[
          {
            field: 'name',
            caption: 'Name',
            validators: [
              (value) =>
                String(value).length < 3 ? 'At least three characters' : null,
            ],
          },
          ...columns.slice(1),
        ]}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    const input = editorInput() as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await settle();

    expect(document.querySelector('.oge-editor')?.getAttribute('title')).toBe(
      'At least three characters',
    );
    expect(rows[0].name).toBe('Ada');
  });

  it('addRow() stages a draft row on top and onInitNewRow prefills it', async () => {
    const rows = seed();
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'batch', allowUpdating: true, allowAdding: true }}
        onInitNewRow={(event) => {
          event.values.city = 'Ankara';
        }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    act(() => ref.current?.addRow());
    await settle();

    expect(dataRows().length).toBe(4);
    expect(ref.current?.hasChanges()).toBe(true);
    expect(cellsOf(dataRows()[0])[1].textContent).toContain('Ankara');
  });

  it('deleteRow() stages a removal in batch mode and saving applies it', async () => {
    const rows = seed();
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'batch', allowUpdating: true, allowDeleting: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    act(() => ref.current?.deleteRow(2));
    await settle();
    expect(rows).toHaveLength(3); // staged only
    expect(ref.current?.hasChanges()).toBe(true);

    act(() => ref.current?.saveChanges());
    await waitFor(() => expect(rows.map((row) => row.id)).toEqual([1, 3]));
  });

  it('form mode replaces the row with an edit form', async () => {
    const rows = seed();
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'form', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    act(() => ref.current?.editRow(1));
    await settle();

    expect(document.querySelector('.oge-edit-form-row')).not.toBeNull();
    expect(document.querySelector('.oge-edit-form-fields')).not.toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]);
    await settle();
    expect(document.querySelector('.oge-edit-form-row')).toBeNull();
  });

  it('popup mode opens the row in a modal', async () => {
    const rows = seed();
    const ref = createRef<OgeGridHandle<Person>>();
    render(
      <OgeGrid
        ref={ref}
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'popup', allowUpdating: true }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    act(() => ref.current?.editRow(1));
    await settle();

    expect(document.querySelector('.oge-edit-modal')).not.toBeNull();
    expect(document.querySelector('.oge-popup-fields')).not.toBeNull();
  });

  it('editing stays off without the matching permission', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={new ArrayDataSource(rows, { key: 'id' })}
        keyField="id"
        columns={columns}
        editing={{ mode: 'cell', allowUpdating: false }}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    fireEvent.click(cellsOf(dataRows()[0])[0]);
    await settle();
    expect(editorInput()).toBeNull();
  });
});

describe('<OgeGrid> header filter', () => {
  const withDistinct = (rows: Person[]) => {
    const source = new ArrayDataSource(rows, { key: 'id' });
    return source;
  };

  it('lists the column’s distinct values and filters by the checked ones', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={withDistinct(rows)}
        keyField="id"
        columns={columns}
        headerFilter
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    const funnels = document.querySelectorAll<HTMLElement>(
      '.oge-header-filter-btn',
    );
    expect(funnels.length).toBe(3);
    fireEvent.click(funnels[1]); // City
    await waitFor(() =>
      expect(document.querySelector('.oge-header-filter-popup')).not.toBeNull(),
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-hf-item').length).toBeGreaterThan(
        1,
      ),
    );

    const labels = Array.from(document.querySelectorAll('.oge-hf-item')).map(
      (item) => item.textContent?.trim(),
    );
    expect(labels).toContain('London');
    expect(labels).toContain('New York');

    // Excel semantics: everything starts checked, so clearing "Select all"
    // and checking one value is what narrows the grid to that value
    fireEvent.click(
      document.querySelector('.oge-hf-all input') as HTMLInputElement,
    );
    await settle();
    const london = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-hf-item'),
    ).find((item) => item.textContent?.trim() === 'London') as HTMLElement;
    fireEvent.click(london.querySelector('input') as HTMLInputElement);
    await waitFor(() => expect(dataRows().length).toBe(2));
  });

  it('the funnel is marked active while the column carries a header filter', async () => {
    const rows = seed();
    render(
      <OgeGrid
        data={withDistinct(rows)}
        keyField="id"
        columns={columns}
        headerFilter
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(document.querySelector('.oge-header-filter-active')).toBeNull();

    fireEvent.click(
      document.querySelectorAll<HTMLElement>('.oge-header-filter-btn')[1],
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-hf-item').length).toBeGreaterThan(
        1,
      ),
    );
    const london = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-hf-item'),
    ).find((item) => item.textContent?.trim() === 'London') as HTMLElement;
    fireEvent.click(london.querySelector('input') as HTMLInputElement);
    await settle();
    expect(document.querySelector('.oge-header-filter-active')).not.toBeNull();
  });

  it('no funnel without headerFilter', async () => {
    render(
      <OgeGrid data={withDistinct(seed())} keyField="id" columns={columns} />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(document.querySelector('.oge-header-filter-btn')).toBeNull();
  });
});

describe('<OgeGrid> column chooser', () => {
  it('lists every column and hides the one unchecked', async () => {
    render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
        columnChooser
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(document.querySelectorAll('.oge-header-cell').length).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    await waitFor(() =>
      expect(document.querySelector('.oge-chooser-popup')).not.toBeNull(),
    );
    const entries = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
    );
    expect(entries.map((entry) => entry.textContent?.trim())).toEqual([
      'Name',
      'City',
      'Age',
    ]);

    fireEvent.click(entries[1].querySelector('input') as HTMLInputElement);
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-header-cell').length).toBe(2),
    );
  });

  it('no chooser button without columnChooser', async () => {
    render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(document.querySelector('.oge-chooser-popup')).toBeNull();
  });
});

describe('<OgeGrid> filter panel and builder', () => {
  it('opens the builder, applies a condition and describes it in the panel', async () => {
    render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
        filterPanel
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(screen.getByText('Create filter')).toBeTruthy();

    fireEvent.click(screen.getByText('Create filter'));
    await waitFor(() =>
      expect(document.querySelector('.oge-builder-modal')).not.toBeNull(),
    );

    const [fieldSelect, opSelect] = Array.from(
      document.querySelectorAll<HTMLSelectElement>('.oge-fb-condition select'),
    );
    fireEvent.change(fieldSelect, { target: { value: 'city' } });
    fireEvent.change(opSelect, { target: { value: 'eq' } });
    const valueInput = document.querySelector<HTMLInputElement>(
      '.oge-fb-condition .oge-fb-input input',
    );
    fireEvent.change(valueInput as HTMLInputElement, {
      target: { value: 'London' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(dataRows().length).toBe(2));
    expect(document.querySelector('.oge-filter-panel-clear')).not.toBeNull();
  });

  it('reports the expression through onFilterValueChange and takes filterValue back', async () => {
    const seen: unknown[] = [];
    const { rerender } = render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
        filterValue={null}
        onFilterValueChange={(value) => seen.push(value)}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    rerender(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
        filterValue={{
          type: 'binary',
          field: 'city',
          op: 'eq',
          value: 'London',
        }}
        onFilterValueChange={(value) => seen.push(value)}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(2));
  });
});

describe('<OgeGrid> column bands', () => {
  it('merges adjacent columns sharing a bandCaption into one spanning cell', async () => {
    render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={[
          { field: 'name', caption: 'Name', bandCaption: 'Person' },
          { field: 'city', caption: 'City', bandCaption: 'Person' },
          { field: 'age', caption: 'Age', dataType: 'number' as const },
        ]}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));

    const bands = Array.from(document.querySelectorAll('.oge-band-cell'));
    expect(bands.map((band) => band.textContent)).toEqual(['Person', '']);
    expect(bands[0].getAttribute('aria-colspan')).toBe('2');
    expect(bands[0].classList.contains('oge-band-filled')).toBe(true);
    expect(bands[1].classList.contains('oge-band-filled')).toBe(false);
  });

  it('no band row when no column carries a caption', async () => {
    render(
      <OgeGrid
        data={new ArrayDataSource(seed(), { key: 'id' })}
        keyField="id"
        columns={columns}
      />,
    );
    await waitFor(() => expect(dataRows().length).toBe(3));
    expect(document.querySelector('.oge-band-row')).toBeNull();
  });
});
