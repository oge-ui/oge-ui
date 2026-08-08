import { createTypeAheadBuffer, matchByPrefix } from './type-ahead';

describe('createTypeAheadBuffer', () => {
  it('accumulates keystrokes within the timeout', () => {
    const buffer = createTypeAheadBuffer(500);
    expect(buffer.push('b', 1000)).toBe('b');
    expect(buffer.push('i', 1100)).toBe('bi');
    expect(buffer.push('l', 1200)).toBe('bil');
    expect(buffer.value()).toBe('bil');
  });

  it('starts a new search after the idle timeout', () => {
    const buffer = createTypeAheadBuffer(500);
    buffer.push('a', 1000);
    expect(buffer.push('b', 2000)).toBe('b');
  });

  it('cycles instead of accumulating when the same key repeats', () => {
    const buffer = createTypeAheadBuffer(500);
    expect(buffer.push('s', 1000)).toBe('s');
    expect(buffer.push('s', 1100)).toBe('s');
    expect(buffer.push('s', 1200)).toBe('s');
  });

  it('clears the prefix', () => {
    const buffer = createTypeAheadBuffer(500);
    buffer.push('a', 1000);
    buffer.clear();
    expect(buffer.value()).toBe('');
    expect(buffer.push('b', 1050)).toBe('b');
  });
});

describe('matchByPrefix', () => {
  const labels = ['Genel', 'Ödeme', 'Güvenlik', 'Gelişmiş'];

  it('matches from the start when there is no cursor', () => {
    expect(matchByPrefix(labels, 'g')).toBe(0);
    expect(matchByPrefix(labels, 'gü')).toBe(2);
  });

  it('searches after the cursor and wraps', () => {
    expect(matchByPrefix(labels, 'g', 0)).toBe(2);
    expect(matchByPrefix(labels, 'g', 3)).toBe(0);
  });

  it('is accent- and locale-insensitive', () => {
    expect(matchByPrefix(labels, 'o')).toBe(1);
    expect(matchByPrefix(labels, 'Ö')).toBe(1);
  });

  it('skips disabled entries', () => {
    expect(matchByPrefix(labels, 'g', -1, (i) => i === 0)).toBe(2);
  });

  it('returns null for an empty prefix or no match', () => {
    expect(matchByPrefix(labels, '')).toBeNull();
    expect(matchByPrefix(labels, 'z')).toBeNull();
  });
});
