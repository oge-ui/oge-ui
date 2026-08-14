import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphemeCount, resetGraphemeSegmenter } from './grapheme';

afterEach(() => {
  vi.restoreAllMocks();
  resetGraphemeSegmenter();
});

describe('graphemeCount', () => {
  it('counts empty text as zero', () => {
    expect(graphemeCount('')).toBe(0);
  });

  it('counts plain text like length does', () => {
    expect(graphemeCount('Ada')).toBe(3);
  });

  it('counts a ZWJ emoji family as one user-perceived character', () => {
    const family = '👨‍👩‍👧';
    expect(family.length).toBeGreaterThan(1); // the bug a counter would show
    expect(graphemeCount(family)).toBe(1);
  });

  it('counts a combining sequence as one character', () => {
    expect(graphemeCount('é')).toBe(1); // e + combining acute
  });

  it('counts an astral pair as one, not two', () => {
    expect(graphemeCount('𝄞')).toBe(1);
  });

  it('falls back to code points where Intl.Segmenter is missing', () => {
    const real = Intl.Segmenter;
    Object.defineProperty(Intl, 'Segmenter', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    resetGraphemeSegmenter();
    try {
      // code points, not UTF-16 units — the fallback still beats `.length`
      expect(graphemeCount('𝄞')).toBe(1);
      expect(graphemeCount('Ada')).toBe(3);
    } finally {
      Object.defineProperty(Intl, 'Segmenter', {
        value: real,
        configurable: true,
        writable: true,
      });
    }
  });
});
