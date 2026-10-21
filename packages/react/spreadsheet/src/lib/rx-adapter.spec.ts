import { createSpreadsheetRxAdapter } from './rx-adapter';

describe('createSpreadsheetRxAdapter', () => {
  it('re-renders on a real write only, and memoizes derived values per write', () => {
    const bump = vi.fn();
    const rx = createSpreadsheetRxAdapter(bump);
    const count = rx.cell(1);
    const compute = vi.fn(() => count() * 2);
    const double = rx.derived(compute);
    expect(double()).toBe(2);
    expect(double()).toBe(2);
    expect(compute).toHaveBeenCalledTimes(1);
    count.set(1);
    expect(bump).not.toHaveBeenCalled();
    count.set(3);
    expect(bump).toHaveBeenCalledTimes(1);
    expect(double()).toBe(6);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});
