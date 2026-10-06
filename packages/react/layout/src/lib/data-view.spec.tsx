import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type {
  OgeDataViewKey,
  OgeDataViewOptionsChangedEvent,
  OgeDataViewPageChangedEvent,
} from '@oge-ui/behavior';
import { OgeDataView, type OgeDataViewHandle } from './data-view';
import { OgeDataViewConfigProvider } from './layout-config';

interface Product {
  id: number;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: 1, name: 'Desk', price: 300 },
  { id: 2, name: 'Chair', price: 120 },
  { id: 3, name: 'Lamp', price: 40 },
  { id: 4, name: 'Shelf', price: 90 },
  { id: 5, name: 'Rug', price: 150 },
];

const names = () =>
  Array.from(document.querySelectorAll('.oge-data-view-item')).map(
    (n) => n.textContent?.trim() ?? '',
  );

describe('<OgeDataView>', () => {
  it('renders a list with the default text, toolbar and pager', () => {
    render(
      <OgeDataView
        items={PRODUCTS}
        pageSize={2}
        ariaLabel="Products"
        toolbar={<button type="button">Export</button>}
      />,
    );
    const list = screen.getByRole('list', { name: 'Products' });
    expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(names()).toEqual(['Desk', 'Chair']);
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Pages' })).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Page 1' })
        .getAttribute('aria-current'),
    ).toBe('page');
    expect(document.querySelector('.oge-data-view-info')?.textContent).toBe(
      '1–2 of 5',
    );
    const host = document.querySelector<HTMLElement>('.oge-data-view')!;
    expect(host.className).toContain('oge-data-view-layout-grid');
    expect(host.style.getPropertyValue('--oge-data-view-min-item-width')).toBe(
      '240px',
    );
  });

  it('pages uncontrolled and reports', () => {
    const pages: OgeDataViewPageChangedEvent[] = [];
    const ref = createRef<OgeDataViewHandle>();
    render(
      <OgeDataView
        ref={ref}
        items={PRODUCTS}
        pageSize={2}
        onPageChanged={(e) => pages.push(e)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()).toEqual(['Lamp', 'Shelf']);
    expect(pages[0]).toMatchObject({ pageIndex: 1, previousPageIndex: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(names()).toEqual(['Rug']);
    expect(
      (screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    act(() => ref.current!.goToPage(0));
    expect(document.activeElement).not.toBeNull();
  });

  it('switches layout and uses renderListItem', () => {
    render(
      <OgeDataView
        items={PRODUCTS}
        showLayoutSwitch
        renderItem={({ item }) => <b>{item.name}</b>}
        renderListItem={({ item }) => (
          <span className="row">{`${item.name} ${item.price}`}</span>
        )}
      />,
    );
    const list = screen.getByRole('button', { name: 'List' });
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(list);
    expect(list).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('.row')?.textContent).toBe('Desk 300');
  });

  it('searches and sorts, emitting options', () => {
    const options: OgeDataViewOptionsChangedEvent[] = [];
    render(
      <OgeDataView
        items={PRODUCTS}
        searchEnabled
        searchExpr="name"
        locale="en"
        sortOptions={[
          { field: 'name', label: 'Name' },
          { field: 'price', label: 'Price' },
        ]}
        onOptionsChanged={(e) => options.push(e)}
      />,
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'l' },
    });
    expect(names()).toEqual(['Lamp', 'Shelf']);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Descending' }));
    expect(names()).toEqual(['Shelf', 'Lamp']);
    expect(options.at(-1)).toMatchObject({
      sort: { field: 'name', direction: 'desc' },
      searchValue: 'l',
    });
  });

  it('renders the empty state and leaves remote items alone', () => {
    const { rerender } = render(
      <OgeDataView
        items={PRODUCTS}
        searchValue="zzz"
        renderEmpty={({ filtered, text }) => (
          <i>{`${filtered ? 'F' : 'E'} ${text}`}</i>
        )}
      />,
    );
    expect(screen.getByText('F No matching items')).toBeTruthy();
    rerender(
      <OgeDataView
        items={PRODUCTS.slice(2, 4)}
        remoteOperations
        itemCount={40}
        pageSize={2}
        searchValue="zzz"
      />,
    );
    expect(names()).toEqual(['Lamp', 'Shelf']);
    expect(document.querySelector('.oge-data-view-info')?.textContent).toBe(
      '1–2 of 40',
    );
  });

  it('selects as a listbox with arrows, Space and Ctrl+A', () => {
    const changes: OgeDataViewKey[][] = [];
    render(
      <OgeDataView
        items={PRODUCTS}
        selectionMode="multiple"
        onSelectedKeysChange={(k) => changes.push(k)}
      />,
    );
    const listbox = screen.getByRole('listbox', { name: 'Items' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
    const options = () => screen.getAllByRole('option');
    expect(options()[0].tabIndex).toBe(0);
    fireEvent.click(options()[1]);
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    act(() => options()[1].focus());
    fireEvent.keyDown(options()[1], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(options()[2]);
    fireEvent.keyDown(options()[2], { key: ' ' });
    expect(changes.at(-1)).toEqual([2, 3]);
    fireEvent.keyDown(options()[2], { key: 'a', ctrlKey: true });
    expect(changes.at(-1)).toEqual([1, 2, 3, 4, 5]);
  });

  it('reads the config provider', () => {
    render(
      <OgeDataViewConfigProvider
        config={{
          layout: 'list',
          pageSize: 3,
          messages: { nextPage: 'Sonraki' },
        }}
      >
        <OgeDataView items={PRODUCTS} />
      </OgeDataViewConfigProvider>,
    );
    expect(names()).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Sonraki' })).toBeTruthy();
    expect(document.querySelector('.oge-data-view')?.className).toContain(
      'oge-data-view-layout-list',
    );
  });

  function Controlled() {
    const [page, setPage] = useState(0);
    const [keys, setKeys] = useState<OgeDataViewKey[]>([]);
    return (
      <OgeDataView
        items={PRODUCTS}
        pageSize={2}
        pageIndex={page}
        onPageIndexChange={setPage}
        selectionMode="single"
        selectedKeys={keys}
        onSelectedKeysChange={setKeys}
      />
    );
  }

  it('survives StrictMode double effects; PageDown moves focus to the new page', () => {
    render(
      <StrictMode>
        <Controlled />
      </StrictMode>,
    );
    const options = () => screen.getAllByRole('option');
    fireEvent.click(options()[1]);
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    act(() => options()[1].focus());
    fireEvent.keyDown(options()[1], { key: 'PageDown' });
    expect(names()).toEqual(['Lamp', 'Shelf']);
    expect(document.activeElement?.textContent).toContain('Shelf');
  });
});
