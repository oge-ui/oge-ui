import { flattenNestedTree } from './nested-tree';

interface Node {
  id: number;
  title: string;
  items?: Node[];
}

const keyOf = (row: Node): number => row.id;
const itemsOf = (row: Node): readonly Node[] | undefined => row.items;

describe('flattenNestedTree', () => {
  it('flattens depth-first and records parent keys', () => {
    const roots: Node[] = [
      {
        id: 1,
        title: 'Root A',
        items: [
          { id: 2, title: 'Child A1', items: [{ id: 3, title: 'Grand' }] },
          { id: 4, title: 'Child A2' },
        ],
      },
      { id: 5, title: 'Root B' },
    ];
    const { rows, parentOf } = flattenNestedTree(roots, { keyOf, itemsOf });
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(parentOf.get(1)).toBeNull();
    expect(parentOf.get(2)).toBe(1);
    expect(parentOf.get(3)).toBe(2);
    expect(parentOf.get(4)).toBe(1);
    expect(parentOf.get(5)).toBeNull();
  });

  it('keeps sibling order and tolerates empty/missing items arrays', () => {
    const roots: Node[] = [
      { id: 1, title: 'A', items: [] },
      { id: 2, title: 'B' },
    ];
    const { rows } = flattenNestedTree(roots, { keyOf, itemsOf });
    expect(rows.map((row) => row.id)).toEqual([1, 2]);
  });

  it('breaks cycles instead of recursing forever', () => {
    const a: Node = { id: 1, title: 'A' };
    const b: Node = { id: 2, title: 'B', items: [a] };
    a.items = [b];
    const { rows, parentOf } = flattenNestedTree([a], { keyOf, itemsOf });
    expect(rows.map((row) => row.id)).toEqual([1, 2]);
    expect(parentOf.get(2)).toBe(1);
  });
});
