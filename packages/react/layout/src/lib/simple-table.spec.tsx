import { fireEvent, render } from '@testing-library/react';
import { createRef, useState } from 'react';
import { OgeSimpleTableConfigProvider } from './layout-config';
import { OgeSimpleTable, type OgeSimpleTableHandle } from './simple-table';

interface Line {
  no: number;
  item: { name: string };
  qty: number;
}

const LINES: Line[] = Array.from({ length: 12 }, (_, i) => ({
  no: i + 1,
  item: { name: `Item ${i + 1}` },
  qty: (i + 1) * 2,
}));

const columns = [
  { field: 'item.name', caption: 'Item', width: '60%' },
  { field: 'qty', caption: 'Amount', align: 'end' as const },
];

const info = () =>
  document.querySelector('.oge-simple-table-info')?.textContent?.trim();
const pagerBtn = (which: 'prev' | 'next') =>
  document.querySelector<HTMLButtonElement>(
    `[data-oge-simple-table-pager="${which}"]`,
  )!;

describe('<OgeSimpleTable>', () => {
  it('renders a plain table from the first row without columns', () => {
    render(
      <OgeSimpleTable value={[{ orderNo: 7, unitPrice: 3 }]} caption="Lines" />,
    );
    expect(document.querySelector('caption')?.textContent).toBe('Lines');
    expect(
      Array.from(document.querySelectorAll('th')).map((th) => th.textContent),
    ).toEqual(['Order No', 'Unit Price']);
    expect(document.querySelector('th')?.getAttribute('scope')).toBe('col');
    expect(
      Array.from(document.querySelectorAll('tbody td')).map(
        (td) => td.textContent,
      ),
    ).toEqual(['7', '3']);
    expect(document.querySelector('.oge-simple-table-pager')).toBeNull();
  });

  it('renders rows from renderRow with aligned classes and absolute rowIndex', () => {
    function Host() {
      const [page, setPage] = useState(0);
      return (
        <OgeSimpleTable
          value={LINES}
          columns={columns}
          paging
          pageSize={5}
          pageIndex={page}
          onPageIndexChange={setPage}
          compact
          ariaLabel="Order lines"
          renderRow={({ row, columns: cols, rowIndex }) => (
            <tr className="line">
              <td>
                {rowIndex}:{row.item.name}
              </td>
              <td className={cols[1].cellClass}>{row.qty * 10}</td>
            </tr>
          )}
          renderFooter={({ rows }) => (
            <tr className="total">
              <td colSpan={2}>{rows.length} rows</td>
            </tr>
          )}
        />
      );
    }
    render(<Host />);
    const rows = document.querySelectorAll('tbody tr.line');
    expect(rows).toHaveLength(5);
    expect(rows[0].children[0].textContent).toBe('0:Item 1');
    const th = document.querySelectorAll('th')[1];
    expect(rows[0].children[1].className).toBe(th.className);
    expect(th.className).toContain('oge-simple-table-align-end');
    expect(document.querySelector('col')?.getAttribute('style')).toContain(
      '60%',
    );
    expect(
      document
        .querySelector('.oge-simple-table')
        ?.classList.contains('oge-simple-table-compact'),
    ).toBe(true);
    expect(document.querySelector('table')?.getAttribute('aria-label')).toBe(
      'Order lines',
    );
    expect(document.querySelector('tfoot .total')?.textContent).toBe('12 rows');

    expect(info()).toBe('1–5 of 12');
    expect(pagerBtn('prev').disabled).toBe(true);
    fireEvent.click(pagerBtn('next'));
    expect(info()).toBe('6–10 of 12');
    expect(
      document.querySelector('tbody tr.line')?.children[0].textContent,
    ).toBe('5:Item 6');
    fireEvent.click(pagerBtn('next'));
    expect(info()).toBe('11–12 of 12');
    expect(pagerBtn('next').disabled).toBe(true);
  });

  it('pages uncontrolled and through the handle, clamped', () => {
    const ref = createRef<OgeSimpleTableHandle>();
    const changes: number[] = [];
    render(
      <OgeSimpleTable
        ref={ref}
        value={LINES}
        paging
        pageSize={5}
        onPageIndexChange={(page) => changes.push(page)}
      />,
    );
    fireEvent.click(pagerBtn('next'));
    expect(info()).toBe('6–10 of 12');
    ref.current?.goToPage(99);
    expect(changes).toEqual([1, 2]);
  });

  it('shows the empty content across every column and configured messages', () => {
    render(
      <OgeSimpleTableConfigProvider config={{ messages: { noData: 'Yok' } }}>
        <OgeSimpleTable value={[]} columns={columns} />
      </OgeSimpleTableConfigProvider>,
    );
    const empty = document.querySelector('td.oge-simple-table-empty');
    expect(empty?.textContent).toBe('Yok');
    expect(empty?.getAttribute('colspan')).toBe('2');
  });

  it('prints user text as text', () => {
    render(
      <OgeSimpleTable value={[{ name: '<img src=x onerror=alert(1)>' }]} />,
    );
    expect(document.querySelector('tbody img')).toBeNull();
    expect(document.querySelector('tbody td')?.textContent).toBe(
      '<img src=x onerror=alert(1)>',
    );
  });
});
