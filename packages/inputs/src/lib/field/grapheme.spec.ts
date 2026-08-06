import { graphemeCount, resetGraphemeSegmenter } from './grapheme';

describe('graphemeCount', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetGraphemeSegmenter();
  });

  it('counts plain ASCII', () => {
    expect(graphemeCount('')).toBe(0);
    expect(graphemeCount('abc')).toBe(3);
  });

  it('counts combining marks as one character', () => {
    expect(graphemeCount('é')).toBe(1); // é as e + combining acute
  });

  it('counts a ZWJ family emoji as one character', () => {
    const family = '👨‍👩‍👧';
    expect(family.length).toBe(8); // what naive .length would report
    expect(graphemeCount(family)).toBe(1);
  });

  it('counts flag emoji as one character each', () => {
    expect(graphemeCount('🇹🇷🇩🇪')).toBe(2);
  });

  it('falls back to code points without Intl.Segmenter (no throw)', () => {
    resetGraphemeSegmenter();
    vi.stubGlobal('Intl', {
      ...Intl,
      Segmenter: undefined,
    } as unknown as typeof Intl);
    expect(graphemeCount('abc')).toBe(3);
    // documented degradation: ZWJ families over-count in the fallback
    expect(graphemeCount('👨‍👩‍👧')).toBeGreaterThan(1);
  });

  it('caches the segmenter instance', () => {
    resetGraphemeSegmenter();
    const original = Intl.Segmenter;
    let constructions = 0;
    vi.stubGlobal('Intl', {
      ...Intl,
      Segmenter: function (
        ...args: ConstructorParameters<typeof original>
      ): Intl.Segmenter {
        constructions++;
        return new original(...args);
      },
    } as unknown as typeof Intl);
    graphemeCount('one');
    graphemeCount('two');
    graphemeCount('three');
    expect(constructions).toBe(1);
  });
});
