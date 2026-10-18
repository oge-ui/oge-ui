// Hand-compiled from packages/ai/src/lib/chat/**, packages/react/ai/src/lib/chat.tsx
// and the shared machine in packages/behavior/src/lib/ai/chat-core.ts — keep in
// sync with the source TSDoc. The React table mirrors the Angular one member
// for member (the parity gate diffs them).
import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';

const BEHAVIOUR: ApiEntry[] = [
  {
    name: 'transport',
    type: 'OgeAiTransport | null',
    default: 'undefined',
    description:
      'Where replies come from; falls back to the config. <code>null</code> is <strong>manual mode</strong>: messages are only emitted (<code>sent</code>) and the host adds replies with <code>addMessage()</code> — a chat between people, or a backend with its own channel.',
  },
  {
    name: 'instructions',
    type: 'string',
    default: 'undefined',
    description:
      'System instructions sent before the conversation (“You are the support assistant of Acme”); falls back to the config.',
  },
  {
    name: 'suggestions',
    type: 'readonly string[]',
    default: '[]',
    description: 'Prompts offered as chips before the first message.',
  },
  {
    name: 'messages',
    type: 'Partial<OgeChatMessages>',
    default: 'undefined',
    description: 'Per-instance string overrides, merged over the catalog.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables the composer and every action.',
  },
];

const METHODS: ApiEntry[] = [
  {
    name: 'send(text?)',
    type: '(text?: string) => Promise<void>',
    description:
      'Sends <code>text</code> or the composer’s text as a user turn and, with a transport, waits for the reply. Never rejects.',
  },
  {
    name: 'addMessage(message)',
    type: "(message: { role: 'user' | 'assistant'; text; id?; time? }) => OgeChatMessage",
    description: 'Appends a message — a reply in manual mode, or a greeting.',
  },
  {
    name: 'retry()',
    type: '() => Promise<void>',
    description: 'Resends the last user turn after a failed reply.',
  },
  {
    name: 'stop()',
    type: 'void',
    description: 'Stops the reply in flight (the stop button, Escape).',
  },
  {
    name: 'clear()',
    type: 'void',
    description: 'Empties the conversation and the composer.',
  },
  {
    name: 'focus()',
    type: 'void',
    description: 'Moves focus to the composer.',
  },
];

/** Chat types — the same objects in both layers. */
export const OGE_CHAT_TYPES: readonly ApiGroup[] = [
  {
    title: 'Chat',
    entries: [
      {
        name: 'OgeChatMessage',
        type: "{ id; role: 'user' | 'assistant'; text; status?: 'error'; time? }",
        description:
          'One message. Rendered as text with preserved line breaks — never as HTML or Markdown.',
      },
      {
        name: 'OgeChatSendingEvent',
        type: '{ text; cancel: boolean }',
        description:
          'Cancelable: set <code>cancel</code> to keep a message out (moderation, a required login).',
      },
      {
        name: 'OgeChatSentEvent / OgeChatReplyEvent',
        type: '{ message: OgeChatMessage }',
        description:
          'A user message or an assistant reply entered the conversation.',
      },
      {
        name: 'OgeChatErrorEvent',
        type: "{ code: OgeAiErrorCode | 'no-transport'; error }",
        description: 'A reply failed; the failed turn shows a retry button.',
      },
      {
        name: 'OgeChatConfig',
        type: '{ instructions; historyLimit; suggestions }',
        description:
          'Defaults under <code>chat</code> in the AI config: the last 20 messages replayed to the model.',
      },
      {
        name: 'OgeChatMessages',
        type: '{ label; logLabel; composerLabel; placeholder; send; stop; retry; clear; you; assistant; thinking; error; emptyReply; empty; suggestions }',
        description:
          'Under <code>messages.chat</code>; every <code>@oge-ui/locales</code> pack carries them.',
      },
      {
        name: 'OgeChatCore',
        type: 'class OgeChatCore { list; draft; thinking; canSend; send(); addMessage(); retry(); stop(); clear() }',
        description:
          'The shared machine both chats run (<code>@oge-ui/behavior</code>) — usable on its own for a custom chat UI.',
      },
    ],
  },
];

export const OGE_CHAT_API: ApiSections = {
  properties: [
    {
      title: 'Conversation',
      entries: [
        {
          name: 'conversation',
          type: 'readonly OgeChatMessage[]',
          default: '[]',
          description:
            'The conversation, two-way (<code>[(conversation)]</code>) — restore a history, persist it, reset it.',
        },
      ],
    },
    { title: 'Behaviour (undefined = config)', entries: BEHAVIOUR },
  ],
  methods: [{ entries: METHODS }],
  events: [
    {
      entries: [
        {
          name: 'sending',
          type: 'OgeChatSendingEvent',
          description:
            'A user message is about to be sent — set <code>cancel</code> to keep it out.',
        },
        {
          name: 'sent',
          type: 'OgeChatSentEvent',
          description: 'A user message entered the conversation.',
        },
        {
          name: 'conversationChange',
          type: 'readonly OgeChatMessage[]',
          description:
            'Every change of the conversation — the event half of <code>[(conversation)]</code>.',
        },
        {
          name: 'replied',
          type: 'OgeChatReplyEvent',
          description: 'An assistant reply entered the conversation.',
        },
        {
          name: 'errorOccurred',
          type: 'OgeChatErrorEvent',
          description: 'A reply request failed.',
        },
      ],
    },
  ],
  types: OGE_CHAT_TYPES,
};

export const OGE_REACT_CHAT_API: ApiSections = {
  properties: [
    {
      title: 'Conversation',
      entries: [
        {
          name: 'conversation',
          type: 'readonly OgeChatMessage[]',
          default: 'undefined',
          description:
            'The conversation (controlled); pair it with <code>onConversationChange</code>.',
        },
        {
          name: 'defaultConversation',
          type: 'readonly OgeChatMessage[]',
          default: '[]',
          description: 'The initial conversation when uncontrolled.',
        },
        {
          name: 'onConversationChange',
          type: '(conversation: readonly OgeChatMessage[]) => void',
          default: 'undefined',
          description:
            'Every change of the conversation — the controlled half of <code>conversation</code>.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        ...BEHAVIOUR,
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          default: 'undefined',
          description: 'Added to the root <code>.oge-chat</code> element.',
        },
      ],
    },
  ],
  methods: [{ title: 'Ref handle (OgeChatHandle)', entries: METHODS }],
  events: [
    {
      entries: [
        {
          name: 'onSending',
          type: '(event: OgeChatSendingEvent) => void',
          description:
            'A user message is about to be sent — set <code>cancel</code> to keep it out.',
        },
        {
          name: 'onSent',
          type: '(event: OgeChatSentEvent) => void',
          description: 'A user message entered the conversation.',
        },
        {
          name: 'onReplied',
          type: '(event: OgeChatReplyEvent) => void',
          description: 'An assistant reply entered the conversation.',
        },
        {
          name: 'onErrorOccurred',
          type: '(event: OgeChatErrorEvent) => void',
          description: 'A reply request failed.',
        },
      ],
    },
  ],
  types: OGE_CHAT_TYPES,
};
