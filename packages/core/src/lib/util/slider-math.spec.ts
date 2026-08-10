import {
  clampValue,
  constrainRangeValue,
  ratioToValue,
  snapToStep,
  valueToRatio,
} from './slider-math';

describe('slider-math', () => {
  it('clamps into the range', () => {
    expect(clampValue(5, 0, 10)).toBe(5);
    expect(clampValue(-1, 0, 10)).toBe(0);
    expect(clampValue(11, 0, 10)).toBe(10);
  });

  it('snaps to the step grid anchored at min', () => {
    expect(snapToStep(7.4, 0, 100, 5)).toBe(5);
    expect(snapToStep(7.6, 0, 100, 5)).toBe(10);
    expect(snapToStep(3, 1, 10, 2)).toBe(3); // grid 1,3,5…
    expect(snapToStep(4, 1, 10, 2)).toBe(5);
  });

  it('corrects binary float drift on fractional steps', () => {
    expect(snapToStep(0.3, 0, 1, 0.1)).toBe(0.3); // not 0.30000000000000004
    expect(snapToStep(0.7, 0, 1, 0.1)).toBe(0.7);
  });

  it('keeps max reachable when the range is not a step multiple', () => {
    expect(snapToStep(10, 0, 10, 3)).toBe(10); // grid 0,3,6,9 — 10 still wins
    expect(snapToStep(9.4, 0, 10, 3)).toBe(9);
  });

  it('a non-positive step only clamps', () => {
    expect(snapToStep(7.4, 0, 10, 0)).toBe(7.4);
  });

  it('projects value ↔ ratio', () => {
    expect(valueToRatio(25, 0, 100)).toBe(0.25);
    expect(valueToRatio(5, 5, 5)).toBe(0); // empty range never divides by zero
    expect(ratioToValue(0.25, 0, 100, 1)).toBe(25);
    expect(ratioToValue(0.249, 0, 100, 5)).toBe(25);
    expect(ratioToValue(1.5, 0, 100, 1)).toBe(100); // ratio is clamped
  });

  it('constrains a range pair against the sibling', () => {
    expect(constrainRangeValue(80, 60, 'start')).toBe(60); // start ≤ end
    expect(constrainRangeValue(40, 60, 'end')).toBe(60); // end ≥ start
    expect(constrainRangeValue(55, 60, 'start', 10)).toBe(50); // minRange gap
    expect(constrainRangeValue(65, 60, 'end', 10)).toBe(70);
  });
});
