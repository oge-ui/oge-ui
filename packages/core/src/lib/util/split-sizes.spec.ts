import {
  normalizeSplitTracks,
  resizeSplitAt,
  splitSeparatorRange,
  splitTrackPx,
  type OgeSplitBounds,
  type OgeSplitTrack,
} from './split-sizes';

const share = (value: number): OgeSplitTrack => ({ kind: 'share', value });
const fixed = (value: number): OgeSplitTrack => ({ kind: 'fixed', value });
const shares = (tracks: readonly OgeSplitTrack[]): number[] =>
  tracks.filter((t) => t.kind === 'share').map((t) => t.value);
const open: OgeSplitBounds = {};

describe('normalizeSplitTracks', () => {
  it('leaves shares that already sum to 100 alone', () => {
    expect(shares(normalizeSplitTracks([share(30), share(70)]))).toEqual([
      30, 70,
    ]);
  });

  it('treats sizes as ratios, so under- and over-100 sums lay out the same', () => {
    expect(shares(normalizeSplitTracks([share(30), share(30)]))).toEqual([
      50, 50,
    ]);
    expect(shares(normalizeSplitTracks([share(60), share(60)]))).toEqual([
      50, 50,
    ]);
  });

  it('splits the leftover equally between unsized panes', () => {
    expect(
      shares(normalizeSplitTracks([share(50), share(0), share(0)])),
    ).toEqual([50, 25, 25]);
  });

  it('still gives unsized panes room when the sized ones claim everything', () => {
    const result = shares(normalizeSplitTracks([share(100), share(0)]));
    expect(result[1]).toBeGreaterThan(0);
    expect(result[0] + result[1]).toBeCloseTo(100);
  });

  it('gives every pane an equal share when none is sized', () => {
    expect(
      shares(normalizeSplitTracks([share(0), share(0), share(0)])),
    ).toEqual([100 / 3, 100 / 3, 100 / 3]);
  });

  it('passes fixed tracks through untouched and normalizes only the shares', () => {
    const result = normalizeSplitTracks([fixed(240), share(30), share(30)]);
    expect(result[0]).toEqual({ kind: 'fixed', value: 240 });
    expect(shares(result)).toEqual([50, 50]);
  });

  it('is a no-op for an all-fixed splitter', () => {
    expect(normalizeSplitTracks([fixed(100), fixed(200)])).toEqual([
      { kind: 'fixed', value: 100 },
      { kind: 'fixed', value: 200 },
    ]);
  });
});

describe('splitTrackPx', () => {
  it('resolves shares against the flexible space and passes fixed px through', () => {
    expect(splitTrackPx([share(25), fixed(240), share(75)], 800)).toEqual([
      200, 240, 600,
    ]);
  });
});

