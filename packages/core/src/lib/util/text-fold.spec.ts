import { foldText, foldTextWithMap } from './text-fold';

describe('foldText', () => {
  it('matches Turkish dotted capital I regardless of the host locale', () => {
    expect(foldText('İzmir')).toBe(foldText('izmir'));
    expect(foldText('İZMİR')).toBe('izmir');
  });

  it('is accent-insensitive', () => {
    expect(foldText('Ayşe')).toBe('ayse');
    expect(foldText('café')).toBe('cafe');
    expect(foldText('Åström')).toBe(foldText('astrom'));
  });

  it('leaves plain ASCII untouched apart from case', () => {
    expect(foldText('Hello World 42')).toBe('hello world 42');
  });
});

describe('foldTextWithMap', () => {
  it('maps folded match positions back to the source string', () => {
    const { folded, sourceIndex } = foldTextWithMap('Ayşe İzmir');
    const found = folded.indexOf(foldText('izmir'));
    expect(found).toBeGreaterThanOrEqual(0);
    expect(sourceIndex[found]).toBe('Ayşe '.length); // start of 'İzmir'
  });

  it('keeps indices aligned when folding shortens the text', () => {
    // 'İ'.toLowerCase() produces i + combining dot; the mark is stripped.
    const { folded, sourceIndex } = foldTextWithMap('İİab');
    expect(folded).toBe('iiab');
    expect(sourceIndex).toEqual([0, 1, 2, 3]);
  });

  it('handles surrogate pairs without splitting them', () => {
    const { folded, sourceIndex } = foldTextWithMap('😀X');
    expect(folded).toBe('😀x');
    expect(sourceIndex[folded.indexOf('x')]).toBe(2);
  });
});
