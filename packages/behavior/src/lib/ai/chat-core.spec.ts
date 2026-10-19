import { describe, expect, it, vi } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { OGE_DEFAULT_AI_CONFIG } from './ai-config';
import {
  OgeAiError,
  type OgeAiRequest,
  type OgeAiTransport,
} from './ai-transport';
import { OgeChatCore, type OgeChatCoreOptions } from './chat-core';

const PLAIN: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

function setup(
  transport: OgeAiTransport | null,
  overrides: Partial<OgeChatCoreOptions> = {},
) {
  const events = {
    sending: vi.fn(),
    sent: vi.fn(),
    replied: vi.fn(),
    errorOccurred: vi.fn(),
    changed: vi.fn(),
  };
  const core = new OgeChatCore({
    adapter: PLAIN,
    transport: () => transport,
    instructions: () => 'You are the support bot of Acme.',
    historyLimit: () => 3,
    messages: () => OGE_DEFAULT_AI_CONFIG.messages.chat,
    idPrefix: 't',
    now: () => 1000,
    ...events,
    ...overrides,
  });
  return { core, events };
}

function echo(): OgeAiTransport & { requests: OgeAiRequest[] } {
  const requests: OgeAiRequest[] = [];
  return {
    requests,
    complete: vi.fn(async (request: OgeAiRequest) => {
      requests.push(request);
      const last = request.messages[request.messages.length - 1];
      return { text: `  echo: ${last.content}  ` };
    }),
  };
}

describe('OgeChatCore', () => {
  it('sends the draft, replays recent history with the instructions and appends the reply', async () => {
    const transport = echo();
    const { core, events } = setup(transport);
    core.setDraft('  Hello  ');
    expect(core.canSend()).toBe(true);
    await core.send();
    expect(core.draft()).toBe('');
    expect(core.list()).toEqual([
      { id: 't-m1', role: 'user', text: 'Hello', time: 1000 },
      { id: 't-m2', role: 'assistant', text: 'echo: Hello', time: 1000 },
    ]);
    expect(events.sent).toHaveBeenCalledWith({ message: core.list()[0] });
    expect(events.replied).toHaveBeenCalledWith({ message: core.list()[1] });
    expect(events.changed).toHaveBeenCalledTimes(2);

    await core.send('second');
    await core.send('third');
    const last = transport.requests[2];
    expect(last.feature).toBe('chat');
    expect(last.messages[0].role).toBe('system');
    expect(last.messages[0].content).toContain(
      'You are the support bot of Acme.',
    );
    expect(last.messages[0].content).toContain('plain text');
    // historyLimit 3: only the latest three turns go out
    expect(last.messages.slice(1).map((m) => m.content)).toEqual([
      'second',
      'echo: second',
      'third',
    ]);
  });

  it('lets a sending handler veto, and ignores empty or concurrent sends', async () => {
    const transport = echo();
    const { core } = setup(transport, {
      sending: (event) => {
        event.cancel = event.text.includes('secret');
      },
    });
    await core.send('my secret');
    await core.send('   ');
    expect(core.list()).toEqual([]);
    expect(transport.requests).toHaveLength(0);
  });

  it('marks a failed reply, retries it and stops a reply in flight', async () => {
    let fail = true;
    let release: ((text: string) => void) | null = null;
    const transport: OgeAiTransport = {
      complete: (_r, options) =>
        fail
          ? Promise.reject(new OgeAiError('http', 'HTTP 500', 500))
          : new Promise((resolve, reject) => {
              release = (text) => resolve({ text });
              options?.signal?.addEventListener('abort', () =>
                reject(new OgeAiError('aborted', 'aborted')),
              );
            }),
    };
    const { core, events } = setup(transport);
    await core.send('hi');
    expect(core.list().at(-1)).toMatchObject({
      role: 'assistant',
      status: 'error',
      text: 'The reply could not be loaded.',
    });
    expect(events.errorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'http' }),
    );

    fail = false;
    const pending = core.retry();
    expect(core.thinking()).toBe(true);
    expect(core.list().map((m) => m.text)).toEqual(['hi']);
    core.stop();
    expect(core.thinking()).toBe(false);
    release?.('late');
    await pending;
    expect(core.list().map((m) => m.text)).toEqual(['hi']);
  });

  it('works without a transport: messages are emitted, the host adds replies', async () => {
    const { core, events } = setup(null);
    await core.send('Is anyone there?');
    expect(core.thinking()).toBe(false);
    expect(events.sent).toHaveBeenCalled();
    core.addMessage({ role: 'assistant', text: 'Yes — Ayşe from support.' });
    expect(core.list().map((m) => m.role)).toEqual(['user', 'assistant']);
    core.clear();
    expect(core.list()).toEqual([]);
  });

  it('ignores replies after destroy', async () => {
    let release!: (text: string) => void;
    const transport: OgeAiTransport = {
      complete: () =>
        new Promise((resolve) => (release = (text) => resolve({ text }))),
    };
    const { core } = setup(transport);
    const pending = core.send('hi');
    core.destroy();
    release('late');
    await pending;
    expect(core.list().map((m) => m.role)).toEqual(['user']);
  });
});
