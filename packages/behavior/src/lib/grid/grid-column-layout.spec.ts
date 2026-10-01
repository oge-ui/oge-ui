import { resizedColumnWidth } from './grid-column-layout';

describe('resizedColumnWidth', () => {
  it('adds the pointer delta in a left-to-right grid', () => {
    expect(resizedColumnWidth(120, 300, 340, false)).toBe(160);
    expect(resizedColumnWidth(120, 300, 280, false)).toBe(100);
  });

  it('negates the pointer delta in a right-to-left grid', () => {
    // The handle sits on the physical left edge: dragging left widens.
    expect(resizedColumnWidth(120, 300, 260, true)).toBe(160);
    expect(resizedColumnWidth(120, 300, 320, true)).toBe(100);
  });
});
