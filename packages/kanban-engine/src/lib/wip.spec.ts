import { previewCount, wipState } from './wip';

describe('wipState', () => {
  it('reports count, limit and overflow', () => {
    expect(wipState(3, 5)).toEqual({
      count: 3,
      limit: 5,
      min: null,
      exceeded: false,
      underfilled: false,
    });
    expect(wipState(6, 5).exceeded).toBe(true);
    expect(wipState(5, 5).exceeded).toBe(false);
  });

  it('no limit (undefined or non-positive) never exceeds', () => {
    expect(wipState(99, undefined).limit).toBeNull();
    expect(wipState(99, undefined).exceeded).toBe(false);
    expect(wipState(99, 0).limit).toBeNull();
  });

  it('minCount drives the underfilled state', () => {
    expect(wipState(1, undefined, 2).underfilled).toBe(true);
    expect(wipState(2, undefined, 2).underfilled).toBe(false);
    expect(wipState(0, undefined, undefined).underfilled).toBe(false);
  });
});

describe('previewCount', () => {
  it('target previews +1, origin previews -1 during a drag', () => {
    expect(previewCount(4, 'doing', 'todo', 'doing')).toBe(5);
    expect(previewCount(4, 'todo', 'todo', 'doing')).toBe(3);
    expect(previewCount(4, 'done', 'todo', 'doing')).toBe(4);
  });

  it('same-column drags net zero', () => {
    expect(previewCount(4, 'todo', 'todo', 'todo')).toBe(4);
  });

  it('no hover → live counts', () => {
    expect(previewCount(4, 'todo', 'todo', null)).toBe(4);
  });
});
