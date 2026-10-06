import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/inputs/src/lib/** — keep in sync with the
 * source TSDoc when the public API changes.
 *
 * Mirrors `pages/inputs/inputs-api-data.ts` block for block and group for
 * group: the members every editor shares come from `OgeControlProps` and are
 * listed once per editor as "Common" groups, exactly like the Angular base
 * class. What differs is the idiom — controlled/uncontrolled prop pairs
 * instead of `model()`, callbacks instead of outputs, an imperative handle
 * instead of public methods, render props instead of `TemplateRef` — and that
 * is precisely what a reader crossing the switch needs spelled out. The parity
 * gate diffs the two tables and flags anything missing on either side.
 */

const COMMON_CHROME: ApiGroup = {
  title: 'Common — field chrome (all field editors)',
  entries: [
    {
      name: 'label',
      type: 'string',
      default: "''",
      description: 'Field label; placement follows <code>labelMode</code>.',
    },
    {
      name: 'labelMode',
      type: 'OgeInputLabelMode',
      default: "'static'",
      description:
        'Label placement: static / floating / hidden (aria-only) / outside.',
    },
    {
      name: 'stylingMode',
      type: 'OgeInputStylingMode',
      default: "'outlined'",
      description: 'Container fill style.',
    },
    {
      name: 'size',
      type: 'OgeInputSize',
      default: "'md'",
      description: 'Container height preset — 28/34/42px, the button scale.',
    },
    {
      name: 'placeholder',
      type: 'string',
      default: "''",
      description: 'Native placeholder text.',
    },
    {
      name: 'hint',
      type: 'string',
      description:
        'Helper text in the subscript region (hidden while an error shows).',
    },
    {
      name: 'tooltip',
      type: 'string',
      description: 'Native <code>title</code> attribute of the input element.',
    },
    {
      name: 'subscriptSizing',
      type: 'OgeInputSubscriptSizing',
      default: "'fixed'",
      description:
        'Whether the hint/error line reserves height, collapses, or is removed.',
    },
    {
      name: 'fluid',
      type: 'boolean',
      default: 'false',
      description:
        'Stretches the field to 100% width (default 240px via <code>--oge-input-width</code>).',
    },
    {
      name: 'width',
      type: 'number | string',
      default: 'undefined',
      description:
        'This field’s width — a number is px, a string any CSS length. Sets <code>--oge-input-width</code> on this host only; <code>fluid</code> still wins.',
    },
    {
      name: 'showClearButton',
      type: 'boolean',
      default: 'false',
      description: 'Renders the clear (✕) button while the field has a value.',
    },
    {
      name: 'id',
      type: 'string',
      description:
        'Base for the generated element ids (input/label/hint/error/counter). Omitted, a stable id comes from <code>useId()</code>.',
    },
    {
      name: 'tabIndex',
      type: 'number',
      default: '0',
      description: 'Tab order of the native input.',
    },
    {
      name: 'autofocus',
      type: 'boolean',
      default: 'false',
      description: 'Focuses the editor after its first render.',
    },
    {
      name: 'messages',
      type: 'Partial&lt;OgeInputsMessages&gt;',
      description:
        'Per-instance overrides of user-facing strings; merged over the <code>&lt;OgeInputsConfigProvider&gt;</code> values.',
    },
    {
      name: 'prefix',
      type: 'ReactNode',
      description:
        'Leading adornment inside the field — the React face of the <code>[ogeInputPrefix]</code> slot. React slots take nodes, not directive markup.',
    },
    {
      name: 'suffix',
      type: 'ReactNode',
      description:
        'Trailing adornment, rendered after the built-in rail buttons — the React face of <code>[ogeInputSuffix]</code>.',
    },
    {
      name: 'showSuccessIcon',
      type: 'OgeInputShowSuccessIcon',
      default: 'false',
      description:
        'Success icon when valid: <code>false</code> / on touch / always.',
    },
    {
      name: 'selectOnFocus',
      type: 'boolean',
      default: 'false',
      description: 'Selects the whole text when the input receives focus.',
    },
    {
      name: 'inputAttr',
      type: 'Record&lt;string, string&gt;',
      description:
        'Escape hatch: extra attributes rendered onto the native input (component-owned attributes are ignored).',
    },
    {
      name: 'className',
      type: 'string',
      description: 'Extra class names appended to the host element.',
    },
    {
      name: 'style',
      type: 'CSSProperties',
      description: 'Inline styles on the host element.',
    },
  ],
};

const HOST_PROPS: ApiGroup = {
  title: 'Host styling',
  entries: [
    {
      name: 'className',
      type: 'string',
      description: 'Extra class names appended to the host element.',
    },
    {
      name: 'style',
      type: 'CSSProperties',
      description: 'Inline styles on the host element.',
    },
  ],
};

const COMMON_STATE: ApiGroup = {
  title: 'Common — state & validation (all editors)',
  entries: [
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      description: 'Disables the editor.',
    },
    {
      name: 'readonly',
      type: 'boolean',
      default: 'false',
      description:
        'Focusable but not editable. (Contract name — not <code>readOnly</code>.)',
    },
    {
      name: 'required',
      type: 'boolean',
      default: 'false',
      description: 'Marks the field required (label asterisk + validation).',
    },
    {
      name: 'name',
      type: 'string',
      default: "''",
      description: 'Native <code>name</code> attribute.',
    },
    {
      name: 'invalid',
      type: 'boolean',
      default: 'false',
      description:
        'External invalid override — combined with the <code>errors</code> props.',
    },
    {
      name: 'pending',
      type: 'boolean',
      default: 'false',
      description:
        'Async-validation indicator; a spinner shows in the rail while <code>true</code>.',
    },
    {
      name: 'touched',
      type: 'boolean',
      default: 'false',
      description:
        'External touched override — hand it your form library’s touched flag.',
    },
    {
      name: 'dirty',
      type: 'boolean',
      default: 'false',
      description: 'External dirty override.',
    },
    {
      name: 'errors',
      type: 'readonly OgeFieldError[]',
      default: '[]',
      description:
        'Validation errors in the shared <code>OgeFieldError</code> shape — the bridge from React Hook Form, Formik or your own resolver.',
    },
    {
      name: 'errorText',
      type: 'string',
      description:
        'Explicit error message — always wins over resolved messages.',
    },
    {
      name: 'errorDisplay',
      type: 'OgeInputErrorDisplay',
      default: "'touched'",
      description: 'When resolved errors become visible.',
    },
    {
      name: 'debounce',
      type: 'number',
      description:
        'Commit delay in ms for <code>onValueChange</code>; blur and Enter flush immediately.',
    },
  ],
};

const COMMON_METHODS: ApiGroup = {
  title: 'Common — imperative handle (via ref)',
  entries: [
    {
      name: 'focus()',
      type: '() =&gt; void',
      description: 'Moves keyboard focus to the native input.',
    },
    {
      name: 'blur()',
      type: '() =&gt; void',
      description: 'Blurs the native input.',
    },
    {
      name: 'clear()',
      type: '() =&gt; void',
      description:
        'Clears the value (commits immediately), keeps focus in the field; no-op when disabled/readonly.',
    },
  ],
};

const FOCUS_METHODS: ApiGroup = {
  title: 'Common — imperative handle (via ref)',
  entries: [
    {
      name: 'focus()',
      type: '() =&gt; void',
      description: 'Moves keyboard focus to the control.',
    },
    {
      name: 'blur()',
      type: '() =&gt; void',
      description: 'Blurs the control.',
    },
  ],
};

const COMMON_EVENT_ENTRIES = [
  {
    name: 'onValueChange',
    type: '(value: T) =&gt; void',
    description:
      'Every committed change — the controlled half of <code>value</code>. Pass <code>defaultValue</code> instead to let the editor own its state.',
  },
  {
    name: 'onValueCommitted',
    type: '(event: { value: T; previousValue: T; event: Event | undefined }) =&gt; void',
    description:
      'The same commits with <code>previousValue</code> and the originating DOM event (<code>undefined</code> for programmatic writes) — the rich payload for cross-field rules.',
  },
  {
    name: 'onCleared',
    type: '() =&gt; void',
    description:
      'Value cleared via the clear button or the handle’s <code>clear()</code>.',
  },
  {
    name: 'onEnterKey',
    type: '(event: KeyboardEvent) =&gt; void',
    description:
      'Enter pressed inside the editor (pending debounce is flushed first).',
  },
  {
    name: 'onFocus',
    type: '(event: FocusEvent) =&gt; void',
    description: 'The editor received focus.',
  },
  {
    name: 'onBlur',
    type: '(event: FocusEvent) =&gt; void',
    description: 'The editor lost focus.',
  },
];

const COMMON_EVENTS: ApiGroup = {
  title: 'Common (all editors)',
  entries: COMMON_EVENT_ENTRIES,
};

const FIELD_EVENTS: ApiGroup = {
  title: 'Common (all field editors)',
  entries: [
    ...COMMON_EVENT_ENTRIES,
    {
      name: 'onInputChange',
      type: '(event: { text: string; event: Event }) =&gt; void',
      description: 'Raw text on every keystroke, regardless of commit policy.',
    },
  ],
};

const TEXT_BOX_MASK: ApiGroup = {
  title: 'Mask',
  entries: [
    {
      name: 'mask',
      type: 'string',
      description:
        'Input mask — <code>0</code> digit, <code>9</code> optional digit, <code>#</code> digit/space/sign, <code>L</code>/<code>l</code> letter (required/optional, any script), <code>A</code>/<code>a</code> letter or digit, <code>C</code>/<code>c</code> any character, a backslash escapes a literal; every other character is a literal. Typing overwrites slot by slot and skips literals, Backspace/Delete empty a slot without shifting the rest, paste accepts raw or formatted text, IME composition is applied at <code>compositionend</code>.',
    },
    {
      name: 'maskRules',
      type: 'OgeMaskRules',
      description:
        'Extra or overriding single-character rules — a one-character <code>RegExp</code>, a string of allowed characters or a predicate; custom slots are always required. Keep the object stable (module scope / <code>useMemo</code>).',
    },
    {
      name: 'maskChar',
      type: 'string',
      default: "'_'",
      description: 'Placeholder character of empty mask slots.',
    },
    {
      name: 'showMaskMode',
      type: 'OgeMaskShowMode',
      default: "'always'",
      description:
        "<code>'always'</code> shows the empty mask while blurred too (not under a floating label); <code>'onFocus'</code> only while focused or filled, so the <code>placeholder</code> shows.",
    },
    {
      name: 'includeLiterals',
      type: 'boolean',
      default: 'false',
      description:
        'Commit the formatted text with literals instead of the raw characters.',
    },
    {
      name: 'maskInvalidMessage',
      type: 'string',
      description:
        'Error shown while required slots are empty (after blur, per <code>errorDisplay</code>); falls back to <code>messages.maskInvalidError</code>.',
    },
    {
      name: 'maskValidation',
      type: 'boolean',
      default: 'true',
      description:
        'The built-in “required slots are filled” check (Kendo <code>maskValidation</code>): the field error. <code>false</code> leaves completeness to your own validators.',
    },
  ],
};

const MASK_METHODS: ApiGroup = {
  title: 'Mask — imperative handle (via ref)',
  entries: [
    {
      name: 'isMaskComplete()',
      type: '() =&gt; boolean',
      description:
        '<code>true</code> unless a mask is set and a required slot of the entered value is empty (an empty field counts as complete).',
    },
  ],
};

const MASK_EVENTS: ApiGroup = {
  title: 'Mask',
  entries: [
    {
      name: 'onMaskCompleted',
      type: '(event: OgeMaskCompletedEvent) =&gt; void',
      description:
        'The last required mask slot was filled — <code>{ value, rawValue, maskedValue }</code>.',
    },
  ],
};

export const OGE_REACT_TEXT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeTextBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string',
          default: "''",
          description:
            'The editor value. Controlled with <code>value</code> + <code>onValueChange</code>, or uncontrolled starting from <code>defaultValue</code> — the React half of Angular’s <code>[(value)]</code>.',
        },
        {
          name: 'mode',
          type: 'OgeTextBoxMode',
          default: "'text'",
          description:
            'Native input type. <code>password</code> auto-enables the reveal toggle.',
        },
        {
          name: 'maxLength',
          type: 'number',
          description:
            "Counter denominator; enforced natively while <code>counterMode</code> is <code>'limit'</code>.",
        },
        {
          name: 'minLength',
          type: 'number',
          description: 'Native <code>minlength</code> attribute.',
        },
        {
          name: 'showCounter',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the grapheme-accurate character counter in the subscript end slot.',
        },
        {
          name: 'counterMode',
          type: 'OgeInputCounterMode',
          default: "'limit'",
          description:
            'Enforce <code>maxLength</code> natively, or allow typing past it and color the counter.',
        },
        {
          name: 'revealable',
          type: 'boolean',
          default: 'true',
          description:
            'Password reveal toggle; on by default for <code>mode="password"</code>. Preserves caret/selection when toggling.',
        },
        {
          name: 'showCopyButton',
          type: 'boolean',
          default: 'false',
          description:
            'Copy-to-clipboard rail button (API keys, tokens…); copies the live text.',
        },
        {
          name: 'autocomplete',
          type: 'string',
          description: 'Native <code>autocomplete</code> attribute.',
        },
        {
          name: 'inputMode',
          type: 'string',
          description: 'Native <code>inputmode</code> attribute.',
        },
        {
          name: 'enterKeyHint',
          type: 'string',
          description: 'Native <code>enterkeyhint</code> attribute.',
        },
        {
          name: 'autocapitalize',
          type: 'string',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
        {
          name: 'spellcheck',
          type: 'boolean',
          description:
            '<code>undefined</code> omits the attribute (browser default).',
        },
      ],
    },
    TEXT_BOX_MASK,
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [MASK_METHODS, COMMON_METHODS],
  events: [MASK_EVENTS, FIELD_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeTextBoxProps',
          type: 'interface',
          description:
            'Extends <code>OgeControlProps&lt;string&gt;</code> with everything above.',
        },
        {
          name: 'OgeTextBoxHandle',
          type: '{ focus(); blur(); clear(); isMaskComplete() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_MASKED_TEXT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeMaskedTextBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string',
          default: "''",
          description:
            'The editor value — the raw characters, or the formatted text with <code>includeLiterals</code>. Controlled with <code>value</code> + <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'mask',
          type: 'string (required)',
          description:
            'Input mask — <code>0</code> digit, <code>9</code> optional digit, <code>#</code> digit/space/sign, <code>L</code>/<code>l</code> letter (required/optional, any script), <code>A</code>/<code>a</code> letter or digit, <code>C</code>/<code>c</code> any character, a backslash escapes a literal; every other character is a literal. Typing overwrites slot by slot and skips literals, Backspace/Delete empty a slot without shifting the rest, paste accepts raw or formatted text, IME composition is applied at <code>compositionend</code>.',
        },
        {
          name: 'maskRules',
          type: 'OgeMaskRules',
          description:
            'Extra or overriding single-character rules — a one-character <code>RegExp</code>, a string of allowed characters or a predicate; custom slots are always required. Keep the object stable (module scope / <code>useMemo</code>).',
        },
        {
          name: 'maskChar',
          type: 'string',
          default: "'_'",
          description: 'Placeholder character of empty mask slots.',
        },
        {
          name: 'showMaskMode',
          type: 'OgeMaskShowMode',
          default: "'always'",
          description:
            "<code>'always'</code> shows the empty mask while blurred too (not under a floating label); <code>'onFocus'</code> only while focused or filled, so the <code>placeholder</code> shows.",
        },
        {
          name: 'includeLiterals',
          type: 'boolean',
          default: 'false',
          description:
            'Commit the formatted text with literals instead of the raw characters.',
        },
        {
          name: 'maskInvalidMessage',
          type: 'string',
          description:
            'Error shown while required slots are empty (after blur, per <code>errorDisplay</code>); falls back to <code>messages.maskInvalidError</code>.',
        },
        {
          name: 'maskValidation',
          type: 'boolean',
          default: 'true',
          description:
            'The built-in “required slots are filled” check (Kendo <code>maskValidation</code>): the field error. <code>false</code> leaves completeness to your own validators.',
        },
        {
          name: 'spellcheck',
          type: 'boolean',
          default: 'false',
          description: 'Off by default — masked values are codes, not words.',
        },
        {
          name: 'autocomplete',
          type: 'string',
          default: "'off'",
          description:
            "Off by default; set e.g. <code>'tel-national'</code> to let the browser offer phone numbers.",
        },
        {
          name: 'inputMode',
          type: 'string',
          description:
            "Native <code>inputmode</code>; unset, a digit-only mask implies <code>'numeric'</code>.",
        },
        {
          name: 'mode',
          type: 'OgeTextBoxMode',
          default: "'text'",
          description: 'Native input type (as on the text box).',
        },
        {
          name: 'showCopyButton',
          type: 'boolean',
          default: 'false',
          description: 'Copy-to-clipboard rail button; copies the value.',
        },
        {
          name: 'enterKeyHint',
          type: 'string',
          description: 'Native <code>enterkeyhint</code> attribute.',
        },
        {
          name: 'autocapitalize',
          type: 'string',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMaskedTextBox — imperative handle (via ref)',
      entries: [
        {
          name: 'rawValue()',
          type: '() =&gt; string',
          description:
            'The committed value’s characters without literals, whatever <code>includeLiterals</code> says.',
        },
        {
          name: 'maskedValue()',
          type: '() =&gt; string',
          description:
            "The committed value as formatted text with literals (<code>''</code> while empty).",
        },
        ...MASK_METHODS.entries,
      ],
    },
    COMMON_METHODS,
  ],
  events: [MASK_EVENTS, FIELD_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeMaskedTextBoxProps',
          type: 'interface',
          description: 'The text box props with <code>mask</code> required.',
        },
        {
          name: 'OgeMaskedTextBoxHandle',
          type: '{ focus(); blur(); clear(); isMaskComplete(); rawValue(); maskedValue() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TEXT_AREA_API: ApiSections = {
  properties: [
    {
      title: 'OgeTextArea',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string',
          default: "''",
          description:
            'The editor value — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'rows',
          type: 'number',
          default: '3',
          description:
            'Visible rows when <code>autoResize</code> is off; the floor when it is on.',
        },
        {
          name: 'autoResize',
          type: 'boolean',
          default: 'false',
          description:
            'Grow/shrink with content between <code>minRows</code> and <code>maxRows</code>.',
        },
        {
          name: 'minRows',
          type: 'number',
          description: 'Defaults to <code>rows</code>.',
        },
        {
          name: 'maxRows',
          type: 'number',
          description: '<code>undefined</code> = unbounded growth.',
        },
        {
          name: 'maxLength',
          type: 'number',
          description: 'Counter denominator / native cap.',
        },
        {
          name: 'minLength',
          type: 'number',
          description: 'Native <code>minlength</code> attribute.',
        },
        {
          name: 'showCounter',
          type: 'boolean',
          default: 'false',
          description: 'Grapheme-accurate character counter.',
        },
        {
          name: 'counterMode',
          type: 'OgeInputCounterMode',
          default: "'limit'",
          description: 'Enforce <code>maxLength</code> natively, or soft-cap.',
        },
        {
          name: 'spellcheck',
          type: 'boolean',
          default: 'true',
          description: 'Non-optional here, unlike the text box.',
        },
        {
          name: 'autocapitalize',
          type: 'string',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [FIELD_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeTextAreaHandle',
          type: '{ focus(); blur(); clear() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'measureTextAreaHeight(el, minRows, maxRows?)',
          type: 'number',
          description:
            'Fallback auto-resize measurement for browsers without CSS <code>field-sizing: content</code> — the same helper the Angular package exports.',
        },
      ],
    },
  ],
};

