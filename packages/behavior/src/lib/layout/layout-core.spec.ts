import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
  resolveOgeCardConfig,
  resolveOgeLoadIndicatorConfig,
  resolveOgeProgressBarConfig,
  resolveOgeSkeletonConfig,
} from './layout-core';

/**
 * The presentational members of the layout family carry no state machine —
 * their whole framework-free surface is the config merge, which is exactly
 * what decides whether an app-wide default reaches both render layers.
 */

describe('resolveOgeCardConfig', () => {
  it('defaults to an empty config — the component owns its own fallbacks', () => {
    expect(resolveOgeCardConfig(undefined)).toEqual({});
  });

  it('passes the layout defaults through', () => {
    expect(resolveOgeCardConfig({ stylingMode: 'raised', size: 'sm' })).toEqual(
      {
        stylingMode: 'raised',
        size: 'sm',
      },
    );
  });

  it('returns a fresh object per call, never the shared default', () => {
    const first = resolveOgeCardConfig({ size: 'sm' });
    expect(resolveOgeCardConfig(undefined)).not.toBe(first);
    expect(resolveOgeCardConfig(undefined).size).toBeUndefined();
  });
});

describe('resolveOgeProgressBarConfig', () => {
  it('defaults its message table', () => {
    expect(resolveOgeProgressBarConfig(undefined).messages).toEqual(
      OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
    );
  });

  it('merges messages while keeping the other defaults', () => {
    const config = resolveOgeProgressBarConfig({
      severity: 'success',
      messages: { progress: 'İlerleme' },
    });
    expect(config.messages.progress).toBe('İlerleme');
    expect(config.severity).toBe('success');
  });

  it('does not mutate the shared defaults', () => {
    resolveOgeProgressBarConfig({ messages: { progress: 'changed' } });
    expect(OGE_DEFAULT_PROGRESS_BAR_MESSAGES.progress).toBe('Progress');
  });
});

describe('resolveOgeLoadIndicatorConfig', () => {
  it('defaults and merges its one string', () => {
    expect(resolveOgeLoadIndicatorConfig(undefined).messages).toEqual(
      OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
    );
    expect(
      resolveOgeLoadIndicatorConfig({ messages: { loading: 'Yükleniyor' } })
        .messages.loading,
    ).toBe('Yükleniyor');
  });
});

describe('resolveOgeSkeletonConfig', () => {
  it('defaults to empty and passes the shape/animation defaults through', () => {
    expect(resolveOgeSkeletonConfig(undefined)).toEqual({});
    expect(
      resolveOgeSkeletonConfig({ shape: 'circle', animation: 'pulse' }),
    ).toEqual({ shape: 'circle', animation: 'pulse' });
  });
});
