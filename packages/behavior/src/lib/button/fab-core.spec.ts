import { describe, expect, it } from 'vitest';
import {
  ogeSpeedDialAwayKey,
  ogeSpeedDialDirection,
  ogeSpeedDialItemKey,
  ogeSpeedDialNavIndex,
  ogeSpeedDialToggleKey,
  ogeSpeedDialTowardKey,
  ogeSpeedDialVertical,
  resolveOgeFabConfig,
} from './fab-core';

describe('ogeSpeedDialDirection', () => {
  it('unfolds away from the pinned edge unless told otherwise', () => {
    expect(ogeSpeedDialDirection('bottom-end')).toBe('up');
    expect(ogeSpeedDialDirection('bottom-center')).toBe('up');
    expect(ogeSpeedDialDirection('top-start')).toBe('down');
    expect(ogeSpeedDialDirection('bottom-end', 'start')).toBe('start');
    expect(ogeSpeedDialVertical('up')).toBe(true);
    expect(ogeSpeedDialVertical('end')).toBe(false);
  });
});

describe('dial axis keys', () => {
  it('points along the dial, mirroring start/end in RTL', () => {
    expect(ogeSpeedDialAwayKey('up')).toBe('ArrowUp');
    expect(ogeSpeedDialTowardKey('up')).toBe('ArrowDown');
    expect(ogeSpeedDialAwayKey('start')).toBe('ArrowLeft');
    expect(ogeSpeedDialAwayKey('start', true)).toBe('ArrowRight');
    expect(ogeSpeedDialTowardKey('end', true)).toBe('ArrowRight');
  });
});

describe('ogeSpeedDialToggleKey', () => {
  it('opens on the first or last action per APG menu button', () => {
    expect(ogeSpeedDialToggleKey('ArrowUp', 'up', false)).toEqual({
      type: 'open',
      focus: 'first',
    });
    expect(ogeSpeedDialToggleKey('ArrowDown', 'up', false)).toEqual({
      type: 'open',
      focus: 'last',
    });
    expect(ogeSpeedDialToggleKey('ArrowDown', 'down', false)).toEqual({
      type: 'open',
      focus: 'first',
    });
  });

  it('closes on Escape only when open; ignores other keys', () => {
    expect(ogeSpeedDialToggleKey('Escape', 'up', true)).toEqual({
      type: 'close',
      restoreFocus: true,
    });
    expect(ogeSpeedDialToggleKey('Escape', 'up', false)).toBeNull();
    expect(ogeSpeedDialToggleKey('Enter', 'up', false)).toBeNull();
  });
});

describe('ogeSpeedDialItemKey', () => {
  it('moves along the axis, jumps, closes', () => {
    expect(ogeSpeedDialItemKey('ArrowUp', 'up')).toEqual({
      type: 'move',
      to: 'next',
    });
    expect(ogeSpeedDialItemKey('ArrowDown', 'up')).toEqual({
      type: 'move',
      to: 'prev',
    });
    expect(ogeSpeedDialItemKey('ArrowLeft', 'end', true)).toEqual({
      type: 'move',
      to: 'next',
    });
    expect(ogeSpeedDialItemKey('Home', 'up')).toEqual({
      type: 'move',
      to: 'first',
    });
    expect(ogeSpeedDialItemKey('End', 'up')).toEqual({
      type: 'move',
      to: 'last',
    });
    expect(ogeSpeedDialItemKey('Escape', 'up')).toEqual({
      type: 'close',
      restoreFocus: true,
    });
    expect(ogeSpeedDialItemKey('Tab', 'up')).toEqual({
      type: 'close',
      restoreFocus: false,
    });
    expect(ogeSpeedDialItemKey('ArrowRight', 'up')).toBeNull();
  });
});

describe('ogeSpeedDialNavIndex', () => {
  it('wraps like an APG menu and skips disabled actions', () => {
    expect(ogeSpeedDialNavIndex(3, 2, 'next')).toBe(0);
    expect(ogeSpeedDialNavIndex(3, 0, 'prev')).toBe(2);
    expect(ogeSpeedDialNavIndex(3, 0, 'next', (i) => i === 1)).toBe(2);
    expect(ogeSpeedDialNavIndex(3, 1, 'first', (i) => i === 0)).toBe(1);
    expect(ogeSpeedDialNavIndex(3, 0, 'last', (i) => i === 2)).toBe(1);
    expect(ogeSpeedDialNavIndex(2, 0, 'next', () => true)).toBe(-1);
    expect(ogeSpeedDialNavIndex(0, 0, 'first')).toBe(-1);
  });
});

describe('resolveOgeFabConfig', () => {
  it('merges messages and passes defaults', () => {
    const config = resolveOgeFabConfig({
      position: 'bottom-start',
      messages: { speedDial: 'Eylemler' },
    });
    expect(config.position).toBe('bottom-start');
    expect(config.messages.speedDial).toBe('Eylemler');
  });
});
