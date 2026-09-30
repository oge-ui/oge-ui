import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { FilterExpr } from '@oge-ui/core';
import { OgeTreeList } from './tree-list';
import { COLUMNS, makeRows, names, settled } from './tree-list.test-utils';

describe('OgeTreeList filtering', () => {
  it('search keeps the ancestor chain of a match and highlights it', async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        searchPanel
        filterDebounce={0}
      />,
    );
    await settled();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'grand' },
    });
    // expandNodesOnFiltering opens the path to the match
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Grand A1a']),
    );
    expect(document.querySelector('mark.oge-highlight')?.textContent).toBe(
      'Grand',
    );
  });

  it("filterMode 'fullBranch' also keeps the descendants of a match", async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        filterMode="fullBranch"
        searchPanel
        filterDebounce={0}
        autoExpandAll
      />,
    );
    await settled();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'child a1' },
    });
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Grand A1a']),
    );
  });

  it('filters through the filter row with the operator menu', async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        filterRow
        filterDebounce={0}
        autoExpandAll
      />,
    );
    await settled();
    const input = screen.getByRole('textbox', { name: 'Filter Office' });
    fireEvent.input(input, { target: { value: 'lon' } });
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Grand A1a', 'Root B']),
    );
    // operator: contains → starts with (still matches), then equals
    const opButtons = [
      ...document.querySelectorAll<HTMLElement>('.oge-filter-op-btn'),
    ];
    fireEvent.click(opButtons[1]);
    const equals = await waitFor(() => {
      const item = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="menuitemradio"], [role="menuitem"]',
        ),
      ].find((el) => el.textContent?.trim() === 'Equals');
      expect(item).toBeTruthy();
      return item as HTMLElement;
    });
    fireEvent.click(equals);
    await waitFor(() => expect(names()).toEqual([]));
  });

  it('header filter lists distinct loaded values and filters by them', async () => {
    render(
      <OgeTreeList
        data={makeRows()}
        columns={COLUMNS}
        headerFilter
        autoExpandAll
      />,
    );
    await settled();
    const [officeFunnel] = screen
      .getAllByRole('button', { name: 'Filter values' })
      .slice(1, 2);
    fireEvent.click(officeFunnel);
    const labels = await waitFor(() => {
      const found = [
        ...document.querySelectorAll('.oge-header-filter-popup .oge-hf-item'),
      ].map((item) => item.textContent?.trim());
      expect(found.length).toBeGreaterThan(1);
      return found;
    });
    expect(labels).toEqual(['(All)', 'Berlin', 'İzmir', 'London']);
    // untick "Berlin": Root A stays as the ancestor of İzmir/London rows
    const berlin = [
      ...document.querySelectorAll<HTMLElement>(
        '.oge-header-filter-popup .oge-hf-item',
      ),
    ].find((item) => item.textContent?.includes('Berlin'));
    fireEvent.click(berlin?.querySelector('input') as HTMLInputElement);
    await waitFor(() =>
      expect(names()).toEqual(['Root A', 'Child A1', 'Grand A1a', 'Root B']),
    );
    expect(
      screen
        .getAllByRole('button', { name: 'Filter values' })[1]
        .classList.contains('oge-header-filter-active'),
    ).toBe(true);
  });

  it('filterValue is a controlled pair with the filter builder panel', async () => {
    const seen: (FilterExpr | null)[] = [];
    function Host() {
      const [filter, setFilter] = useState<FilterExpr | null>({
        type: 'binary',
        field: 'name',
        op: 'contains',
        value: 'B',
      });
      return (
        <OgeTreeList
          data={makeRows()}
          columns={COLUMNS}
          filterPanel
          filterValue={filter}
          onFilterValueChange={(next) => {
            seen.push(next);
            setFilter(next);
          }}
        />
      );
    }
    render(<Host />);
    await waitFor(() => expect(names()).toEqual(['Root B']));
    expect(document.querySelector('.oge-filter-panel-text')?.textContent).toBe(
      "[Name] Contains 'B'",
    );
    fireEvent.click(
      document.querySelector('.oge-filter-panel-clear') as HTMLElement,
    );
    await waitFor(() => expect(names()).toEqual(['Root A', 'Root B']));
    expect(seen.at(-1)).toBeNull();
  });
});