describe('resizeSplitAt', () => {
  const twoOpen = [open, open];

  it('moves both neighbours by the delta', () => {
    const next = resizeSplitAt([share(50), share(50)], 0, 100, 1000, twoOpen);
    expect(shares(next)).toEqual([60, 40]);
  });

  it('moves them the other way for a negative delta', () => {
    const next = resizeSplitAt([share(50), share(50)], 0, -200, 1000, twoOpen);
    expect(shares(next)).toEqual([30, 70]);
  });

  it('clamps to the growing pane maximum', () => {
    const next = resizeSplitAt([share(50), share(50)], 0, 400, 1000, [
      { max: 70 },
      open,
    ]);
    expect(shares(next)).toEqual([70, 30]);
  });

  it('clamps to the shrinking pane minimum', () => {
    const next = resizeSplitAt([share(50), share(50)], 0, 400, 1000, [
      open,
      { min: 20 },
    ]);
    expect(shares(next)).toEqual([80, 20]);
  });

  it('leaves untouched panes alone in a three-pane splitter', () => {
    const next = resizeSplitAt(
      [share(40), share(30), share(30)],
      1,
      100,
      1000,
      [open, open, open],
    );
    expect(shares(next)).toEqual([40, 40, 20]);
  });

  it('refuses to move when either neighbour is locked', () => {
    const before: OgeSplitTrack[] = [share(50), share(50)];
    expect(
      shares(resizeSplitAt(before, 0, 100, 1000, [{ resizable: false }, open])),
    ).toEqual([50, 50]);
    expect(
      shares(resizeSplitAt(before, 0, 100, 1000, [open, { resizable: false }])),
    ).toEqual([50, 50]);
  });

  it('re-shares the shrinking flexible space when a fixed pane grows', () => {
    // 1000px container: fixed 200 + shares over the remaining 800 (400/400).
    // Growing the fixed pane by 100 leaves 700 flexible, of which the middle
    // pane keeps 300 and the last one its original 400.
    const next = resizeSplitAt(
      [fixed(200), share(50), share(50)],
      0,
      100,
      800,
      [open, open, open],
    );
    expect(next[0]).toEqual({ kind: 'fixed', value: 300 });
    const px = splitTrackPx(next, 700);
    expect(px[1]).toBeCloseTo(300);
    expect(px[2]).toBeCloseTo(400);
  });

  it('honours a fixed pane minimum in pixels', () => {
    const next = resizeSplitAt([fixed(200), share(100)], 0, -150, 800, [
      { min: 120 },
      open,
    ]);
    expect(next[0]).toEqual({ kind: 'fixed', value: 120 });
  });

  it('returns the input unchanged for an out-of-range separator', () => {
    expect(
      shares(resizeSplitAt([share(50), share(50)], 1, 50, 1000, twoOpen)),
    ).toEqual([50, 50]);
    expect(
      shares(resizeSplitAt([share(50), share(50)], -1, 50, 1000, twoOpen)),
    ).toEqual([50, 50]);
  });

  it('returns the input unchanged when there is nothing to measure', () => {
    expect(
      shares(resizeSplitAt([share(50), share(50)], 0, 50, 0, twoOpen)),
    ).toEqual([50, 50]);
  });

  it('never lets a pane cross zero', () => {
    const next = resizeSplitAt([share(50), share(50)], 0, 5000, 1000, twoOpen);
    expect(shares(next)).toEqual([100, 0]);
  });
});

describe('splitSeparatorRange', () => {
  it('reports the primary pane percentage and its full travel', () => {
    const range = splitSeparatorRange([share(30), share(70)], 0, 1000, [
      open,
      open,
    ]);
    expect(range.now).toBeCloseTo(30);
    expect(range.min).toBeCloseTo(0);
    expect(range.max).toBeCloseTo(100);
  });

  it('narrows the range to the neighbours bounds', () => {
    const range = splitSeparatorRange([share(50), share(50)], 0, 1000, [
      { min: 20, max: 70 },
      { min: 20 },
    ]);
    expect(range.now).toBeCloseTo(50);
    expect(range.min).toBeCloseTo(20);
    expect(range.max).toBeCloseTo(70);
  });

  it('caps the range by the neighbour minimum, not only by its own maximum', () => {
    const range = splitSeparatorRange([share(50), share(50)], 0, 1000, [
      open,
      { min: 40 },
    ]);
    expect(range.max).toBeCloseTo(60);
  });

  it('scales against the whole pane area when a fixed pane is present', () => {
    // panes are 200px fixed + 400px + 400px = 1000px of pane area
    const range = splitSeparatorRange(
      [fixed(200), share(50), share(50)],
      1,
      800,
      [open, open, open],
    );
    expect(range.now).toBeCloseTo(40);
  });

  it('falls back to a neutral range with nothing to measure', () => {
    expect(
      splitSeparatorRange([share(50), share(50)], 0, 0, [open, open]),
    ).toEqual({
      now: 0,
      min: 0,
      max: 100,
    });
    expect(
      splitSeparatorRange([share(50), share(50)], 5, 1000, [open, open]),
    ).toEqual({
      now: 0,
      min: 0,
      max: 100,
    });
  });
});