export const OGE_REACT_NUMBER_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeNumberBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'number | null',
          default: 'null',
          description:
            '<code>null</code> is the empty state — never <code>0</code>. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'min',
          type: 'number',
          description:
            'Lower bound — values clamp on commit (typing is never blocked).',
        },
        {
          name: 'max',
          type: 'number',
          description: 'Upper bound — clamped on commit.',
        },
        {
          name: 'step',
          type: 'number',
          default: '1',
          description:
            'Spin/arrow-key increment. Spinning commits immediately.',
        },
        {
          name: 'showSpinButtons',
          type: 'boolean',
          default: 'false',
          description: 'Up/down spin buttons with hold-to-repeat.',
        },
        {
          name: 'format',
          type: 'Intl.NumberFormatOptions',
          description:
            "Blur-time display format: applied while unfocused (and after the blur clamp); focus swaps in the editable number, so typing never fights a currency sign or a rounding. <code>style: 'percent'</code> formats display only — the value is not rescaled.",
        },
        {
          name: 'formatWhileTyping',
          type: 'boolean',
          default: 'false',
          description:
            'Groups thousands live while focused (the locale’s separators — Indian 2-digit groups included), keeping the caret beside the digit just typed. The committed value is the same number either way.',
        },
        {
          name: 'maxFractionDigits',
          type: 'number',
          description:
            'Caps the fraction digits while typing — extra digits are not accepted (<code>0</code> refuses the decimal separator). Unset = unlimited.',
        },
        {
          name: 'wheelStep',
          type: 'number',
          description:
            'Opt-in mouse-wheel stepping by this amount, only while the field is focused (wheel up adds; clamped to <code>min</code>/<code>max</code>). A native non-passive listener — React’s <code>onWheel</code> is passive and could not stop the page scroll. Unset or <code>0</code> leaves the wheel to the page.',
        },
        {
          name: 'locale',
          type: 'string',
          description:
            'Overrides the runtime locale (React has no <code>LOCALE_ID</code>; the config provider carries the default).',
        },
        {
          name: 'mode',
          type: 'OgeNumberBoxMode',
          default: "'text'",
          description:
            'Native <code>type</code> attribute; <code>inputmode</code> is always <code>decimal</code>.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [FIELD_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeNumberBoxHandle',
          type: '{ focus(); blur(); clear() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SELECT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeSelectBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'unknown',
          default: 'null',
          description:
            'Committed value (the <code>valueExpr</code> of the selected item) — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectItemsFn&lt;TItem&gt;',
          default: '[]',
          description:
            'The selectable items: an array, or a function invoked lazily on first open (sync or promise; loading/error rows render while pending). The selected item is resolved from this full set, never the filtered one.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((item) =&gt; string)',
          description:
            'Item &rarr; display text. Omitted, the item itself is stringified.',
        },
        {
          name: 'valueExpr',
          type: 'string | ((item) =&gt; unknown)',
          description:
            'Item &rarr; committed value. Omitted, the whole item is the value.',
        },
        {
          name: 'disabledExpr',
          type: 'string | ((item) =&gt; boolean)',
          description: 'Marks individual items as non-selectable.',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description: 'Enables typing into the field to filter the list.',
        },
        {
          name: 'searchMode',
          type: "'contains' | 'startswith'",
          default: "'contains'",
          description: 'How typed search text matches an item.',
        },
        {
          name: 'searchExpr',
          type: 'string | string[] | ((item) =&gt; string)',
          description:
            'Which text the filter matches; defaults to the display text.',
        },
        {
          name: 'minSearchLength',
          type: 'number',
          default: '0',
          description:
            'Characters required before the filter narrows the list.',
        },
        {
          name: 'showDataBeforeSearch',
          type: 'boolean',
          default: 'false',
          description:
            'Below <code>minSearchLength</code>: show the full list (<code>true</code>) or nothing (<code>false</code>).',
        },
        {
          name: 'searchTimeout',
          type: 'number',
          description:
            'Debounce before typed text filters the list; <code>undefined</code> = config default (250ms). The displayed text is never debounced.',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'false',
          description:
            'Lets typed text that matches no item become the value (committed on Enter/blur) — see <code>onCustomItemCreating</code>.',
        },
        {
          name: 'groupBy',
          type: 'string | ((item) =&gt; string)',
          description:
            'Groups flat items under headers; items are re-ordered by first-seen group.',
        },
        {
          name: 'imageExpr',
          type: 'string | ((item) =&gt; string)',
          description:
            'Item &rarr; image URL rendered before the option text (avatars, flags…). For inline SVG icons use <code>renderItem</code>.',
        },
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'true',
          description: 'Renders the chevron toggle in the field rail.',
        },
        {
          name: 'openOnFieldClick',
          type: 'boolean',
          default: 'true',
          description:
            'Clicking the field opens the popup (select-only mode toggles it).',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'Shows a loading row instead of items — server-side filtering escape hatch.',
        },
        {
          name: 'dropdownPlacement',
          type: 'OgePopupPlacement',
          default: "'bottom-start'",
          description: 'Preferred popup side/alignment (flips when cramped).',
        },
        {
          name: 'dropdownWidth',
          type: "number | 'anchor'",
          default: "'anchor'",
          description:
            "Popup width: fixed pixels or <code>'anchor'</code> to match the field box.",
        },
        {
          name: 'dropdownMaxHeight',
          type: 'number',
          description:
            'Scrollable list height cap; <code>undefined</code> = the CSS default (320px).',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (with a search field at the top when <code>searchEnabled</code>) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'wrapItemText',
          type: 'boolean',
          default: 'false',
          description: 'Wraps long option text instead of ellipsizing it.',
        },
        {
          name: 'useItemTextAsTitle',
          type: 'boolean',
          default: 'false',
          description:
            "Mirrors each option's display text into its <code>title</code> attribute.",
        },
        {
          name: 'renderItem',
          type: '(item: TItem, context: { index; selected; active }) =&gt; ReactNode',
          description:
            'Custom option row rendering — the render prop replacing Angular’s <code>itemTemplate</code>; the context carries the same fields the template context does.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering for large lists (<code>{ itemHeight, overscan }</code>). Rows get a fixed size-matched height; <code>groupBy</code> and <code>wrapItemText</code> are ignored while active.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt;',
          description:
            'Remote, paged data: any <code>&#64;oge-ui/core</code> <code>DataSource</code> (<code>CustomDataSource</code>, <code>ArrayDataSource</code>, <code>CursorDataSource</code>, <code>ODataDataSource</code>) or an object with the same <code>load()</code>, plus an optional <code>byKey()</code>. Replaces <code>items</code> while set: pages of <code>pageSize</code> rows load as the list scrolls (and as the keyboard reaches the end), the typed text goes to the server as <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), superseded requests are aborted through the <code>AbortSignal</code>, pages are cached per search, and a value no loaded page holds resolves through <code>byKey</code> — the same <code>OgeRemoteListCore</code> the Angular editors run.',
        },
        {
          name: 'pageSize',
          type: 'number',
          default: 'provider: 30',
          description:
            "Rows requested per <code>dataSource</code> page (<code>take</code>); unset = the provider's <code>dataPageSize</code>.",
        },
        {
          name: 'renderGroup',
          type: '(label: string) =&gt; ReactNode',
          description:
            'Custom group header rendering for <code>groupBy</code> lists — the render prop replacing Angular’s <code>groupTemplate</code>.',
        },
        {
          name: 'renderField',
          type: '(item: TItem | null, context: { text }) =&gt; ReactNode',
          description:
            'Custom rendering of the closed field’s value; the real input stays underneath for focus, typing and assistive technology, and the content hides while the user types (Angular’s <code>fieldTemplate</code>).',
        },
        {
          name: 'renderHeader / renderFooter',
          type: '(context: OgeSelectPopupRenderContext&lt;TItem&gt;) =&gt; ReactNode',
          description:
            'Content above / below the popup list; context <code>{ items, searchText, loading }</code> (Angular’s <code>headerTemplate</code> / <code>footerTemplate</code>).',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Popup visibility — controlled with <code>opened</code> + <code>onOpenedChange</code>, or uncontrolled from <code>defaultOpened</code>.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSelectBox handle (via ref)',
      entries: [
        {
          name: 'open()',
          type: '() =&gt; void',
          description:
            'Opens the popup (no-op while disabled/readonly, or when <code>onOpening</code> cancels).',
        },
        {
          name: 'close()',
          type: '() =&gt; boolean',
          description:
            'Closes the popup unless <code>onClosing</code> cancels; returns whether it closed.',
        },
        {
          name: 'toggle()',
          type: '() =&gt; void',
          description: 'Toggles the popup.',
        },
        {
          name: 'reload()',
          type: '() =&gt; void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeSelectBox callbacks',
      entries: [
        {
          name: 'onSelectionChange',
          type: '(event: OgeSelectBoxSelectionChangedEvent&lt;TItem&gt;) =&gt; void',
          description:
            'The resolved selected item changed (user or programmatic) — <code>{ item, previousItem }</code>.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeSelectBoxItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'An option row was activated — <code>{ item, index, event }</code>; <code>index</code> is within the visible (filtered) list.',
        },
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description:
            'The controlled half of <code>opened</code> — fires for every open and close.',
        },
        {
          name: 'onSearchChange',
          type: '(event: { text: string }) =&gt; void',
          description:
            'Raw search text on every keystroke — drive server-side filtering from here.',
        },
        {
          name: 'onCustomItemCreating',
          type: '(payload: OgeSelectBoxCustomItemEvent&lt;TItem&gt;) =&gt; void',
          description:
            'Mutable payload (as in the references): assign <code>customItem</code> — an item, a promise of one, or <code>null</code> to reject the text. Left unset, the raw text becomes the item.',
        },
        {
          name: 'onOpening',
          type: '(event: OgeDropDownOpeningEvent) =&gt; void',
          description:
            'Cancelable pre-open callback — set <code>event.cancel = true</code> to keep the popup closed.',
        },
        {
          name: 'onClosing',
          type: '(event: OgeDropDownClosingEvent) =&gt; void',
          description:
            "Cancelable pre-close callback with its <code>reason</code> (<code>'select'</code>, <code>'escape'</code>, <code>'outside'</code>, <code>'tab'</code>, <code>'blur'</code>, <code>'api'</code>) — set <code>cancel</code> to keep the popup open.",
        },
        {
          name: 'onPageLoaded',
          type: '(event: OgeListPageLoadedEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A <code>dataSource</code> page landed — <code>{ searchText, skip, items, totalCount }</code>.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      title: 'Select box types',
      entries: [
        {
          name: 'OgeSelectBoxHandle',
          type: '{ focus(); blur(); clear(); open(); close(): boolean; toggle(); reload() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeSelectPopupRenderContext&lt;TItem&gt;',
          type: '{ items; searchText; loading }',
          description:
            'Context of <code>renderHeader</code> / <code>renderFooter</code>.',
        },
        {
          name: 'OgeListDataSource&lt;TItem&gt;',
          type: '{ load(options): Promise&lt;LoadResult&gt;; byKey?(key) }',
          description:
            'Structurally a subset of the grid’s <code>DataSource</code>, so every core data source fits as is.',
        },
        {
          name: 'OgeDropDownOpeningEvent / OgeDropDownClosingEvent',
          type: '{ cancel } / { reason; cancel }',
          description:
            'Payloads of <code>onOpening</code> / <code>onClosing</code>.',
        },
        {
          name: 'OgeListPageLoadedEvent&lt;TItem&gt;',
          type: '{ searchText; skip; items; totalCount? }',
          description: 'Payload of <code>onPageLoaded</code>.',
        },
        {
          name: 'OgeSelectBoxSelectionChangedEvent&lt;TItem&gt;',
          type: '{ item: TItem | null; previousItem: TItem | null }',
          description: 'Payload of <code>onSelectionChange</code>.',
        },
        {
          name: 'OgeSelectBoxItemClickEvent&lt;TItem&gt;',
          type: '{ item; index; event }',
          description: 'Payload of <code>onItemClick</code>.',
        },
        {
          name: 'OgeSelectBoxCustomItemEvent&lt;TItem&gt;',
          type: '{ text: string; customItem?: TItem | null | PromiseLike&lt;TItem | null&gt; }',
          description:
            'The mutable payload of <code>onCustomItemCreating</code>.',
        },
      ],
    },
  ],
};

/**
 * `<OgeTreeSelect>` — the React mirror of `OGE_TREE_SELECT_API`, group for
 * group. Two Angular members have no counterpart on purpose and are recorded
 * in `docs/REACT-PARITY.md`: `inputChange` (the native input is `readonly`, so
 * the inherited event can never fire in either layer) and the `panel` /
 * `dropdown` DI plumbing of `OGE_INPUT_HOST` (the React chrome takes a plain
 * per-render host object; imperative popup control is on the handle).
 */
export const OGE_REACT_TREE_SELECT_API: ApiSections = {
  properties: [
    {
      title: 'Value & data',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'RowKey | readonly RowKey[] | null',
          default: 'null',
          description:
            "Committed value — the selected node's key in <code>single</code> mode, an array of keys in <code>multiple</code>. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.",
        },
        {
          name: 'items',
          type: 'readonly TItem[] | undefined',
          description:
            'Nodes to display — a flat parent-referencing list or nested children.',
        },
        {
          name: 'keyExpr / parentIdExpr / itemsExpr',
          type: 'string | ((row: TItem) =&gt; …)',
          description:
            'Identity and structure accessors, forwarded to the popup tree. <code>itemsExpr</code> switches to hierarchical data.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((row: TItem) =&gt; unknown)',
          default: "'text'",
          description:
            'Node label, used both in the tree and for the text shown in the closed field.',
        },
        {
          name: 'disabledExpr / hasItemsExpr / iconExpr / rootValue / dataStructure',
          type: 'see OgeTreeView',
          description: 'Forwarded verbatim to the popup tree.',
        },
      ],
    },
    {
      title: 'Selection',
      entries: [
        {
          name: 'selectionMode',
          type: "'single' | 'multiple'",
          default: "'single'",
          description:
            '<code>multiple</code> makes <code>value</code> an array and keeps the popup open while picking.',
        },
        {
          name: 'showCheckBoxes',
          type: "'none' | 'normal' | 'selectAll'",
          default: "'none'",
          description: 'Checkbox column inside the popup.',
        },
        {
          name: 'selectNodesRecursive',
          type: 'boolean',
          default: 'true',
          description:
            'Cascades selection down to descendants and up to fully-selected parents.',
        },
        {
          name: 'selectedKeysMode',
          type: "'all' | 'leavesOnly' | 'excludeRecursive'",
          default: "'all'",
          description:
            'Projection applied to the committed keys — <code>leavesOnly</code> is usually what you want to store from a cascade.',
        },
        {
          name: 'displayMode',
          type: "'text' | 'count'",
          default: "'text'",
          description:
            'Closed-field rendering for a multiple selection: the joined labels, or just how many are picked.',
        },
        {
          name: 'showSelectionAs',
          type: "'text' | 'chips'",
          default: "'text'",
          description:
            "<code>'chips'</code> renders the selected nodes as removable chips in the field (Backspace removes the last one); <code>'text'</code> keeps the comma list / <code>displayMode</code>.",
        },
        {
          name: 'maxDisplayedTags',
          type: 'number',
          description:
            'In chips mode, folds chips past the cap into <code>+N more</code>.',
        },
      ],
    },
    {
      title: 'Popup',
      entries: [
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Popup visibility — controlled with <code>opened</code> + <code>onOpenedChange</code>, or uncontrolled from <code>defaultOpened</code>.',
        },
        {
          name: 'expandedKeys / defaultExpandedKeys',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'Expanded nodes — controlled with <code>onExpandedKeysChange</code>, or uncontrolled from <code>defaultExpandedKeys</code>, so the shape survives close and reopen.',
        },
        {
          name: 'expandEvent',
          type: "'click' | 'dblclick'",
          default: "'dblclick'",
          description:
            'Which gesture expands inside the popup. Unlike the bare tree this defaults to <code>dblclick</code> — in a picker a single click should choose, and the chevron expands either way.',
        },
        {
          name: 'searchEnabled / searchMode / filterMode',
          type: 'see OgeTreeView',
          description: "Puts the tree's own search box inside the popup.",
        },
        {
          name: 'loadChildren',
          type: '(parent: TItem, key: RowKey) =&gt; Promise&lt;readonly TItem[]&gt;',
          description: 'Lazy children, fetched on first expand.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean | { itemHeight: number }',
          default: 'false',
          description:
            'Windowed rendering inside the popup for very large trees.',
        },
        {
          name: 'dropdownPlacement / dropdownWidth / dropdownMaxHeight',
          type: "OgePopupPlacement | number | 'anchor'",
          description:
            "Popup geometry. Width defaults to <code>'anchor'</code> (matches the field), max height to 320px.",
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (a Done action in <code>'multiple'</code> mode) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'openOnFieldClick',
          type: 'boolean',
          default: 'true',
          description:
            'Opens on a click anywhere in the field, not only on the chevron.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeTreeSelectHandle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description:
            'Imperative popup control (no-op while disabled/readonly).',
        },
        {
          name: 'focus() / blur() / clear()',
          type: '() =&gt; void',
          description:
            'Field-chrome control methods. <code>clear()</code> commits the empty value and keeps focus in the field.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'OgeTreeSelect callbacks',
      entries: [
        {
          name: 'onSelectionChanged',
          type: '(event: OgeTreeSelectSelectionChangedEvent) =&gt; void',
          description:
            'Fires after the committed selection changed, with <code>keys</code> and <code>previousKeys</code> (always arrays, even in single mode).',
        },
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Popup lifecycle, from any trigger.',
        },
        {
          name: 'onValueChange',
          type: '(value: unknown) =&gt; void',
          description:
            'Every committed change — the controlled half of <code>value</code>. Pass <code>defaultValue</code> instead to let the editor own its state.',
        },
        {
          name: 'onValueCommitted',
          type: '(event: { value; previousValue; event }) =&gt; void',
          description:
            'The same commits with <code>previousValue</code> and the originating DOM event (<code>undefined</code> for programmatic writes).',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description:
            'The controlled half of <code>opened</code> — fires for every open and close.',
        },
        {
          name: 'onExpandedKeysChange',
          type: '(keys: readonly RowKey[]) =&gt; void',
          description: 'The controlled half of <code>expandedKeys</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Tree select types',
      entries: [
        {
          name: 'OgeTreeSelectHandle',
          type: '{ focus(); blur(); clear(); open(); close(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeTreeSelectSelectionMode',
          type: "'single' | 'multiple'",
          description: 'How many nodes may be committed.',
        },
        {
          name: 'OgeTreeSelectDisplayMode',
          type: "'text' | 'count'",
          description: 'Closed-field rendering of a multiple selection.',
        },
        {
          name: 'OgeTreeSelectShowSelectionAs',
          type: "'text' | 'chips'",
          description: 'Text or removable chips in the closed field.',
        },
        {
          name: 'OgeTreeSelectSelectionChangedEvent',
          type: '{ keys: readonly RowKey[]; previousKeys: readonly RowKey[] }',
          description: 'Payload of <code>onSelectionChanged</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TAG_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeTagBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'readonly unknown[]',
          default: '[]',
          description:
            'Committed values — the <code>valueExpr</code> of every selected item; controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items / displayExpr / valueExpr / disabledExpr / imageExpr',
          type: 'shared with OgeSelectBox',
          description:
            'The tag box reuses the select box expression vocabulary verbatim — <code>items</code> may be a lazy function.',
        },
        {
          name: 'searchEnabled / searchMode / searchExpr',
          type: 'shared with OgeSelectBox',
          description: 'Client-side filtering of the option list.',
        },
        {
          name: 'searchTimeout',
          type: 'number',
          description:
            'Debounce before typed text filters. Unset filters local items immediately and debounces <code>dataSource</code> requests by the provider default (250ms).',
        },
        {
          name: 'minSearchLength / showDataBeforeSearch',
          type: 'number / boolean',
          default: '0 / false',
          description:
            'Characters required before the filter narrows the list, and what shows below that.',
        },
        {
          name: 'groupBy',
          type: 'string | ((item) =&gt; string)',
          description:
            'Groups flat items under headers (ignored while <code>virtualScroll</code> is on).',
        },
        {
          name: 'renderItem',
          type: '(item, context: { index; selected; active }) =&gt; ReactNode',
          description:
            'Custom option content; the checkbox stays in front of it.',
        },
        {
          name: 'renderGroup',
          type: '(label: string) =&gt; ReactNode',
          description: 'Custom group header rendering.',
        },
        {
          name: 'renderTag',
          type: '(item, context: { index; text }) =&gt; ReactNode',
          description:
            'Custom chip content; the remove button stays (Angular’s <code>tagTemplate</code>).',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'false',
          description:
            'Enter on typed text that matches no item creates a new tag — see <code>onCustomItemCreating</code>.',
        },
        {
          name: 'showSelectAll',
          type: 'boolean',
          default: 'false',
          description:
            'A tri-state "select all" row above the options (<code>aria-checked</code> true / false / mixed; ArrowUp from the first option reaches it) acting on the visible, enabled items and honouring <code>maxSelectedItems</code>.',
        },
        {
          name: 'maxSelectedItems',
          type: 'number',
          description:
            'Caps the selection; at the cap unselected options turn inert and the popup shows <code>messages.maxSelectedItemsMessage</code>.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description: 'Shows a loading row instead of items.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt;',
          description:
            'Remote, paged data: any <code>&#64;oge-ui/core</code> <code>DataSource</code> (<code>CustomDataSource</code>, <code>ArrayDataSource</code>, <code>CursorDataSource</code>, <code>ODataDataSource</code>) or an object with the same <code>load()</code>, plus an optional <code>byKey()</code>. Replaces <code>items</code> while set: pages of <code>pageSize</code> rows load as the list scrolls (and as the keyboard reaches the end), the typed text goes to the server as <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), superseded requests are aborted through the <code>AbortSignal</code>, pages are cached per search, and a value no loaded page holds resolves through <code>byKey</code> — the same <code>OgeRemoteListCore</code> the Angular editors run.',
        },
        {
          name: 'pageSize',
          type: 'number',
          default: 'provider: 30',
          description:
            "Rows requested per <code>dataSource</code> page (<code>take</code>); unset = the provider's <code>dataPageSize</code>.",
        },

        {
          name: 'showSelectionControls',
          type: 'boolean',
          default: 'true',
          description: 'Renders checkboxes in front of the options.',
        },
        {
          name: 'hideSelectedItems',
          type: 'boolean',
          default: 'false',
          description: 'Hides already-selected items from the popup list.',
        },
        {
          name: 'maxDisplayedTags',
          type: 'number',
          description:
            'Caps the rendered chips; the rest collapse into a <code>+N more</code> chip (<code>messages.moreTags</code>).',
        },
        {
          name: 'opened / defaultOpened / dropdownPlacement / dropdownWidth / dropdownMaxHeight / showDropDownButton / openOnFieldClick',
          type: 'shared with OgeSelectBox',
          description:
            'Popup configuration and the controlled/uncontrolled visibility pair.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (search field when <code>searchEnabled</code>, picks keep it open, a Done action closes it) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering for large lists — same contract as the select box.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeTagBox handle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description:
            'Popup control (no-ops while disabled/readonly); <code>close()</code> returns <code>false</code> when <code>onClosing</code> cancels.',
        },
        {
          name: 'selectAll() / unselectAll()',
          type: '() =&gt; void',
          description:
            'Selects (up to <code>maxSelectedItems</code>) / clears the visible, enabled items.',
        },
        {
          name: 'reload()',
          type: '() =&gt; void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeTagBox callbacks',
      entries: [
        {
          name: 'onSelectionChange',
          type: '(event: OgeTagBoxSelectionChangedEvent&lt;TItem&gt;) =&gt; void',
          description:
            'Per-commit delta — <code>{ addedItems, removedItems }</code>.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeTagBoxItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'An option row was toggled — <code>{ item, index, event }</code>.',
        },
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'The controlled half of <code>opened</code>.',
        },
        {
          name: 'onSelectAllValueChanged',
          type: '(event: OgeTagBoxSelectAllEvent) =&gt; void',
          description:
            'The "select all" row was toggled — <code>{ selected, event }</code>.',
        },
        {
          name: 'onOpening / onClosing',
          type: '(event: OgeDropDownOpeningEvent | OgeDropDownClosingEvent) =&gt; void',
          description:
            'Cancelable pre-events — same contract as the select box.',
        },
        {
          name: 'onSearchChange',
          type: '(event: { text: string }) =&gt; void',
          description: 'Raw search text on every keystroke.',
        },
        {
          name: 'onCustomItemCreating',
          type: '(payload: OgeSelectBoxCustomItemEvent&lt;TItem&gt;) =&gt; void',
          description:
            '<code>acceptCustomValue</code> commit: assign <code>customItem</code> (an item, a promise, or <code>null</code> to reject).',
        },
        {
          name: 'onPageLoaded',
          type: '(event: OgeListPageLoadedEvent&lt;TItem&gt;) =&gt; void',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTagBoxSelectAllEvent',
          type: '{ selected: boolean; event: Event }',
          description: 'Payload of <code>onSelectAllValueChanged</code>.',
        },
        {
          name: 'OgeTagBoxHandle',
          type: '{ focus(); blur(); clear(); open(); close(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeTagBoxSelectionChangedEvent&lt;TItem&gt;',
          type: '{ addedItems; removedItems }',
          description: 'Payload of <code>onSelectionChange</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_AUTOCOMPLETE_API: ApiSections = {
  properties: [
    {
      title: 'OgeAutocomplete',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string',
          default: "''",
          description:
            'The typed text — the committed value is the string itself, not an item value; controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectItemsFn&lt;TItem&gt;',
          default: '[]',
          description:
            'The suggestion items: an array, or a function invoked lazily on first open (sync or promise; loading/error rows render while pending).',
        },
        {
          name: 'displayExpr / disabledExpr / imageExpr / searchExpr / searchMode / groupBy / renderItem',
          type: 'shared with OgeSelectBox',
          description:
            'The autocomplete reuses the select box expression vocabulary and list rendering verbatim (no <code>valueExpr</code> — the value is text).',
        },
        {
          name: 'minSearchLength',
          type: 'number',
          default: '1',
          description:
            'Characters required before suggestions open while typing; deleting below the threshold closes the list.',
        },
        {
          name: 'maxItemCount',
          type: 'number',
          default: '10',
          description: 'Caps the rendered suggestion list.',
        },
        {
          name: 'searchTimeout',
          type: 'number',
          description:
            'Debounce before typed text filters the list; <code>undefined</code> = config default (250ms). The displayed text is never debounced.',
        },
        {
          name: 'forceSelection',
          type: 'boolean',
          default: 'false',
          description:
            'Reverts non-matching text to the last committed value on blur; an exact display match resolves to the item with its canonical casing.',
        },
        {
          name: 'searchHighlight',
          type: 'boolean',
          default: 'true',
          description:
            'Marks the matched part of each suggestion (<code>&lt;mark&gt;</code>).',
        },
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the chevron toggle in the field rail (off by default — reference parity).',
        },
        {
          name: 'openOnFieldClick',
          type: 'boolean',
          default: 'false',
          description: 'Clicking the field opens the suggestion list.',
        },
        {
          name: 'loading / dropdownPlacement / dropdownWidth / dropdownMaxHeight / wrapItemText / useItemTextAsTitle',
          type: 'shared with OgeSelectBox',
          description: 'Popup configuration and list rendering.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet with its own text field at the top on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering for large lists — same contract as the select box.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt;',
          description:
            'Remote, paged suggestions — the typed text is the <code>searchText</code>; <code>maxItemCount</code> does not apply, <code>pageSize</code> does.',
        },
        {
          name: 'pageSize',
          type: 'number',
          default: 'provider: 30',
          description: 'Rows requested per <code>dataSource</code> page.',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Popup visibility — controlled with <code>onOpenedChange</code>, or uncontrolled from <code>defaultOpened</code>.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeAutocomplete handle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description: 'Popup control (no-ops while disabled/readonly).',
        },
        {
          name: 'reload()',
          type: '() =&gt; void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeAutocomplete callbacks',
      entries: [
        {
          name: 'onSelectionChange',
          type: '(event: OgeAutocompleteSelectionChangedEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A suggestion was picked or the selection was canceled — <code>{ item: TItem | null, event? }</code>.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeAutocompleteItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A suggestion row was activated — <code>{ item, index, event }</code>.',
        },
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'The controlled half of <code>opened</code>.',
        },
        {
          name: 'onSearchChange',
          type: '(event: { text: string }) =&gt; void',
          description:
            'Raw search text on every keystroke — drive server-side filtering from here.',
        },
        {
          name: 'onPageLoaded',
          type: '(event: OgeListPageLoadedEvent&lt;TItem&gt;) =&gt; void',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      title: 'Autocomplete types',
      entries: [
        {
          name: 'OgeAutocompleteHandle',
          type: '{ focus(); blur(); clear(); open(); close(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeAutocompleteSelectionChangedEvent&lt;TItem&gt;',
          type: '{ item: TItem | null; event?: Event }',
          description:
            '<code>null</code> means the selection was canceled — the same shape as the Angular output.',
        },
        {
          name: 'OgeVirtualScrollOptions',
          type: 'interface',
          description:
            '<code>{ itemHeight?: number; overscan?: number }</code>; default heights come from the shared <code>@oge-ui/behavior</code> option-height table (28/34/40px for sm/md/lg).',
        },
      ],
    },
  ],
};

export const OGE_REACT_CHECK_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeCheckBox',
      entries: [
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Text rendered beside the control.',
        },
        {
          name: 'value / defaultValue',
          type: 'boolean | null',
          default: 'false',
          description:
            '<code>true</code>/<code>false</code>, or <code>null</code> for the indeterminate (dash) state. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>; <code>null</code> renders regardless of <code>threeState</code>.',
        },
        {
          name: 'threeState',
          type: 'boolean',
          default: 'false',
          description:
            'Lets users cycle into the indeterminate state: <code>null → true → false → null</code> (the reference cycle).',
        },
        {
          name: 'text',
          type: 'string',
          default: "''",
          description:
            'Label text; <code>children</code> renders when unset — the React face of the default <code>&lt;ng-content&gt;</code> slot.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Rich label content when <code>text</code> is not enough (JSX projection).',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Glyph/font size preset.',
        },
        {
          name: 'tooltip',
          type: 'string',
          description: 'Native <code>title</code> on the label element.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeCheckBox handle (via ref)',
      entries: [
        {
          name: 'toggle()',
          type: '() =&gt; void',
          description:
            'Advances the state exactly like a user click (respects <code>threeState</code>, no-op while disabled/readonly).',
        },
      ],
    },
    FOCUS_METHODS,
  ],
  events: [COMMON_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeCheckBoxHandle',
          type: '{ focus(); blur(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SLIDER_API: ApiSections = {
  properties: [
    {
      title: 'OgeSlider',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'number',
          default: '0',
          description:
            'The slider value — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>. Programmatic writes clamp and snap to the step grid.',
        },
        {
          name: 'min / max',
          type: 'number',
          default: '0 / 100',
          description: 'Scale bounds.',
        },
        {
          name: 'step',
          type: 'number',
          default: '1',
          description:
            'Arrow-key and drag increment; thumbs always sit on this grid, with float-error correction (0.1-style steps never drift).',
        },
        {
          name: 'largeStep',
          type: 'number',
          description:
            'PageUp/PageDown increment; <code>undefined</code> means <code>step × 10</code>.',
        },
        {
          name: 'orientation',
          type: "'horizontal' | 'vertical'",
          default: "'horizontal'",
          description:
            'A vertical slider announces <code>aria-orientation="vertical"</code>; Up still increases (APG).',
        },
        {
          name: 'showRange',
          type: 'boolean',
          default: 'true',
          description: 'Fills the selected portion of the track.',
        },
        {
          name: 'showTicks / tickStep',
          type: 'boolean / number',
          default: 'false',
          description:
            'Tick marks on the <code>tickStep</code> grid — falling back to <code>largeStep</code>, then <code>step</code>; capped at 200 marks.',
        },
        {
          name: 'showTickLabels',
          type: 'boolean',
          default: 'false',
          description:
            'Formatted labels under each tick, fed by <code>formatValue</code>.',
        },
        {
          name: 'showLabels',
          type: 'boolean',
          default: 'false',
          description:
            'Formatted <code>min</code>/<code>max</code> labels at the track ends.',
        },
        {
          name: 'valueIndicator',
          type: "'none' | 'active' | 'always'",
          default: "'none'",
          description:
            "The inline value bubble: <code>'active'</code> while focused, dragged <strong>or hovered</strong>, <code>'always'</code> permanent.",
        },
        {
          name: 'formatValue',
          type: '(value: number) =&gt; string',
          description:
            'Formats the bubble, the end labels <strong>and</strong> <code>aria-valuetext</code> — display and announcement never diverge.',
        },
        {
          name: 'showButtons',
          type: 'boolean',
          default: 'false',
          description:
            'Increment/decrement buttons with press-and-hold repeat — the number box’s spin timing config.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name of the thumb; the localized <code>sliderHandle</code> message is the fallback.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [
    {
      title: 'OgeSlider callbacks',
      entries: [
        {
          name: 'onDragStarted',
          type: '(event: OgeSliderDragStartedEvent) =&gt; void',
          description: 'A drag gesture began on the thumb or the track.',
        },
        {
          name: 'onSlideEnded',
          type: '(event: OgeSliderSlideEndedEvent&lt;number&gt;) =&gt; void',
          description:
            'Fires once per gesture at release (live changes stream through <code>onValueCommitted</code>, throttled by <code>debounce</code>). Not emitted when Escape cancels the gesture.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeSliderOrientation',
          type: "'horizontal' | 'vertical'",
          description: 'Axis the track lays along.',
        },
        {
          name: 'OgeSliderValueIndicator',
          type: "'none' | 'active' | 'always'",
          description: 'When the inline value bubble shows.',
        },
        {
          name: 'OgeSliderDragStartedEvent / OgeSliderSlideEndedEvent&lt;T&gt;',
          type: '{ event } / { value; event }',
          description: 'The drag gesture pair.',
        },
        {
          name: 'OgeSliderBaseProps&lt;T&gt;',
          type: 'interface',
          description:
            'The scale/appearance surface both sliders extend — exported so wrappers can reuse it.',
        },
      ],
    },
  ],
};

export const OGE_REACT_RANGE_SLIDER_API: ApiSections = {
  properties: [
    {
      title: 'OgeRangeSlider',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'readonly [number, number]',
          default: '[0, 0]',
          description:
            'The <code>[start, end]</code> pair — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>. Programmatic writes clamp, snap and sort.',
        },
        {
          name: 'minRange',
          type: 'number',
          default: '0',
          description:
            'Minimum distance kept between the thumbs — reflected in each thumb&rsquo;s dynamic <code>aria-valuemin</code>/<code>aria-valuemax</code> (the APG multi-thumb constraint).',
        },
        {
          name: 'startAriaLabel / endAriaLabel',
          type: 'string',
          description:
            'Accessible names of the thumbs; the localized <code>sliderStartHandle</code>/<code>sliderEndHandle</code> messages are the fallbacks.',
        },
        {
          name: 'startName / endName',
          type: 'string',
          default: "''",
          description:
            'Hidden-input names for plain HTML form posts (the single slider uses the inherited <code>name</code>).',
        },
      ],
    },
    {
      title: 'Shared with OgeSlider',
      entries: [
        {
          name: 'min / max / step / largeStep / orientation / showRange / showTicks / tickStep / showLabels / valueIndicator / formatValue',
          type: '—',
          description:
            'The full scale/appearance surface of <code>&lt;OgeSlider&gt;</code>, identical semantics. <code>showButtons</code> is single-slider only. Clicking the track moves the <strong>nearest</strong> thumb.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [
    {
      title: 'OgeRangeSlider callbacks',
      entries: [
        {
          name: 'onDragStarted / onSlideEnded',
          type: '(event: OgeSliderSlideEndedEvent&lt;readonly [number, number]&gt;) =&gt; void',
          description:
            'The drag gesture pair; an unchanged pair never re-emits <code>onValueCommitted</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeRangeSliderHandle',
          type: '{ focus(); blur() }',
          description:
            'Imperative handle exposed through <code>ref</code>; <code>focus()</code> targets the start thumb.',
        },
      ],
    },
  ],
};

export const OGE_REACT_SWITCH_API: ApiSections = {
  properties: [
    {
      title: 'OgeSwitch',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'boolean',
          default: 'false',
          description:
            'The on/off state — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Accessible name (<code>aria-label</code>).',
        },
        {
          name: 'onText / offText',
          type: 'string',
          description:
            "Track texts; <code>undefined</code> falls back to the localized <code>switchOn</code>/<code>switchOff</code> messages ('ON'/'OFF'), empty strings hide the text.",
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Track size preset.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSwitch handle (via ref)',
      entries: [
        {
          name: 'toggle()',
          type: '() =&gt; void',
          description: 'Flips the state (no-op while disabled/readonly).',
        },
      ],
    },
    FOCUS_METHODS,
  ],
  events: [COMMON_EVENTS],
  types: [
    {
      entries: [
        {
          name: 'OgeSwitchHandle',
          type: '{ focus(); blur(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_RADIO_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeRadioGroup',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'unknown',
          default: 'null',
          description:
            "The selected item's <code>valueExpr</code> result — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.",
        },
        {
          name: 'items',
          type: 'readonly TItem[]',
          default: '[]',
          description: 'The selectable items.',
        },
        {
          name: 'displayExpr / valueExpr / disabledExpr',
          type: 'shared with OgeSelectBox',
          description:
            'Field-name string or function expressions — the select box vocabulary.',
        },
        {
          name: 'layout',
          type: "'vertical' | 'horizontal'",
          default: "'vertical'",
          description: 'Column or row arrangement.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name of the group (<code>aria-label</code>).',
        },
        {
          name: 'renderItem',
          type: '(item: TItem, context: { index; selected; active }) =&gt; ReactNode',
          description:
            'Custom item rendering next to the radio dot — the render prop replacing Angular’s <code>itemTemplate</code>.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Dot/font size preset.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [
    {
      title: 'OgeRadioGroup callbacks',
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeRadioGroupItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A radio item was activated by click or keyboard — <code>{ item, index, event }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeRadioGroupLayout',
          type: "'vertical' | 'horizontal'",
          description: 'Arrangement of the radios.',
        },
        {
          name: 'OgeRadioGroupHandle',
          type: '{ focus(); blur() }',
          description:
            '<code>focus()</code> moves to the radio holding the roving tabindex.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CALENDAR_API: ApiSections = {
  properties: [
    {
      title: 'OgeCalendar',
      entries: [
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name of the grid (<code>aria-label</code>); the messages supply a default.',
        },
        {
          name: 'value / defaultValue',
          type: 'Date | null',
          default: 'null',
          description:
            'The selected day (single mode) — a local <code>Date</code>; controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'values / defaultValues',
          type: 'readonly Date[]',
          default: '[]',
          description:
            "Selected days for <code>selectionMode: 'multiple'</code> — controlled with <code>onValuesChange</code>.",
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple' | 'range'",
          default: "'single'",
          description:
            'Range mode picks a start–end pair with a live hover preview.',
        },
        {
          name: 'range / defaultRange',
          type: '[Date | null, Date | null]',
          default: '[null, null]',
          description:
            "The selected tuple for <code>selectionMode: 'range'</code> — controlled with <code>onRangeChange</code>; either end may stay open.",
        },
        {
          name: 'viewsCount',
          type: '1 | 2',
          default: '1',
          description: 'Side-by-side month views (2 is the range layout).',
        },
        {
          name: 'zoomLevel / defaultZoomLevel / minZoomLevel / maxZoomLevel',
          type: "'month' | 'year' | 'decade'",
          default: "'month' / 'decade' / 'month'",
          description:
            "Drill level (controlled with <code>onZoomLevelChange</code>) and its reachable bounds; dx's 'century' is deliberately dropped.",
        },
        {
          name: 'min / max',
          type: 'Date',
          description:
            'Day bounds; <code>undefined</code> = unbounded (no dx 1000–3000 defaults).',
        },
        {
          name: 'disabledDates',
          type: 'Date[] | ((d: Date) =&gt; boolean)',
          description: 'Individual unselectable days.',
        },
        {
          name: 'firstDayOfWeek',
          type: 'number',
          description:
            "0–6 (Sunday-first); <code>undefined</code> resolves from the locale's Intl week info.",
        },
        {
          name: 'showWeekNumbers',
          type: "boolean | { rule: 'firstDay' | 'firstFourDays' | 'fullWeek' }",
          default: 'false',
          description: 'Week-number column; <code>true</code> = the ISO rule.',
        },
        {
          name: 'showTodayButton',
          type: 'boolean',
          default: 'false',
          description: 'Renders the localized today shortcut.',
        },
        {
          name: 'focusedDate / defaultFocusedDate',
          type: 'Date | null',
          description:
            'The keyboard-focused day — controlled navigation via <code>onFocusedDateChange</code>.',
        },
        {
          name: 'locale',
          type: 'string',
          description: 'BCP 47 locale for all texts (Intl).',
        },
        {
          name: 'renderCell',
          type: '(context: OgeCalendarCellContext) =&gt; ReactNode',
          description:
            'Custom day/month/year cell rendering — badges, prices, availability dots. The React face of the Angular <code>[ogeCalendarCellTemplate]</code> slot; the context carries <code>date</code>, <code>view</code>, <code>text</code>, <code>disabled</code>, <code>selected</code>, <code>today</code> and <code>otherPeriod</code>.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeCalendar handle (via ref)',
      entries: [
        {
          name: 'focus()',
          type: '() =&gt; void',
          description: 'Moves keyboard focus to the focused day cell.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'OgeCalendar callbacks',
      entries: [
        {
          name: 'onCellClick',
          type: '(event: OgeCalendarCellClickEvent) =&gt; void',
          description:
            'A day/month/year cell was activated — <code>{ date, view, event }</code>.',
        },
        {
          name: 'onValuesChange / onRangeChange',
          type: '(value) =&gt; void',
          description:
            'The controlled halves of <code>values</code> and <code>range</code> — the multiple/range selections have their own pairs so one calendar never guesses which model you drive.',
        },
        {
          name: 'onZoomLevelChange / onFocusedDateChange',
          type: '(value) =&gt; void',
          description:
            'The controlled halves of <code>zoomLevel</code> and <code>focusedDate</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeCalendarCellContext',
          type: '{ date; view; text; disabled; selected; today; otherPeriod }',
          description: 'Argument of <code>renderCell</code>.',
        },
        {
          name: 'OgeCalendarZoomLevel / OgeCalendarSelectionMode / OgeCalendarRange / OgeCalendarWeekNumberOptions / OgeCalendarDisabledDates',
          type: '@oge-ui/behavior',
          description:
            'The shared calendar vocabulary — the same types the Angular package uses.',
        },
      ],
    },
  ],
};

export const OGE_REACT_DATE_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeDateBox',
      entries: [
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the rail button that toggles the picker; the field click and the keyboard still open it when hidden.',
        },
        {
          name: 'dropdownPlacement',
          type: 'OgePopupPlacement',
          default: "'bottom-start'",
          description:
            'Preferred popup side/alignment; flips when it would clip.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-screen dialog with 44px day cells on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'value / defaultValue',
          type: 'Date | null',
          default: 'null',
          description:
            "Always a local <code>Date</code> — serialization is the app's concern (no <code>dateSerializationFormat</code>). Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.",
        },
        {
          name: 'type',
          type: "'date' | 'time' | 'datetime'",
          default: "'date'",
          description:
            'Picker: calendar, interval time list, or both (no dx <code>pickerType</code>). The rail icon follows the type.',
        },
        {
          name: 'displayFormat',
          type: 'Intl.DateTimeFormatOptions | ((d: Date) =&gt; string)',
          description:
            'Display text; <code>undefined</code> = per-type Intl defaults. No format strings, no date library.',
        },
        {
          name: 'min / max / disabledDates',
          type: 'as OgeCalendar',
          description:
            'Out-of-range typed text marks the field invalid — it is never clamped (unlike the number box).',
        },
        {
          name: 'interval',
          type: 'number',
          default: '30',
          description: 'Time list step in minutes.',
        },
        {
          name: 'timeView',
          type: "'list' | 'columns'",
          default: "'list'",
          description:
            'Time picker layout: one interval list, or hour + minute columns (plus seconds / AM-PM columns when enabled). Each column is a labelled listbox.',
        },
        {
          name: 'hour12',
          type: 'boolean',
          description:
            "Clock of the display text and the picker. <code>true</code> adds an AM/PM column to <code>timeView: 'columns'</code> (hours 12, 1 … 11); <code>false</code> forces 24-hour; unset follows the locale with the single 24-entry hour column.",
        },
        {
          name: 'showSeconds',
          type: 'boolean',
          default: 'false',
          description:
            "Seconds in the display text (<code>timeStyle: 'medium'</code>), a seconds column and a seconds segment of the masked entry; typed <code>HH:MM:SS</code> parses. Off, picks zero the seconds.",
        },
        {
          name: 'showTodayButton',
          type: 'boolean',
          default: 'false',
          description:
            'Footer "Today" button (<code>date</code> / <code>datetime</code>): picks today through the calendar path — <code>datetime</code> keeps the time of day. Disabled when <code>min</code>/<code>max</code>/<code>disabledDates</code> exclude today.',
        },
        {
          name: 'showNowButton',
          type: 'boolean',
          default: 'false',
          description:
            'Footer "Now" button (<code>time</code> / <code>datetime</code>): commits the current time (seconds kept only with <code>showSeconds</code>) and closes; with <code>useButtons</code> it drafts instead.',
        },
        {
          name: 'useMaskBehavior',
          type: 'boolean',
          default: 'false',
          description:
            'Segment entry (DevExtreme <code>useMaskBehavior</code>) on the shared <code>OgeDateSegmentCore</code>: the field shows the locale’s numeric pattern (<code>dd.mm.yyyy</code>, <code>mm/dd/yyyy</code>… from <code>Intl</code>), digits fill the selected segment and auto-advance, ArrowUp/Down step it with wrap-around, ArrowLeft/Right (mirrored in RTL) and Home/End move between segments, Backspace/Delete clear, a typed separator moves on, <code>a</code>/<code>p</code> set AM/PM, paste reads a whole date and Alt+ArrowDown opens the picker. Commits on blur/Enter like typed text; impossible dates show the invalid state and revert. <code>displayFormat</code> is not used while it is on.',
        },
        {
          name: 'applyValueMode',
          type: "'instantly' | 'useButtons'",
          default: "'instantly'",
          description:
            'OK/Cancel footer collects picker changes in a draft when <code>useButtons</code>.',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> makes the text read-only (picker input only).',
        },
        {
          name: 'openOnFieldClick',
          type: 'boolean',
          default: 'true',
          description: 'Clicking the field opens the picker.',
        },
        {
          name: 'firstDayOfWeek / showWeekNumbers / zoomLevel / renderCalendarCell / locale',
          type: 'calendar passthroughs',
          description:
            'Exposed individually — no <code>calendarOptions</code> kitchen-sink object. <code>renderCalendarCell</code> is the render prop replacing the projected cell template.',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Picker visibility — controlled with <code>onOpenedChange</code>, or uncontrolled from <code>defaultOpened</code>.',
        },
      ],
    },
    {
      title: 'OgeDateRangeBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: '[Date | null, Date | null]',
          default: '[null, null]',
          description:
            'Start–end tuple on one field: two parsed inputs + a two-view range calendar popup. A reversed pair reorders on commit; either end may stay open.',
        },
        {
          name: 'type',
          type: 'OgeDateRangeBoxType',
          default: "'date'",
          description:
            "<code>'datetime'</code> adds start/end time lists to the picker: day and time picks collect in a draft and commit together on OK; both sides parse and render times. <code>'time'</code> is a time-range picker — no calendar, two time lists and OK.",
        },
        {
          name: 'presets',
          type: 'readonly OgeDateRangePreset[]',
          default: '[]',
          description:
            'Quick ranges listed beside the calendar (a horizontal chip row in the adaptive dialog), each an <code>aria-pressed</code> button that reads pressed while the draft matches it. <code>{ label, range: () =&gt; [start, end] }</code> — <code>range</code> is evaluated on render and on pick, never at construction — or the built-in <code>ogeDateRangePresets.today() / yesterday() / last7Days() / last30Days() / thisWeek() / lastWeek() / thisMonth() / lastMonth() / thisYear() / lastYear()</code>, labelled from the messages. A <code>date</code> box commits and closes on a pick; <code>time</code>/<code>datetime</code> and the adaptive dialog draft it for OK/Done.',
        },
        {
          name: 'hour12 / showSeconds',
          type: 'boolean',
          description:
            'Clock and seconds of the display text and the time lists, as on <code>OgeDateBox</code>.',
        },
        {
          name: 'interval',
          type: 'number',
          default: '30',
          description:
            "Time list step in minutes (<code>type: 'time' | 'datetime'</code>).",
        },
        {
          name: 'min / max / disabledDates / firstDayOfWeek / showWeekNumbers / locale / displayFormat / openOnFieldClick / acceptCustomValue',
          type: 'as OgeDateBox',
          description: 'Shared configuration surface.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-screen dialog showing one month, where picking both ends waits for an explicit Done that applies the range on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeDateBox / OgeDateRangeBox handle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description: 'Picker control (no-ops while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeDateBox callbacks',
      entries: [
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Picker visibility changes, from any trigger.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'The controlled half of <code>opened</code>.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      title: 'Date types',
      entries: [
        {
          name: 'OgeDateBoxHandle / OgeDateRangeBoxHandle',
          type: '{ focus(); blur(); clear(); open(); close(); toggle() }',
          description: 'Imperative handles exposed through <code>ref</code>.',
        },
        {
          name: 'OgeDateBoxType / OgeDateBoxApplyValueMode / OgeDateBoxDisplayFormat / OgeDateBoxTimeView',
          type: '@oge-ui/behavior',
          description:
            'The string unions and the display-format shape — shared with the Angular package, so locale-aware typed parsing behaves identically.',
        },
        {
          name: 'OgeDateRangeBoxType',
          type: "'date' | 'time' | 'datetime'",
          description: 'What the date range box edits.',
        },
        {
          name: 'OgeDateRangePreset',
          type: '{ label?: string; id?: string; range: () =&gt; [Date | null, Date | null] }',
          description:
            'One preset entry. <code>label</code> wins; built-ins carry an <code>id</code> whose message supplies the label.',
        },
        {
          name: 'ogeDateRangePresets',
          type: 'object of factories',
          description:
            'Built-in presets, each <code>(options?: { label?, now? }) =&gt; OgeDateRangePreset</code> covering whole local days; <code>thisWeek</code>/<code>lastWeek</code> also take <code>firstDayOfWeek</code> / <code>locale</code>. Re-exported from <code>@oge-ui/behavior</code> — the Angular package ships the same factories.',
        },
        {
          name: 'OgeDateRangePresetId / OgeDateRangePresetOptions / OgeDateRangeWeekPresetOptions',
          type: 'types',
          description: 'The built-in ids and the factory option shapes.',
        },
      ],
    },
  ],
};

export const OGE_REACT_COLOR_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeColorBox',
      entries: [
        {
          name: 'dropdownPlacement',
          type: 'OgePopupPlacement',
          default: "'bottom-start'",
          description:
            'Preferred popup side/alignment; flips when it would clip.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from the <code>&lt;OgeInputsConfigProvider&gt;</code>.`,
        },
        {
          name: 'value / defaultValue',
          type: 'string | null',
          default: 'null',
          description:
            'The committed color as a CSS string, normalized to <code>format</code> on user commits. Programmatic writes keep any parseable CSS color verbatim; unparseable writes land as <code>null</code>.',
        },
        {
          name: 'format',
          type: "'hex' | 'rgb' | 'rgba' | 'hsl'",
          default: "'hex'",
          description:
            'Committed string shape. Translucent colors widen to carry alpha: <code>#rrggbbaa</code> / <code>rgba()</code> / <code>hsla()</code>.',
        },
        {
          name: 'view',
          type: "'gradient' | 'palette' | 'both'",
          default: "'gradient'",
          description:
            'Popup surfaces: the saturation/brightness gradient with sliders and inputs, the swatch palette, or both stacked — no view switcher.',
        },
        {
          name: 'editAlphaChannel',
          type: 'boolean',
          default: 'false',
          description:
            'Adds the alpha slider + percent input and lets the output carry alpha. Without it, alpha is coerced to 1 on commit — <code>rgba()</code> text still parses.',
        },
        {
          name: 'applyValueMode',
          type: "'instantly' | 'useButtons'",
          default: "'instantly'",
          description:
            'OK/Cancel footer collects panel interactions in a draft when <code>useButtons</code>; the default commits live (dragging streams through <code>onValueCommitted</code>, throttled by <code>debounce</code>).',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> makes the text read-only (picker input only). Typed text parses any CSS color incl. the 148 named colors; unparseable text reverts on blur.',
        },
        {
          name: 'keyStep',
          type: 'number',
          default: '5',
          description:
            'Arrow-key increment of the panel parts in value units — hue degrees, alpha percent, surface saturation/brightness percent. PageUp/PageDown move by 5× (value-space, zoom-independent).',
        },
        {
          name: 'palette',
          type: 'readonly string[]',
          description:
            'Palette swatches as CSS color strings; <code>undefined</code> renders the exported <code>OGE_DEFAULT_COLOR_PALETTE</code>. Unparseable entries are dropped.',
        },
        {
          name: 'paletteColumns',
          type: 'number',
          default: '10',
          description: 'Swatch columns of the palette grid.',
        },
        {
          name: 'openOnFieldClick',
          type: 'boolean',
          default: 'true',
          description: 'Clicking the field opens the picker.',
        },
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> hides the rail chevron — field click and ArrowDown still open.',
        },
        {
          name: 'showEyedropper',
          type: 'boolean',
          default: 'true',
          description:
            'The eyedropper button (pick a color from anywhere on screen) — rendered only in browsers shipping the <code>EyeDropper</code> API; progressive enhancement, no polyfill. The picked color keeps the working alpha.',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Picker visibility — controlled with <code>onOpenedChange</code>, or uncontrolled from <code>defaultOpened</code>.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeColorBox handle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description: 'Picker control (no-ops while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeColorBox callbacks',
      entries: [
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Picker visibility changes, from any trigger.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'The controlled half of <code>opened</code>.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      title: 'Color types',
      entries: [
        {
          name: 'OgeColorBoxView / OgeColorBoxApplyValueMode / OgeColorFormat',
          type: '@oge-ui/behavior',
          description:
            'The string unions of <code>view</code>, <code>applyValueMode</code> and <code>format</code>.',
        },
        {
          name: 'OGE_DEFAULT_COLOR_PALETTE',
          type: 'readonly string[]',
          description:
            'The built-in 50-swatch palette used when <code>palette</code> is not set.',
        },
        {
          name: 'Color messages',
          type: 'OgeInputsMessages keys',
          description:
            'All popup strings localize through <code>&lt;OgeInputsConfigProvider&gt;</code>: <code>colorPickerLabel</code>, <code>hueSliderLabel</code>/<code>hueValueText</code>, <code>alphaSliderLabel</code>/<code>alphaValueText</code>, <code>colorSurfaceLabel</code>/<code>colorSurfaceRoleDescription</code>/<code>surfaceValueText</code>, <code>paletteLabel</code>, the hex/R/G/B/A input labels, <code>eyedropperButton</code> and <code>invalidColorError</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_INPUTS_TYPES_API: ApiSections = {
  types: [
    {
      title: 'Unions & contracts',
      entries: [
        {
          name: 'OgeControlProps&lt;T&gt;',
          type: 'interface',
          description:
            'The base every editor extends: the <code>value</code>/<code>defaultValue</code>/<code>onValueChange</code> trio, <code>onValueCommitted</code>, the state and validation props, and the focus/blur/enter/cleared callbacks. The React counterpart of the Angular <code>OgeInputBase</code> class.',
        },
        {
          name: 'OgeInputLabelMode',
          type: "'static' | 'floating' | 'hidden' | 'outside'",
          description:
            '<code>hidden</code> renders the label as <code>aria-label</code> only.',
        },
        {
          name: 'OgeInputStylingMode',
          type: "'outlined' | 'filled' | 'underlined'",
          description: 'Container fill style.',
        },
        {
          name: 'OgeInputSize',
          type: "'sm' | 'md' | 'lg'",
          description: '28 / 34 / 42px heights.',
        },
        {
          name: 'OgeInputSubscriptSizing',
          type: "'fixed' | 'dynamic' | 'none'",
          description:
            '<code>fixed</code> reserves one line so errors never shift layout.',
        },
        {
          name: 'OgeInputErrorDisplay',
          type: "'touched' | 'dirty' | 'always'",
          description: 'When resolved errors become visible.',
        },
        {
          name: 'OgeInputCounterMode',
          type: "'limit' | 'soft'",
          description:
            '<code>soft</code> allows typing past <code>maxLength</code> and colors the counter danger.',
        },
        {
          name: 'OgeInputShowSuccessIcon',
          type: "false | 'touched' | 'always'",
          description: 'Success-icon visibility policy.',
        },
        {
          name: 'OgeTextBoxMode',
          type: "'text' | 'email' | 'password' | 'search' | 'tel' | 'url'",
          description: 'Native input type of the text box.',
        },
        {
          name: 'OgeNumberBoxMode',
          type: "'text' | 'tel'",
          description: 'Native input type of the number box.',
        },
        {
          name: 'OgeFieldError',
          type: '{ kind: string; message?: string }',
          description:
            'The validation-error shape the <code>errors</code> prop takes — map your form library’s errors into it once.',
        },
      ],
    },
    {
      title: 'Mask',
      entries: [
        {
          name: 'OgeMaskRule',
          type: 'RegExp | string | ((char: string) =&gt; boolean)',
          description:
            'One custom mask rule: a one-character <code>RegExp</code>, a string listing the allowed characters, or a predicate.',
        },
        {
          name: 'OgeMaskRules',
          type: 'Readonly&lt;Record&lt;string, OgeMaskRule&gt;&gt;',
          description: 'Custom rules keyed by a single mask character.',
        },
        {
          name: 'OgeMaskShowMode',
          type: "'always' | 'onFocus'",
          description: 'When the empty mask placeholders are visible.',
        },
        {
          name: 'OgeMaskCompletedEvent',
          type: '{ value: string; rawValue: string; maskedValue: string }',
          description: 'Payload of <code>onMaskCompleted</code>.',
        },
        {
          name: 'ogeMaskComplete(mask, value, { rules?, includeLiterals? })',
          type: 'boolean',
          description:
            '<code>true</code> when <code>value</code> fills every required slot (empty counts as complete) — the check a form library or a server runs without an editor. The error kind <code>mask</code> resolves to <code>messages.maskInvalidError</code>.',
        },
        {
          name: 'ogeMaskInputMode(mask, rules?)',
          type: "'numeric' | undefined",
          description:
            "The <code>inputmode</code> a mask implies — <code>'numeric'</code> when every slot takes only digits.",
        },
        {
          name: 'OGE_DEFAULT_MASK_RULES',
          type: 'Record&lt;string, [test, optional]&gt;',
          description:
            'The built-in rules (<code>0 9 # L l A a C c</code>) as test/optional pairs.',
        },
      ],
    },
    {
      title: 'Callback payloads',
      entries: [
        {
          name: 'onValueCommitted payload',
          type: '{ value: T; previousValue: T; event: Event | undefined }',
          description:
            '<code>event === undefined</code> means a programmatic change.',
        },
        {
          name: 'onInputChange payload',
          type: '{ text: string; event: Event }',
          description: 'Raw keystroke payload.',
        },
        {
          name: 'onEnterKey / onFocus / onBlur payloads',
          type: 'KeyboardEvent / FocusEvent',
          description:
            'The native DOM events, not React synthetic wrappers — the editors listen natively so debounce flushing stays ordered.',
        },
      ],
    },
    {
      title: 'Slots & helpers',
      entries: [
        {
          name: 'prefix / suffix',
          type: 'ReactNode props',
          description:
            'Leading and trailing adornments inside the field — the React face of the <code>[ogeInputPrefix]</code> / <code>[ogeInputSuffix]</code> directives. The trailing slot renders after the built-in rail buttons.',
        },
        {
          name: 'OgeInputCounterState',
          type: '{ count: number; max: number | undefined; over: boolean }',
          description: 'Counter state rendered in the subscript end slot.',
        },
        {
          name: 'OgeInputRevealState',
          type: '{ visible; active; toggle() }',
          description: 'Password-reveal state (text box only).',
        },
        {
          name: 'OgeInputCopyState',
          type: '{ visible; copied; trigger() }',
          description: 'Copy-to-clipboard state (text box only).',
        },
        {
          name: 'measureTextAreaHeight(el, minRows, maxRows?)',
          type: 'number',
          description:
            'Fallback auto-resize measurement for browsers without CSS <code>field-sizing: content</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_INPUTS_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'OgeInputsConfigProvider',
          type: '(props: { config?: OgeInputsConfigInput; children?: ReactNode }) =&gt; JSX.Element',
          description:
            'Wrap a subtree to change the editors’ defaults and user-facing strings beneath it — the React counterpart of Angular’s <code>provideOgeInputsConfig()</code>. Both merge over the same <code>@oge-ui/behavior</code> defaults, so a message override reads identically in either layer.',
        },
        {
          name: 'useOgeInputsConfig()',
          type: '() =&gt; OgeInputsConfig',
          description:
            'Reads the resolved config of the current subtree — how a custom editor of your own picks up the same messages and timings.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgeInputsConfig',
      entries: [
        {
          name: 'spinRepeatDelayMs',
          type: 'number',
          default: '400',
          description: 'Delay before spin buttons start repeating.',
        },
        {
          name: 'spinRepeatIntervalMs',
          type: 'number',
          default: '80',
          description: 'Interval between spin repeats.',
        },
        {
          name: 'copiedResetMs',
          type: 'number',
          default: '2000',
          description: 'How long the copy button shows "copied".',
        },
        {
          name: 'adaptiveMode',
          type: "'auto' | 'none'",
          default: "'none'",
          description:
            "Default <code>adaptiveMode</code> of every popup editor (select box, tag box, autocomplete, tree select, date / date range / color box). <code>'none'</code> keeps existing apps' anchored drop-downs; switch the whole family with <code>'auto'</code>.",
        },
        {
          name: 'adaptiveBreakpoint',
          type: 'number',
          default: '600',
          description:
            "Viewport width (px) below which <code>'auto'</code> presents popups as bottom sheets / full-screen dialogs.",
        },
        {
          name: 'dataPageSize',
          type: 'number',
          default: '30',
          description:
            'Rows a list editor asks its <code>dataSource</code> for per page (select box, tag box, autocomplete, multi-column combo box).',
        },
        {
          name: 'messages',
          type: 'OgeInputsMessages',
          description:
            'User-facing strings — the same key set the Angular package documents (clear/reveal/copy/spin labels, counter patterns and the validation messages).',
        },
      ],
    },
  ],
};

// --- standalone color components + choice groups (G4a) ----------------------

const CONTRAST_TYPES: ApiGroup = {
  title: 'Contrast & palette helpers',
  entries: [
    {
      name: 'contrastRatio',
      type: '(foreground: OgeRgba, background: OgeRgba) =&gt; number',
      description:
        'WCAG 2.x contrast ratio (1–21); a translucent foreground is composited over the background first. Re-exported from <code>@oge-ui/behavior</code>.',
    },
    {
      name: 'contrastLevels',
      type: '(ratio: number) =&gt; OgeContrastLevels',
      description:
        'AA (4.5) / AA large (3) / AAA (7) / AAA large (4.5) verdicts on the unrounded ratio; the displayed <code>ratio</code> is truncated, never rounded up into a pass.',
    },
    {
      name: 'OgeContrastLevels',
      type: '{ ratio; aa; aaLarge; aaa; aaaLarge }',
      description: 'Result of <code>contrastLevels</code>.',
    },
  ],
};

export const OGE_REACT_COLOR_GRADIENT_API: ApiSections = {
  properties: [
    {
      title: 'OgeColorGradient',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string | null',
          default: 'null',
          description:
            'The committed color as a CSS string, normalized to <code>format</code> on commit — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name of the <code>role="group"</code>; falls back to the <code>colorGradientLabel</code> message.',
        },
        {
          name: 'format',
          type: 'OgeColorFormat',
          default: "'hex'",
          description:
            'Committed string shape; translucent colors widen to carry alpha.',
        },
        {
          name: 'editAlphaChannel',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the alpha slider and the alpha-percent input, and commits alpha-carrying strings.',
        },
        {
          name: 'keyStep',
          type: 'number',
          default: '5',
          description:
            'Arrow-key increment of the surface and sliders; PageUp/PageDown move 5×.',
        },
        {
          name: 'showInputs',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the hex + R/G/B(/A) inputs; they apply on blur / Enter and revert unusable text.',
        },
        {
          name: 'showContrast',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the WCAG contrast readout — sample, ratio and AA / AAA pass-fail badges.',
        },
        {
          name: 'contrastBackground',
          type: 'string',
          default: "'#ffffff'",
          description:
            'The background (any CSS color) the contrast ratio is measured against.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [COMMON_EVENTS],
  types: [
    CONTRAST_TYPES,
    {
      title: 'Color gradient types',
      entries: [
        {
          name: 'OgeColorGradientHandle',
          type: '{ focus(); blur() }',
          description:
            '<code>focus()</code> moves to the saturation/brightness surface.',
        },
      ],
    },
  ],
};

export const OGE_REACT_COLOR_PALETTE_API: ApiSections = {
  properties: [
    {
      title: 'OgeColorPalette',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string | null',
          default: 'null',
          description:
            'The picked swatch string as listed — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'palette',
          type: 'OgeColorPalettePreset | readonly string[]',
          default: "'default'",
          description:
            "A preset (<code>'default' | 'basic' | 'office' | 'material' | 'monochrome'</code>) or your own CSS color list.",
        },
        {
          name: 'columns',
          type: 'number | undefined',
          description:
            'Tiles per row; <code>undefined</code> uses the preset’s own count (10 for a custom list).',
        },
        {
          name: 'tileSize',
          type: 'number | undefined',
          description:
            'Tile edge in px; <code>undefined</code> lets the tiles share the width.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name of the grid; falls back to the <code>paletteLabel</code> message.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [COMMON_EVENTS],
  types: [
    {
      title: 'Palette types',
      entries: [
        {
          name: 'OgeColorPalettePreset',
          type: "'default' | 'basic' | 'office' | 'material' | 'monochrome'",
          description: 'The built-in swatch sets.',
        },
        {
          name: 'OGE_COLOR_PALETTE_PRESETS',
          type: 'Record&lt;OgeColorPalettePreset, OgeColorPalettePresetData&gt;',
          description:
            'The preset data — <code>{ colors, columns }</code> each.',
        },
        {
          name: 'OgeColorPaletteHandle',
          type: '{ focus(); blur() }',
          description:
            '<code>focus()</code> moves to the roving tile (the selected one, else the first).',
        },
      ],
    },
  ],
};

export const OGE_REACT_CHECK_BOX_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeCheckBoxGroup',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'readonly unknown[]',
          default: '[]',
          description:
            'The checked items’ <code>valueExpr</code> results in items order — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[]',
          default: '[]',
          description: 'One check box per item.',
        },
        {
          name: 'displayExpr / valueExpr / disabledExpr',
          type: 'shared with OgeSelectBox',
          description:
            'Field-name string or function expressions; disabled items keep their state.',
        },
        {
          name: 'layout',
          type: 'OgeCheckBoxGroupLayout',
          default: "'vertical'",
          description:
            "<code>'vertical'</code>, <code>'horizontal'</code> (wrapping) or <code>'columns'</code>.",
        },
        {
          name: 'columns',
          type: 'number',
          default: '2',
          description: "Column count of <code>layout: 'columns'</code>.",
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Visible group label and the group’s accessible name.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Helper text under the items, hidden while an error shows.',
        },
        {
          name: 'showSelectAll',
          type: 'boolean',
          default: 'false',
          description:
            'A tri-state “select all” box over the enabled items; from mixed it selects all.',
        },
        {
          name: 'selectAllText',
          type: 'string | undefined',
          description:
            'Text of the select-all box; <code>undefined</code> = the <code>selectAllText</code> message.',
        },
        {
          name: 'renderItem',
          type: '(item: TItem, context: { index; checked }) =&gt; ReactNode',
          description:
            'Custom label next to each glyph — the render prop replacing Angular’s <code>itemTemplate</code>.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeCheckBoxGroup handle',
      entries: [
        {
          name: 'selectAll() / unselectAll()',
          type: '() =&gt; void',
          description:
            'Checks / unchecks every enabled item (disabled items keep their state).',
        },
      ],
    },
    FOCUS_METHODS,
  ],
  events: [
    {
      title: 'OgeCheckBoxGroup callbacks',
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeCheckBoxGroupItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'One check box was toggled by the user — <code>{ item, index, checked, event }</code>.',
        },
        {
          name: 'onSelectAllChange',
          type: '(event: OgeCheckBoxGroupSelectAllEvent) =&gt; void',
          description:
            'The select-all box was toggled by the user — <code>{ checked, event }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeCheckBoxGroupLayout',
          type: "'horizontal' | 'vertical' | 'columns'",
          description: 'Arrangement of the boxes.',
        },
        {
          name: 'OgeCheckBoxGroupHandle',
          type: '{ focus(); blur(); selectAll(); unselectAll() }',
          description: 'The imperative handle.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TOGGLE_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeToggleGroup',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'unknown',
          default: 'null',
          description:
            'The selected value (<code>single</code>) or an array in items order (<code>multiple</code>) — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[]',
          default: '[]',
          description: 'The segments.',
        },
        {
          name: 'displayExpr / valueExpr / disabledExpr',
          type: 'shared with OgeSelectBox',
          description: 'Field-name string or function expressions.',
        },
        {
          name: 'selectionMode',
          type: 'OgeToggleGroupSelectionMode',
          default: "'single'",
          description:
            "<code>'single'</code> — APG radio group; <code>'multiple'</code> — <code>aria-pressed</code> toggle buttons.",
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Visible caption and the track’s accessible name.',
        },
        {
          name: 'hideLabel',
          type: 'boolean',
          default: 'false',
          description: 'Keeps <code>label</code> as the accessible name only.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description: 'Helper text under the segments.',
        },
        {
          name: 'fluid',
          type: 'boolean',
          default: 'false',
          description: 'Stretches the track; segments share the width.',
        },
        {
          name: 'renderItem',
          type: '(item: TItem, context: { index; selected }) =&gt; ReactNode',
          description:
            'Custom segment content — the render prop replacing Angular’s <code>itemTemplate</code>.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [FOCUS_METHODS],
  events: [
    {
      title: 'OgeToggleGroup callbacks',
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeToggleGroupItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A segment was pressed, before any value change — <code>{ item, index, event }</code>.',
        },
        {
          name: 'onSelectionChange',
          type: '(event: OgeToggleGroupSelectionChangedEvent) =&gt; void',
          description:
            'The value changed through user interaction — <code>{ value, addedValues, removedValues }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeToggleGroupSelectionMode',
          type: "'single' | 'multiple'",
          description: 'One value or many.',
        },
        {
          name: 'OgeToggleGroupHandle',
          type: '{ focus(); blur() }',
          description: '<code>focus()</code> moves to the roving segment.',
        },
      ],
    },
  ],
};

export const OGE_REACT_MULTI_COLUMN_COMBO_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeMultiColumnComboBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'unknown',
          default: 'null',
          description:
            "The selected row's <code>valueExpr</code> (an array in <code>multiple</code> mode) — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.",
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectItemsFn&lt;TItem&gt;',
          default: '[]',
          description:
            'The rows: an array, or a function invoked lazily on first open.',
        },
        {
          name: 'columns',
          type: 'readonly OgeComboBoxColumn&lt;TItem&gt;[]',
          default: '[]',
          description:
            'Popup columns: <code>field</code>, <code>caption</code>, <code>width</code>, <code>format</code>, <code>alignment</code>, <code>searchable</code>, <code>cssClass</code> and an optional <code>renderCell</code>.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((item) =&gt; string)',
          description:
            "Row &rarr; field text; omitted, the first column's formatted cell text.",
        },
        {
          name: 'valueExpr / disabledExpr',
          type: 'string | fn',
          description: 'Committed value and per-row disabling.',
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple'",
          default: "'single'",
          description:
            '<code>multiple</code>: array value, removable chips, the popup stays open while picking.',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'true',
          description: 'Typing filters the rows.',
        },
        {
          name: 'searchMode / searchExpr / searchTimeout / minSearchLength / showDataBeforeSearch',
          type: 'shared with OgeSelectBox',
          description:
            'Without <code>searchExpr</code> every searchable column is searched by its formatted cell text.',
        },
        {
          name: 'showHeader',
          type: 'boolean',
          default: 'true',
          description: 'Renders the sticky column header row.',
        },
        {
          name: 'showDropDownButton / openOnFieldClick / loading',
          type: 'boolean',
          description: 'Shared with the select box.',
        },
        {
          name: 'maxDisplayedTags',
          type: 'number',
          description:
            'In <code>multiple</code> mode, folds chips past the cap into <code>+N more</code>.',
        },
        {
          name: 'dropdownPlacement / dropdownWidth / dropdownMaxHeight',
          type: "OgePopupPlacement / number | 'anchor' / number",
          description:
            'Popup geometry; all-pixel column widths set the grid’s minimum width.',
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description: 'Windowed row rendering.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt;',
          description: 'Remote, paged rows — see <code>OgeSelectBox</code>.',
        },
        {
          name: 'pageSize',
          type: 'number',
          default: 'provider: 30',
          description: 'Rows requested per <code>dataSource</code> page.',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          default: 'false',
          description:
            'Popup visibility — controlled with <code>onOpenedChange</code>.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "provider: 'none' / 600",
          description:
            "<code>'auto'</code> presents the grid as a bottom sheet on narrow viewports.",
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMultiColumnComboBox handle (via ref)',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description:
            'Popup control; <code>close()</code> returns <code>false</code> when <code>onClosing</code> cancels.',
        },
        {
          name: 'reload()',
          type: '() =&gt; void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeMultiColumnComboBox callbacks',
      entries: [
        {
          name: 'onSelectionChange',
          type: '(event: OgeMultiColumnComboBoxSelectionChangedEvent&lt;TItem&gt;) =&gt; void',
          description:
            '<code>{ selectedItems, addedItems, removedItems }</code> on every commit.',
        },
        {
          name: 'onRowClick',
          type: '(event: OgeMultiColumnComboBoxRowClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'A row was activated — <code>{ item, index, event }</code>.',
        },
        {
          name: 'onDropDownOpened / onDropDownClosed',
          type: '() =&gt; void',
          description: 'Popup visibility changes.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'The controlled half of <code>opened</code>.',
        },
        {
          name: 'onOpening / onClosing',
          type: '(event) =&gt; void',
          description: 'Cancelable pre-events.',
        },
        {
          name: 'onSearchChange',
          type: '(event: { text: string }) =&gt; void',
          description: 'Raw search text on every keystroke.',
        },
        {
          name: 'onPageLoaded',
          type: '(event: OgeListPageLoadedEvent&lt;TItem&gt;) =&gt; void',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      title: 'Multi-column combo box types',
      entries: [
        {
          name: 'OgeComboBoxColumn&lt;TItem&gt;',
          type: 'interface',
          description:
            "<code>{ field; caption?; width?: number | string; format?; alignment?: 'start' | 'center' | 'end'; searchable?; cssClass?; renderCell?(item, { value, text, rowIndex }) }</code>.",
        },
        {
          name: 'OgeMultiColumnComboBoxHandle',
          type: '{ focus(); blur(); clear(); open(); close(): boolean; toggle(); reload() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'Keyboard (APG combobox with grid popup)',
          type: 'keys',
          description:
            'Down/Up move rows; once in the grid Left/Right/Home/End move between cells (mirrored in RTL); Ctrl+Home/End jump rows; Enter commits; Alt+Up commits and closes; Escape closes, then clears; Backspace removes the last chip.',
        },
      ],
    },
  ],
};

export const OGE_REACT_RATING_API: ApiSections = {
  properties: [
    {
      title: 'OgeRating',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'number | null',
          default: 'null',
          description:
            'The rating — controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>; <code>null</code> means not rated. Snapped to <code>precision</code> inside <code>0…max</code>.',
        },
        {
          name: 'max',
          type: 'number',
          default: '5',
          description: 'Number of items (stars).',
        },
        {
          name: 'precision',
          type: 'number',
          default: '1',
          description:
            'Value step: <code>1</code> whole items, <code>0.5</code> halves, <code>0.1</code> tenths (at least <code>0.01</code>). A pointer press rounds up to the next step inside the item.',
        },
        {
          name: 'allowClear',
          type: 'boolean',
          default: 'true',
          description:
            'A press on the current value — or Delete / Backspace / <code>0</code> — clears it; also lowers <code>aria-valuemin</code> to 0.',
        },
        {
          name: 'icon',
          type: 'OgeRatingIcon',
          default: "'star'",
          description:
            "The built-in glyph: <code>'star' | 'heart' | 'circle'</code>. <code>renderItem</code> replaces it.",
        },
        {
          name: 'selection',
          type: 'OgeRatingSelection',
          default: "'continuous'",
          description:
            "<code>'continuous'</code> paints every item up to the value; <code>'single'</code> only the item holding it (a pick-one scale).",
        },
        {
          name: 'semantics',
          type: 'OgeRatingSemantics',
          default: "'slider'",
          description:
            "<code>'slider'</code> — one APG slider, any precision; <code>'radiogroup'</code> — one radio per item with a roving tab stop (whole-item precision only, otherwise the slider).",
        },
        {
          name: 'hoverPreview',
          type: 'boolean',
          default: 'true',
          description:
            'Paints the value under a mouse pointer before it is pressed.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name; empty falls back to the <code>ratingLabel</code> message.',
        },
        {
          name: 'locale',
          type: 'string',
          description:
            'Locale of the spoken value (<code>aria-valuetext</code>); falls back to the config <code>locale</code>.',
        },
        {
          name: 'renderItem',
          type: '(state: OgeRatingItemState, ctx: { filled; hovered }) =&gt; ReactNode',
          description:
            'Custom glyph per item — called for the empty and the filled (clipped) layer, so fractional fills work with any markup.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Item size preset — 18 / 24 / 32px.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeRating callbacks',
      entries: [
        {
          name: 'onHoverChange',
          type: '(event: OgeRatingHoverEvent) =&gt; void',
          description:
            'The pointer previews another value — <code>{ value, event }</code>, <code>value: null</code> once it leaves.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Rating types',
      entries: [
        {
          name: 'OgeRatingHandle',
          type: '{ focus(); blur(); clear() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeRatingItemState',
          type: '{ index; itemValue; fill; full; partial }',
          description:
            'One item: zero-based <code>index</code>, the <code>itemValue</code> a full press commits, the filled share <code>fill</code> (0…1).',
        },
        {
          name: 'OgeRatingItemRenderContext',
          type: '{ filled: boolean; hovered: boolean }',
          description: 'Second argument of <code>renderItem</code>.',
        },
        {
          name: 'OgeRatingIcon',
          type: "'star' | 'heart' | 'circle'",
          description: 'The built-in glyphs.',
        },
        {
          name: 'OgeRatingSelection',
          type: "'continuous' | 'single'",
          description: 'How the value is painted.',
        },
        {
          name: 'OgeRatingSemantics',
          type: "'slider' | 'radiogroup'",
          description: 'The ARIA pattern rendered.',
        },
        {
          name: 'OgeRatingHoverEvent',
          type: '{ value: number | null; event: Event }',
          description: 'Payload of <code>onHoverChange</code>.',
        },
        {
          name: 'Keyboard',
          type: 'APG slider / radio group',
          description:
            'Slider: ArrowRight/ArrowUp step up by <code>precision</code>, ArrowLeft/ArrowDown down (horizontal arrows mirror in RTL), PageUp/PageDown by one item, Home/End, digits <code>1</code>–<code>9</code> jump, Delete/Backspace/<code>0</code> clear. Radio group: arrows move and select with wrapping, Home/End, Space.',
        },
        {
          name: 'Messages',
          type: 'OgeInputsMessages',
          description:
            '<code>ratingLabel</code>, <code>ratingValueText</code> (<code>{value}</code> / <code>{max}</code>, or an ICU plural) and <code>ratingNoValueText</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_OTP_INPUT_API: ApiSections = {
  properties: [
    {
      title: 'OgeOtpInput',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'string',
          default: "''",
          description:
            'The characters entered — always a contiguous prefix, so <code>value.length === length</code> means complete. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'length',
          type: 'number',
          default: '6',
          description: 'Number of cells (1–12).',
        },
        {
          name: 'type',
          type: 'OgeOtpInputType',
          default: "'numeric'",
          description:
            "Accepted characters: <code>'numeric'</code> (script and full-width digits fold to ASCII), <code>'alphanumeric'</code> or <code>'alphabetic'</code>. Rejected characters never land.",
        },
        {
          name: 'letterCase',
          type: 'OgeOtpInputCase',
          default: "'none'",
          description:
            "<code>'upper'</code> / <code>'lower'</code> applied to typed and pasted letters.",
        },
        {
          name: 'masked',
          type: 'boolean',
          default: 'false',
          description: 'Hides the characters like a password field (PINs).',
        },
        {
          name: 'groupSize',
          type: 'number',
          default: '0',
          description:
            'Draws <code>separator</code> after every <code>groupSize</code> cells (<code>3</code> → 123–456); <code>0</code> = none.',
        },
        {
          name: 'separator',
          type: 'string',
          default: "'–'",
          description:
            'Separator glyph between groups — decorative, hidden from assistive technology.',
        },
        {
          name: 'placeholder',
          type: 'string',
          default: "''",
          description: 'Placeholder character shown in empty cells.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Visible group label and the group’s accessible name; empty falls back to the <code>otpLabel</code> message.',
        },
        {
          name: 'hint',
          type: 'string',
          description:
            'Helper text under the cells (hidden while an error shows).',
        },
        {
          name: 'locale',
          type: 'string',
          description:
            'Locale of the cell names’ digits; falls back to the config <code>locale</code>.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Cell size preset.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeOtpInput callbacks',
      entries: [
        {
          name: 'onCompleted',
          type: '(event: OgeOtpCompletedEvent) =&gt; void',
          description:
            'Every cell got filled — by typing, a paste or the SMS autofill: <code>{ value, event }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'OTP input types',
      entries: [
        {
          name: 'OgeOtpInputHandle',
          type: '{ focus(); blur(); clear() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeOtpInputType',
          type: "'numeric' | 'alphanumeric' | 'alphabetic'",
          description: 'Which characters a cell accepts.',
        },
        {
          name: 'OgeOtpInputCase',
          type: "'none' | 'upper' | 'lower'",
          description: 'Letter case applied to accepted letters.',
        },
        {
          name: 'OgeOtpCompletedEvent',
          type: '{ value: string; event: Event | undefined }',
          description: 'Payload of <code>onCompleted</code>.',
        },
        {
          name: 'Keyboard',
          type: 'one Tab stop',
          description:
            'Only the caret cell is tabbable. Typing fills and advances, Backspace clears and steps back, Delete closes the gap, ArrowLeft/ArrowRight (RTL-mirrored) and Home/End move; a cell past the first empty one hands the focus back to it.',
        },
        {
          name: 'Autofill',
          type: 'autocomplete="one-time-code"',
          description:
            'On the first cell, so iOS/Android SMS suggestions fill the whole code; a paste of a whole code always fills from the first cell.',
        },
        {
          name: 'Messages',
          type: 'OgeInputsMessages',
          description:
            '<code>otpLabel</code> (group name without a <code>label</code>) and <code>otpCellLabel</code> (<code>{index}</code> / <code>{length}</code>).',
        },
      ],
    },
  ],
};

const REACT_LIST_BOX_KEYBOARD = {
  name: 'Keyboard',
  type: 'APG listbox',
  description:
    'One Tab stop (<code>aria-activedescendant</code>). ↑/↓, Home/End, PageUp/PageDown move the active option — in <code>single</code> mode the selection follows. Typing jumps by prefix (accent-insensitive; repeat a letter to cycle). Multiple: Space/Enter toggle, Shift+↑/↓ and Shift+Space extend from the anchor, Ctrl+Shift+Home/End select to an edge, Ctrl+A (⌘A) selects all — or none when all are selected. In the search field ↓ moves into the list.',
};

export const OGE_REACT_LIST_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeListBox',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'unknown',
          default: 'null',
          description:
            'The selection — one <code>valueExpr</code> result (or <code>null</code>) in single mode, an items-ordered array in multiple mode. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[]',
          default: '[]',
          description: 'The options.',
        },
        {
          name: 'displayExpr / valueExpr / disabledExpr',
          type: 'shared with OgeSelectBox',
          description:
            'Field-name string or function expressions; disabled options are skipped by the keyboard and keep their state.',
        },
        {
          name: 'groupBy',
          type: 'OgeSelectGroupExpr&lt;TItem&gt; | undefined',
          description:
            'Groups the options under headers (first-seen group order); each group is a <code>role="group"</code> labelled by its header.',
        },
        {
          name: 'selectionMode',
          type: 'OgeListBoxSelectionMode',
          default: "'single'",
          description:
            "<code>'single'</code> (selection follows focus) or <code>'multiple'</code> (<code>aria-multiselectable</code>).",
        },
        {
          name: 'showCheckBoxes',
          type: 'boolean',
          default: 'false',
          description: 'A check glyph on every option (multiple mode only).',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'A search field above the list that filters the options.',
        },
        {
          name: 'searchExpr / searchMode',
          type: "OgeSelectSearchExpr&lt;TItem&gt; / 'contains' | 'startswith'",
          default: "— / 'contains'",
          description:
            'Which text the search matches (default: the display text) and how.',
        },
        {
          name: 'searchPlaceholder',
          type: 'string | undefined',
          description:
            'Placeholder of the search field; <code>undefined</code> = the <code>listBoxSearchPlaceholder</code> message.',
        },
        {
          name: 'height',
          type: 'number | string | undefined',
          description:
            'Maximum list height — a px number or any CSS length; the list scrolls past it (default 280px).',
        },
        {
          name: 'noDataText',
          type: 'string | undefined',
          description:
            'Text while there are no (matching) options; <code>undefined</code> = the <code>noDataText</code> message.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Visible label above the list and its accessible name; without one the list is named by the <code>listBoxLabel</code> message.',
        },
        {
          name: 'labelledBy',
          type: 'string | undefined',
          description:
            'Id of an external element naming the list (overrides <code>label</code>) — what the transfer list uses for its titles.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Helper text under the list, hidden while an error shows.',
        },
        {
          name: 'keyShortcuts',
          type: 'string | undefined',
          description:
            'Shortcuts a host handles on the list, advertised as <code>aria-keyshortcuts</code>.',
        },
        {
          name: 'renderItem',
          type: '(item: TItem, context: OgeListBoxRenderItemContext) =&gt; ReactNode',
          description:
            'Option content — the render prop replacing Angular’s <code>itemTemplate</code>; context <code>{ index, selected, active, disabled }</code>. The option keeps its role, state and check glyph.',
        },
        {
          name: 'renderGroup',
          type: '(label: string, context: { count }) =&gt; ReactNode',
          description:
            'Group header content — the render prop replacing Angular’s <code>groupTemplate</code>.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeListBox handle',
      entries: [
        {
          name: 'selectAll() / unselectAll()',
          type: 'void',
          description:
            'Selects / deselects every enabled option (disabled options keep their state).',
        },
        {
          name: 'scrollToItem(item: TItem): void',
          type: 'void',
          description:
            'Makes the item the active option and scrolls it into view.',
        },
        {
          name: 'search(text: string): void',
          type: 'void',
          description:
            "Sets the search text programmatically; <code>''</code> clears the filter.",
        },
        {
          name: 'getVisibleItems() / getSelectedItems()',
          type: 'readonly TItem[] / TItem[]',
          description:
            'The options currently shown (after the search) in display order / the selected items in items order.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeListBox callbacks',
      entries: [
        {
          name: 'onSelectionChange',
          type: '(event: OgeListBoxSelectionChangeEvent&lt;TItem&gt;) =&gt; void',
          description:
            'The selection changed — <code>{ value, previousValue, addedItems, removedItems, event }</code>.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeListBoxItemClickEvent&lt;TItem&gt;) =&gt; void',
          description:
            'An enabled option was clicked — <code>{ item, index, event }</code> (fires in read-only mode too).',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'List box types',
      entries: [
        {
          name: 'OgeListBoxSelectionMode',
          type: "'single' | 'multiple'",
          description: 'The selection model.',
        },
        {
          name: 'OgeListBoxHandle',
          type: '{ focus(); blur(); clear(); selectAll(); unselectAll(); scrollToItem(); search(); getVisibleItems(); getSelectedItems() }',
          description: 'The imperative handle.',
        },
        {
          name: 'OgeListBoxRenderItemContext',
          type: '{ index; selected; active; disabled }',
          description: 'Context of <code>renderItem</code>.',
        },
        {
          name: 'OgeListBoxSelectionChangeEvent / OgeListBoxItemClickEvent',
          type: 'callback payloads',
          description: 'See the callbacks table.',
        },
        REACT_LIST_BOX_KEYBOARD,
      ],
    },
  ],
};

export const OGE_REACT_TRANSFER_LIST_API: ApiSections = {
  properties: [
    {
      title: 'OgeTransferList',
      entries: [
        {
          name: 'value / defaultValue',
          type: 'readonly unknown[]',
          default: '[]',
          description:
            'The target side — the moved items’ <code>valueExpr</code> results in arrival order. Controlled with <code>onValueChange</code>, or uncontrolled from <code>defaultValue</code>.',
        },
        {
          name: 'items',
          type: 'readonly TItem[]',
          default: '[]',
          description:
            'Every item; those not in <code>value</code> form the source list (items order).',
        },
        {
          name: 'displayExpr / valueExpr / disabledExpr',
          type: 'shared with OgeSelectBox',
          description:
            'Field-name string or function expressions; disabled items cannot be selected or moved.',
        },
        {
          name: 'groupBy',
          type: 'OgeSelectGroupExpr&lt;TItem&gt; | undefined',
          description: 'Groups both lists’ options under headers.',
        },
        {
          name: 'sourceTitle / targetTitle',
          type: 'string | undefined',
          description:
            'List titles (and accessible names); <code>undefined</code> = the <code>transferSourceTitle</code> / <code>transferTargetTitle</code> messages.',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'A search field above each list; the move-all buttons move what a list shows.',
        },
        {
          name: 'searchExpr / searchMode',
          type: "OgeSelectSearchExpr&lt;TItem&gt; / 'contains' | 'startswith'",
          default: "— / 'contains'",
          description: 'Which text the search matches and how.',
        },
        {
          name: 'showCheckBoxes',
          type: 'boolean',
          default: 'false',
          description: 'Check glyphs on the options of both lists.',
        },
        {
          name: 'height',
          type: 'number | string | undefined',
          description: 'Maximum height of each list — px number or CSS length.',
        },
        {
          name: 'noDataText',
          type: 'string | undefined',
          description: 'Text of an empty list.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Visible label above both lists; the <code>role="group"</code>’s accessible name.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Helper text under the lists, hidden while an error shows.',
        },
        {
          name: 'renderItem / renderGroup',
          type: 'render props',
          description:
            'Option / group header content for both lists — the render props of <code>&lt;OgeListBox&gt;</code>.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeTransferList handle',
      entries: [
        {
          name: 'moveSelectedToTarget() / moveAllToTarget()',
          type: 'void',
          description:
            'Moves the source selection / every shown, enabled source item to the target list.',
        },
        {
          name: 'moveSelectedToSource() / moveAllToSource()',
          type: 'void',
          description:
            'Moves the target selection / every shown, enabled target item back to the source list.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeTransferList callbacks',
      entries: [
        {
          name: 'onMoving',
          type: '(event: OgeTransferListMovingEvent&lt;TItem&gt;) =&gt; void',
          description:
            "Cancelable pre-event of every move — <code>{ items, values, from, to, cause, cancel }</code>; <code>cause</code> is <code>'button' | 'keyboard' | 'drag'</code>.",
        },
        {
          name: 'onMoved',
          type: '(event: OgeTransferListMovedEvent&lt;TItem&gt;) =&gt; void',
          description:
            'Items changed sides — <code>{ items, values, from, to, cause, value }</code>, after the commit and the live announcement.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Transfer list types',
      entries: [
        {
          name: 'OgeTransferListSide',
          type: "'source' | 'target'",
          description: 'One side of the transfer list.',
        },
        {
          name: 'OgeTransferListMoveCause',
          type: "'button' | 'keyboard' | 'drag'",
          description:
            'What triggered a move — all three run the same move path.',
        },
        {
          name: 'Keyboard',
          type: 'listbox + shortcuts',
          description:
            'Every list box key on each list, plus Ctrl/⌘+→ (from the source) / Ctrl/⌘+← (from the target) to move the selection toward the other list — with Shift, everything shown. Visual arrows, mirrored in RTL, advertised with <code>aria-keyshortcuts</code>.',
        },
        {
          name: 'Drag and drop',
          type: 'beginPointerDragDrop',
          description:
            'Drag an option (or the selection it belongs to) onto the other list — mouse and pen at once, touch after a long press; Escape cancels. The drop runs the same move as the buttons.',
        },
        {
          name: 'OgeTransferListHandle',
          type: '{ focus(); blur(); moveSelectedToTarget(); moveAllToTarget(); moveSelectedToSource(); moveAllToSource() }',
          description: 'The imperative handle.',
        },
        {
          name: 'Announcements',
          type: 'useOgeLiveAnnouncer',
          description:
            'Every move is announced politely through the shared live announcer (<code>transferMovedAnnouncement</code>, an ICU plural).',
        },
      ],
    },
  ],
};

const REACT_SIGNATURE_TYPES: ApiGroup = {
  title: 'Signature pad types',
  entries: [
    {
      name: 'OgeSignaturePadHandle',
      type: '{ focus(); blur(); clear(); undo(); toDataUrl(format?); toSvg(); isEmpty(); setMode(mode) }',
      description: 'Imperative handle exposed through <code>ref</code>.',
    },
    {
      name: 'OgeSignatureFormat',
      type: "'png' | 'svg'",
      description:
        'Export format. PNG renders through a canvas (falling back to SVG where no 2D context exists, e.g. SSR or jsdom); SVG is built without the DOM and embeds the strokes, so the value restores an editable pad.',
    },
    {
      name: 'OgeSignatureMode',
      type: "'draw' | 'type'",
      description:
        'Pointer drawing, or the keyboard-accessible typed signature (a labelled text field rendered in <code>fontFamily</code>).',
    },
    {
      name: 'OgeSignatureStroke',
      type: '{ points: readonly OgeSignaturePoint[] }',
      description: 'One pen-down → pen-up trace.',
    },
    {
      name: 'OgeSignaturePoint',
      type: '{ x: number; y: number; t: number }',
      description:
        'A sample in surface-relative coordinates (<code>0..1</code> on both axes) with its time in ms.',
    },
    {
      name: 'OgeSignatureStrokeEvent',
      type: '{ stroke: OgeSignatureStroke; strokeCount: number; event: Event | undefined }',
      description: 'Payload of <code>onStrokeEnded</code>.',
    },
    {
      name: 'Keyboard',
      type: 'buttons + text field',
      description:
        'Draw / Type is a pressed-state button pair; Undo (also <kbd>Ctrl</kbd>+<kbd>Z</kbd> anywhere in the pad) and Clear are real buttons; <kbd>Escape</kbd> mid-stroke cancels the stroke. Any external image <code>value</code> passes <code>sanitizeResourceUrl</code> before it becomes an <code>&lt;img src&gt;</code>.',
    },
  ],
};

export const OGE_REACT_SIGNATURE_PAD_API: ApiSections = {
  properties: [
    {
      title: 'OgeSignaturePad',
      entries: [
        {
          name: 'value',
          type: 'string | null',
          description:
            'The signature as a <code>data:</code> URL in <code>format</code> — controlled when provided (<code>defaultValue</code> for uncontrolled). Writing a stored value back restores the pad’s own SVG export as strokes; any other image URL is shown (sanitized) until the next stroke replaces it.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Accessible name of the pad; falls back to the <code>signatureLabel</code> message.',
        },
        {
          name: 'placeholder',
          type: 'string',
          description:
            'Text on the empty pad; <code>undefined</code> = the <code>signaturePlaceholder</code> message (“Sign here”), an empty string hides it.',
        },
        {
          name: 'format',
          type: 'OgeSignatureFormat',
          default: "'png'",
          description:
            'Export format of <code>value</code> and of <code>toDataUrl()</code> without an argument.',
        },
        {
          name: 'mode',
          type: 'OgeSignatureMode',
          default: "'draw'",
          description:
            'Draw with a pointer or type a name — controlled when provided (<code>defaultMode</code> + <code>onModeChange</code>).',
        },
        {
          name: 'allowTyping',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the Draw / Type switch — the keyboard-accessible alternative (WCAG 2.1.1).',
        },
        {
          name: 'height',
          type: 'number',
          default: '160',
          description:
            'Surface height in px; the width follows the host (<code>--oge-signature-pad-width</code>, 420px).',
        },
        {
          name: 'strokeColor',
          type: 'string',
          description:
            'Ink colour; <code>undefined</code> = the <code>--oge-signature-ink</code> token.',
        },
        {
          name: 'backgroundColor',
          type: 'string',
          description:
            'Background baked into the export; <code>undefined</code> = transparent.',
        },
        {
          name: 'minWidth',
          type: 'number',
          default: '1',
          description:
            'Thinnest stroke width in px — reached at high pen speed.',
        },
        {
          name: 'maxWidth',
          type: 'number',
          default: '3',
          description:
            'Thickest stroke width in px — reached when the pen moves slowly.',
        },
        {
          name: 'fontFamily',
          type: 'string',
          default: "script stack + 'cursive'",
          description:
            'Font of a typed signature, on screen and in the export.',
        },
      ],
    },
    HOST_PROPS,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSignaturePad handle',
      entries: [
        {
          name: 'undo()',
          type: '() =&gt; void',
          description: 'Removes the last stroke and re-exports the value.',
        },
        {
          name: 'toDataUrl(format?)',
          type: '(format?: OgeSignatureFormat) =&gt; string | null',
          description:
            'The signature as a <code>data:</code> URL (default: <code>format</code>); <code>null</code> when empty.',
        },
        {
          name: 'toSvg()',
          type: '() =&gt; string | null',
          description:
            'The signature as an SVG document string; <code>null</code> when empty.',
        },
        {
          name: 'setMode(mode)',
          type: '(mode: OgeSignatureMode) =&gt; void',
          description:
            'Switches between drawing and typing, re-exporting the value.',
        },
        {
          name: 'isEmpty()',
          type: '() =&gt; boolean',
          description: 'No signature (<code>value === null</code>).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeSignaturePad callbacks',
      entries: [
        {
          name: 'onStrokeEnded',
          type: '(event: OgeSignatureStrokeEvent) =&gt; void',
          description: 'A stroke was completed (pen up) and committed.',
        },
        {
          name: 'onModeChange',
          type: '(mode: OgeSignatureMode) =&gt; void',
          description: 'The controlled half of <code>mode</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [REACT_SIGNATURE_TYPES],
};

const REACT_MENTION_TYPES: ApiGroup = {
  title: 'Mention types',
  entries: [
    {
      name: 'OgeMentionHandle',
      type: '{ focus(); blur(); clear(); close() }',
      description: 'Imperative handle exposed through <code>ref</code>.',
    },
    {
      name: 'OgeMentionTrigger&lt;T&gt;',
      type: '{ char: string; items: OgeMentionItemsSource&lt;T&gt;; displayExpr?; valueExpr?; searchExpr? }',
      description: 'One trigger character and the items it suggests.',
    },
    {
      name: 'OgeMentionItemsSource&lt;T&gt;',
      type: 'readonly T[] | ((query: string) =&gt; readonly T[] | PromiseLike&lt;readonly T[]&gt;)',
      description:
        'A list filtered locally by the query, or a function of the query (debounced by <code>searchTimeout</code>; stale answers are dropped) returning the filtered items.',
    },
    {
      name: 'OgeMentionToken&lt;T&gt;',
      type: '{ trigger: string; item: T; value: unknown; text: string; start: number; end: number }',
      description:
        'An inserted mention — the item, its <code>valueExpr</code> value, the inserted text and its <code>[start, end)</code> range. Tokens shift with edits before them and drop out when edited.',
    },
    {
      name: 'OgeMentionSelectedEvent&lt;T&gt;',
      type: '{ token: OgeMentionToken&lt;T&gt;; item: T; event: Event | undefined }',
      description: 'Payload of <code>onMentionSelected</code>.',
    },
    {
      name: 'OgeMentionSearchChangedEvent',
      type: '{ trigger: string; text: string }',
      description: 'Payload of <code>onSearchChange</code>.',
    },
    {
      name: 'OgeMentionItemContext&lt;T&gt;',
      type: '{ item: T; index: number; trigger: string; query: string; active: boolean }',
      description: 'Second argument of <code>renderItem</code>.',
    },
    {
      name: 'Keyboard',
      type: 'APG combobox',
      description:
        '<kbd>ArrowDown</kbd>/<kbd>ArrowUp</kbd> move the active suggestion, <kbd>PageUp</kbd>/<kbd>PageDown</kbd> jump to the ends, <kbd>Enter</kbd> or <kbd>Tab</kbd> insert, <kbd>Escape</kbd> closes until the next trigger. The single-line field is <code>role="combobox"</code>; the text area keeps its textbox role with <code>aria-autocomplete</code>, <code>aria-controls</code> and <code>aria-activedescendant</code>.',
    },
  ],
};

export const OGE_REACT_MENTION_API: ApiSections = {
  properties: [
    {
      title: 'OgeMention',
      entries: [
        {
          name: 'value',
          type: 'string',
          description:
            'The text, mentions included as plain-text tokens — controlled when provided (<code>defaultValue</code> for uncontrolled).',
        },
        {
          name: 'mentions',
          type: 'readonly OgeMentionToken&lt;T&gt;[]',
          description:
            'The inserted mentions in text order — controlled when provided (<code>defaultMentions</code> + <code>onMentionsChange</code>), kept in step with every edit.',
        },
        {
          name: 'triggers',
          type: 'readonly OgeMentionTrigger&lt;T&gt;[]',
          description:
            'Several trigger characters with their own items and expressions; overrides the single-trigger shorthand below.',
        },
        {
          name: 'items',
          type: 'OgeMentionItemsSource&lt;T&gt;',
          default: '[]',
          description:
            'Shorthand single trigger: its suggestions — a list or a function of the query.',
        },
        {
          name: 'trigger',
          type: 'string',
          default: "'@'",
          description: 'Shorthand single trigger: its character.',
        },
        {
          name: 'displayExpr',
          type: 'OgeSelectDisplayExpr&lt;T&gt;',
          description:
            'Shorthand: item → display text, also the inserted token text.',
        },
        {
          name: 'valueExpr',
          type: 'OgeSelectValueExpr&lt;T&gt;',
          description:
            'Shorthand: item → the <code>value</code> reported in <code>mentions</code> (default: the item).',
        },
        {
          name: 'searchExpr',
          type: 'OgeSelectSearchExpr&lt;T&gt;',
          description:
            'Shorthand: which text the local filter matches (default: the display text).',
        },
        {
          name: 'searchMode',
          type: 'OgeSelectSearchMode',
          default: "'contains'",
          description: 'Substring or prefix matching of local items.',
        },
        {
          name: 'minSearchLength',
          type: 'number',
          default: '0',
          description:
            'Characters required after the trigger before suggestions show.',
        },
        {
          name: 'maxSuggestions',
          type: 'number',
          default: '8',
          description: 'Caps the suggestion list.',
        },
        {
          name: 'allowSpaces',
          type: 'boolean',
          default: 'false',
          description:
            'Lets a query run across spaces; line breaks always end it.',
        },
        {
          name: 'insertSpace',
          type: 'boolean',
          default: 'true',
          description:
            'Adds a space after the inserted token (unless one follows already).',
        },
        {
          name: 'searchTimeout',
          type: 'number',
          description:
            'Debounce (ms) before a query function is called; <code>undefined</code> = the config <code>searchTimeoutMs</code> (250).',
        },
        {
          name: 'multiline',
          type: 'boolean',
          default: 'true',
          description:
            'A text area (<code>true</code>) or a single-line combobox field.',
        },
        {
          name: 'rows',
          type: 'number',
          default: '3',
          description: 'Visible rows of the text area.',
        },
        {
          name: 'maxLength',
          type: 'number',
          description: 'Native <code>maxlength</code>.',
        },
        {
          name: 'spellcheck',
          type: 'boolean',
          default: 'true',
          description: 'Native <code>spellcheck</code>.',
        },
        {
          name: 'dropdownMaxHeight',
          type: 'number',
          description:
            'Suggestion list height cap; <code>undefined</code> = the CSS default (320px).',
        },
        {
          name: 'renderItem',
          type: '(item: T, context: OgeMentionItemContext&lt;T&gt;) =&gt; ReactNode',
          description: 'Custom suggestion row.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMention handle',
      entries: [
        {
          name: 'close()',
          type: '() =&gt; void',
          description: 'Closes the suggestion list.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeMention callbacks',
      entries: [
        {
          name: 'onMentionSelected',
          type: '(event: OgeMentionSelectedEvent&lt;T&gt;) =&gt; void',
          description: 'A suggestion was inserted.',
        },
        {
          name: 'onMentionsChange',
          type: '(mentions: readonly OgeMentionToken&lt;T&gt;[]) =&gt; void',
          description:
            'The controlled half of <code>mentions</code> — after an insert and after an edit that shifted or dropped a mention.',
        },
        {
          name: 'onSearchChange',
          type: '(event: OgeMentionSearchChangedEvent) =&gt; void',
          description:
            'The query after a trigger changed — drive your own server-side suggestions from here.',
        },
      ],
    },
    FIELD_EVENTS,
  ],
  types: [REACT_MENTION_TYPES],
};
