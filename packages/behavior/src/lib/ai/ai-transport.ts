/**
 * The one seam between the AI components and a language model (G6).
 *
 * Every AI feature in the suite builds an {@link OgeAiRequest} and hands it to
 * an {@link OgeAiTransport}; nothing else in the package knows which model or
 * vendor answers. The suite never ships a hosted service of its own, so the
 * transport is always the application's: its own backend
 * ({@link createOgeAiHttpTransport} — the production shape, the API key never
 * reaches the browser), or a vendor endpoint called directly
 * ({@link createOgeOpenAiTransport} for OpenAI and every OpenAI-compatible
 * server — Azure OpenAI, Ollama, vLLM, LM Studio, OpenRouter —
 * {@link createOgeAnthropicTransport} for Claude).
 *
 * The adapters use `fetch` only — no vendor SDK is a dependency.
 */

/** Who wrote a message in the conversation sent to the model. */
export type OgeAiRole = 'system' | 'user' | 'assistant';

/** One message of the conversation sent to the model. */
export interface OgeAiMessage {
  readonly role: OgeAiRole;
  readonly content: string;
}

/** A JSON Schema object (draft 2020-12 subset) describing a structured reply. */
export type OgeAiJsonSchema = { readonly [key: string]: unknown };

/** What an AI feature asks the transport to send. */
export interface OgeAiRequest {
  /**
   * Which feature is asking (`'grid-assistant'`), so a backend can route,
   * rate-limit or log per feature.
   */
  readonly feature: string;
  /** The conversation: system instructions first, then the user turns. */
  readonly messages: readonly OgeAiMessage[];
  /**
   * JSON Schema the reply must satisfy. Adapters that support structured
   * output pass it on; the reply is validated either way, so a model that
   * ignores it only costs a retry.
   */
  readonly responseSchema?: OgeAiJsonSchema;
  /** Name of the schema, for vendors that require one (`[a-zA-Z0-9_-]`). */
  readonly responseName?: string;
  /** Sampling temperature; features send a low value for deterministic edits. */
  readonly temperature?: number;
  /** Upper bound on the reply length in tokens. */
  readonly maxTokens?: number;
}

/** Token counts a transport may report back. */
export interface OgeAiUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
}

/** The model's reply as text — JSON text when the request carried a schema. */
export interface OgeAiResponse {
  readonly text: string;
  readonly usage?: OgeAiUsage;
}

/** Per-call options. */
export interface OgeAiCallOptions {
  /** Aborts the request; the promise rejects with an `'aborted'` error. */
  readonly signal?: AbortSignal;
}

/** Sends one request to a model. Implement it to plug in any provider. */
export interface OgeAiTransport {
  complete(
    request: OgeAiRequest,
    options?: OgeAiCallOptions,
  ): Promise<OgeAiResponse>;
}

/** Why a transport call failed. */
export type OgeAiErrorCode =
  'aborted' | 'network' | 'http' | 'invalid-response' | 'browser-key';

/** The error every built-in transport rejects with. */
export class OgeAiError extends Error {
  /** The failure class, for branching without parsing the message. */
  readonly code: OgeAiErrorCode;
  /** HTTP status for `'http'` errors. */
  readonly status: number | undefined;

  constructor(code: OgeAiErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'OgeAiError';
    this.code = code;
    this.status = status;
  }
}

/** The `fetch` signature the adapters call — inject one for tests or proxies. */
export type OgeAiFetch = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
    credentials?: 'omit' | 'same-origin' | 'include';
  },
) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

/** Options every built-in adapter shares. */
export interface OgeAiTransportBaseOptions {
  /** Extra request headers (an auth token, an Azure `api-key`, a tenant id). */
  readonly headers?: Readonly<Record<string, string>>;
  /** Replaces the global `fetch`. */
  readonly fetch?: OgeAiFetch;
}

/** Options of {@link createOgeAiHttpTransport}. */
export interface OgeAiHttpTransportOptions extends OgeAiTransportBaseOptions {
  /** Your endpoint. It receives the {@link OgeAiRequest} as JSON. */
  readonly url: string;
  /** Cookie policy of the request; `'same-origin'` by default. */
  readonly credentials?: 'omit' | 'same-origin' | 'include';
}

/** Options of {@link createOgeOpenAiTransport}. */
export interface OgeAiOpenAiTransportOptions extends OgeAiTransportBaseOptions {
  /** Model or deployment name (`'gpt-4.1-mini'`, `'llama3.1'`, …). */
  readonly model: string;
  /**
   * API base URL; `'https://api.openai.com/v1'` by default. Point it at any
   * OpenAI-compatible server: `'http://localhost:11434/v1'` (Ollama), an
   * Azure deployment URL (with `query: { 'api-version': … }` and an
   * `api-key` header), vLLM, LM Studio, OpenRouter.
   */
  readonly baseUrl?: string;
  /** Sent as `Authorization: Bearer <key>`. Leave unset behind a proxy. */
  readonly apiKey?: string;
  /** Query parameters appended to the endpoint (Azure's `api-version`). */
  readonly query?: Readonly<Record<string, string>>;
  /**
   * How the response schema is requested: `'json_schema'` (default; OpenAI,
   * Azure, Ollama ≥ 0.5, vLLM), `'json_object'` for servers that only know
   * JSON mode, `'none'` to rely on the prompt alone.
   */
  readonly structuredOutput?: 'json_schema' | 'json_object' | 'none';
  /**
   * Required to send `apiKey` from a browser: a key in client code is
   * readable by every visitor. Use it for prototypes and internal tools only.
   */
  readonly dangerouslyAllowBrowser?: boolean;
}

