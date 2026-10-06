import { describe, expect, it, vi } from 'vitest';
import {
  ogeExpansionShowsToggle,
  runOgeExpansionToggle,
  type OgeExpansionPanelExpandingEvent,
} from './expansion-panel-core';

function request(
  overrides: Partial<Parameters<typeof runOgeExpansionToggle>[0]> = {},
) {
  const log: string[] = [];
  const base = {
    next: true,
    current: false,
    disabled: false,
    pending: false,
    preEvent: (): OgeExpansionPanelExpandingEvent => ({ cancel: false }),
    emitPre: () => log.push('pre'),
    commit: () => log.push('commit'),
  };
  return { log, req: { ...base, ...overrides } };
}

describe('runOgeExpansionToggle', () => {
  it('runs pre-event then commit synchronously without a guard', async () => {
    const { log, req } = request();
    const result = runOgeExpansionToggle(req);
    expect(log).toEqual(['pre', 'commit']);
    await expect(result).resolves.toBe(true);
  });

  it('a request for the current state is a silent success', async () => {
    const { log, req } = request({ current: true });
    await expect(runOgeExpansionToggle(req)).resolves.toBe(true);
    expect(log).toEqual([]);
  });

  it('disabled and pending panels refuse before any event', async () => {
    for (const flag of ['disabled', 'pending'] as const) {
      const { log, req } = request({ [flag]: true });
      await expect(runOgeExpansionToggle(req)).resolves.toBe(false);
      expect(log).toEqual([]);
    }
  });

  it('a canceled pre-event blocks the commit', async () => {
    const { log, req } = request({
      emitPre: (event: { cancel: boolean }) => {
        log.push('pre');
        event.cancel = true;
      },
    });
    await expect(runOgeExpansionToggle(req)).resolves.toBe(false);
    expect(log).toEqual(['pre']);
  });

  it('a sync guard vetoes after the pre-event', async () => {
    const { log, req } = request({ guard: () => false });
    await expect(runOgeExpansionToggle(req)).resolves.toBe(false);
    expect(log).toEqual(['pre']);
  });

  it('an async guard reports pending and commits on resolve', async () => {
    const pending: boolean[] = [];
    let allow!: (value: boolean) => void;
    const { log, req } = request({
      guard: () =>
        new Promise<boolean>((resolve) => {
          allow = resolve;
        }),
      setPending: (active: boolean) => pending.push(active),
    });
    const result = runOgeExpansionToggle(req);
    expect(log).toEqual(['pre']);
    expect(pending).toEqual([true]);
    allow(true);
    await expect(result).resolves.toBe(true);
    expect(log).toEqual(['pre', 'commit']);
    expect(pending).toEqual([true, false]);
  });

  it('a rejecting guard is a veto', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { log, req } = request({
      guard: () => Promise.reject(new Error('no')),
    });
    await expect(runOgeExpansionToggle(req)).resolves.toBe(false);
    expect(log).toEqual(['pre']);
    warn.mockRestore();
  });
});

describe('ogeExpansionShowsToggle', () => {
  it('lets the own flag win over the inherited one', () => {
    expect(ogeExpansionShowsToggle(undefined, false)).toBe(true);
    expect(ogeExpansionShowsToggle(undefined, true)).toBe(false);
    expect(ogeExpansionShowsToggle(false, true)).toBe(true);
    expect(ogeExpansionShowsToggle(true, false)).toBe(false);
  });
});
