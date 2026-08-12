import { resolvePopupPosition } from './position';

const viewport = { width: 1000, height: 800 };

describe('resolvePopupPosition — centered placements', () => {
  it("centers horizontally for bare 'top' and reports the bare side back", () => {
    const result = resolvePopupPosition({
      anchor: { top: 400, left: 450, width: 100, height: 30 },
      panel: { width: 200, height: 40 },
      viewport,
      placement: 'top',
    });
    // anchor center 500 → panel left 500 - 100
    expect(result.left).toBe(400);
    expect(result.top).toBe(400 - 4 - 40);
    expect(result.placement).toBe('top');
  });

  it("centers vertically for bare 'right'", () => {
    const result = resolvePopupPosition({
      anchor: { top: 300, left: 100, width: 60, height: 100 },
      panel: { width: 120, height: 40 },
      viewport,
      placement: 'right',
    });
    expect(result.left).toBe(100 + 60 + 4);
    // anchor v-center 350 → panel top 350 - 20
    expect(result.top).toBe(330);
    expect(result.placement).toBe('right');
  });

  it('flips a centered top placement to bottom when there is no room above', () => {
    const result = resolvePopupPosition({
      anchor: { top: 10, left: 450, width: 100, height: 30 },
      panel: { width: 200, height: 120 },
      viewport,
      placement: 'top',
    });
    expect(result.top).toBe(10 + 30 + 4);
    expect(result.placement).toBe('bottom');
  });

  it('shifts (not swaps) a centered placement near the viewport edge', () => {
    const result = resolvePopupPosition({
      anchor: { top: 400, left: 10, width: 40, height: 30 },
      panel: { width: 200, height: 40 },
      viewport,
      placement: 'top',
    });
    // ideal left would be negative — clamped to the viewport padding
    expect(result.left).toBe(8);
    expect(result.placement).toBe('top');
  });
});