/** Options of {@link createOgeAnthropicTransport}. */
export interface OgeAiAnthropicTransportOptions extends OgeAiTransportBaseOptions {
  /** Model name (`'claude-sonnet-5-5'`, `'claude-haiku-5-5'`, …). */
  readonly model: string;
  /** API base URL; `'https://api.anthropic.com/v1'` by default. */
  readonly baseUrl?: string;
  /** Sent as `x-api-key`. Leave unset behind a proxy. */
  readonly apiKey?: string;
  /** `anthropic-version` header; `'2023-06-01'` by default. */
  readonly apiVersion?: string;
  /** `max_tokens` when the request sets none; `1024` by default. */
  readonly maxTokens?: number;
  /** Required to send `apiKey` from a browser — see the OpenAI option. */
  readonly dangerouslyAllowBrowser?: boolean;
}

function resolveFetch(custom: OgeAiFetch | undefined): OgeAiFetch {
  if (custom) return custom;
  const native = (globalThis as { fetch?: unknown }).fetch;
  if (typeof native !== 'function') {
    throw new OgeAiError('network', 'No fetch implementation is available.');
  }
  return native.bind(globalThis) as OgeAiFetch;
}

function isBrowser(): boolean {
  return (
    typeof (globalThis as { document?: unknown }).document === 'object' &&
    typeof (globalThis as { window?: unknown }).window === 'object'
  );
}

function guardBrowserKey(
  apiKey: string | undefined,
  allowed: boolean | undefined,
): void {
  if (apiKey && !allowed && isBrowser()) {
    throw new OgeAiError(
      'browser-key',
      'Refusing to send an API key from the browser. Call the model through ' +
        'your own backend (createOgeAiHttpTransport), or set ' +
        'dangerouslyAllowBrowser for a prototype.',
    );
  }
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/** Runs one POST and returns the body text, mapping failures to {@link OgeAiError}. */
async function post(
  fetchImpl: OgeAiFetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: OgeAiCallOptions | undefined,
  credentials?: 'omit' | 'same-origin' | 'include',
): Promise<{ text: string; contentType: string }> {
  if (options?.signal?.aborted) {
    throw new OgeAiError('aborted', 'The request was aborted.');
  }
  let response: Awaited<ReturnType<OgeAiFetch>>;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: options?.signal,
      ...(credentials ? { credentials } : {}),
    });
  } catch (error) {
    if (isAbort(error) || options?.signal?.aborted) {
      throw new OgeAiError('aborted', 'The request was aborted.');
    }
    throw new OgeAiError('network', 'The AI service could not be reached.');
  }
  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    if (isAbort(error) || options?.signal?.aborted) {
      throw new OgeAiError('aborted', 'The request was aborted.');
    }
    throw new OgeAiError('network', 'The AI response could not be read.');
  }
  if (!response.ok) {
    throw new OgeAiError(
      'http',
      `The AI service answered with HTTP ${response.status}.`,
      response.status,
    );
  }
  return { text, contentType: response.headers.get('content-type') ?? '' };
}

function parseJsonBody(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new OgeAiError('invalid-response', 'The AI response is not JSON.');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OgeAiError('invalid-response', 'The AI response is not JSON.');
  }
  return value as Record<string, unknown>;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function withQuery(
  url: string,
  query: Readonly<Record<string, string>> | undefined,
): string {
  const entries = Object.entries(query ?? {});
  if (entries.length === 0) return url;
  const search = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `${url}${url.includes('?') ? '&' : '?'}${search}`;
}

/** Drops trailing slashes — a loop, not a `/+$` regex, which backtracks. */
function trimSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end--;
  return url.slice(0, end);
}

/**
 * A transport that posts every request to your own endpoint — the shape to
 * ship to production. The endpoint receives the {@link OgeAiRequest} as JSON,
 * calls whichever model it likes with a key the browser never sees, and
 * answers either `{ "text": "…" }` (optionally with `usage`) or the reply as
 * plain text.
 *
 * ```ts
 * provideOgeAiConfig({ transport: createOgeAiHttpTransport({ url: '/api/ai' }) })
 * ```
 */
export function createOgeAiHttpTransport(
  options: OgeAiHttpTransportOptions,
): OgeAiTransport {
  return {
    async complete(request, callOptions) {
      const { text, contentType } = await post(
        resolveFetch(options.fetch),
        options.url,
        { ...options.headers },
        request,
        callOptions,
        options.credentials ?? 'same-origin',
      );
      if (!contentType.includes('json')) return { text };
      const body = parseJsonBody(text);
      if (typeof body['text'] !== 'string') {
        throw new OgeAiError(
          'invalid-response',
          'The AI endpoint must answer { "text": string }.',
        );
      }
      const usage = body['usage'] as Record<string, unknown> | undefined;
      return {
        text: body['text'],
        ...(usage && typeof usage === 'object'
          ? {
              usage: {
                inputTokens: finite(usage['inputTokens']),
                outputTokens: finite(usage['outputTokens']),
              },
            }
          : {}),
      };
    },
  };
}

