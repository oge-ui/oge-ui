import { resolveMenubarCompact } from './menubar-compact';

describe('resolveMenubarCompact', () => {
  it('stays a bar when the behavior is disabled', () => {
    expect(
      resolveMenubarCompact({ containerSize: 100, compactBelow: undefined }),
    ).toEqual({ compact: false });
  });

  it('stays a bar while unmeasured — jsdom and pre-layout renders', () => {
    expect(
      resolveMenubarCompact({ containerSize: 0, compactBelow: 480 }),
    ).toEqual({ compact: false });
    expect(
      resolveMenubarCompact({ containerSize: -1, compactBelow: 480 }),
    ).toEqual({ compact: false });
  });

  it('collapses below the threshold and recovers at it', () => {
    expect(
      resolveMenubarCompact({ containerSize: 479, compactBelow: 480 }),
    ).toEqual({ compact: true });
    expect(
      resolveMenubarCompact({ containerSize: 480, compactBelow: 480 }),
    ).toEqual({ compact: false });
  });
});
