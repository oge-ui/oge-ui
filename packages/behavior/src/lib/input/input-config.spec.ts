import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_INPUTS_CONFIG,
  OGE_DEFAULT_INPUTS_MESSAGES,
  resolveOgeInputsConfig,
} from './input-config';

describe('resolveOgeInputsConfig', () => {
  it('defaults everything when called with nothing', () => {
    expect(resolveOgeInputsConfig()).toEqual(OGE_DEFAULT_INPUTS_CONFIG);
  });

  it('overrides one timing without disturbing the others', () => {
    const config = resolveOgeInputsConfig({ searchTimeoutMs: 0 });
    expect(config.searchTimeoutMs).toBe(0); // a 0 override is honoured
    expect(config.spinRepeatDelayMs).toBe(
      OGE_DEFAULT_INPUTS_CONFIG.spinRepeatDelayMs,
    );
  });

  it('merges messages key by key rather than replacing the table', () => {
    const config = resolveOgeInputsConfig({
      messages: { requiredError: 'Zorunlu alan' },
    });
    expect(config.messages.requiredError).toBe('Zorunlu alan');
    expect(config.messages.clearButton).toBe(
      OGE_DEFAULT_INPUTS_MESSAGES.clearButton,
    );
  });

  it('carries the locale through — it drives every Intl format', () => {
    expect(resolveOgeInputsConfig({ locale: 'tr-TR' }).locale).toBe('tr-TR');
    expect(resolveOgeInputsConfig().locale).toBeUndefined();
  });

  it('does not mutate the shared defaults', () => {
    resolveOgeInputsConfig({
      searchTimeoutMs: 1,
      messages: { requiredError: 'changed' },
    });
    expect(OGE_DEFAULT_INPUTS_CONFIG.searchTimeoutMs).toBe(250);
    expect(OGE_DEFAULT_INPUTS_MESSAGES.requiredError).toBe(
      'This field is required',
    );
  });

  it('keeps every message key populated, so no label can render as undefined', () => {
    const config = resolveOgeInputsConfig({
      messages: { copied: 'Kopyalandı' },
    });
    for (const [key, value] of Object.entries(config.messages)) {
      expect(typeof value, key).toBe('string');
    }
    expect(Object.keys(config.messages).sort()).toEqual(
      Object.keys(OGE_DEFAULT_INPUTS_MESSAGES).sort(),
    );
  });
});
