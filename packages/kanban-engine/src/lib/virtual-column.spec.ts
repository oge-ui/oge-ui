import { computeColumnWindow } from './virtual-column';

describe('computeColumnWindow', () => {
  it('windows a long column with overscan', () => {
    const w = computeColumnWindow(1000, 400, 100, 100, 0, 3);
    expect(w.start).toBe(7); // firstVisible 10 - overscan 3
    expect(w.end).toBe(18); // lastVisible 14 + 1 + overscan 3
    expect(w.offsetY).toBe(700);
    expect(w.totalHeight).toBe(10000);
  });

  it('accounts for the inter-card gap', () => {
    const w = computeColumnWindow(0, 400, 10, 90, 10, 0);
    expect(w.totalHeight).toBe(10 * 100 - 10);
    expect(w.start).toBe(0);
    expect(w.end).toBe(5);
  });

  it('clamps to the ends', () => {
    const top = computeColumnWindow(-50, 400, 100, 100, 0, 2);
    expect(top.start).toBe(0);
    const bottom = computeColumnWindow(99999, 400, 100, 100, 0, 2);
    expect(bottom.end).toBe(100);
  });

  it('renders everything when the viewport is unmeasured or empty', () => {
    expect(computeColumnWindow(0, 0, 5, 100).end).toBe(5);
    expect(computeColumnWindow(0, 400, 0, 100).totalHeight).toBe(0);
  });

  it('a short column renders fully with zero offset', () => {
    const w = computeColumnWindow(0, 800, 3, 100);
    expect(w.start).toBe(0);
    expect(w.end).toBe(3);
    expect(w.offsetY).toBe(0);
  });
});
