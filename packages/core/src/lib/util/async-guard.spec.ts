import { runAsyncGuard } from './async-guard';

function handlers() {
  return {
    allowed: 0,
    denials: [] as ('denied' | 'failed')[],
    pendings: [] as boolean[],
  };
}

describe('runAsyncGuard', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it('allows immediately when there is no guard', () => {
    const h = handlers();
    runAsyncGuard(undefined, { allow: () => h.allowed++ });
    expect(h.allowed).toBe(1);
  });

  it('settles a sync guard without reporting pending', () => {
    const h = handlers();
    runAsyncGuard(() => true, {
      allow: () => h.allowed++,
      pending: (a) => h.pendings.push(a),
    });
    expect(h.allowed).toBe(1);
    expect(h.pendings).toEqual([]);

    runAsyncGuard(() => false, {
      allow: () => h.allowed++,
      deny: (r) => h.denials.push(r),
      pending: (a) => h.pendings.push(a),
    });
    expect(h.allowed).toBe(1);
    expect(h.denials).toEqual(['denied']);
    expect(h.pendings).toEqual([]);
  });

  it('reports pending around an async guard and allows on resolve', async () => {
    const h = handlers();
    runAsyncGuard(() => Promise.resolve(true), {
      allow: () => h.allowed++,
      pending: (a) => h.pendings.push(a),
    });
    expect(h.pendings).toEqual([true]);
    expect(h.allowed).toBe(0);
    await Promise.resolve();
    expect(h.pendings).toEqual([true, false]);
    expect(h.allowed).toBe(1);
  });

  it('treats a throw as a veto and warns', () => {
    const h = handlers();
    runAsyncGuard(
      () => {
        throw new Error('nope');
      },
      { allow: () => h.allowed++, deny: (r) => h.denials.push(r) },
    );
    expect(h.allowed).toBe(0);
    expect(h.denials).toEqual(['failed']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('treats a rejection as a veto, clears pending and warns', async () => {
    const h = handlers();
    runAsyncGuard(() => Promise.reject(new Error('nope')), {
      allow: () => h.allowed++,
      deny: (r) => h.denials.push(r),
      pending: (a) => h.pendings.push(a),
      label: 'oge-accordion expandGuard',
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(h.allowed).toBe(0);
    expect(h.denials).toEqual(['failed']);
    expect(h.pendings).toEqual([true, false]);
    expect(warn.mock.calls[0][0]).toContain('oge-accordion expandGuard');
  });
});
