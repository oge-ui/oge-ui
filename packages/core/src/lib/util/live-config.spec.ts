import { ogeLiveConfig } from './live-config';

/** A minimal memo: re-runs when invalidated, like a signal-backed computed. */
function memo<V>(compute: () => V): (() => V) & { invalidate(): void } {
  let cached: { value: V } | null = null;
  const read = () => (cached ??= { value: compute() }).value;
  return Object.assign(read, { invalidate: () => (cached = null) });
}

describe('ogeLiveConfig', () => {
  it('serves every property through the memo, fresh after each change', () => {
    let lang = 'en';
    let calls = 0;
    let handle: ReturnType<typeof memo> | null = null;
    const config = ogeLiveConfig(
      () => {
        calls++;
        return {
          messages: { noData: lang === 'tr' ? 'Veri yok' : 'No data' },
          rowHeight: 36,
        };
      },
      (compute) => (handle = memo(compute)),
    );
    expect(config.messages.noData).toBe('No data');
    expect(config.rowHeight).toBe(36);
    const before = calls;
    expect(config.messages.noData).toBe('No data'); // memoized
    expect(calls).toBe(before);
    lang = 'tr';
    handle!.invalidate();
    expect(config.messages.noData).toBe('Veri yok');
    expect(Object.keys(config)).toEqual(['messages', 'rowHeight']);
    expect({ ...config }.messages.noData).toBe('Veri yok');
  });
});