/**
 * A transport for the OpenAI Chat Completions API and every server that
 * speaks it (Azure OpenAI, Ollama, vLLM, LM Studio, OpenRouter).
 *
 * ```ts
 * // a local model — nothing leaves the machine
 * createOgeOpenAiTransport({ baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' })
 * ```
 */
export function createOgeOpenAiTransport(
  options: OgeAiOpenAiTransportOptions,
): OgeAiTransport {
  return {
    async complete(request, callOptions) {
      guardBrowserKey(options.apiKey, options.dangerouslyAllowBrowser);
      const mode = options.structuredOutput ?? 'json_schema';
      const body: Record<string, unknown> = {
        model: options.model,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (request.temperature !== undefined) {
        body['temperature'] = request.temperature;
      }
      if (request.maxTokens !== undefined) {
        body['max_tokens'] = request.maxTokens;
      }
      if (request.responseSchema && mode === 'json_schema') {
        body['response_format'] = {
          type: 'json_schema',
          json_schema: {
            name: request.responseName ?? 'oge_response',
            schema: request.responseSchema,
          },
        };
      } else if (request.responseSchema && mode === 'json_object') {
        body['response_format'] = { type: 'json_object' };
      }
      const headers: Record<string, string> = { ...options.headers };
      if (options.apiKey) headers['authorization'] = `Bearer ${options.apiKey}`;
      const url = withQuery(
        `${trimSlash(options.baseUrl ?? 'https://api.openai.com/v1')}/chat/completions`,
        options.query,
      );
      const { text } = await post(
        resolveFetch(options.fetch),
        url,
        headers,
        body,
        callOptions,
      );
      const json = parseJsonBody(text);
      const choices = json['choices'];
      const first = Array.isArray(choices)
        ? (choices[0] as Record<string, unknown> | undefined)
        : undefined;
      const message = first?.['message'] as Record<string, unknown> | undefined;
      const content = message?.['content'];
      if (typeof content !== 'string') {
        throw new OgeAiError(
          'invalid-response',
          'The AI response has no message content.',
        );
      }
      const usage = json['usage'] as Record<string, unknown> | undefined;
      return {
        text: content,
        ...(usage && typeof usage === 'object'
          ? {
              usage: {
                inputTokens: finite(usage['prompt_tokens']),
                outputTokens: finite(usage['completion_tokens']),
              },
            }
          : {}),
      };
    },
  };
}

/**
 * A transport for the Anthropic Messages API (Claude). System messages are
 * sent as the `system` field; the response schema travels in the prompt.
 *
 * ```ts
 * createOgeAnthropicTransport({ baseUrl: '/api/anthropic', model: 'claude-haiku-5-5' })
 * ```
 */
export function createOgeAnthropicTransport(
  options: OgeAiAnthropicTransportOptions,
): OgeAiTransport {
  return {
    async complete(request, callOptions) {
      guardBrowserKey(options.apiKey, options.dangerouslyAllowBrowser);
      const system = request.messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n');
      const body: Record<string, unknown> = {
        model: options.model,
        max_tokens: request.maxTokens ?? options.maxTokens ?? 1024,
        messages: request.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content })),
      };
      if (system) body['system'] = system;
      if (request.temperature !== undefined) {
        body['temperature'] = request.temperature;
      }
      const headers: Record<string, string> = {
        'anthropic-version': options.apiVersion ?? '2023-06-01',
        ...options.headers,
      };
      if (options.apiKey) {
        headers['x-api-key'] = options.apiKey;
        if (isBrowser()) {
          headers['anthropic-dangerous-direct-browser-access'] = 'true';
        }
      }
      const { text } = await post(
        resolveFetch(options.fetch),
        `${trimSlash(options.baseUrl ?? 'https://api.anthropic.com/v1')}/messages`,
        headers,
        body,
        callOptions,
      );
      const json = parseJsonBody(text);
      const blocks = json['content'];
      const reply = Array.isArray(blocks)
        ? blocks
            .filter(
              (b): b is { type: 'text'; text: string } =>
                typeof b === 'object' &&
                b !== null &&
                (b as { type?: unknown }).type === 'text' &&
                typeof (b as { text?: unknown }).text === 'string',
            )
            .map((b) => b.text)
            .join('')
        : undefined;
      if (!reply) {
        throw new OgeAiError(
          'invalid-response',
          'The AI response has no text content.',
        );
      }
      const usage = json['usage'] as Record<string, unknown> | undefined;
      return {
        text: reply,
        ...(usage && typeof usage === 'object'
          ? {
              usage: {
                inputTokens: finite(usage['input_tokens']),
                outputTokens: finite(usage['output_tokens']),
              },
            }
          : {}),
      };
    },
  };
}
