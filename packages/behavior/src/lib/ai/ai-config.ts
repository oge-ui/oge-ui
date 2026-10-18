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

/** Strings of smart paste. ICU plurals over `{count}` where noted. */
export interface OgeSmartPasteMessages {
  /** The button text and the accessible name of the component. */
  readonly label: string;
  /** Label of the fallback text area (clipboard unreadable, or opened by hand). */
  readonly textLabel: string;
  readonly textPlaceholder: string;
  /** Sends the text-area contents. */
  readonly fill: string;
  /** Opens the text area instead of reading the clipboard. */
  readonly pasteText: string;
  readonly stop: string;
  readonly apply: string;
  readonly discard: string;
  readonly undo: string;
  /** Heading of the proposed-values panel. */
  readonly proposal: string;
  /** Column headers of the proposal table. */
  readonly field: string;
  readonly current: string;
  readonly next: string;
  /** Shown for an empty current value. */
  readonly emptyValue: string;
  readonly yes: string;
  readonly no: string;
  readonly reading: string;
  readonly thinking: string;
  /** ICU plural over `{count}`: fields a proposal would fill. */
  readonly proposed: string;
  /** ICU plural over `{count}`: fields that were filled. */
  readonly applied: string;
  readonly unchanged: string;
  /** `{summary}` is the model's reason. */
  readonly unsupported: string;
  readonly invalid: string;
  readonly error: string;
  readonly noTransport: string;
  readonly clipboardDenied: string;
  readonly empty: string;
  readonly aborted: string;
  readonly discarded: string;
  readonly undone: string;
  /** ICU plural over `{count}`: values that were dropped. */
  readonly ignored: string;
}

/** Strings of an AI cell (one row's computed value). */
export interface OgeAiCellMessages {
  /** Screen-reader text of the loading skeleton. */
  readonly generating: string;
  /** Shown when the value could not be computed. */
  readonly error: string;
  /** Accessible name of the retry button. */
  readonly retry: string;
  /** Shown when the model had no answer for the row. */
  readonly empty: string;
  readonly yes: string;
  readonly no: string;
}

/** Strings of the chat. */
export interface OgeChatMessages {
  /** Accessible name of the chat. */
  readonly label: string;
  /** Accessible name of the message list. */
  readonly logLabel: string;
  /** Accessible name of the composer. */
  readonly composerLabel: string;
  readonly placeholder: string;
  readonly send: string;
  readonly stop: string;
  readonly retry: string;
  readonly clear: string;
  /** Visually hidden author prefixes. */
  readonly you: string;
  readonly assistant: string;
  /** The typing indicator's text. */
  readonly thinking: string;
  /** The text of a failed assistant turn. */
  readonly error: string;
  /** Stands in for an empty reply. */
  readonly emptyReply: string;
  /** Shown before the first message. */
  readonly empty: string;
  /** Accessible name of the suggestion list. */
  readonly suggestions: string;
}

