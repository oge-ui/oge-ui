import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_DRAWER_MESSAGES,
  resolveDrawerMode,
  resolveOgeDrawerConfig,
} from './drawer-core';

/**
 * The drawer's engine is the mode decision (which is what modality, the
 * landmark role and the focus trap all derive from) plus the config merge.
 * `resolveDrawerMode` is re-exported from core so a render layer needs only
 * this package — these cases lock in what the drawer itself depends on.
 */

describe('resolveDrawerMode', () => {
  it('honours the requested mode above the compact breakpoint', () => {
    expect(
      resolveDrawerMode({
        requestedMode: 'side',
        containerSize: 1200,
        compactBelow: 900,
      }),
    ).toEqual({ mode: 'side', compact: false });
  });

  it('downgrades a side or push drawer below the breakpoint', () => {
    for (const requestedMode of ['side', 'push'] as const) {
      expect(
        resolveDrawerMode({
          requestedMode,
          containerSize: 600,
          compactBelow: 900,
        }),
      ).toEqual({ mode: 'overlay', compact: true });
    }
  });

  it('treats the breakpoint itself as wide enough', () => {
    expect(
      resolveDrawerMode({
        requestedMode: 'side',
        containerSize: 900,
        compactBelow: 900,
      }).compact,
    ).toBe(false);
  });

  it('never reports an overlay drawer as compacted — it was already overlay', () => {
    expect(
      resolveDrawerMode({
        requestedMode: 'overlay',
        containerSize: 100,
        compactBelow: 900,
      }),
    ).toEqual({ mode: 'overlay', compact: false });
  });

  it('leaves the mode alone with no breakpoint configured', () => {
    expect(
      resolveDrawerMode({ requestedMode: 'side', containerSize: 100 }),
    ).toEqual({ mode: 'side', compact: false });
  });

  it('waits for a measured container rather than compacting on first paint', () => {
    expect(
      resolveDrawerMode({
        requestedMode: 'side',
        containerSize: 0,
        compactBelow: 900,
      }),
    ).toEqual({ mode: 'side', compact: false });
  });
});

describe('resolveOgeDrawerConfig', () => {
  it('defaults and merges messages key by key', () => {
    expect(resolveOgeDrawerConfig(undefined).messages).toEqual(
      OGE_DEFAULT_DRAWER_MESSAGES,
    );
    const config = resolveOgeDrawerConfig({ messages: { close: 'Kapat' } });
    expect(config.messages.close).toBe('Kapat');
    expect(config.messages.drawer).toBe(OGE_DEFAULT_DRAWER_MESSAGES.drawer);
  });

  it('carries the layout defaults through', () => {
    expect(
      resolveOgeDrawerConfig({ mode: 'push', position: 'end', size: '20rem' }),
    ).toMatchObject({ mode: 'push', position: 'end', size: '20rem' });
  });
});
