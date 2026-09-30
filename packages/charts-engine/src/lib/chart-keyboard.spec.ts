import {
  cartesianKeyCommand,
  polarKeyCommand,
  rangeHandleKeyRange,
  type OgeChartKeyContext,
} from './chart-keyboard';

const ctx = (
  overrides: Partial<OgeChartKeyContext> = {},
): OgeChartKeyContext => ({
  argCount: 4,
  position: null,
  seriesIndex: 0,
  seriesCount: 3,
  isSeriesVisible: () => true,
  ...overrides,
});

describe('cartesianKeyCommand', () => {
  it('Right/Left start at the edges, then clamp', () => {
    expect(cartesianKeyCommand('ArrowRight', ctx())).toEqual({
      type: 'argument',
      position: 0,
      clearPointer: true,
    });
    expect(cartesianKeyCommand('ArrowLeft', ctx())).toMatchObject({
      position: 0,
    });
    expect(
      cartesianKeyCommand('ArrowRight', ctx({ position: 3 })),
    ).toMatchObject({
      position: 3,
    });
    expect(
      cartesianKeyCommand('ArrowLeft', ctx({ position: 2 })),
    ).toMatchObject({
      position: 1,
    });
  });

  it('Home/End jump without clearing the pointer', () => {
    expect(cartesianKeyCommand('Home', ctx({ position: 2 }))).toEqual({
      type: 'argument',
      position: 0,
      clearPointer: false,
    });
    expect(cartesianKeyCommand('End', ctx())).toMatchObject({ position: 3 });
  });

  it('Up/Down walk visible series and wrap', () => {
    expect(cartesianKeyCommand('ArrowDown', ctx())).toEqual({
      type: 'series',
      seriesIndex: 1,
    });
    expect(cartesianKeyCommand('ArrowUp', ctx())).toEqual({
      type: 'series',
      seriesIndex: 2,
    });
    expect(
      cartesianKeyCommand(
        'ArrowDown',
        ctx({ isSeriesVisible: (i) => i !== 1 }),
      ),
    ).toEqual({ type: 'series', seriesIndex: 2 });
  });

  it('Enter/Space need an active argument; Escape needs a zoom', () => {
    expect(cartesianKeyCommand('Enter', ctx())).toBeNull();
    expect(cartesianKeyCommand(' ', ctx({ position: 1 }))).toEqual({
      type: 'activate',
    });
    expect(cartesianKeyCommand('Escape', ctx())).toBeNull();
    expect(cartesianKeyCommand('Escape', ctx({ zoomed: true }))).toEqual({
      type: 'resetZoom',
    });
    expect(cartesianKeyCommand('a', ctx())).toBeNull();
    expect(cartesianKeyCommand('ArrowRight', ctx({ argCount: 0 }))).toBeNull();
  });
});

describe('polarKeyCommand', () => {
  it('categories wrap around the circle', () => {
    expect(polarKeyCommand('ArrowRight', ctx({ position: 3 }))).toMatchObject({
      position: 0,
    });
    expect(polarKeyCommand('ArrowLeft', ctx({ position: 0 }))).toMatchObject({
      position: 3,
    });
    expect(polarKeyCommand('ArrowLeft', ctx())).toMatchObject({ position: 0 });
  });

  it('has no Home/End/Escape', () => {
    expect(polarKeyCommand('Home', ctx())).toBeNull();
    expect(polarKeyCommand('Escape', ctx({ zoomed: true }))).toBeNull();
    expect(polarKeyCommand('Enter', ctx({ position: 0 }))).toEqual({
      type: 'activate',
    });
  });
});

describe('rangeHandleKeyRange', () => {
  const bounds = { min: 0, max: 100 };
  const range = { min: 20, max: 60 };
  it('arrows move by 2% of the bounds, never past the other handle', () => {
    expect(rangeHandleKeyRange('start', 'ArrowRight', range, bounds)).toEqual({
      min: 22,
      max: 60,
    });
    expect(rangeHandleKeyRange('start', 'ArrowDown', range, bounds)).toEqual({
      min: 18,
      max: 60,
    });
    expect(rangeHandleKeyRange('end', 'ArrowUp', range, bounds)).toEqual({
      min: 20,
      max: 62,
    });
    expect(
      rangeHandleKeyRange('end', 'ArrowLeft', { min: 20, max: 21 }, bounds),
    ).toEqual({ min: 20, max: 20 });
  });
  it('Home/End jump', () => {
    expect(rangeHandleKeyRange('start', 'Home', range, bounds)).toEqual({
      min: 0,
      max: 60,
    });
    expect(rangeHandleKeyRange('start', 'End', range, bounds)).toEqual({
      min: 60,
      max: 60,
    });
    expect(rangeHandleKeyRange('end', 'Home', range, bounds)).toEqual({
      min: 20,
      max: 20,
    });
    expect(rangeHandleKeyRange('end', 'End', range, bounds)).toEqual({
      min: 20,
      max: 100,
    });
    expect(rangeHandleKeyRange('end', 'Tab', range, bounds)).toBeNull();
  });
});
