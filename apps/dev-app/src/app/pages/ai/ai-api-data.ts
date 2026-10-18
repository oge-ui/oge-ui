// Hand-compiled from packages/ai/src/lib/** and the shared machine in
// packages/behavior/src/lib/ai/** — keep in sync with the source TSDoc.
import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Transports, config and shared types — one vocabulary for both render layers
 * (everything here lives in `@oge-ui/behavior` and is re-exported by
 * `@oge-ui/ai` and `@oge-ui/react-ai`), so the React table reuses it.
 */
export const OGE_AI_SHARED_TYPES: readonly ApiGroup[] = [
  {
    title: 'Transports',
    entries: [
      {
        name: 'createOgeAiHttpTransport(options)',
        type: '(options: OgeAiHttpTransportOptions) => OgeAiTransport',
        description:
          'Posts every <code>OgeAiRequest</code> as JSON to your endpoint (<code>{ url, headers?, credentials?, fetch? }</code>), which calls the model with a key the browser never sees and answers <code>{ "text": "…" }</code> or plain text. The production shape.',
      },
      {
        name: 'createOgeOpenAiTransport(options)',
        type: '(options: OgeAiOpenAiTransportOptions) => OgeAiTransport',
        description:
          'OpenAI Chat Completions and every compatible server — Azure OpenAI (<code>query: { "api-version": … }</code> + an <code>api-key</code> header), Ollama (<code>baseUrl: "http://localhost:11434/v1"</code>), vLLM, LM Studio, OpenRouter. <code>structuredOutput</code>: <code>"json_schema"</code> (default), <code>"json_object"</code> or <code>"none"</code>.',
      },
      {
        name: 'createOgeAnthropicTransport(options)',
        type: '(options: OgeAiAnthropicTransportOptions) => OgeAiTransport',
        description:
          'The Anthropic Messages API (Claude): system messages go to <code>system</code>, text blocks are joined. <code>{ model, baseUrl?, apiKey?, apiVersion?, maxTokens? }</code>.',
      },
      {
        name: 'dangerouslyAllowBrowser',
        type: 'boolean',
        description:
          'Required by the vendor transports to send an <code>apiKey</code> from a browser — without it they reject with <code>code: "browser-key"</code>. A key in client code is readable by every visitor: prototypes and internal tools only.',
      },
      {
        name: 'OgeAiTransport',
        type: '{ complete(request: OgeAiRequest, options?: { signal?: AbortSignal }): Promise<OgeAiResponse> }',
        description:
          'The whole contract — implement it to plug in any provider or SDK. Requests are abortable; the assistant aborts on Stop and when a newer prompt supersedes an older one.',
      },
      {
        name: 'OgeAiRequest',
        type: '{ feature; messages: readonly OgeAiMessage[]; responseSchema?; responseName?; temperature?; maxTokens? }',
        description:
          'What a feature sends: <code>feature</code> (<code>"grid-assistant"</code>) lets a backend route or rate-limit, <code>responseSchema</code> is the JSON Schema of the reply.',
      },
      {
        name: 'OgeAiResponse',
        type: '{ text: string; usage?: { inputTokens?; outputTokens? } }',
        description: 'The model’s reply as text (JSON text for a schema).',
      },
      {
        name: 'OgeAiMessage',
        type: "{ role: 'system' | 'user' | 'assistant'; content: string }",
        description: 'One message of the conversation.',
      },
      {
        name: 'OgeAiError',
        type: "Error & { code: 'aborted' | 'network' | 'http' | 'invalid-response' | 'browser-key'; status? }",
        description:
          'What every built-in transport rejects with; <code>status</code> carries the HTTP status of <code>"http"</code> errors.',
      },
      {
        name: 'OgeAiFetch',
        type: '(input: string, init) => Promise<{ ok; status; headers; text() }>',
        description:
          'The <code>fetch</code> shape the adapters call — pass <code>fetch</code> in the options for tests or a custom client.',
      },
    ],
  },
  {
    title: 'Grid assistant',
    entries: [
      {
        name: 'OgeGridAssistantTarget',
        type: '{ state(): GridStateSnapshot; applyState(snapshot): void; describeColumns(): readonly OgeAiGridColumn[] }',
        description:
          'What the assistant drives — the grid’s own state API. The Angular <code>OgeGrid</code> and the React grid handle both satisfy it.',
      },
      {
        name: 'OgeAiGridColumn',
        type: '{ field; caption; dataType; sortable; filterable; groupable; visible; values?; description? }',
        description:
          'What the model is told about a column — never row data. <code>values</code> are a lookup’s items (texts map back to values); <code>description</code> adds meaning (“net amount in EUR”).',
      },
      {
        name: 'OgeGridAiCapabilities',
        type: '{ sort; filter; group; search; columns: boolean }',
        description:
          'Which parts of the state the assistant may change; a reply touching a switched-off part is dropped with a <code>not-allowed</code> warning.',
      },
      {
        name: 'OgeGridAssistantMode',
        type: "'preview' | 'apply'",
        description:
          '<code>"preview"</code> shows the proposed change with Apply / Discard; <code>"apply"</code> applies at once. Undo works in both.',
      },
      {
        name: 'OgeGridAssistantStatus',
        type: "'idle' | 'thinking' | 'preview' | 'applied' | 'unchanged' | 'clarify' | 'unsupported' | 'invalid' | 'error' | 'aborted'",
        description:
          'Where the assistant is; the status line renders the matching message and is a polite live region.',
      },
      {
        name: 'OgeGridAssistantProposal',
        type: '{ prompt; summary; snapshot: GridStateSnapshot; slices: readonly OgeGridAiSlice[]; warnings }',
        description:
          'A validated change: the complete next state, already through <code>sanitizeGridStateSnapshot</code>, and the parts that differ.',
      },
      {
        name: 'OgeGridAiSlice',
        type: "'sort' | 'group' | 'filter' | 'search' | 'columns'",
        description: 'A part of the grid state; shown as chips on a proposal.',
      },
      {
        name: 'OgeGridAiWarning',
        type: "{ kind: 'unknown-field' | 'not-allowed' | 'invalid-operator' | 'invalid-value' | 'too-complex'; slice; field? }",
        description:
          'A part of the reply that was dropped instead of applied (the <code>ignored</code> message counts them).',
      },
      {
        name: 'OgeGridAssistantApplyingEvent',
        type: '{ prompt; summary; snapshot; slices; cancel: boolean }',
        description:
          'Cancelable: set <code>cancel</code> to keep the grid as it is.',
      },
      {
        name: 'OgeGridAssistantAppliedEvent',
        type: '{ prompt; summary; snapshot; previousSnapshot; slices }',
        description: 'A change reached the grid.',
      },
      {
        name: 'OgeGridAssistantUndoneEvent',
        type: '{ summary; snapshot }',
        description: 'Undo restored <code>snapshot</code>.',
      },
      {
        name: 'OgeGridAssistantErrorEvent',
        type: "{ prompt; code: OgeAiErrorCode | 'no-transport' | 'invalid-reply'; error }",
        description:
          'A request failed — no transport configured, a transport error, or a reply that was not a usable object.',
      },
    ],
  },
  {
    title: 'Config and messages',
    entries: [
      {
        name: 'OgeAiConfig',
        type: '{ transport: OgeAiTransport | null; locale; gridAssistant: OgeGridAssistantConfig; messages: OgeAiMessages }',
        description:
          'Package defaults. <code>OGE_DEFAULT_AI_CONFIG</code> has no transport — the application configures one.',
      },
      {
        name: 'OgeGridAssistantConfig',
        type: '{ mode; suggestions; historyLimit; undoLimit; capabilities; instructions }',
        description:
          'Assistant defaults: <code>"preview"</code>, no suggestions, the last 4 exchanges replayed, 20 undo steps, every capability on.',
      },
      {
        name: 'OgeAiMessages',
        type: '{ gridAssistant: OgeGridAssistantMessages }',
        description:
          'Every string, grouped per component. <code>OGE_DEFAULT_AI_MESSAGES</code> is the English catalog; <code>@oge-ui/locales</code> packs carry an <code>ai</code> slice to merge into your config.',
      },
      {
        name: 'OgeGridAssistantMessages',
        type: '{ label; placeholder; submit; stop; apply; discard; undo; suggestions; proposal; thinking; applied; proposed; unchanged; clarify; unsupported; invalid; error; noTransport; aborted; discarded; undone; ignored; slices }',
        description:
          '<code>applied</code> / <code>proposed</code> / <code>clarify</code> / <code>unsupported</code> take <code>{summary}</code>; <code>ignored</code> is an ICU plural over <code>{count}</code>.',
      },
    ],
  },
];

