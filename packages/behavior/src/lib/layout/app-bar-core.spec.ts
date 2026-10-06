import { describe, expect, it } from 'vitest';
import {
  ogeAppBarAcceptsLabel,
  ogeAppBarRole,
  resolveOgeAppBarConfig,
} from './app-bar-core';

describe('ogeAppBarRole', () => {
  it('adds a landmark only on request', () => {
    expect(ogeAppBarRole(undefined)).toBeNull();
    expect(ogeAppBarRole('none')).toBeNull();
    expect(ogeAppBarRole('banner')).toBe('banner');
    expect(ogeAppBarRole('contentinfo')).toBe('contentinfo');
    expect(ogeAppBarRole('navigation')).toBe('navigation');
  });

  it('only lets a landmark carry a name', () => {
    expect(ogeAppBarAcceptsLabel('none')).toBe(false);
    expect(ogeAppBarAcceptsLabel('region')).toBe(true);
  });
});

describe('resolveOgeAppBarConfig', () => {
  it('passes the defaults through', () => {
    expect(resolveOgeAppBarConfig(undefined)).toEqual({});
    expect(resolveOgeAppBarConfig({ color: 'primary' }).color).toBe('primary');
  });
});
