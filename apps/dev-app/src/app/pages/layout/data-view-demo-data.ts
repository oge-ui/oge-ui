import type { OgeDataViewSortOption } from '@oge-ui/layout/data-view';

/**
 * The product catalog the data view demos render — shared by the Angular page
 * and its React mirror so both show the same example content.
 */
export interface DemoProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

export const DATA_VIEW_PRODUCTS: DemoProduct[] = [
  {
    id: 1,
    name: 'Oak desk',
    category: 'Furniture',
    price: 420,
    rating: 4.6,
    inStock: true,
  },
  {
    id: 2,
    name: 'Mesh office chair',
    category: 'Furniture',
    price: 260,
    rating: 4.4,
    inStock: true,
  },
  {
    id: 3,
    name: 'Desk lamp',
    category: 'Lighting',
    price: 45,
    rating: 4.1,
    inStock: false,
  },
  {
    id: 4,
    name: 'Wall shelf',
    category: 'Storage',
    price: 89,
    rating: 3.9,
    inStock: true,
  },
  {
    id: 5,
    name: 'Wool rug',
    category: 'Textiles',
    price: 150,
    rating: 4.8,
    inStock: true,
  },
  {
    id: 6,
    name: 'Floor lamp',
    category: 'Lighting',
    price: 120,
    rating: 4.2,
    inStock: true,
  },
  {
    id: 7,
    name: 'Filing cabinet',
    category: 'Storage',
    price: 199,
    rating: 3.7,
    inStock: false,
  },
  {
    id: 8,
    name: 'Standing desk',
    category: 'Furniture',
    price: 640,
    rating: 4.7,
    inStock: true,
  },
  {
    id: 9,
    name: 'Linen curtains',
    category: 'Textiles',
    price: 75,
    rating: 4.0,
    inStock: true,
  },
  {
    id: 10,
    name: 'Monitor arm',
    category: 'Accessories',
    price: 95,
    rating: 4.5,
    inStock: true,
  },
  {
    id: 11,
    name: 'Cable tray',
    category: 'Accessories',
    price: 25,
    rating: 3.8,
    inStock: false,
  },
  {
    id: 12,
    name: 'Pendant light',
    category: 'Lighting',
    price: 180,
    rating: 4.3,
    inStock: true,
  },
];

/** Styles of the demo tiles — shared with the React demos component. */
export const DATA_VIEW_DEMO_STYLES = `
  .demo-dv-category {
    margin: 0 0 4px;
    color: var(--oge-input-muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .demo-dv-name {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
  }
  .demo-dv-meta {
    margin: 0;
    color: var(--oge-input-muted);
    font-size: 13px;
  }
  .demo-dv-stock {
    color: var(--oge-danger);
  }
  .demo-dv-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: baseline;
  }
`;

export const DATA_VIEW_SORT_OPTIONS: readonly OgeDataViewSortOption[] = [
  { field: 'name', label: 'Name' },
  { field: 'price', label: 'Price' },
  { field: 'rating', label: 'Rating' },
];
