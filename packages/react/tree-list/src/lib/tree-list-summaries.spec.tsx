import { render, screen, waitFor } from '@testing-library/react';
import { StrictMode, createRef } from 'react';
import {
  ArrayDataSource,
  createFilterPredicate,
  type DataSource,
} from '@oge-ui/core';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import {
  COLUMNS,
  makeRows,
  names,
  settled,
  type Node,
} from './tree-list.test-utils';

const SUMMARY = {
  totalItems: [
    { field: 'effort', type: 'sum' as const },
    { field: 'name', type: 'count' as const },
  ],
  recursiveItems: [{ field: 'effort', type: 'sum' as const }],
};

describe('OgeTreeList (React) summaries', () => {
  it('renders the footer row and the per-parent aggregates', async () => {
    const { container } = render(
      <StrictMode>
        <OgeTreeList<Node>
          data={makeRows()}
          columns={COLUMNS}
          autoExpandAll
          summary={SUMMARY}
        />
      </StrictMode>,
    );
    await settled();
    const footer = container.querySelector('.oge-total-row');
    expect(footer?.getAttribute('role')).toBe('row');
    expect(
      [...(footer?.querySelectorAll('.oge-total-cell') ?? [])].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(['Count: 5', '', 'Sum: 25']);
    expect(
      [...container.querySelectorAll('.oge-tree-node-summary')].map(
        (span) => span.textContent,
      ),
    ).toEqual(['Sum: 8', 'Sum: 1']); // Root A (4 + 1 + 3), Child A1 (1)
    expect(screen.getByRole('treegrid').getAttribute('aria-rowcount')).toBe(
      '7',
    );
  });

  it('exports the summary lines through the handle', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList<Node>
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        autoExpandAll
        summary={SUMMARY}
      />,
    );
    await settled();
    const data = ref.current?.getExportData();
    expect(data?.items?.filter((item) => item.kind !== 'data')).toHaveLength(
      3, // Child A1 footer, Root A footer, total
    );
    const total = data?.items?.at(-1);
    expect(total?.kind === 'total' && total.summaries[0].text).toBe('Sum: 25');
    expect(
      ref.current?.getExportData({ selectedRowsOnly: true }).rows,
    ).toHaveLength(0);
  });
});

describe('OgeTreeList (React) remoteOperations.filtering', () => {
  it('sends the filter to the source and trusts its ancestor-preserving answer', async () => {
    const calls: object[] = [];
    const all = makeRows();
    const local = new ArrayDataSource<Node>(all, { key: 'id' });
    const source: DataSource<Node> = {
      capabilities: {
        sort: true,
        filter: true,
        group: false,
        paging: false,
        summary: false,
      },
      keyOf: (row) => row.id,
      load: async (options) => {
        calls.push(options);
        if (!options.filter) return local.load({});
        const predicate = createFilterPredicate<Node>(options.filter);
        const keep = new Set<number>();
        for (const hit of all.filter(predicate)) {
          let current: Node | undefined = hit;
          while (current) {
            keep.add(current.id);
            const parent = current.parentId;
            current = all.find((row) => row.id === parent);
          }
        }
        return { data: all.filter((row) => keep.has(row.id)) };
      },
    };
    const { rerender } = render(
      <OgeTreeList<Node>
        data={source}
        columns={COLUMNS}
        remoteOperations={{ filtering: true }}
      />,
    );
    await settled();
    rerender(
      <OgeTreeList<Node>
        data={source}
        columns={COLUMNS}
        remoteOperations={{ filtering: true }}
        filterValue={{
          type: 'binary',
          field: 'name',
          op: 'contains',
          value: 'grand',
        }}
      />,
    );
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Grand A1a']),
    );
    expect(calls.at(-1)).toHaveProperty('filter');
  });
});
