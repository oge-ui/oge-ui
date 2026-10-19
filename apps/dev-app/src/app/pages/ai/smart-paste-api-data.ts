// Hand-compiled from packages/ai/src/lib/smart-paste/**, packages/react/ai/src/lib/smart-paste.tsx
// and the shared machine in packages/behavior/src/lib/ai/smart-paste-* — keep in
// sync with the source TSDoc. The React table mirrors the Angular one member
// for member (the parity gate diffs them).
import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';

const BEHAVIOUR: ApiEntry[] = [
  {
    name: 'mode',
    type: 'OgeGridAssistantMode',
    default: "'preview'",
    description:
      '<code>"preview"</code> shows the values in a Now → New table before writing them, <code>"apply"</code> writes them at once.',
  },
  {
    name: 'instructions',
    type: 'string',
    default: 'undefined',
    description:
      'Domain vocabulary appended to the system prompt (“seats are licences”).',
  },
  {
    name: 'fields',
    type: 'readonly OgeAiFormField[]',
    default: 'undefined',
    description:
      'Field descriptions merged over the form’s own (by <code>field</code>) — add a <code>description</code>, or set <code>readOnly: true</code> to keep a field out of reach of the model.',
  },
  {
    name: 'messages',
    type: 'Partial<OgeSmartPasteMessages>',
    default: 'undefined',
    description: 'Per-instance string overrides, merged over the catalog.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    default: 'false',
    description: 'Disables every control.',
  },
];

const METHODS: ApiEntry[] = [
  {
    name: 'paste(text?)',
    type: '(text?: string) => Promise<void>',
    description:
      'Fills the form from <code>text</code>, or from the clipboard (<code>navigator.clipboard.readText</code>) when called without one; an unreadable clipboard opens the text area. Never rejects.',
  },
  {
    name: 'fillFromText()',
    type: '() => Promise<void>',
    description: 'Fills the form from the text area.',
  },
  {
    name: 'apply()',
    type: 'void',
    description: 'Writes the pending values into the form (the Apply button).',
  },
  {
    name: 'discard()',
    type: 'void',
    description: 'Drops the pending values; the form stays as it is.',
  },
  {
    name: 'undo()',
    type: 'void',
    description:
      'Restores the values the latest paste replaced, one paste per call (up to <code>undoLimit</code>).',
  },
  {
    name: 'cancel()',
    type: 'void',
    description: 'Aborts the clipboard read or the request in flight.',
  },
  {
    name: 'reset()',
    type: 'void',
    description: 'Clears the proposal, the text area and the undo history.',
  },
  {
    name: 'focus()',
    type: 'void',
    description: 'Moves focus to the Smart paste button.',
  },
];

/** Smart-paste types — the same objects in both layers. */
export const OGE_SMART_PASTE_TYPES: readonly ApiGroup[] = [
  {
    title: 'Smart paste',
    entries: [
      {
        name: 'OgeSmartPasteTarget',
        type: '{ describeFields(): readonly OgeSmartPasteField[]; updateData(values): void }',
        description:
          'What smart paste fills — the form’s own API. The Angular <code>OgeForm</code> and the React form handle both satisfy it.',
      },
      {
        name: 'OgeAiFormField',
        type: '{ field; label; dataType; required?; readOnly?; multiple?; values?; description? }',
        description:
          'What the model is told about a field. Read-only fields are never offered; choice fields only accept their listed values (texts map back to values). <code>OgeSmartPasteField</code> adds the current <code>value</code>, which stays on the page.',
      },
      {
        name: 'OgeSmartPasteChange',
        type: '{ field; label; previous; next }',
        description: 'One row of the Now → New table.',
      },
      {
        name: 'OgeSmartPasteWarning',
        type: "{ kind: 'unknown-field' | 'not-allowed' | 'invalid-value'; field }",
        description:
          'A value the reply carried that was dropped instead of written.',
      },
      {
        name: 'OgeSmartPasteStatus',
        type: "'idle' | 'reading' | 'thinking' | 'preview' | 'applied' | 'unchanged' | 'unsupported' | 'invalid' | 'error' | 'aborted'",
        description:
          'Where smart paste is; the status line renders the matching message and is a polite live region.',
      },
      {
        name: 'OgeSmartPasteApplyingEvent',
        type: '{ values; changes; cancel: boolean }',
        description:
          'Cancelable: set <code>cancel</code> to keep the form as it is.',
      },
      {
        name: 'OgeSmartPasteAppliedEvent',
        type: '{ values; changes }',
        description: 'Values were written.',
      },
      {
        name: 'OgeSmartPasteUndoneEvent',
        type: '{ values }',
        description: 'Undo restored <code>values</code>.',
      },
      {
        name: 'OgeSmartPasteErrorEvent',
        type: "{ code: OgeAiErrorCode | 'clipboard' | 'empty' | 'no-transport' | 'invalid-reply'; error }",
        description:
          'A paste failed — the clipboard could not be read, the text was empty, no transport, a transport error, or an unusable reply.',
      },
      {
        name: 'OgeSmartPasteConfig',
        type: '{ mode; undoLimit; instructions }',
        description:
          'Defaults under <code>smartPaste</code> in the AI config: <code>"preview"</code>, 10 undo steps.',
      },
      {
        name: 'OgeSmartPasteMessages',
        type: '{ label; textLabel; textPlaceholder; fill; pasteText; …; proposed; applied; ignored }',
        description:
          '<code>proposed</code>, <code>applied</code> and <code>ignored</code> are ICU plurals over <code>{count}</code>; <code>unsupported</code> takes <code>{summary}</code>.',
      },
    ],
  },
];

