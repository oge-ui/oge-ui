import {
  chartColumnsKeyCommand,
  chartGridKeyCommand,
  chartListKeyCommand,
  chartMapKeyCommand,
} from './visual-keyboard';

describe('chartListKeyCommand', () => {
  it('walks and clamps; RTL swaps the horizontal pair', () => {
    expect(chartListKeyCommand('ArrowDown', { count: 3, index: null })).toEqual(
      { type: 'move', index: 0 },
    );
    expect(chartListKeyCommand('ArrowDown', { count: 3, index: 2 })).toEqual({
      type: 'move',
      index: 2,
    });
    expect(
      chartListKeyCommand('ArrowLeft', { count: 3, index: 1, rtl: true }),
    ).toEqual({ type: 'move', index: 2 });
    expect(chartListKeyCommand('End', { count: 3, index: 0 })).toEqual({
      type: 'move',
      index: 2,
    });
    expect(chartListKeyCommand('Enter', { count: 3, index: null })).toBeNull();
    expect(chartListKeyCommand(' ', { count: 3, index: 1 })).toEqual({
      type: 'activate',
    });
    expect(chartListKeyCommand('x', { count: 3, index: 1 })).toBeNull();
    expect(
      chartListKeyCommand('ArrowDown', { count: 0, index: null }),
    ).toBeNull();
  });
});

describe('chartGridKeyCommand', () => {
  const ctx = { rows: 3, columns: 4, row: 1, column: 1 };

  it('moves a cell at a time, clamped', () => {
    expect(chartGridKeyCommand('ArrowRight', ctx)).toEqual({
      type: 'move',
      row: 1,
      column: 2,
    });
    expect(chartGridKeyCommand('ArrowUp', { ...ctx, row: 0 })).toEqual({
      type: 'move',
      row: 0,
      column: 1,
    });
    expect(chartGridKeyCommand('ArrowRight', { ...ctx, rtl: true })).toEqual({
      type: 'move',
      row: 1,
      column: 0,
    });
  });

  it('Home/End per row, Ctrl+Home/End per grid, PageUp/Down per column', () => {
    expect(chartGridKeyCommand('Home', ctx)).toEqual({
      type: 'move',
      row: 1,
      column: 0,
    });
    expect(chartGridKeyCommand('End', { ...ctx, ctrl: true })).toEqual({
      type: 'move',
      row: 2,
      column: 3,
    });
    expect(chartGridKeyCommand('PageDown', ctx)).toEqual({
      type: 'move',
      row: 2,
      column: 1,
    });
  });

  it('the first arrow lands on the first cell; Enter needs a cell', () => {
    const fresh = { ...ctx, row: null, column: null };
    expect(chartGridKeyCommand('ArrowDown', fresh)).toEqual({
      type: 'move',
      row: 0,
      column: 0,
    });
    expect(chartGridKeyCommand('Enter', fresh)).toBeNull();
    expect(chartGridKeyCommand('Enter', ctx)).toEqual({ type: 'activate' });
  });
});

describe('chartColumnsKeyCommand', () => {
  const columns = [[0, 1], [2, 3, 4], [5]];

  it('Up/Down within the column, Left/Right to the closest rank', () => {
    expect(chartColumnsKeyCommand('ArrowDown', { columns, index: 2 })).toEqual({
      type: 'move',
      index: 3,
    });
    expect(chartColumnsKeyCommand('ArrowRight', { columns, index: 1 })).toEqual(
      { type: 'move', index: 4 },
    );
    expect(chartColumnsKeyCommand('ArrowLeft', { columns, index: 4 })).toEqual({
      type: 'move',
      index: 1,
    });
    expect(
      chartColumnsKeyCommand('ArrowLeft', { columns, index: 1, rtl: true }),
    ).toEqual({ type: 'move', index: 4 });
    expect(chartColumnsKeyCommand('ArrowUp', { columns, index: null })).toEqual(
      { type: 'move', index: 0 },
    );
    expect(chartColumnsKeyCommand('End', { columns, index: 2 })).toEqual({
      type: 'move',
      index: 4,
    });
  });
});

describe('chartMapKeyCommand', () => {
  const centroids = [
    { x: 0, y: 0 },
    { x: 10, y: 1 },
    { x: 1, y: 10 },
    { x: -10, y: 0 },
  ];

  it('arrows move to the nearest region on that side', () => {
    const ctx = { centroids, index: 0, panStep: 10 };
    expect(chartMapKeyCommand('ArrowRight', ctx)).toEqual({
      type: 'move',
      index: 1,
    });
    expect(chartMapKeyCommand('ArrowDown', ctx)).toEqual({
      type: 'move',
      index: 2,
    });
    expect(chartMapKeyCommand('ArrowLeft', ctx)).toEqual({
      type: 'move',
      index: 3,
    });
    expect(chartMapKeyCommand('ArrowLeft', { ...ctx, index: 3 })).toBeNull();
    expect(chartMapKeyCommand('ArrowUp', { ...ctx, index: null })).toEqual({
      type: 'move',
      index: 0,
    });
  });

  it('Shift+arrows pan, +/- zoom, 0 resets, Enter activates', () => {
    const ctx = { centroids, index: 0, panStep: 10 };
    expect(chartMapKeyCommand('ArrowRight', { ...ctx, shift: true })).toEqual({
      type: 'pan',
      dx: -10,
      dy: -0,
    });
    expect(chartMapKeyCommand('+', ctx)).toEqual({ type: 'zoom', factor: 1.5 });
    expect(chartMapKeyCommand('-', ctx)).toEqual({
      type: 'zoom',
      factor: 1 / 1.5,
    });
    expect(chartMapKeyCommand('0', ctx)).toEqual({ type: 'reset' });
    expect(chartMapKeyCommand('Enter', ctx)).toEqual({ type: 'activate' });
  });
});
