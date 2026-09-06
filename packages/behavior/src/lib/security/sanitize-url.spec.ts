import { describe, expect, it } from 'vitest';
import { sanitizeResourceUrl, sanitizeUrl } from './sanitize-url';

describe('sanitizeUrl', () => {
  it('passes ordinary links through untouched', () => {
    for (const url of [
      'https://ogeui.com/docs',
      'http://example.test/a?b=c#d',
      '/reports/2026',
      './relative',
      '#anchor',
      '?query=only',
      'mailto:security@ogeui.com',
      'tel:+901112223344',
      '//cdn.example.test/asset.png',
    ]) {
      expect(sanitizeUrl(url)).toBe(url);
    }
  });

  it('neutralizes script-bearing schemes', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
    ]) {
      expect(sanitizeUrl(url)).toBe('about:blank');
    }
  });

  it('strips the control characters browsers strip before resolving', () => {
    // the classic bypasses of a naive `startsWith('javascript:')` check
    expect(sanitizeUrl('java\tscript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('java\nscript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('java\u0000script:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('\u200bjavascript:alert(1)')).toBe('about:blank');
    expect(sanitizeUrl('jav\u00a0ascript:alert(1)')).toBe('about:blank');
  });

  it('treats empty and nullish input as no link', () => {
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
    expect(sanitizeUrl('')).toBe('');
  });

  it('rejects blob and data URLs for links but allows them for resources', () => {
    const blob = 'blob:https://ogeui.com/8a1f-…';
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(sanitizeUrl(blob)).toBe('about:blank');
    expect(sanitizeUrl(png)).toBe('about:blank');
    expect(sanitizeResourceUrl(blob)).toBe(blob);
    expect(sanitizeResourceUrl(png)).toBe(png);
  });

  it('rejects markup-bearing data URLs even as a resource', () => {
    expect(sanitizeResourceUrl('data:text/html,<img onerror=alert(1)>')).toBe(
      'about:blank',
    );
    expect(
      sanitizeResourceUrl('data:image/svg+xml,<svg onload="alert(1)"/>'),
    ).toBe('about:blank');
    expect(sanitizeResourceUrl('data:application/xhtml+xml,<html/>')).toBe(
      'about:blank',
    );
  });
});
