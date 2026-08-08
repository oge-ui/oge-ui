import { edgeEnabledIndex, stepEnabledIndex } from './nav-index';

const none = () => false;
const disabled = (set: number[]) => (index: number) => set.includes(index);

describe('stepEnabledIndex', () => {
  it('steps forward and backward', () => {
    expect(stepEnabledIndex(4, 1, 1, none)).toBe(2);
    expect(stepEnabledIndex(4, 1, -1, none)).toBe(0);
  });

  it('wraps around both ends', () => {
    expect(stepEnabledIndex(3, 2, 1, none)).toBe(0);
    expect(stepEnabledIndex(3, 0, -1, none)).toBe(2);
  });

  it('stops at the ends when wrapping is off', () => {
    expect(stepEnabledIndex(3, 2, 1, none, false)).toBeNull();
    expect(stepEnabledIndex(3, 0, -1, none, false)).toBeNull();
  });

  it('skips disabled entries', () => {
    expect(stepEnabledIndex(5, 0, 1, disabled([1, 2]))).toBe(3);
    expect(stepEnabledIndex(5, 4, 1, disabled([0, 1]))).toBe(2);
  });

  it('returns null for an empty or fully disabled list', () => {
    expect(stepEnabledIndex(0, 0, 1, none)).toBeNull();
    expect(stepEnabledIndex(3, 0, 1, disabled([0, 1, 2]))).toBeNull();
  });
});

describe('edgeEnabledIndex', () => {
  it('finds the first and last enabled entry', () => {
    expect(edgeEnabledIndex(4, 1, none)).toBe(0);
    expect(edgeEnabledIndex(4, -1, none)).toBe(3);
    expect(edgeEnabledIndex(4, 1, disabled([0, 1]))).toBe(2);
    expect(edgeEnabledIndex(4, -1, disabled([3]))).toBe(2);
  });

  it('returns null when nothing is enabled', () => {
    expect(edgeEnabledIndex(2, 1, disabled([0, 1]))).toBeNull();
    expect(edgeEnabledIndex(0, 1, none)).toBeNull();
  });
});