/** Every AI string, grouped per component. */
export interface OgeAiMessages {
  readonly gridAssistant: OgeGridAssistantMessages;
  readonly smartPaste: OgeSmartPasteMessages;
  readonly aiCell: OgeAiCellMessages;
  readonly chat: OgeChatMessages;
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
  smartPaste: {
    label: 'Smart paste',
    textLabel: 'Text to fill the form from',
    textPlaceholder: 'Paste an email, a signature or a note…',
    fill: 'Fill the form',
    pasteText: 'Paste text instead',
    stop: 'Stop',
    apply: 'Apply',
    discard: 'Discard',
    undo: 'Undo',
    proposal: 'Proposed values',
    field: 'Field',
    current: 'Now',
    next: 'New',
    emptyValue: '(empty)',
    yes: 'Yes',
    no: 'No',
    reading: 'Reading the clipboard…',
    thinking: 'Reading the text…',
    proposed:
      '{count, plural, one {# field to fill from the text.} other {# fields to fill from the text.}}',
    applied: '{count, plural, one {# field filled.} other {# fields filled.}}',
    unchanged: 'The form already holds these values.',
    unsupported: 'Nothing in the text fits this form. {summary}',
    invalid: 'The answer did not fit this form. Try again.',
    error: 'Smart paste is not available right now.',
    noTransport: 'No AI service is configured.',
    clipboardDenied:
      'The clipboard could not be read — paste the text into the box instead.',
    empty: 'There is no text to read.',
    aborted: 'Stopped.',
    discarded: 'Proposal discarded.',
    undone: 'Values restored.',
    ignored:
      '{count, plural, one {# value did not fit its field and was ignored.} other {# values did not fit their fields and were ignored.}}',
  },
  aiCell: {
    generating: 'Generating…',
    error: 'Not available',
    retry: 'Try again',
    empty: '—',
    yes: 'Yes',
    no: 'No',
  },
  chat: {
    label: 'Chat',
    logLabel: 'Conversation',
    composerLabel: 'Message',
    placeholder: 'Type a message…',
    send: 'Send',
    stop: 'Stop',
    retry: 'Try again',
    clear: 'Clear conversation',
    you: 'You:',
    assistant: 'Assistant:',
    thinking: 'Typing…',
    error: 'The reply could not be loaded.',
    emptyReply: '(no reply)',
    empty: 'Start the conversation.',
    suggestions: 'Suggestions',
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

/** Defaults of every chat under a provider. */
export interface OgeChatConfig {
  /** System instructions sent before the conversation. */
  readonly instructions: string | undefined;
  /** Earlier messages replayed to the model. */
  readonly historyLimit: number;
  /** Prompts offered as chips before the first message. */
  readonly suggestions: readonly string[];
}

/** Defaults of every smart paste under a provider. */
export interface OgeSmartPasteConfig {
  readonly mode: OgeGridAssistantMode;
  /** How many applied pastes Undo can step back through. */
  readonly undoLimit: number;
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
  readonly smartPaste: OgeSmartPasteConfig;
  readonly chat: OgeChatConfig;
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
  smartPaste: { mode: 'preview', undoLimit: 10, instructions: undefined },
  chat: { instructions: undefined, historyLimit: 20, suggestions: [] },
  messages: OGE_DEFAULT_AI_MESSAGES,
};

/** A deep-partial message override, as the providers and `messages` inputs take. */
export type OgeAiMessagesInput = {
  gridAssistant?: OgeGridAssistantMessagesInput;
  smartPaste?: Partial<OgeSmartPasteMessages>;
  aiCell?: Partial<OgeAiCellMessages>;
  chat?: Partial<OgeChatMessages>;
};

/** A partial grid-assistant catalog (`slices` merged key by key). */
export type OgeGridAssistantMessagesInput = Partial<
  Omit<OgeGridAssistantMessages, 'slices'>
> & {
  slices?: Partial<Record<OgeGridAiSlice, string>>;
};

/** What the providers accept: everything optional, nested objects partial. */
export type OgeAiConfigInput = Partial<
  Omit<OgeAiConfig, 'messages' | 'gridAssistant' | 'smartPaste' | 'chat'>
> & {
  smartPaste?: Partial<OgeSmartPasteConfig>;
  chat?: Partial<OgeChatConfig>;
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
    smartPaste: { ...base.smartPaste, ...input.smartPaste },
    aiCell: { ...base.aiCell, ...input.aiCell },
    chat: { ...base.chat, ...input.chat },
  };
}

/** Merges a config input over the defaults (nested objects merged one level). */
export function resolveOgeAiConfig(
  input: OgeAiConfigInput | undefined,
  base: OgeAiConfig = OGE_DEFAULT_AI_CONFIG,
): OgeAiConfig {
  const { messages, gridAssistant, smartPaste, chat, ...rest } = input ?? {};
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
    smartPaste: { ...base.smartPaste, ...smartPaste },
    chat: { ...base.chat, ...chat },
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

/** The assistant's sparkle glyph (24 × 24 view box), shared by both layers. */
export const OGE_GRID_ASSISTANT_ICON_PATH =
  'M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5zm6.5 11l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z';
