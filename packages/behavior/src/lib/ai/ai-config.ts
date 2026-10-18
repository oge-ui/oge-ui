/**
 * The AI family's message catalog and package defaults (G6), shared by both
 * render layers so `provideOgeAiConfig()` and `<OgeAiConfigProvider>` resolve
 * against one object — and a translation written for one layer is the
 * translation for the other.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import type { OgeAiTransport } from './ai-transport';
import {
  OGE_GRID_AI_ALL_CAPABILITIES,
  type OgeGridAiCapabilities,
} from './grid-ai-context';
import type { OgeGridAiSlice } from './grid-ai-response';

/** Strings of the grid assistant. `{token}` placeholders expand at render. */
export interface OgeGridAssistantMessages {
  /** Accessible name of the prompt field and of the assistant region. */
  readonly label: string;
  readonly placeholder: string;
  readonly submit: string;
  /** Stops a request in flight. */
  readonly stop: string;
  readonly apply: string;
  readonly discard: string;
  readonly undo: string;
  /** Accessible name of the suggestion list. */
  readonly suggestions: string;
  /** Heading of the proposed-change panel. */
  readonly proposal: string;
  readonly thinking: string;
  /** Status after a change was applied; `{summary}`. */
  readonly applied: string;
  /** Status when a proposal is waiting; `{summary}`. */
  readonly proposed: string;
  readonly unchanged: string;
  /** Status when the model asks back; `{summary}` is its question. */
  readonly clarify: string;
  /** Status when the request cannot be done; `{summary}` is the reason. */
  readonly unsupported: string;
  readonly invalid: string;
  readonly error: string;
  readonly noTransport: string;
  readonly aborted: string;
  readonly discarded: string;
  readonly undone: string;
  /** ICU plural over `{count}`: parts of the reply that were dropped. */
  readonly ignored: string;
  /** Names of the changed parts, shown as chips on a proposal. */
  readonly slices: Readonly<Record<OgeGridAiSlice, string>>;
}

/** Every AI string, grouped per component. */
export interface OgeAiMessages {
  readonly gridAssistant: OgeGridAssistantMessages;
}

/** The shipped English catalog. */
export const OGE_DEFAULT_AI_MESSAGES: OgeAiMessages = {
  gridAssistant: {
    label: 'Ask the grid',
    placeholder: 'Describe the view you want, e.g. "top 10 orders this month"',
    submit: 'Ask',
    stop: 'Stop',
    apply: 'Apply',
    discard: 'Discard',
    undo: 'Undo',
    suggestions: 'Suggestions',
    proposal: 'Proposed change',
    thinking: 'Thinking…',
    applied: 'Applied: {summary}',
    proposed: 'Proposed: {summary}',
    unchanged: 'The grid already shows that.',
    clarify: '{summary}',
    unsupported: 'Not possible with these columns. {summary}',
    invalid: 'The answer did not fit this grid. Try rephrasing.',
    error: 'The assistant is not available right now.',
    noTransport: 'No AI service is configured.',
    aborted: 'Stopped.',
    discarded: 'Proposal discarded.',
    undone: 'Change undone.',
    ignored:
      '{count, plural, one {# part of the answer did not match the columns and was ignored.} other {# parts of the answer did not match the columns and were ignored.}}',
    slices: {
      sort: 'Sort',
      group: 'Grouping',
      filter: 'Filter',
      search: 'Search',
      columns: 'Columns',
    },
  },
};

/**
 * `'preview'` shows the proposed change with Apply / Discard; `'apply'`
 * applies it at once (Undo stays available either way).
 */
export type OgeGridAssistantMode = 'preview' | 'apply';

/** Defaults of every grid assistant under a provider. */
export interface OgeGridAssistantConfig {
  readonly mode: OgeGridAssistantMode;
  /** Prompts offered as one-click chips before the first request. */
  readonly suggestions: readonly string[];
  /** Earlier exchanges replayed to the model, so follow-ups work. */
  readonly historyLimit: number;
  /** How many applied changes Undo can step back through. */
  readonly undoLimit: number;
  readonly capabilities: OgeGridAiCapabilities;
  /** Domain vocabulary appended to the system prompt. */
  readonly instructions: string | undefined;
}

/** Package-wide defaults for every AI component under a provider. */
export interface OgeAiConfig {
  /** Where requests go. `null` until the application configures one. */
  readonly transport: OgeAiTransport | null;
  /** Locale of message plurals and of the model's summaries. */
  readonly locale: string | undefined;
  readonly gridAssistant: OgeGridAssistantConfig;
  readonly messages: OgeAiMessages;
}

/** The shipped defaults. */
export const OGE_DEFAULT_AI_CONFIG: OgeAiConfig = {
  transport: null,
  locale: undefined,
  gridAssistant: {
    mode: 'preview',
    suggestions: [],
    historyLimit: 4,
    undoLimit: 20,
    capabilities: OGE_GRID_AI_ALL_CAPABILITIES,
    instructions: undefined,
  },
  messages: OGE_DEFAULT_AI_MESSAGES,
};

/** A deep-partial message override, as the providers and `messages` inputs take. */
export type OgeAiMessagesInput = {
  gridAssistant?: OgeGridAssistantMessagesInput;
};

/** A partial grid-assistant catalog (`slices` merged key by key). */
export type OgeGridAssistantMessagesInput = Partial<
  Omit<OgeGridAssistantMessages, 'slices'>
> & {
  slices?: Partial<Record<OgeGridAiSlice, string>>;
};

/** What the providers accept: everything optional, nested objects partial. */
export type OgeAiConfigInput = Partial<
  Omit<OgeAiConfig, 'messages' | 'gridAssistant'>
> & {
  gridAssistant?: Partial<Omit<OgeGridAssistantConfig, 'capabilities'>> & {
    capabilities?: Partial<OgeGridAiCapabilities>;
  };
  messages?: OgeAiMessagesInput;
};

/** Merges a partial grid-assistant catalog over a base one. */
export function mergeOgeGridAssistantMessages(
  base: OgeGridAssistantMessages,
  input: OgeGridAssistantMessagesInput | undefined,
): OgeGridAssistantMessages {
  if (!input) return base;
  return { ...base, ...input, slices: { ...base.slices, ...input.slices } };
}

/** Merges a deep-partial message override over a base catalog. */
export function mergeOgeAiMessages(
  base: OgeAiMessages,
  input: OgeAiMessagesInput | undefined,
): OgeAiMessages {
  if (!input) return base;
  return {
    ...base,
    gridAssistant: mergeOgeGridAssistantMessages(
      base.gridAssistant,
      input.gridAssistant,
    ),
  };
}

/** Merges a config input over the defaults (nested objects merged one level). */
export function resolveOgeAiConfig(
  input: OgeAiConfigInput | undefined,
  base: OgeAiConfig = OGE_DEFAULT_AI_CONFIG,
): OgeAiConfig {
  const { messages, gridAssistant, ...rest } = input ?? {};
  return {
    ...base,
    ...rest,
    gridAssistant: {
      ...base.gridAssistant,
      ...gridAssistant,
      capabilities: {
        ...base.gridAssistant.capabilities,
        ...gridAssistant?.capabilities,
      },
    },
    messages: mergeOgeAiMessages(base.messages, messages),
  };
}

/**
 * Expands an AI message: `{token}` placeholders and ICU plurals over numeric
 * tokens, in `locale` (unset = the runtime default).
 */
export function formatOgeAiMessage(
  template: string,
  tokens: Record<string, string | number>,
  locale?: string,
): string {
  return ogeFormatMessage(template, tokens, locale);
}
