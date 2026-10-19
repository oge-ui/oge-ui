import { fireEvent, render, waitFor } from '@testing-library/react';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  city: string;
  note: string;
}

describe('OgeGrid pinned-column edge shadow', () => {
  it('marks the cells bordering the scrolling content and follows the scroll position', async () => {
    render(
      <OgeGrid<Row>
        data={[{ id: 1, name: 'Ada', city: 'London', note: 'x' }]}
        keyField="id"
        columns={[
          { field: 'id', width: 60, pinned: 'left' },
          { field: 'name', width: 100, pinned: 'left' },
          { field: 'city', width: 300 },
          { field: 'note', width: 100, pinned: 'right' },
        ]}
      />,
    );
    await waitFor(() =>
      expect(document.querySelectorAll('.oge-rows .oge-row')).toHaveLength(1),
    );
    const headers = Array.from(document.querySelectorAll('.oge-header-cell'));
    expect(
      headers.map((h) => h.classList.contains('oge-pin-edge-start')),
    ).toEqual([false, true, false, false]);
    expect(
      headers.map((h) => h.classList.contains('oge-pin-edge-end')),
    ).toEqual([false, false, false, true]);
    const cells = document.querySelectorAll('.oge-rows .oge-row .oge-cell');
    expect(cells[1].classList.contains('oge-pin-edge-start')).toBe(true);
    expect(cells[3].classList.contains('oge-pin-edge-end')).toBe(true);

    const viewport = document.querySelector('.oge-viewport') as HTMLElement;
    Object.defineProperty(viewport, 'scrollWidth', { value: 1000 });
    Object.defineProperty(viewport, 'clientWidth', { value: 400 });
    viewport.scrollLeft = 120;
    fireEvent.scroll(viewport);
    expect(viewport.classList.contains('oge-pin-shadow-start')).toBe(true);
    expect(viewport.classList.contains('oge-pin-shadow-end')).toBe(true);
    viewport.scrollLeft = 600;
    fireEvent.scroll(viewport);
    expect(viewport.classList.contains('oge-pin-shadow-end')).toBe(false);
  });
});
