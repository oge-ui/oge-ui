import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_BUTTONS_CONFIG,
  OGE_DEFAULT_BUTTONS_MESSAGES,
  resolveOgeButtonsConfig,
} from './button-config';

describe('resolveOgeButtonsConfig', () => {
  it('returns the defaults for an absent or empty override', () => {
    expect(resolveOgeButtonsConfig(undefined)).toEqual(
      OGE_DEFAULT_BUTTONS_CONFIG,
    );
    expect(resolveOgeButtonsConfig({})).toEqual(OGE_DEFAULT_BUTTONS_CONFIG);
  });

  it('overrides one timing without disturbing the others', () => {
    const config = resolveOgeButtonsConfig({ clickGuardMs: 1000 });
    expect(config.clickGuardMs).toBe(1000);
    expect(config.holdToConfirmMs).toBe(
      OGE_DEFAULT_BUTTONS_CONFIG.holdToConfirmMs,
    );
  });

  it('merges messages key by key rather than replacing the table', () => {
    const config = resolveOgeButtonsConfig({
      messages: { loading: 'Yükleniyor' },
    });
    expect(config.messages.loading).toBe('Yükleniyor');
    expect(config.messages.dropDownToggle).toBe(
      OGE_DEFAULT_BUTTONS_MESSAGES.dropDownToggle,
    );
  });

  it('keeps a 0 override instead of falling back to the default', () => {
    expect(resolveOgeButtonsConfig({ clickGuardMs: 0 }).clickGuardMs).toBe(0);
  });

  it('does not mutate the shared defaults', () => {
    resolveOgeButtonsConfig({
      clickGuardMs: 1,
      messages: { loading: 'changed' },
    });
    expect(OGE_DEFAULT_BUTTONS_CONFIG.clickGuardMs).toBe(500);
    expect(OGE_DEFAULT_BUTTONS_MESSAGES.loading).toBe('Loading');
  });

  it('returns a fresh messages object per call, so one app config cannot leak into another', () => {
    const first = resolveOgeButtonsConfig({ messages: { loading: 'A' } });
    const second = resolveOgeButtonsConfig({});
    expect(second.messages.loading).toBe('Loading');
    expect(second.messages).not.toBe(first.messages);
  });
});
