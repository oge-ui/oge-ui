import { describe, expect, it, vi } from 'vitest';
import {
  createOgeAiHttpTransport,
  createOgeAnthropicTransport,
  createOgeOpenAiTransport,
  OgeAiError,
  type OgeAiFetch,
  type OgeAiRequest,
} from './ai-transport';

const REQUEST: OgeAiRequest = {
  feature: 'grid-assistant',
  messages: [
    { role: 'system', content: 'You control a grid.' },
    { role: 'user', content: 'sort by name' },
  ],
  responseSchema: { type: 'object' },
  responseName: 'oge_test',
  temperature: 0,
  maxTokens: 256,
};

function fakeFetch(
  body: unknown,
  init: { status?: number; contentType?: string } = {},
): OgeAiFetch & ReturnType<typeof vi.fn> {
  return vi.fn(async () => ({
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers: {
      get: (name: string) =>
        name === 'content-type'
          ? (init.contentType ?? 'application/json')
          : null,
    },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })) as unknown as OgeAiFetch & ReturnType<typeof vi.fn>;
}

function sentBody(fetch: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(fetch.mock.calls[0][1].body as string);
}

describe('createOgeAiHttpTransport', () => {
  it('posts the request as JSON and reads { text }', async () => {
    const fetch = fakeFetch({
      text: '{"status":"apply"}',
      usage: { inputTokens: 5 },
    });
    const transport = createOgeAiHttpTransport({
      url: '/api/ai',
      headers: { 'x-tenant': 'a' },
      fetch,
    });
    const reply = await transport.complete(REQUEST);
    expect(reply.text).toBe('{"status":"apply"}');
    expect(reply.usage?.inputTokens).toBe(5);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/ai');
    expect(init.headers['x-tenant']).toBe('a');
    expect(init.credentials).toBe('same-origin');
    expect(sentBody(fetch)).toEqual(JSON.parse(JSON.stringify(REQUEST)));
  });

  it('accepts a plain-text answer', async () => {
    const fetch = fakeFetch('hello', { contentType: 'text/plain' });
    const reply = await createOgeAiHttpTransport({ url: '/x', fetch }).complete(
      REQUEST,
    );
    expect(reply.text).toBe('hello');
  });

  it('maps HTTP errors and malformed bodies to OgeAiError', async () => {
    const http = createOgeAiHttpTransport({
      url: '/x',
      fetch: fakeFetch({ error: 'nope' }, { status: 502 }),
    });
    await expect(http.complete(REQUEST)).rejects.toMatchObject({
      code: 'http',
      status: 502,
    });
    const bad = createOgeAiHttpTransport({
      url: '/x',
      fetch: fakeFetch({ reply: 1 }),
    });
    await expect(bad.complete(REQUEST)).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });

  it('reports a network failure and an abort distinctly', async () => {
    const down = createOgeAiHttpTransport({
      url: '/x',
      fetch: vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }) as unknown as OgeAiFetch,
    });
    await expect(down.complete(REQUEST)).rejects.toMatchObject({
      code: 'network',
    });

    const controller = new AbortController();
    controller.abort();
    const fetch = fakeFetch({ text: 'x' });
    await expect(
      createOgeAiHttpTransport({ url: '/x', fetch }).complete(REQUEST, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'aborted' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('createOgeOpenAiTransport', () => {
  const reply = {
    choices: [{ message: { content: '{"status":"apply"}' } }],
    usage: { prompt_tokens: 12, completion_tokens: 3 },
  };

  it('sends a chat completion with a JSON schema response format', async () => {
    const fetch = fakeFetch(reply);
    const transport = createOgeOpenAiTransport({
      baseUrl: 'http://localhost:11434/v1/',
      model: 'llama3.1',
      fetch,
    });
    const result = await transport.complete(REQUEST);
    expect(result).toEqual({
      text: '{"status":"apply"}',
      usage: { inputTokens: 12, outputTokens: 3 },
    });
    expect(fetch.mock.calls[0][0]).toBe(
      'http://localhost:11434/v1/chat/completions',
    );
    const body = sentBody(fetch);
    expect(body['model']).toBe('llama3.1');
    expect(body['temperature']).toBe(0);
    expect(body['max_tokens']).toBe(256);
    expect(body['response_format']).toEqual({
      type: 'json_schema',
      json_schema: { name: 'oge_test', schema: { type: 'object' } },
    });
    expect(fetch.mock.calls[0][1].headers['authorization']).toBeUndefined();
  });

  it('supports JSON mode, no structured output and Azure query parameters', async () => {
    const jsonMode = fakeFetch(reply);
    await createOgeOpenAiTransport({
      model: 'm',
      structuredOutput: 'json_object',
      fetch: jsonMode,
    }).complete(REQUEST);
    expect(sentBody(jsonMode)['response_format']).toEqual({
      type: 'json_object',
    });

    const azure = fakeFetch(reply);
    await createOgeOpenAiTransport({
      baseUrl: 'https://r.openai.azure.com/openai/deployments/d',
      model: 'd',
      query: { 'api-version': '2024-10-21' },
      headers: { 'api-key': 'k' },
      structuredOutput: 'none',
      fetch: azure,
    }).complete(REQUEST);
    expect(azure.mock.calls[0][0]).toBe(
      'https://r.openai.azure.com/openai/deployments/d/chat/completions?api-version=2024-10-21',
    );
    expect(azure.mock.calls[0][1].headers['api-key']).toBe('k');
    expect(sentBody(azure)['response_format']).toBeUndefined();
  });

  it('refuses to send an API key from a browser unless allowed', async () => {
    const fetch = fakeFetch(reply);
    const transport = createOgeOpenAiTransport({
      model: 'm',
      apiKey: 'sk',
      fetch,
    });
    await expect(transport.complete(REQUEST)).rejects.toBeInstanceOf(
      OgeAiError,
    );
    await expect(transport.complete(REQUEST)).rejects.toMatchObject({
      code: 'browser-key',
    });
    expect(fetch).not.toHaveBeenCalled();

    const allowed = fakeFetch(reply);
    await createOgeOpenAiTransport({
      model: 'm',
      apiKey: 'sk',
      dangerouslyAllowBrowser: true,
      fetch: allowed,
    }).complete(REQUEST);
    expect(allowed.mock.calls[0][1].headers['authorization']).toBe('Bearer sk');
  });

  it('rejects a reply without message content', async () => {
    const transport = createOgeOpenAiTransport({
      model: 'm',
      fetch: fakeFetch({ choices: [] }),
    });
    await expect(transport.complete(REQUEST)).rejects.toMatchObject({
      code: 'invalid-response',
    });
  });
});

describe('createOgeAnthropicTransport', () => {
  it('moves system messages to `system` and joins text blocks', async () => {
    const fetch = fakeFetch({
      content: [
        { type: 'text', text: '{"status":' },
        { type: 'tool_use', id: 'x' },
        { type: 'text', text: '"apply"}' },
      ],
      usage: { input_tokens: 40, output_tokens: 8 },
    });
    const result = await createOgeAnthropicTransport({
      baseUrl: '/api/anthropic',
      model: 'claude-haiku-5-5',
      fetch,
    }).complete(REQUEST);
    expect(result).toEqual({
      text: '{"status":"apply"}',
      usage: { inputTokens: 40, outputTokens: 8 },
    });
    expect(fetch.mock.calls[0][0]).toBe('/api/anthropic/messages');
    const body = sentBody(fetch);
    expect(body['system']).toBe('You control a grid.');
    expect(body['messages']).toEqual([
      { role: 'user', content: 'sort by name' },
    ]);
    expect(body['max_tokens']).toBe(256);
    expect(fetch.mock.calls[0][1].headers['anthropic-version']).toBe(
      '2023-06-01',
    );
  });

  it('sends the browser-access header only with an allowed key', async () => {
    const fetch = fakeFetch({ content: [{ type: 'text', text: 'ok' }] });
    await createOgeAnthropicTransport({
      model: 'm',
      apiKey: 'k',
      dangerouslyAllowBrowser: true,
      fetch,
    }).complete(REQUEST);
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('k');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    await expect(
      createOgeAnthropicTransport({ model: 'm', apiKey: 'k', fetch }).complete(
        REQUEST,
      ),
    ).rejects.toMatchObject({ code: 'browser-key' });
  });
});
