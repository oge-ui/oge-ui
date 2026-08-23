import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OgeGridStatePersistenceCore,
  type OgeStateStorage,
} from './grid-state-persistence';

/**
 * The Angular seam owns *when* these methods are called; what the core owns —
 * and what this spec pins — is what makes persistence correct rather than
 * merely present: restore once per key, ignore a stale async response, treat
 * restored state as the baseline, and debounce the save.
 */
interface Snapshot {
  sort: string;
}

function createStorage(initial: Record<string, string> = {}) {
  const entries = new Map(Object.entries(initial));
  const storage: OgeStateStorage = {
    get: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value);
    },
  };
  return { entries, storage };
}

describe('OgeGridStatePersistenceCore', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('restores a stored snapshot once per key', () => {
    const { storage } = createStorage({
      'oge-grid:a': JSON.stringify({ sort: 'name' }),
    });
    const applied: Snapshot[] = [];
    let current: Snapshot = { sort: '' };
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => current,
      stateKey: () => 'a',
      apply: (snapshot) => {
        applied.push(snapshot);
        current = snapshot;
      },
    });

    core.restore('a');
    core.restore('a');
    expect(applied).toEqual([{ sort: 'name' }]);
  });

  it('does nothing without a key, and survives corrupt state', () => {
    const { storage } = createStorage({ 'oge-grid:b': '{not json' });
    const apply = vi.fn();
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => ({ sort: '' }),
      stateKey: () => 'b',
      apply,
    });

    core.restore(undefined);
    expect(apply).not.toHaveBeenCalled();
    expect(() => core.restore('b')).not.toThrow();
    expect(apply).not.toHaveBeenCalled();
  });

  it('drops an async restore whose key the host has already left', async () => {
    const stored = new Map([['oge-grid:a', JSON.stringify({ sort: 'name' })]]);
    const storage: OgeStateStorage = {
      get: (key) => Promise.resolve(stored.get(key) ?? null),
      set: () => undefined,
    };
    const apply = vi.fn();
    let key: string | undefined = 'a';
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => ({ sort: '' }),
      stateKey: () => key,
      apply,
    });

    core.restore('a');
    key = 'b'; // the host switched before the response landed
    await vi.runAllTimersAsync();
    expect(apply).not.toHaveBeenCalled();
  });

  it('treats the first snapshot as a baseline, then debounces the save', () => {
    const { entries, storage } = createStorage();
    const onChange = vi.fn();
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => ({ sort: '' }),
      stateKey: () => 'a',
      apply: () => undefined,
      onChange,
    });

    core.noteSnapshot({ sort: '' }, 'a');
    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();
    expect(entries.size).toBe(0);

    core.noteSnapshot({ sort: 'name' }, 'a');
    expect(onChange).not.toHaveBeenCalled(); // still inside the debounce
    vi.advanceTimersByTime(250);
    expect(onChange).toHaveBeenCalledWith({ sort: 'name' });
    expect(entries.get('oge-grid:a')).toBe(JSON.stringify({ sort: 'name' }));
  });

  it('never re-saves an identical snapshot, and one save wins a burst', () => {
    const { storage } = createStorage();
    const onChange = vi.fn();
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => ({ sort: '' }),
      stateKey: () => 'a',
      apply: () => undefined,
      onChange,
    });

    core.noteSnapshot({ sort: '' }, 'a'); // baseline
    core.noteSnapshot({ sort: 'a' }, 'a');
    core.noteSnapshot({ sort: 'b' }, 'a');
    core.noteSnapshot({ sort: 'c' }, 'a');
    vi.advanceTimersByTime(250);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ sort: 'c' });

    core.noteSnapshot({ sort: 'c' }, 'a');
    vi.advanceTimersByTime(250);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending save when the host is torn down', () => {
    const { entries, storage } = createStorage();
    const onChange = vi.fn();
    const core = new OgeGridStatePersistenceCore<Snapshot>({
      prefix: 'oge-grid',
      storage,
      snapshot: () => ({ sort: '' }),
      stateKey: () => 'a',
      apply: () => undefined,
      onChange,
    });

    core.noteSnapshot({ sort: '' }, 'a');
    core.noteSnapshot({ sort: 'name' }, 'a');
    core.dispose();
    vi.advanceTimersByTime(1000);
    expect(onChange).not.toHaveBeenCalled();
    expect(entries.size).toBe(0);
  });
});
