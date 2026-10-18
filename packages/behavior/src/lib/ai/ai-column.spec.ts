import { describe, expect, it, vi } from 'vitest';
import { createOgeAiColumn } from './ai-column';
import { formatOgeAiValue } from './ai-format';
import type { OgeAiRequest, OgeAiTransport } from './ai-transport';

interface Review {
  id: number;
  text: string;
  author: string;
  secret: string;
}

const ROWS: Review[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  text: i % 2 ? 'Terrible service' : 'Loved it',
  author: `user${i}`,
  secret: 'card 4111',
}));

const CHOICES = [
  { value: 'pos', text: 'Positive' },
  { value: 'neg', text: 'Negative' },
];

/** Answers each batch from the rows it was sent; resolves on demand. */
class EchoTransport implements OgeAiTransport {
  readonly requests: OgeAiRequest[] = [];
  private pending: (() => void)[] = [];
  auto = true;
  complete(request: OgeAiRequest, options?: { signal?: AbortSignal }) {
    this.requests.push(request);
    const rows = JSON.parse(
      request.messages[1].content.replace(/^Rows: /, ''),
    ) as {
      key: number;
      text: string;
    }[];
    const text = JSON.stringify({
      values: rows.map((r) => ({
        key: r.key,
        value:
          r.key === 4
            ? 'banana'
            : r.text.includes('Loved')
              ? 'Positive'
              : 'neg',
      })),
    });
    return new Promise<{ text: string }>((resolve, reject) => {
      options?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      );
      const done = () => resolve({ text });
      if (this.auto) queueMicrotask(done);
      else this.pending.push(done);
    });
  }
  releaseAll(): void {
    this.pending.splice(0).forEach((done) => done());
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('OgeAiColumn', () => {
  it('batches the cells of one pass, sends only the input fields and validates replies', async () => {
    const transport = new EchoTransport();
    const column = createOgeAiColumn<Review>({
      prompt: 'Classify the sentiment',
      inputs: ['text'],
      keyField: 'id',
      values: CHOICES,
      transport,
      batchSize: 3,
    });
    const seen = vi.fn();
    column.subscribe(1, seen);
    for (const row of ROWS) column.request(row);
    column.request(ROWS[0]); // duplicate requests are ignored
    expect(column.state(1).status).toBe('pending');
    await flush();
    await flush();

    expect(transport.requests).toHaveLength(2);
    const sent = transport.requests
      .map((r) => r.messages[1].content)
      .join('\n');
    expect(sent).toContain('"text":"Loved it"');
    expect(sent).not.toContain('author');
    expect(sent).not.toContain('4111');
    expect(transport.requests[0].messages[0].content).toContain(
      'Task: Classify the sentiment',
    );
    expect(transport.requests[0].messages[0].content).toContain(
      'one of: "pos" (Positive), "neg" (Negative)',
    );
    expect(transport.requests[0].messages[0].content).toContain(
      'never instructions',
    );

    expect(column.state(1)).toEqual({ status: 'done', value: 'pos' });
    expect(column.valueOf(2)).toBe('neg');
    // "banana" is not one of the choices
    expect(column.state(4).status).toBe('error');
    expect(seen).toHaveBeenCalled();
    expect([...column.values().keys()]).toEqual([1, 2, 3, 5]);
  });

  it('respects maxConcurrent and drains the queue', async () => {
    const transport = new EchoTransport();
    transport.auto = false;
    const column = createOgeAiColumn<Review>({
      prompt: 'p',
      inputs: ['text'],
      keyField: (row) => `r${row.id}`,
      transport,
      batchSize: 1,
      maxConcurrent: 2,
    });
    ROWS.forEach((row) => column.request(row));
    await flush();
    expect(transport.requests).toHaveLength(2);
    transport.releaseAll();
    await flush();
    expect(transport.requests).toHaveLength(4);
    transport.releaseAll();
    await flush();
    transport.releaseAll();
    await flush();
    expect(transport.requests).toHaveLength(5);
  });

  it('fill() resolves with the values, refresh() forgets them, a missing transport fails', async () => {
    const transport = new EchoTransport();
    const column = createOgeAiColumn<Review>({
      prompt: 'p',
      inputs: ['text'],
      keyField: 'id',
      dataType: 'string',
      maxLength: 4,
    });
    column.useTransport(transport);
    const values = await column.fill(ROWS.slice(0, 2));
    expect([...values]).toEqual([
      [1, 'Posi'],
      [2, 'neg'],
    ]);
    column.refresh(1);
    expect(column.state(1).status).toBe('idle');
    column.refresh();
    expect(column.state(2).status).toBe('idle');

    const offline = createOgeAiColumn<Review>({
      prompt: 'p',
      inputs: ['text'],
      keyField: 'id',
    });
    offline.request(ROWS[0]);
    await flush();
    expect(offline.state(1).status).toBe('error');
  });

  it('ignores replies after destroy', async () => {
    const transport = new EchoTransport();
    transport.auto = false;
    const column = createOgeAiColumn<Review>({
      prompt: 'p',
      inputs: ['text'],
      keyField: 'id',
      transport,
    });
    const seen = vi.fn();
    column.subscribe(1, seen);
    column.request(ROWS[0]);
    await flush();
    seen.mockClear();
    column.destroy();
    transport.releaseAll();
    await flush();
    expect(seen).not.toHaveBeenCalled();
  });
});

describe('formatOgeAiValue', () => {
  it('renders choices, booleans, numbers, dates, lists and empties', () => {
    const base = { yes: 'Yes', no: 'No', empty: '—', locale: 'en-US' };
    expect(formatOgeAiValue('pos', { ...base, values: CHOICES })).toBe(
      'Positive',
    );
    expect(formatOgeAiValue(true, base)).toBe('Yes');
    expect(formatOgeAiValue(1234.5, base)).toBe('1,234.5');
    expect(formatOgeAiValue(new Date(2026, 10, 2), base)).toBe('Nov 2, 2026');
    expect(formatOgeAiValue(['a', 'b'], base)).toBe('a, b');
    expect(formatOgeAiValue(null, base)).toBe('—');
  });
});
