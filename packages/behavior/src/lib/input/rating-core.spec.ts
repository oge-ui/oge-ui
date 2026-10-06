import {
  normalizeRatingMax,
  normalizeRatingPrecision,
  ratingItemStates,
  ratingKeyboardTarget,
  ratingPointerRatio,
  ratingPressValue,
  ratingRadioKeyTarget,
  ratingValueFromPointer,
  ratingValueText,
  resolveRatingSemantics,
  snapRatingValue,
} from './rating-core';

const keys = (
  key: string,
  current: number | null,
  overrides: Partial<Parameters<typeof ratingKeyboardTarget>[2]> = {},
) =>
  ratingKeyboardTarget(key, current, {
    max: 5,
    precision: 1,
    rtl: false,
    allowClear: true,
    ...overrides,
  });

describe('rating core', () => {
  it('normalizes precision and max', () => {
    expect(normalizeRatingPrecision(0.5)).toBe(0.5);
    expect(normalizeRatingPrecision(0)).toBe(1);
    expect(normalizeRatingPrecision(2)).toBe(1);
    expect(normalizeRatingPrecision(Number.NaN)).toBe(1);
    expect(normalizeRatingPrecision(0.0001)).toBe(0.01);
    expect(normalizeRatingMax(10)).toBe(10);
    expect(normalizeRatingMax(0)).toBe(5);
    expect(normalizeRatingMax(3.6)).toBe(4);
  });

  it('snaps values to the precision inside 0…max, 0 meaning no rating', () => {
    expect(snapRatingValue(3.3, 5, 0.5)).toBe(3.5);
    expect(snapRatingValue(3.2, 5, 0.5)).toBe(3);
    expect(snapRatingValue(0.3, 5, 0.1)).toBe(0.3);
    expect(snapRatingValue(9, 5, 1)).toBe(5);
    expect(snapRatingValue(0, 5, 1)).toBeNull();
    expect(snapRatingValue(-2, 5, 1)).toBeNull();
    expect(snapRatingValue(null, 5, 1)).toBeNull();
    expect(snapRatingValue(0.2, 5, 1)).toBeNull();
  });

  it('computes per-item fills including the partial item', () => {
    const states = ratingItemStates(2.5, 4);
    expect(states.map((state) => state.fill)).toEqual([1, 1, 0.5, 0]);
    expect(states[2].partial).toBe(true);
    expect(states[0].full).toBe(true);
    expect(states[3].itemValue).toBe(4);
    expect(ratingItemStates(null, 3).every((state) => state.fill === 0)).toBe(
      true,
    );
    // single selection paints only the item holding the value
    expect(
      ratingItemStates(2.5, 4, 'single').map((state) => state.fill),
    ).toEqual([0, 0, 0.5, 0]);
    expect(ratingItemStates(3, 4, 'single').map((state) => state.fill)).toEqual(
      [0, 0, 1, 0],
    );
  });

  it('maps a pointer ratio up to the next precision step', () => {
    expect(ratingValueFromPointer(2, 0.2, 0.5)).toBe(2.5);
    expect(ratingValueFromPointer(2, 0.6, 0.5)).toBe(3);
    expect(ratingValueFromPointer(0, 0, 1)).toBe(1);
    expect(ratingValueFromPointer(1, 0.31, 0.1)).toBe(1.4);
    expect(ratingValueFromPointer(1, 1.4, 0.5)).toBe(2);
  });

  it('measures the pointer ratio from the inline-start edge', () => {
    const rect = { left: 100, width: 20 };
    expect(ratingPointerRatio(105, rect, false)).toBe(0.25);
    expect(ratingPointerRatio(105, rect, true)).toBe(0.75);
    expect(ratingPointerRatio(105, { left: 0, width: 0 }, false)).toBe(1);
  });

  it('clears on a repeated press only with allowClear', () => {
    expect(ratingPressValue(3, 3, true)).toBeNull();
    expect(ratingPressValue(3, 3, false)).toBe(3);
    expect(ratingPressValue(3, 4, true)).toBe(4);
    expect(ratingPressValue(null, 2, true)).toBe(2);
  });

  it('runs the APG slider key map', () => {
    expect(keys('ArrowRight', 2)).toBe(3);
    expect(keys('ArrowUp', 2)).toBe(3);
    expect(keys('ArrowLeft', 2)).toBe(1);
    expect(keys('ArrowDown', 1)).toBeNull();
    expect(keys('ArrowRight', null)).toBe(1);
    expect(keys('ArrowRight', 5)).toBe(5);
    expect(keys('Home', 4)).toBeNull();
    expect(keys('End', 1)).toBe(5);
    expect(keys('PageUp', 2.5, { precision: 0.5 })).toBe(3.5);
    expect(keys('PageDown', 0.5, { precision: 0.5 })).toBeNull();
    expect(keys('ArrowRight', 2, { precision: 0.5 })).toBe(2.5);
    expect(keys('Delete', 3)).toBeNull();
    expect(keys('Backspace', 3, { allowClear: false })).toBeUndefined();
    expect(keys('4', 1)).toBe(4);
    expect(keys('7', 1)).toBeUndefined();
    expect(keys('0', 3)).toBeNull();
    expect(keys('Tab', 3)).toBeUndefined();
  });

  it('keeps one step as the floor without allowClear', () => {
    expect(keys('Home', 4, { allowClear: false })).toBe(1);
    expect(keys('ArrowLeft', 1, { allowClear: false })).toBe(1);
    expect(keys('ArrowLeft', 0.5, { allowClear: false, precision: 0.5 })).toBe(
      0.5,
    );
    expect(keys('0', 3, { allowClear: false })).toBeUndefined();
  });

  it('mirrors the horizontal arrows in RTL', () => {
    expect(keys('ArrowLeft', 2, { rtl: true })).toBe(3);
    expect(keys('ArrowRight', 2, { rtl: true })).toBe(1);
    expect(keys('ArrowUp', 2, { rtl: true })).toBe(3);
  });

  it('runs the radio-group key map with wrapping', () => {
    expect(ratingRadioKeyTarget('ArrowRight', 2, 5, false)).toBe(3);
    expect(ratingRadioKeyTarget('ArrowRight', 5, 5, false)).toBe(1);
    expect(ratingRadioKeyTarget('ArrowLeft', 1, 5, false)).toBe(5);
    expect(ratingRadioKeyTarget('ArrowLeft', null, 5, false)).toBe(5);
    expect(ratingRadioKeyTarget('ArrowLeft', 2, 5, true)).toBe(3);
    expect(ratingRadioKeyTarget('Home', 4, 5, false)).toBe(1);
    expect(ratingRadioKeyTarget('End', 1, 5, false)).toBe(5);
    expect(ratingRadioKeyTarget('x', 1, 5, false)).toBeUndefined();
  });

  it('falls back to the slider for fractional radio groups', () => {
    expect(resolveRatingSemantics('radiogroup', 1)).toBe('radiogroup');
    expect(resolveRatingSemantics('radiogroup', 0.5)).toBe('slider');
    expect(resolveRatingSemantics('slider', 1)).toBe('slider');
  });

  it('speaks the value through the catalog with locale digits', () => {
    const messages = {
      ratingValueText: '{value} of {max}',
      ratingNoValueText: 'Not rated',
    };
    expect(ratingValueText(3.5, 5, messages, 'en-US')).toBe('3.5 of 5');
    expect(ratingValueText(3.5, 5, messages, 'de-DE')).toBe('3,5 of 5');
    expect(ratingValueText(null, 5, messages, 'en-US')).toBe('Not rated');
    expect(
      ratingValueText(
        1,
        5,
        {
          ratingValueText: '{value, plural, one {# star} other {# stars}}',
          ratingNoValueText: '',
        },
        'en-US',
      ),
    ).toBe('1 star');
  });
});
