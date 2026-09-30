import { screen, waitFor, within } from '@testing-library/react';

/** The org chart every spec renders: two roots, a three-level branch. */
export interface Node {
  id: number;
  parentId: number | null;
  name: string;
  office: string;
  effort: number;
  done?: boolean;
  hasKids?: boolean;
}

export const makeRows = (): Node[] => [
  { id: 1, parentId: null, name: 'Root A', office: 'Berlin', effort: 10 },
  { id: 2, parentId: 1, name: 'Child A1', office: 'İzmir', effort: 4 },
  { id: 3, parentId: 2, name: 'Grand A1a', office: 'London', effort: 1 },
  { id: 4, parentId: 1, name: 'Child A2', office: 'Berlin', effort: 3 },
  { id: 5, parentId: null, name: 'Root B', office: 'London', effort: 7 },
];

export const COLUMNS = [
  { field: 'name', caption: 'Name' },
  { field: 'office', caption: 'Office' },
  { field: 'effort', caption: 'Effort', dataType: 'number' as const },
];

/** Rendered data rows (not the header, filter or filler rows). */
export const rows = (): HTMLElement[] =>
  screen
    .queryAllByRole('row')
    .filter(
      (row) =>
        row.classList.contains('oge-row') &&
        !row.classList.contains('oge-filler-row'),
    );

/** Names of the rendered rows, in display order. */
export const names = (): string[] =>
  rows().map(
    (row) =>
      row.querySelector('.oge-tree-cell .oge-tree-cell-text')?.textContent ??
      '',
  );

export const rowByName = (name: string): HTMLElement => {
  const row = rows().find((candidate) =>
    within(candidate).queryByText(name, { exact: true }),
  );
  if (!row) throw new Error(`no row "${name}" in ${names().join(', ')}`);
  return row;
};

export const expanderOf = (name: string): HTMLElement =>
  rowByName(name).querySelector('.oge-tree-expander') as HTMLElement;

/** Waits until at least one data row rendered. */
export async function settled(): Promise<void> {
  await waitFor(() => expect(rows().length).toBeGreaterThan(0));
}
