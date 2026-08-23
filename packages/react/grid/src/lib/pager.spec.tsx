import { fireEvent, render, screen } from '@testing-library/react';
import { OgePager, pagerPages } from './pager';

describe('OgePager', () => {
  it('windows the page list around the current page', () => {
    expect(pagerPages(5, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(pagerPages(20, 10)).toEqual([0, 8, 9, 10, 11, 12, 19]);
    expect(pagerPages(20, 0)).toEqual([0, 1, 2, 19]);
  });

  it('navigates and reports size changes', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <OgePager
        pageIndex={1}
        pageCount={3}
        totalCount={25}
        pageSize={10}
        pageSizes={[10, 20, 'all']}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'all' },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(0);
    expect(screen.getByText('25 rows')).toBeInTheDocument();
  });

  it('compact mode shows page / count', () => {
    render(
      <OgePager
        pageIndex={2}
        pageCount={9}
        totalCount={90}
        displayMode="compact"
      />,
    );
    expect(screen.getByText('3 / 9')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3' })).toBeNull();
  });
});