export const OGE_SMART_PASTE_API: ApiSections = {
  properties: [
    {
      title: 'Target and transport',
      entries: [
        {
          name: 'target',
          type: 'OgeSmartPasteTarget | null',
          default: 'undefined',
          description:
            'The form to fill — an <code>OgeForm</code> template reference (<code>[target]="form"</code>), or any object with <code>describeFields()</code> and <code>updateData(values)</code>.',
        },
        {
          name: 'transport',
          type: 'OgeAiTransport | null',
          default: 'undefined',
          description:
            'Replaces the configured transport for this smart paste.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        ...BEHAVIOUR.slice(0, 3),
        {
          name: 'locale',
          type: 'string',
          default: 'undefined',
          description:
            'BCP 47 locale of value formatting and the text; falls back to the config, then <code>LOCALE_ID</code>.',
        },
        ...BEHAVIOUR.slice(3),
      ],
    },
  ],
  methods: [{ entries: METHODS }],
  events: [
    {
      entries: [
        {
          name: 'applying',
          type: 'OgeSmartPasteApplyingEvent',
          description:
            'Values are about to reach the form — set <code>cancel</code> to keep it as it is.',
        },
        {
          name: 'applied',
          type: 'OgeSmartPasteAppliedEvent',
          description: 'Values were written into the form.',
        },
        {
          name: 'undone',
          type: 'OgeSmartPasteUndoneEvent',
          description: 'Undo restored the values the latest paste replaced.',
        },
        {
          name: 'errorOccurred',
          type: 'OgeSmartPasteErrorEvent',
          description:
            'A paste failed: <code>"clipboard"</code>, <code>"empty"</code>, <code>"no-transport"</code>, an <code>OgeAiError</code> code, or <code>"invalid-reply"</code>.',
        },
      ],
    },
  ],
  types: OGE_SMART_PASTE_TYPES,
};

export const OGE_REACT_SMART_PASTE_API: ApiSections = {
  properties: [
    {
      title: 'Target and transport',
      entries: [
        {
          name: 'target',
          type: 'OgeSmartPasteTarget | RefObject<OgeSmartPasteTarget | null> | null',
          default: 'undefined',
          description:
            'The form to fill — the <code>&lt;OgeForm&gt;</code> ref (<code>target={form}</code>) or its handle, or any object with <code>describeFields()</code> and <code>updateData(values)</code>.',
        },
        {
          name: 'transport',
          type: 'OgeAiTransport | null',
          default: 'undefined',
          description:
            'Replaces the transport from <code>&lt;OgeAiConfigProvider&gt;</code> for this smart paste.',
        },
      ],
    },
    {
      title: 'Behaviour (undefined = config)',
      entries: [
        ...BEHAVIOUR.slice(0, 3),
        {
          name: 'locale',
          type: 'string',
          default: 'undefined',
          description:
            'BCP 47 locale of value formatting and the text; falls back to the config, then the runtime default.',
        },
        ...BEHAVIOUR.slice(3),
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          default: 'undefined',
          description:
            'Added to the root <code>.oge-smart-paste</code> element.',
        },
      ],
    },
  ],
  methods: [{ title: 'Ref handle (OgeSmartPasteHandle)', entries: METHODS }],
  events: [
    {
      entries: [
        {
          name: 'onApplying',
          type: '(event: OgeSmartPasteApplyingEvent) => void',
          description:
            'Values are about to reach the form — set <code>cancel</code> to keep it as it is.',
        },
        {
          name: 'onApplied',
          type: '(event: OgeSmartPasteAppliedEvent) => void',
          description: 'Values were written into the form.',
        },
        {
          name: 'onUndone',
          type: '(event: OgeSmartPasteUndoneEvent) => void',
          description: 'Undo restored the values the latest paste replaced.',
        },
        {
          name: 'onErrorOccurred',
          type: '(event: OgeSmartPasteErrorEvent) => void',
          description:
            'A paste failed: <code>"clipboard"</code>, <code>"empty"</code>, <code>"no-transport"</code>, an <code>OgeAiError</code> code, or <code>"invalid-reply"</code>.',
        },
      ],
    },
  ],
  types: OGE_SMART_PASTE_TYPES,
};
