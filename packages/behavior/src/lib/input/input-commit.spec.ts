import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OgeInputCommit } from './input-commit';

interface Commit {
  value: string;
  previous: string;
  event: Event | undefined;
}

/** Builds a machine over a tiny value store, mirroring what a host does. */
function harness(debounceMs = 0) {
  let current = '';
  let ms = debounceMs;
  const commits: Commit[] = [];
  const machine = new OgeInputCommit<string>({
    debounceMs: () => ms,
    current: () => current,
    onCommit: (value, previous, event) => {
      current = value;
      commits.push({ value, previous, event });
    },
  });
  return {
    machine,
    commits,
    current: () => current,
    setDebounce: (value: number) => (ms = value),
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('OgeInputCommit', () => {
  it('commits synchronously when no debounce is set', () => {
    const h = harness(0);
    h.machine.queue('a');
    expect(h.commits).toEqual([{ value: 'a', previous: '', event: undefined }]);
    expect(h.machine.hasPending()).toBe(false);
  });

  it('stages a debounced value and commits it once the timer fires', () => {
    const h = harness(200);
    h.machine.queue('a');
    expect(h.machine.hasPending()).toBe(true);
    expect(h.commits).toHaveLength(0);
    vi.advanceTimersByTime(199);
    expect(h.commits).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(h.commits.map((c) => c.value)).toEqual(['a']);
    expect(h.machine.hasPending()).toBe(false);
  });

  it('restarts the timer per keystroke — only the last value commits', () => {
    const h = harness(200);
    h.machine.queue('a');
    vi.advanceTimersByTime(150);
    h.machine.queue('ab');
    vi.advanceTimersByTime(150);
    expect(h.commits).toHaveLength(0);
    vi.advanceTimersByTime(50);
    expect(h.commits.map((c) => c.value)).toEqual(['ab']);
  });

  it('reports the previous value at commit time, not at queue time', () => {
    const h = harness(0);
    h.machine.queue('a');
    h.machine.queue('b');
    expect(h.commits.map((c) => c.previous)).toEqual(['', 'a']);
  });

  it('carries the originating DOM event through the debounce', () => {
    const h = harness(100);
    const event = new Event('input');
    h.machine.queue('a', event);
    vi.advanceTimersByTime(100);
    expect(h.commits[0].event).toBe(event);
  });

  it('flushes a staged value synchronously (blur/Enter)', () => {
    const h = harness(200);
    h.machine.queue('a');
    h.machine.flush();
    expect(h.commits.map((c) => c.value)).toEqual(['a']);
    // the cancelled timer must not fire a second commit
    vi.advanceTimersByTime(500);
    expect(h.commits).toHaveLength(1);
  });

  it('applies the flush transform — the number box clamps here', () => {
    const h = harness(200);
    h.machine.queue('42');
    h.machine.flush((value) => `clamped:${value}`);
    expect(h.commits.map((c) => c.value)).toEqual(['clamped:42']);
  });

  it('flushing with nothing staged commits nothing', () => {
    const h = harness(200);
    h.machine.flush((value) => `clamped:${value}`);
    expect(h.commits).toHaveLength(0);
  });

  it('cancel drops a staged value — programmatic writes supersede typing', () => {
    const h = harness(200);
    h.machine.queue('a');
    h.machine.cancel();
    vi.advanceTimersByTime(500);
    expect(h.commits).toHaveLength(0);
    expect(h.machine.hasPending()).toBe(false);
  });

  it('commitNow supersedes a staged value instead of racing it', () => {
    const h = harness(200);
    h.machine.queue('typed');
    h.machine.commitNow('spun');
    vi.advanceTimersByTime(500);
    expect(h.commits.map((c) => c.value)).toEqual(['spun']);
  });

  it('reads the debounce live, so a config change takes effect immediately', () => {
    const h = harness(0);
    h.machine.queue('a');
    h.setDebounce(100);
    h.machine.queue('b');
    expect(h.commits.map((c) => c.value)).toEqual(['a']);
    vi.advanceTimersByTime(100);
    expect(h.commits.map((c) => c.value)).toEqual(['a', 'b']);
  });
});