export const OGE_AI_API: ApiSections = {
  properties: [
    {
      title: 'Target and transport',
      entries: [
        {
          name: 'target',
          type: 'OgeGridAssistantTarget | null',
          default: 'undefined',
          description:
            'The grid to drive — an <code>OgeGrid</code> template reference (<code>[target]="grid"</code>), or any object with <code>state()</code>, <code>applyState()</code> and <code>describeColumns()</code>.',
        },
        {
          name: 'transport',
          type: 'OgeAiTransport | null',
          default: 'undefined',
          description:
            'Replaces the configured transport for this assistant. Without either, a request ends in the <code>noTransport</code> error.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        {
          name: 'mode',
          type: 'OgeGridAssistantMode',
          default: "'preview'",
          description:
            '<code>"preview"</code> asks before applying (Apply / Discard), <code>"apply"</code> applies at once.',
        },
        {
          name: 'suggestions',
          type: 'readonly string[]',
          default: '[]',
          description:
            'One-click prompts shown as chips until the first change is applied.',
        },
        {
          name: 'capabilities',
          type: 'Partial<OgeGridAiCapabilities>',
          default: 'undefined',
          description:
            'Turns parts of the state off for the model (<code>{ columns: false }</code>), merged over the config.',
        },
        {
          name: 'instructions',
          type: 'string',
          default: 'undefined',
          description:
            'Domain vocabulary appended to the system prompt (““open” means status 1”).',
        },
        {
          name: 'columns',
          type: 'readonly OgeAiGridColumn[]',
          default: 'undefined',
          description:
            'Column descriptions to send instead of the grid’s own — add <code>description</code>s, or leave a column out to keep it from the model.',
        },
        {
          name: 'locale',
          type: 'string',
          default: 'undefined',
          description:
            'BCP 47 locale of plurals, passed to the model as the user’s locale; falls back to the config, then <code>LOCALE_ID</code>.',
        },
        {
          name: 'messages',
          type: 'OgeGridAssistantMessagesInput',
          default: 'undefined',
          description:
            'Per-instance string overrides, merged over the catalog.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the field, the chips and every action.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'submit(text?)',
          type: '(text?: string) => Promise<void>',
          description:
            'Sends the prompt — or <code>text</code>, which also becomes the prompt. Resolves when the reply is handled; never rejects (failures land in the status).',
        },
        {
          name: 'apply()',
          type: 'void',
          description: 'Applies the pending proposal (the Apply button).',
        },
        {
          name: 'discard()',
          type: 'void',
          description: 'Drops the pending proposal; the grid stays as it is.',
        },
        {
          name: 'undo()',
          type: 'void',
          description:
            'Reverts the latest applied change, one step per call (up to <code>undoLimit</code>).',
        },
        {
          name: 'cancel()',
          type: 'void',
          description:
            'Aborts the request in flight (the Stop button, Escape).',
        },
        {
          name: 'reset()',
          type: 'void',
          description:
            'Clears the prompt, the proposal, the conversation and the undo history.',
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Moves focus to the prompt field.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'applying',
          type: 'OgeGridAssistantApplyingEvent',
          description:
            'A change is about to reach the grid — set <code>cancel</code> to veto it (e.g. confirm a destructive filter).',
        },
        {
          name: 'applied',
          type: 'OgeGridAssistantAppliedEvent',
          description:
            'A change was applied: <code>{ prompt, summary, snapshot, previousSnapshot, slices }</code> — log it, or persist <code>snapshot</code> as a saved view.',
        },
        {
          name: 'undone',
          type: 'OgeGridAssistantUndoneEvent',
          description: 'Undo restored the previous state.',
        },
        {
          name: 'errorOccurred',
          type: 'OgeGridAssistantErrorEvent',
          description:
            'A request failed: <code>"no-transport"</code>, an <code>OgeAiError</code> code, or <code>"invalid-reply"</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Providers',
      entries: [
        {
          name: 'provideOgeAiConfig(config)',
          type: '(config: OgeAiConfigInput | (() => OgeAiConfigInput)) => Provider',
          description:
            'Sets the transport and the AI defaults for an application or a route; a function makes the config live (switch the language without a reload).',
        },
        {
          name: 'OGE_AI_CONFIG',
          type: 'InjectionToken<OgeAiConfig>',
          description: 'The token every AI component reads its defaults from.',
        },
      ],
    },
    ...OGE_AI_SHARED_TYPES,
  ],
};
