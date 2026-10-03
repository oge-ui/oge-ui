import { fireEvent, render, waitFor } from '@testing-library/react';
import { OgeTreeList } from './tree-list';
import { makeRows, rows } from './tree-list.test-utils';

afterEach(() => vi.restoreAllMocks());

describe('<OgeTreeList> adaptive detail', () => {
  it('adds a leading toggle column and reveals the hidden values per row', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
    const { container } = render(
      <OgeTreeList
        data={makeRows()}
        keyExpr="id"
        parentIdExpr="parentId"
        autoExpandAll
        columns={[
          { field: 'name', caption: 'Name', width: 200 },
          { field: 'office', caption: 'Office', width: 200, hidingPriority: 0 },
        ]}
      />,
    );
    await waitFor(() => expect(rows().length).toBeGreaterThan(0));
    expect(
      Array.from(container.querySelectorAll('.oge-header-caption')).map((h) =>
        h.textContent?.trim(),
      ),
    ).toEqual(['Name']);
    expect(
      container
        .querySelector('.oge-header-row .oge-expander-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Detail');

    const row = rows()[1];
    const toggle = row.querySelector<HTMLButtonElement>(
      '.oge-adaptive-toggle',
    )!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    const detail = row.querySelector<HTMLElement>('.oge-adaptive-detail')!;
    expect(toggle.getAttribute('aria-controls')).toBe(detail.id);
    expect(detail.querySelector('dt')?.textContent).toBe('Office');
    expect(detail.querySelector('dd')?.textContent).toBe('İzmir');
  });
});
