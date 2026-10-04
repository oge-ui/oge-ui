import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOgePdfDefaultFont,
  isOgePdfWinAnsi,
  registerOgePdfFont,
  resolveOgePdfFont,
  setOgePdfDefaultFont,
  type OgePdfFontTarget,
} from './pdf-font';

function fakeDoc(): OgePdfFontTarget & {
  files: Map<string, string>;
  fonts: string[];
  current?: string;
} {
  const files = new Map<string, string>();
  const fonts: string[] = [];
  const doc = {
    files,
    fonts,
    current: undefined as string | undefined,
    addFileToVFS: (name: string, data: string) => files.set(name, data),
    addFont: (_file: string, family: string, style: string) =>
      fonts.push(`${family}:${style}`),
    setFont: (family: string, style?: string) => {
      doc.current = `${family}:${style ?? 'normal'}`;
    },
  };
  return doc;
}

describe('isOgePdfWinAnsi', () => {
  it('accepts what the built-in fonts can draw (Latin-1 + cp1252 extras)', () => {
    expect(isOgePdfWinAnsi('Çöü äé ñ — “quotes” € ™')).toBe(true);
  });

  it('rejects Turkish, Central European, Greek and Cyrillic letters', () => {
    for (const text of [
      'ğ',
      'Ş',
      'ı',
      'İstanbul',
      'Łódź',
      'ř',
      'Ωμέγα',
      'Жук',
    ]) {
      expect(isOgePdfWinAnsi(text)).toBe(false);
    }
  });
});

describe('registerOgePdfFont', () => {
  it('embeds every face and maps missing ones to the regular face', () => {
    const doc = fakeDoc();
    const family = registerOgePdfFont(doc, {
      family: 'Noto',
      normal: new Uint8Array([1, 2, 3]),
      bold: 'Qk9MRA==',
    });
    expect(family).toBe('Noto');
    expect(doc.fonts).toEqual([
      'Noto:normal',
      'Noto:bold',
      'Noto:italic',
      'Noto:bolditalic',
    ]);
    expect(doc.files.get('Noto-normal.ttf')).toBe('AQID');
    expect(doc.files.get('Noto-bold.ttf')).toBe('Qk9MRA==');
    // no italic faces given → the regular bytes, never a WinAnsi fallback
    expect(doc.files.get('Noto-italic.ttf')).toBe('AQID');
    expect(doc.current).toBe('Noto:normal');
  });
});

describe('default font', () => {
  afterEach(() => setOgePdfDefaultFont(null));

  it('options win over the default; null forces the built-in font', () => {
    const font = { family: 'Noto', normal: 'AA==' };
    expect(resolveOgePdfFont({})).toBeNull();
    setOgePdfDefaultFont(font);
    expect(getOgePdfDefaultFont()).toBe(font);
    expect(resolveOgePdfFont({})).toBe(font);
    expect(resolveOgePdfFont({ font: null })).toBeNull();
    const own = { family: 'Own', normal: 'AA==' };
    expect(resolveOgePdfFont({ font: own })).toBe(own);
  });
});

describe('warnOgePdfUnicode', () => {
  it('warns once, only for text the built-in fonts cannot draw', async () => {
    vi.resetModules();
    const { warnOgePdfUnicode } = await import('./pdf-font');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnOgePdfUnicode(['Ankara', 'Çanakkale']);
    expect(warn).not.toHaveBeenCalled();
    warnOgePdfUnicode(['Muğla']);
    warnOgePdfUnicode(['Eskişehir']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('setOgePdfDefaultFont');
    warn.mockRestore();
  });
});
