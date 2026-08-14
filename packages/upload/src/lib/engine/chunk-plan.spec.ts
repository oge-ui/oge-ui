import { chunkedLoaded, planChunks } from './chunk-plan';

describe('planChunks', () => {
  it('keeps a file smaller than one chunk whole', () => {
    expect(planChunks(500, 1000)).toEqual([{ index: 0, start: 0, end: 500 }]);
  });

  it('gives an empty file exactly one chunk', () => {
    // A zero-byte upload is a real upload; an empty plan would leave the
    // transfer with nothing to send and no way to finish.
    expect(planChunks(0, 1000)).toEqual([{ index: 0, start: 0, end: 0 }]);
  });

  it('splits on the boundary without an empty tail', () => {
    expect(planChunks(2000, 1000)).toEqual([
      { index: 0, start: 0, end: 1000 },
      { index: 1, start: 1000, end: 2000 },
    ]);
  });

  it('leaves a short final chunk', () => {
    expect(planChunks(2500, 1000).at(-1)).toEqual({
      index: 2,
      start: 2000,
      end: 2500,
    });
  });

  it('covers the file exactly, with no gaps or overlaps', () => {
    const plan = planChunks(10_007, 1024);
    expect(plan[0].start).toBe(0);
    expect(plan.at(-1)?.end).toBe(10_007);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].start).toBe(plan[i - 1].end);
    }
  });

  it('treats a non-positive chunk size as "do not chunk"', () => {
    expect(planChunks(5000, 0)).toHaveLength(1);
    expect(planChunks(5000, -1)).toHaveLength(1);
  });
});

describe('chunkedLoaded', () => {
  const plan = planChunks(2500, 1000);

  it('is zero before anything is sent', () => {
    expect(chunkedLoaded(plan, 0)).toBe(0);
  });

  it('counts the settled chunks', () => {
    expect(chunkedLoaded(plan, 2)).toBe(2000);
  });

  it('adds the in-flight chunk without exceeding its size', () => {
    expect(chunkedLoaded(plan, 1, 400)).toBe(1400);
    // A retry must not double-count: progress is derived from the plan, never
    // accumulated across attempts.
    expect(chunkedLoaded(plan, 1, 5000)).toBe(2000);
  });

  it('ignores a negative in-flight report', () => {
    expect(chunkedLoaded(plan, 1, -50)).toBe(1000);
  });

  it('reports the whole file once every chunk is in', () => {
    expect(chunkedLoaded(plan, plan.length)).toBe(2500);
  });

  it('clamps a done count past the end of the plan', () => {
    expect(chunkedLoaded(plan, 99)).toBe(2500);
  });
});
