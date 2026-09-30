import {
  columnReorderIndex,
  edgeScrollVelocity,
  hitTestCell,
  insertionIndexAt,
  type KanbanCellRect,
} from './drag-math';

function cell(
  column: string,
  left: number,
  top: number,
  swimlane: string | null = null,
): KanbanCellRect {
  return {
    swimlane,
    column,
    rect: { left, top, right: left + 100, bottom: top + 300 },
    contentTop: top + 40,
  };
}

describe('hitTestCell', () => {
  const cells = [
    cell('a', 0, 0),
    cell('b', 110, 0),
    cell('c', 220, 0),
    cell('a', 0, 320, 'lane2'),
    cell('b', 110, 320, 'lane2'),
    cell('c', 220, 320, 'lane2'),
  ];

  it('finds the cell containing the point', () => {
    expect(hitTestCell(50, 100, cells)).toBe(0);
    expect(hitTestCell(150, 100, cells)).toBe(1);
    expect(hitTestCell(250, 400, cells)).toBe(5);
  });

  it('returns -1 in gaps and outside the board', () => {
    expect(hitTestCell(105, 100, cells)).toBe(-1);
    expect(hitTestCell(50, 310, cells)).toBe(-1);
    expect(hitTestCell(-10, -10, cells)).toBe(-1);
  });

  it('handles the single-cell board', () => {
    expect(hitTestCell(10, 10, [cell('only', 0, 0)])).toBe(0);
    expect(hitTestCell(500, 10, [cell('only', 0, 0)])).toBe(-1);
  });
});

describe('insertionIndexAt', () => {
  const target = cell('a', 0, 0);

  it('maps content y to slot index with midpoint semantics (cardHeight 100)', () => {
    // contentTop = 40; pointer at the top of card 0 → index 0
    expect(insertionIndexAt(41, target, 0, 100, 3, -1)).toBe(0);
    // upper half of card 1 (content y ≈ 140) inserts before it
    expect(insertionIndexAt(180, target, 0, 100, 3, -1)).toBe(1);
    // lower half of card 1 (content y ≈ 155) inserts after it
    expect(insertionIndexAt(195, target, 0, 100, 3, -1)).toBe(2);
    // past the last card clamps to count
    expect(insertionIndexAt(1000, target, 0, 100, 3, -1)).toBe(3);
  });

  it('accounts for scrollTop', () => {
    expect(insertionIndexAt(41, target, 200, 100, 5, -1)).toBe(2);
  });

  it('excludes the dragged card from its own cell', () => {
    // 3 cards, one of them is being dragged → max insertion index is 2
    expect(insertionIndexAt(1000, target, 0, 100, 3, 1)).toBe(2);
  });

  it('never returns a negative index', () => {
    expect(insertionIndexAt(-100, target, 0, 100, 3, -1)).toBe(0);
  });
});

describe('edgeScrollVelocity', () => {
  it('is zero away from the edges', () => {
    expect(edgeScrollVelocity(500, 0, 1000)).toBe(0);
  });

  it('ramps negative near the start edge, positive near the end edge', () => {
    expect(edgeScrollVelocity(10, 0, 1000)).toBeLessThan(0);
    expect(edgeScrollVelocity(990, 0, 1000)).toBeGreaterThan(0);
  });

  it('reaches max speed at the boundary, quadratically', () => {
    expect(edgeScrollVelocity(0, 0, 1000, 48, 24)).toBe(-24);
    expect(edgeScrollVelocity(1000, 0, 1000, 48, 24)).toBe(24);
    const half = edgeScrollVelocity(24, 0, 1000, 48, 24);
    expect(Math.abs(half)).toBeLessThan(12); // quadratic, not linear
  });

  it('degenerately small ranges never scroll', () => {
    expect(edgeScrollVelocity(10, 0, 60)).toBe(0);
  });
});

describe('columnReorderIndex', () => {
  const centers = [50, 150, 250, 350];

  it('keeps the origin until a neighbour center is crossed', () => {
    expect(columnReorderIndex(160, centers, 1)).toBe(1);
    expect(columnReorderIndex(260, centers, 1)).toBe(2);
    expect(columnReorderIndex(360, centers, 1)).toBe(3);
  });

  it('moves left when crossing a left neighbour center', () => {
    expect(columnReorderIndex(40, centers, 2)).toBe(0);
    expect(columnReorderIndex(140, centers, 2)).toBe(1);
  });
});
