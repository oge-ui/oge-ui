import { describe, expect, it } from 'vitest';
import {
  OGE_ALERT_ICON_PATHS,
  OGE_DEFAULT_ALERT_MESSAGES,
  ogeAlertFocusAfterClose,
  ogeAlertRole,
  ogeAlertSeverityLabel,
  resolveOgeAlertConfig,
} from './alert-core';

describe('ogeAlertRole', () => {
  it('derives alert vs status from the severity', () => {
    expect(ogeAlertRole('error')).toBe('alert');
    expect(ogeAlertRole('warning')).toBe('alert');
    expect(ogeAlertRole('info')).toBe('status');
    expect(ogeAlertRole('success', 'auto')).toBe('status');
  });

  it('honours an explicit politeness, and off renders no role', () => {
    expect(ogeAlertRole('info', 'assertive')).toBe('alert');
    expect(ogeAlertRole('error', 'polite')).toBe('status');
    expect(ogeAlertRole('error', 'off')).toBeNull();
  });
});

describe('severity labels and glyphs', () => {
  it('reads the prefix from the catalog and ships a glyph per severity', () => {
    expect(ogeAlertSeverityLabel('warning', OGE_DEFAULT_ALERT_MESSAGES)).toBe(
      'Warning',
    );
    for (const severity of ['info', 'success', 'warning', 'error'] as const)
      expect(OGE_ALERT_ICON_PATHS[severity]).toMatch(/^M/);
  });
});

describe('ogeAlertFocusAfterClose', () => {
  it('moves focus past the alert only when it holds focus', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <div id="alert"><button id="dismiss">Dismiss</button></div>
      <button id="after">After</button>`;
    const alert = document.getElementById('alert') as HTMLElement;
    (document.getElementById('before') as HTMLElement).focus();
    expect(ogeAlertFocusAfterClose(alert)).toBeNull();
    (document.getElementById('dismiss') as HTMLElement).focus();
    expect(ogeAlertFocusAfterClose(alert)?.id).toBe('after');
    expect(ogeAlertFocusAfterClose(null)).toBeNull();
    document.body.innerHTML = '';
  });
});

describe('resolveOgeAlertConfig', () => {
  it('merges messages one level deep', () => {
    const config = resolveOgeAlertConfig({
      stylingMode: 'filled',
      messages: { dismiss: 'Kapat' },
    });
    expect(config.stylingMode).toBe('filled');
    expect(config.messages.dismiss).toBe('Kapat');
    expect(config.messages.error).toBe('Error');
  });
});
