import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import {
  OgeMultiColumnComboBox,
  type OgeComboBoxColumn,
  type OgeMultiColumnComboBoxSelectionMode,
} from './multi-column-combo-box';

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  vendor: { name: string };
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    sku: 'L-100',
    name: 'Desk lamp',
    price: 49,
    vendor: { name: 'Lumen' },
  },
  {
    id: 2,
    sku: 'C-200',
    name: 'Office chair',
    price: 249,
    vendor: { name: 'Sitwell' },
  },
  {
    id: 3,
    sku: 'M-300',
    name: 'Monitor arm',
    price: 89,
    vendor: { name: 'Lumen' },
  },
];

const COLUMNS: OgeComboBoxColumn<Product>[] = [
  { field: 'sku', caption: 'SKU', width: 80 },
  { field: 'name' },
  { field: 'vendor.name', caption: 'Vendor' },
  {
    field: 'price',
    format: { style: 'currency', currency: 'USD' },
    alignment: 'end',
    searchable: false,
    renderCell: (_item, { text }) => <em className="price-r">{text}</em>,
  },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;

function Host(props: {
  mode?: OgeMultiColumnComboBoxSelectionMode;
  initial?: unknown;
  onValue?: (value: unknown) => void;
}) {
  const [value, setValue] = useState<unknown>(props.initial ?? null);
  return (
    <OgeMultiColumnComboBox<Product>
      label="Product"
      items={PRODUCTS}
      columns={COLUMNS}
      valueExpr="id"
      displayExpr="name"
      selectionMode={props.mode}
      searchTimeout={0}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        props.onValue?.(next);
      }}
    />
  );
}

describe('<OgeMultiColumnComboBox>', () => {
  it('is a combobox with a grid popup: header, rows, gridcells', () => {
    render(<Host />);
    expect(combo()).toHaveAttribute('aria-haspopup', 'grid');
    fireEvent.click(combo());
    const grid = screen.getByRole('grid');
    expect(combo()).toHaveAttribute('aria-controls', grid.id);
    expect(grid).toHaveAttribute('aria-rowcount', '4');
    expect(grid).toHaveAttribute('aria-colcount', '4');
    expect(
      screen.getAllByRole('columnheader').map((el) => el.textContent),
    ).toEqual(['SKU', 'Name', 'Vendor', 'Price']);
    const firstRow = screen.getAllByRole('row')[1];
    expect(firstRow).toHaveAttribute('aria-rowindex', '2');
    const cells = Array.from(firstRow.querySelectorAll('[role="gridcell"]'));
    expect(cells[2].textContent).toBe('Lumen');
    expect(cells[3].querySelector('.price-r')).not.toBeNull();
  });

  it('moves between rows and cells and commits with Enter', () => {
    const onValue = vi.fn();
    render(<Host onValue={onValue} />);
    fireEvent.keyDown(combo(), { key: 'ArrowDown' });
    fireEvent.keyDown(combo(), { key: 'ArrowDown' });
    expect(combo().getAttribute('aria-activedescendant')).toMatch(/-cell-1-0$/);
    fireEvent.keyDown(combo(), { key: 'ArrowRight' });
    fireEvent.keyDown(combo(), { key: 'ArrowRight' });
    expect(combo().getAttribute('aria-activedescendant')).toMatch(/-cell-1-2$/);
    expect(document.querySelector('.oge-mccb-cell-active')?.textContent).toBe(
      'Sitwell',
    );
    fireEvent.keyDown(combo(), { key: 'Enter' });
    expect(onValue).toHaveBeenLastCalledWith(2);
    expect(combo().value).toBe('Office chair');
  });

  it('searches across the searchable columns', async () => {
    render(<Host />);
    fireEvent.change(combo(), { target: { value: 'lumen' } });
    expect(
      screen.getAllByRole('row').filter((row) => row.id.includes('-row-')),
    ).toHaveLength(2);
    fireEvent.change(combo(), { target: { value: '249' } });
    expect(
      screen.getAllByRole('row').filter((row) => row.id.includes('-row-')),
    ).toHaveLength(0);
  });

  it('multiple mode keeps the popup open and renders chips', () => {
    const onValue = vi.fn();
    render(<Host mode="multiple" initial={[]} onValue={onValue} />);
    fireEvent.click(combo());
    expect(screen.getByRole('grid')).toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
    const rows = () =>
      screen.getAllByRole('row').filter((row) => row.id.includes('-row-'));
    fireEvent.click(rows()[0]);
    fireEvent.click(rows()[2]);
    expect(onValue).toHaveBeenLastCalledWith([1, 3]);
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(
      Array.from(document.querySelectorAll('.oge-tag-text')).map(
        (el) => el.textContent,
      ),
    ).toEqual(['Desk lamp', 'Monitor arm']);
    fireEvent.keyDown(combo(), { key: 'Backspace' });
    expect(onValue).toHaveBeenLastCalledWith([1]);
  });
});
