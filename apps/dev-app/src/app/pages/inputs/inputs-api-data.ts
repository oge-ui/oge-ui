import type { ApiGroup, ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/inputs/src/** — keep in sync with the source
 * TSDoc. Members shared by all three editors live on the (internal)
 * OgeInputBase class and are listed once as "Common" groups.
 */

const COMMON_CHROME: ApiGroup = {
  title: 'Common — field chrome (all editors)',
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
      type: 'string | undefined',
      description:
        'Helper text in the subscript region (hidden while an error shows).',
    },
    {
      name: 'tooltip',
      type: 'string | undefined',
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
      type: 'number | string | undefined',
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
      name: 'showSuccessIcon',
      type: 'OgeInputShowSuccessIcon',
      default: 'false',
      description:
        'Success icon when valid: <code>false</code> / on touch / always.',
    },
    {
      name: 'id',
      type: 'string | undefined',
      description:
        'Base for the generated element ids (input/label/hint/error/counter).',
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
      name: 'selectOnFocus',
      type: 'boolean',
      default: 'false',
      description: 'Selects the whole text when the input receives focus.',
    },
    {
      name: 'inputAttr',
      type: 'Record&lt;string, string&gt;',
      default: '{}',
      description:
        'Escape hatch: extra attributes rendered onto the native input (template-owned attributes are ignored).',
    },
    {
      name: 'messages',
      type: 'Partial&lt;OgeInputsMessages&gt; | undefined',
      description: 'Per-instance overrides of user-facing strings.',
    },
  ],
};

const COMMON_STATE: ApiGroup = {
  title: 'Common — state & forms (all editors)',
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
      description: 'External invalid override — combined with forms state.',
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
      description: 'External touched override (Signal Forms contract).',
    },
    {
      name: 'dirty',
      type: 'boolean',
      default: 'false',
      description: 'External dirty override (Signal Forms contract).',
    },
    {
      name: 'errors',
      type: 'readonly OgeFieldError[]',
      default: '[]',
      description:
        'Signal Forms validation errors (auto-bound by <code>[formField]</code>).',
    },
    {
      name: 'errorText',
      type: 'string | undefined',
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
      type: 'number | undefined',
      description:
        'Commit delay in ms for <code>value</code>/forms updates; blur and Enter flush immediately.',
    },
  ],
};

const COMMON_METHODS: ApiGroup = {
  title: 'Common (all editors)',
  entries: [
    {
      name: 'focus(): void',
      type: 'void',
      description: 'Moves keyboard focus to the native input.',
    },
    {
      name: 'blur(): void',
      type: 'void',
      description: 'Blurs the native input.',
    },
    {
      name: 'clear(): void',
      type: 'void',
      description:
        'Clears the value (commits immediately), keeps focus in the field; no-op when disabled/readonly.',
    },
    {
      name: 'reset(value?: T): void',
      type: 'void',
      description:
        'Returns the field to pristine: sets <code>value</code> (default: empty), clears touched/dirty/parse errors, cancels pending commits. On a reactive-forms-bound editor resets the control itself.',
    },
  ],
};

const COMMON_EVENTS: ApiGroup = {
  title: 'Common (all editors)',
  entries: [
    {
      name: 'valueCommitted',
      type: 'OgeInputValueCommittedEvent&lt;T&gt;',
      description:
        'Every committed change with <code>previousValue</code> + originating DOM event (<code>undefined</code> for programmatic writes) — the reference <code>onValueChanged</code> shape.',
    },
    {
      name: 'inputChange',
      type: 'OgeInputRawEvent',
      description: 'Raw text on every keystroke, regardless of commit policy.',
    },
    {
      name: 'cleared',
      type: 'void',
      description: 'Value cleared via the clear button / <code>clear()</code>.',
    },
    {
      name: 'enterKey',
      type: 'OgeInputKeyEvent',
      description:
        'Enter pressed inside the editor (pending debounce is flushed first).',
    },
    {
      name: 'focused',
      type: 'OgeInputFocusEvent',
      description: 'The editor received focus.',
    },
    {
      name: 'blurred',
      type: 'OgeInputFocusEvent',
      description: 'The editor lost focus.',
    },
    {
      name: 'touch',
      type: 'void',
      description:
        'Signal Forms <code>FormValueControl</code> contract — emitted once per blur.',
    },
    {
      name: 'valueChange',
      type: 'T',
      description: 'Implicit output of the <code>value</code> model.',
    },
  ],
};

const TEXT_BOX_MASK: ApiGroup = {
  title: 'Mask',
  entries: [
    {
      name: 'mask',
      type: 'string | undefined',
      description:
        'Input mask — <code>0</code> digit, <code>9</code> optional digit, <code>#</code> digit/space/sign, <code>L</code>/<code>l</code> letter (required/optional, any script), <code>A</code>/<code>a</code> letter or digit, <code>C</code>/<code>c</code> any character, a backslash escapes a literal; every other character is a literal. Typing overwrites slot by slot and skips literals, Backspace/Delete empty a slot without shifting the rest, paste accepts raw or formatted text, IME composition is applied at <code>compositionend</code>. <code>undefined</code> = a plain text box.',
    },
    {
      name: 'maskRules',
      type: 'OgeMaskRules',
      description:
        'Extra or overriding single-character rules — a one-character <code>RegExp</code>, a string of allowed characters or a predicate; custom slots are always required.',
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
        'Commit the formatted text with literals (<code>(555) 123-4567</code>) instead of the raw characters — DevExtreme <code>useMaskedValue</code>.',
    },
    {
      name: 'maskInvalidMessage',
      type: 'string | undefined',
      description:
        'Error shown while required slots are empty (after blur, per <code>errorDisplay</code>); falls back to <code>messages.maskInvalidError</code>. A reactive control also gets a <code>{ mask }</code> validator attached.',
    },
    {
      name: 'maskValidation',
      type: 'boolean',
      default: 'true',
      description:
        'The built-in “required slots are filled” check (Kendo <code>maskValidation</code>): the field error and the reactive-forms <code>{ mask }</code> validator. <code>false</code> leaves completeness to your own validators.',
    },
  ],
};

const MASK_METHODS: ApiGroup = {
  title: 'Mask',
  entries: [
    {
      name: 'isMaskComplete(): boolean',
      type: 'boolean',
      description:
        '<code>true</code> unless a mask is set and a required slot of the entered value is empty (an empty field counts as complete — leave that to <code>required</code>).',
    },
  ],
};

const MASK_EVENTS: ApiGroup = {
  title: 'Mask',
  entries: [
    {
      name: 'maskCompleted',
      type: 'OgeMaskCompletedEvent',
      description:
        'The last required mask slot was filled — <code>{ value, rawValue, maskedValue }</code>.',
    },
  ],
};

export const OGE_TEXT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeTextBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description: 'Editor value — two-way.',
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
          type: 'number | undefined',
          description:
            "Counter denominator; enforced natively while <code>counterMode</code> is <code>'limit'</code>.",
        },
        {
          name: 'minLength',
          type: 'number | undefined',
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
          type: 'string | undefined',
          description: 'Native <code>autocomplete</code> attribute.',
        },
        {
          name: 'inputMode',
          type: 'string | undefined',
          description: 'Native <code>inputmode</code> attribute.',
        },
        {
          name: 'enterKeyHint',
          type: 'string | undefined',
          description: 'Native <code>enterkeyhint</code> attribute.',
        },
        {
          name: 'autocapitalize',
          type: 'string | undefined',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
        {
          name: 'spellcheck',
          type: 'boolean | undefined',
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
  events: [MASK_EVENTS, COMMON_EVENTS],
};

export const OGE_MASKED_TEXT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeMaskedTextBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description:
            'Editor value — two-way. The raw characters, or the formatted text with <code>includeLiterals</code>.',
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
            'Extra or overriding single-character rules — a one-character <code>RegExp</code>, a string of allowed characters or a predicate; custom slots are always required.',
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
            'Commit the formatted text with literals (<code>(555) 123-4567</code>) instead of the raw characters — DevExtreme <code>useMaskedValue</code>.',
        },
        {
          name: 'maskInvalidMessage',
          type: 'string | undefined',
          description:
            'Error shown while required slots are empty (after blur, per <code>errorDisplay</code>); falls back to <code>messages.maskInvalidError</code>. A reactive control also gets a <code>{ mask }</code> validator attached.',
        },
        {
          name: 'maskValidation',
          type: 'boolean',
          default: 'true',
          description:
            'The built-in “required slots are filled” check (Kendo <code>maskValidation</code>): the field error and the reactive-forms <code>{ mask }</code> validator. <code>false</code> leaves completeness to your own validators.',
        },
        {
          name: 'spellcheck',
          type: 'boolean | undefined',
          default: 'false',
          description: 'Off by default — masked values are codes, not words.',
        },
        {
          name: 'autocomplete',
          type: 'string | undefined',
          default: "'off'",
          description:
            "Off by default; set e.g. <code>'tel-national'</code> to let the browser offer phone numbers.",
        },
        {
          name: 'inputMode',
          type: 'string | undefined',
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
          type: 'string | undefined',
          description: 'Native <code>enterkeyhint</code> attribute.',
        },
        {
          name: 'autocapitalize',
          type: 'string | undefined',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMaskedTextBox',
      entries: [
        {
          name: 'rawValue(): string',
          type: 'string',
          description:
            'The entered characters without literals, whatever <code>includeLiterals</code> says.',
        },
        {
          name: 'maskedValue(): string',
          type: 'string',
          description:
            "The formatted text with literals (<code>''</code> while empty), whatever <code>includeLiterals</code> says.",
        },
        ...MASK_METHODS.entries,
      ],
    },
    COMMON_METHODS,
  ],
  events: [MASK_EVENTS, COMMON_EVENTS],
};

export const OGE_TEXT_AREA_API: ApiSections = {
  properties: [
    {
      title: 'OgeTextArea',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description: 'Editor value — two-way.',
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
          type: 'number | undefined',
          description: 'Defaults to <code>rows</code>.',
        },
        {
          name: 'maxRows',
          type: 'number | undefined',
          description: '<code>undefined</code> = unbounded growth.',
        },
        {
          name: 'maxLength',
          type: 'number | undefined',
          description: 'Counter denominator / native cap.',
        },
        {
          name: 'minLength',
          type: 'number | undefined',
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
          type: 'string | undefined',
          description: 'Native <code>autocapitalize</code> attribute.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [COMMON_EVENTS],
};

export const OGE_NUMBER_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeNumberBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;number | null&gt;',
          default: 'null',
          description:
            '<code>null</code> is the empty state — never <code>0</code>.',
        },
        {
          name: 'min',
          type: 'number | undefined',
          description:
            'Lower bound — values clamp on commit (typing is never blocked).',
        },
        {
          name: 'max',
          type: 'number | undefined',
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
          type: 'Intl.NumberFormatOptions | undefined',
          description:
            "Blur-time display format: applied while unfocused (and after the blur clamp); focus swaps in the editable number, so typing never fights a currency sign or a rounding. <code>style: 'percent'</code> formats display only — the model value is not rescaled.",
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
          type: 'number | undefined',
          description:
            'Caps the fraction digits while typing — extra digits are not accepted (<code>0</code> refuses the decimal separator). <code>undefined</code> = unlimited.',
        },
        {
          name: 'wheelStep',
          type: 'number | undefined',
          description:
            'Opt-in mouse-wheel stepping by this amount, only while the field is focused (wheel up adds; clamped to <code>min</code>/<code>max</code>). Unset or <code>0</code> leaves the wheel to the page.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'Overrides the application locale (<code>LOCALE_ID</code>).',
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
  events: [COMMON_EVENTS],
};

export const OGE_INPUTS_TYPES_API: ApiSections = {
  types: [
    {
      title: 'Unions & contracts',
      entries: [
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
            "Structural mirror of Signal Forms' <code>ValidationError</code>.",
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
          description: 'Payload of <code>maskCompleted</code>.',
        },
        {
          name: 'ogeMaskComplete(mask, value, { rules?, includeLiterals? })',
          type: 'boolean',
          description:
            'From <code>&#64;oge-ui/behavior</code>: <code>true</code> when <code>value</code> fills every required slot (empty counts as complete) — the check a Signal Forms <code>validate()</code> or a server runs without an editor.',
        },
      ],
    },
    {
      title: 'Event payloads',
      entries: [
        {
          name: 'OgeInputValueCommittedEvent&lt;T&gt;',
          type: '{ value: T; previousValue: T; event: Event | undefined }',
          description:
            '<code>event === undefined</code> means a programmatic change.',
        },
        {
          name: 'OgeInputRawEvent',
          type: '{ text: string; event: Event }',
          description: 'Raw keystroke payload.',
        },
        {
          name: 'OgeInputKeyEvent',
          type: '{ event: KeyboardEvent }',
          description: 'Enter-key payload.',
        },
        {
          name: 'OgeInputFocusEvent',
          type: '{ event: FocusEvent }',
          description: 'Focus/blur payload.',
        },
      ],
    },
    {
      title: 'Slots & helpers',
      entries: [
        {
          name: 'OgeInputPrefix',
          type: 'directive — [ogeInputPrefix]',
          description: 'Leading adornment inside the field.',
        },
        {
          name: 'OgeInputSuffix',
          type: 'directive — [ogeInputSuffix]',
          description:
            'Trailing adornment; renders after the built-in rail buttons.',
        },
        {
          name: 'resolveErrorMessage(sfErrors, cvaErrors, messages)',
          type: 'string | null',
          description:
            'The single message a field displays. Signal Forms errors win over reactive-forms errors, and an explicit <code>message</code> wins over the kind→message map. Exported so a form-level error summary reads exactly like the inline text.',
        },
        {
          name: 'formatPattern(pattern, values)',
          type: 'string',
          description:
            'Interpolates <code>{token}</code> placeholders in a message — the same contract the grid uses for its message patterns.',
        },
        {
          name: 'OgeInputCounterState',
          type: '{ count: number; max: number | undefined; over: boolean }',
          description: 'Counter state rendered in the subscript end slot.',
        },
        {
          name: 'OgeInputRevealApi',
          type: '{ visible; active; toggle() }',
          description: 'Password-reveal API (text box only).',
        },
        {
          name: 'OgeInputCopyApi',
          type: '{ visible; copied; trigger() }',
          description: 'Copy-to-clipboard API (text box only).',
        },
        {
          name: 'OgeInputSpinApi',
          type: '{ visible; canUp; canDown; press(dir, event); release() }',
          description: 'Spin-button API (number box only).',
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

export const OGE_INPUTS_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'provideOgeInputsConfig(config: OgeInputsConfigInput): Provider',
          type: 'Provider',
          description:
            'Application- or component-scoped defaults; deep-merges <code>messages</code> over the defaults.',
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
          description: 'User-facing strings (see below).',
        },
      ],
    },
    {
      title: 'OgeInputsMessages',
      entries: [
        {
          name: 'clearButton',
          type: 'string',
          default: "'Clear'",
          description: 'Aria label of the clear (✕) button.',
        },
        {
          name: 'showPassword / hidePassword',
          type: 'string',
          default: "'Show password' / 'Hide password'",
          description: 'Reveal toggle aria labels.',
        },
        {
          name: 'copyButton / copied',
          type: 'string',
          default: "'Copy to clipboard' / 'Copied'",
          description: 'Copy button aria label and transient confirmation.',
        },
        {
          name: 'spinIncrement / spinDecrement',
          type: 'string',
          default: "'Increase value' / 'Decrease value'",
          description: 'Aria labels of the spin buttons.',
        },
        {
          name: 'pending / valid',
          type: 'string',
          default: "'Validating' / 'Valid'",
          description:
            'Screen-reader text next to the pending spinner / success icon.',
        },
        {
          name: 'counter / counterNoMax',
          type: 'string',
          default: "'{count}/{max}' / '{count}'",
          description: 'Visual counter patterns.',
        },
        {
          name: 'counterAria / counterAriaNoMax',
          type: 'string',
          default:
            "'{count} of {max} characters used' / '{count} characters entered'",
          description: 'Counter aria labels.',
        },
        {
          name: 'requiredError',
          type: 'string',
          default: "'This field is required'",
          description:
            'Resolved message for the <code>required</code> error kind.',
        },
        {
          name: 'emailError',
          type: 'string',
          default: "'Enter a valid email address'",
          description:
            'Resolved message for the <code>email</code> error kind.',
        },
        {
          name: 'minError / maxError',
          type: 'string',
          default: "'Value must be at least {min}' / '…at most {max}'",
          description: 'Numeric bound errors.',
        },
        {
          name: 'minLengthError / maxLengthError',
          type: 'string',
          default:
            "'Enter at least {requiredLength} characters' / 'Enter no more than…'",
          description: 'Length errors.',
        },
        {
          name: 'patternError',
          type: 'string',
          default: "'The value has an invalid format'",
          description: 'Pattern mismatch.',
        },
        {
          name: 'maskInvalidError',
          type: 'string',
          default: "'Complete the value in the required format'",
          description:
            'Text box / masked text box: required mask slots are empty (also the <code>mask</code> Signal Forms error kind). <code>maskInvalidMessage</code> overrides it per editor.',
        },
        {
          name: 'invalidNumberError',
          type: 'string',
          default: "'Enter a valid number'",
          description: 'Number box parse failure (reverts on blur).',
        },
        {
          name: 'invalidError',
          type: 'string',
          default: "'Invalid value'",
          description: 'Fallback for unknown validation error kinds.',
        },
        {
          name: 'moreTags',
          type: 'string',
          default: "'+{count} more'",
          description:
            'Overflow chip of <code>maxDisplayedTags</code> (tag box, tree select chips, multi-column combo box). Rendered by <code>ogeMoreTagsText</code> / <code>ogeFormatMessage</code>, so it may be an ICU plural (<code>{count, plural, one {+# weiteres} other {+# weitere}}</code>).',
        },
        {
          name: 'maxSelectedItemsMessage',
          type: 'string',
          default: "'You can select up to {max} items'",
          description:
            'Status shown once <code>maxSelectedItems</code> is reached.',
        },
        {
          name: 'compareError',
          type: 'string',
          default: "'The values do not match'",
          description:
            'Resolved message for the forms <code>compare</code> rule.',
        },
        {
          name: 'nowButton',
          type: 'string',
          default: "'Now'",
          description: 'Date box footer button of <code>showNowButton</code>.',
        },
        {
          name: 'presetsLabel / presetToday … presetLastYear',
          type: 'string',
          default: "'Quick ranges' / 'Today' … 'Last year'",
          description:
            'Aria label of the date range box preset list, and the labels of the built-in <code>ogeDateRangePresets</code> (<code>presetToday</code>, <code>presetYesterday</code>, <code>presetLast7Days</code>, <code>presetLast30Days</code>, <code>presetThisWeek</code>, <code>presetLastWeek</code>, <code>presetThisMonth</code>, <code>presetLastMonth</code>, <code>presetThisYear</code>, <code>presetLastYear</code>).',
        },
        {
          name: 'hourColumnLabel / minuteColumnLabel / secondColumnLabel / dayPeriodColumnLabel',
          type: 'string',
          default: "'Hours' / 'Minutes' / 'Seconds' / 'AM/PM'",
          description:
            "Aria labels of the time picker columns (<code>timeView: 'columns'</code>).",
        },
        {
          name: 'segmentDay / segmentMonth / segmentYear / segmentHour / segmentMinute / segmentSecond / segmentDayPeriod',
          type: 'string',
          default: "'dd' / 'mm' / 'yyyy' / 'hh' / 'mm' / 'ss' / '--'",
          description:
            'Empty-segment placeholders of the masked date entry (<code>useMaskBehavior</code>) — translate them with the UI (<code>TT.MM.JJJJ</code>).',
        },
      ],
    },
  ],
};

export const OGE_SELECT_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeSelectBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            'Committed value (the <code>valueExpr</code> of the selected item); two-way.',
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectBoxItemsFn',
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
          type: 'number | undefined',
          description:
            'Debounce before typed text filters the list; <code>undefined</code> = config default (250ms). The displayed text is never debounced.',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'false',
          description:
            'Lets typed text that matches no item become the value (committed on Enter/blur) — see <code>customItemCreating</code>.',
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
            'Item &rarr; image URL rendered before the option text (avatars, flags…). For inline SVG icons use <code>itemTemplate</code>.',
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
          type: 'number | undefined',
          description:
            'Scrollable list height cap; <code>undefined</code> = the CSS default (320px).',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (with a search field at the top when <code>searchEnabled</code>) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
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
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeSelectItemTemplateContext&gt;',
          description:
            'Custom option row rendering; context: <code>$implicit</code>, <code>index</code>, <code>selected</code>, <code>active</code>.',
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
          type: 'OgeListDataSource&lt;TItem&gt; | undefined',
          description:
            "Remote, paged data: any <code>&#64;oge-ui/core</code> <code>DataSource</code> (<code>CustomDataSource</code>, <code>ArrayDataSource</code>, <code>CursorDataSource</code>, <code>ODataDataSource</code>) or an object with the same <code>load()</code>, plus an optional <code>byKey()</code>. Replaces <code>items</code> while set: pages of <code>pageSize</code> rows load as the list scrolls (virtual window or scroll position, and the keyboard reaching the end), the typed text is sent as <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), superseded requests are aborted through the <code>AbortSignal</code>, each search's pages are cached, and a committed value no loaded page holds resolves through <code>byKey</code>. Without <code>totalCount</code> the list keeps paging until a short page arrives.",
        },
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: 'config: 30',
          description:
            'Rows requested per <code>dataSource</code> page (<code>take</code>); <code>undefined</code> = <code>provideOgeInputsConfig({ dataPageSize })</code>.',
        },
        {
          name: 'groupTemplate',
          type: 'TemplateRef&lt;OgeSelectGroupTemplateContext&gt;',
          description:
            'Custom group header rendering for <code>groupBy</code> lists; context: <code>$implicit</code> / <code>label</code>.',
        },
        {
          name: 'fieldTemplate',
          type: 'TemplateRef&lt;OgeSelectFieldTemplateContext&gt;',
          description:
            "Custom rendering of the closed field's value (an icon, a swatch, a two-line label); context: <code>$implicit</code> (the selected item or <code>null</code>) and <code>text</code>. The real input stays underneath for focus, typing and assistive technology; the template hides while the user types.",
        },
        {
          name: 'headerTemplate / footerTemplate',
          type: 'TemplateRef&lt;OgeSelectPopupTemplateContext&gt;',
          description:
            'Content above / below the popup list (hints, a result count, a "create new" action); context: <code>$implicit</code> (visible items), <code>searchText</code>, <code>loading</code>.',
        },
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Popup visibility — two-way.',
        },
        {
          name: 'selectedItem',
          type: 'Signal&lt;TItem | null&gt;',
          description:
            'Read-only: the item whose <code>valueExpr</code> matches <code>value</code>.',
        },
        {
          name: 'displayText',
          type: 'Signal&lt;string&gt;',
          description: 'Read-only: display text of the selected item.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSelectBox methods',
      entries: [
        {
          name: 'open()',
          type: 'void',
          description:
            'Opens the popup (no-op while disabled/readonly, or when an <code>opening</code> handler cancels).',
        },
        {
          name: 'close(reason?)',
          type: 'boolean',
          description:
            'Closes the popup unless a <code>closing</code> handler cancels; returns whether it closed.',
        },
        {
          name: 'toggle()',
          type: 'void',
          description: 'Toggles the popup.',
        },
        {
          name: 'reload()',
          type: 'void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeSelectBox events',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeSelectBoxSelectionChangedEvent',
          description:
            'The resolved selected item changed (user or programmatic) — <code>{ item, previousItem }</code>.',
        },
        {
          name: 'itemClick',
          type: 'OgeSelectBoxItemClickEvent',
          description:
            'An option row was activated — <code>{ item, index, event }</code>; <code>index</code> is within the visible (filtered) list.',
        },
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'searchChanged',
          type: 'OgeSelectBoxSearchChangedEvent',
          description:
            'Raw search text on every keystroke — drive server-side filtering from here.',
        },
        {
          name: 'customItemCreating',
          type: 'OgeSelectBoxCustomItemEvent',
          description:
            'Mutable payload (as in the references): assign <code>customItem</code> — an item, a promise of one, or <code>null</code> to reject the text. Left unset, the raw text becomes the item.',
        },
        {
          name: 'opening',
          type: 'OgeDropDownOpeningEvent',
          description:
            'Cancelable pre-open event — set <code>event.cancel = true</code> to keep the popup closed.',
        },
        {
          name: 'closing',
          type: 'OgeDropDownClosingEvent',
          description:
            "Cancelable pre-close event with its <code>reason</code> (<code>'select'</code>, <code>'escape'</code>, <code>'outside'</code>, <code>'tab'</code>, <code>'blur'</code>, <code>'api'</code>) — set <code>cancel</code> to keep the popup open.",
        },
        {
          name: 'pageLoaded',
          type: 'OgeListPageLoadedEvent',
          description:
            'A <code>dataSource</code> page landed — <code>{ searchText, skip, items, totalCount }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Select box types',
      entries: [
        {
          name: 'OgeSelectBoxDisplayExpr / ValueExpr / DisabledExpr',
          type: 'string | fn',
          description:
            'Field-name string or function expressions for display text, committed value and per-item disabling.',
        },
        {
          name: 'OgeSelectBoxSearchMode',
          type: "'contains' | 'startswith'",
          description: 'Filter match mode.',
        },
        {
          name: 'OgeSelectItemTemplateContext',
          type: 'interface',
          description:
            '<code>{ $implicit: TItem; index: number; selected: boolean; active: boolean }</code>.',
        },
        {
          name: 'OgeSelectGroupTemplateContext / OgeSelectFieldTemplateContext / OgeSelectPopupTemplateContext',
          type: 'interface',
          description:
            'Contexts of <code>groupTemplate</code> (<code>{ $implicit: label, label }</code>), <code>fieldTemplate</code> (<code>{ $implicit: item | null, text }</code>) and <code>headerTemplate</code> / <code>footerTemplate</code> (<code>{ $implicit: items, searchText, loading }</code>).',
        },
        {
          name: 'OgeListDataSource',
          type: 'interface',
          description:
            "<code>{ load(options: LoadOptions): Promise&lt;LoadResult&gt;; byKey?(key) }</code> — structurally a subset of the grid's <code>DataSource</code>, so every core data source fits as is.",
        },
        {
          name: 'OgeDropDownOpeningEvent / OgeDropDownClosingEvent',
          type: 'interface',
          description:
            '<code>{ cancel: boolean }</code> / <code>{ reason: OgeDropDownCloseReason; cancel: boolean }</code>.',
        },
        {
          name: 'OgeListPageLoadedEvent',
          type: 'interface',
          description:
            '<code>{ searchText: string; skip: number; items: readonly TItem[]; totalCount?: number }</code>.',
        },
      ],
    },
  ],
};

export const OGE_CHECK_BOX_API: ApiSections = {
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
          name: 'value',
          type: 'model&lt;boolean | null&gt;',
          default: 'false',
          description:
            '<code>true</code>/<code>false</code>, or <code>null</code> for the indeterminate (dash) state — two-way. <code>null</code> renders regardless of <code>threeState</code>.',
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
            'Label text; the default <code>&lt;ng-content&gt;</code> slot renders when unset.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Glyph/font size preset.',
        },
        {
          name: 'tooltip',
          type: 'string | undefined',
          description: 'Native <code>title</code> on the label element.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeCheckBox methods',
      entries: [
        {
          name: 'toggle(): void',
          type: 'void',
          description:
            'Advances the state exactly like a user click (respects <code>threeState</code>, no-op while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [COMMON_EVENTS],
};

export const OGE_SWITCH_API: ApiSections = {
  properties: [
    {
      title: 'OgeSwitch',
      entries: [
        {
          name: 'value',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'The on/off state — two-way.',
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description: 'Accessible name (<code>aria-label</code>).',
        },
        {
          name: 'onText / offText',
          type: 'string | undefined',
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
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSwitch methods',
      entries: [
        {
          name: 'toggle(): void',
          type: 'void',
          description: 'Flips the state (no-op while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [COMMON_EVENTS],
};

export const OGE_RADIO_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeRadioGroup',
      entries: [
        {
          name: 'value',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            "The selected item's <code>valueExpr</code> result; two-way.",
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
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeSelectItemTemplateContext&gt;',
          description:
            'Custom item rendering next to the radio dot; context: <code>$implicit</code>, <code>index</code>, <code>selected</code>, <code>active</code>.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Dot/font size preset.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeRadioGroup events',
      entries: [
        {
          name: 'itemClick',
          type: 'OgeRadioGroupItemClickEvent',
          description:
            'A radio item was activated by click or keyboard — <code>{ item, index, event }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
};

export const OGE_CALENDAR_API: ApiSections = {
  properties: [
    {
      title: 'Slot & locale helper',
      entries: [
        {
          name: '*ogeCalendarCellTemplate',
          type: 'OgeCalendarCellTemplate',
          description:
            'Replaces the default day-cell rendering — badges, prices, availability dots. Also usable on <code>oge-date-box</code> and <code>oge-date-range-box</code>, which project into the same calendar.',
        },
        {
          name: 'datePartOrder(locale, kind)',
          type: "(locale: string | undefined, kind: 'date' | 'datetime' | 'time') =&gt; string[]",
          description:
            'The order a locale writes date parts in, derived from <code>Intl</code>. Drives locale-aware typed parsing; exported so consumers can build their own date editors on the same rules.',
        },
      ],
    },
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
          name: 'value',
          type: 'model&lt;Date | null&gt;',
          default: 'null',
          description: 'The selected day (single mode) — two-way, local Date.',
        },
        {
          name: 'values',
          type: 'model&lt;readonly Date[]&gt;',
          default: '[]',
          description:
            "Selected days for <code>selectionMode: 'multiple'</code> — two-way.",
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple' | 'range'",
          default: "'single'",
          description:
            'Range mode picks a start–end pair with a live hover preview.',
        },
        {
          name: 'range',
          type: 'model&lt;[Date | null, Date | null]&gt;',
          default: '[null, null]',
          description:
            "The selected tuple for <code>selectionMode: 'range'</code> — two-way; either end may stay open.",
        },
        {
          name: 'viewsCount',
          type: '1 | 2',
          default: '1',
          description: 'Side-by-side month views (2 is the range layout).',
        },
        {
          name: 'zoomLevel / minZoomLevel / maxZoomLevel',
          type: "'month' | 'year' | 'decade'",
          default: "'month' / 'decade' / 'month'",
          description:
            "Drill level (two-way) and its reachable bounds; dx's 'century' is deliberately dropped.",
        },
        {
          name: 'min / max',
          type: 'Date | undefined',
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
          type: 'number | undefined',
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
          name: 'focusedDate',
          type: 'model&lt;Date | null&gt;',
          description:
            'The keyboard-focused day — two-way (controlled navigation).',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description: 'BCP 47 locale for all texts (Intl).',
        },
        {
          name: 'cellTemplate',
          type: 'TemplateRef&lt;OgeCalendarCellTemplateContext&gt;',
          description:
            'Custom cell rendering — also available as the projected <code>[ogeCalendarCellTemplate]</code> slot.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeCalendar events',
      entries: [
        {
          name: 'cellClick',
          type: 'OgeCalendarCellClickEvent',
          description:
            'A day/month/year cell was activated — <code>{ date, view, event }</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
};

export const OGE_DATE_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeDateBox',
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
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-screen dialog with 44px day cells on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
        },
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the rail button that toggles the picker; the field click and the keyboard still open it when hidden.',
        },
        {
          name: 'value',
          type: 'model&lt;Date | null&gt;',
          default: 'null',
          description:
            "Always a local <code>Date</code> — serialization is the app's concern (no <code>dateSerializationFormat</code>). CVA writes accept ISO-like strings and epoch numbers leniently.",
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
          type: 'boolean | undefined',
          description:
            "Clock of the display text and the picker. <code>true</code> adds an AM/PM column to <code>timeView: 'columns'</code> (hours 12, 1 … 11); <code>false</code> forces 24-hour; <code>undefined</code> follows the locale with the single 24-entry hour column.",
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
            'Segment entry (DevExtreme <code>useMaskBehavior</code>): the field shows the locale’s numeric pattern (<code>dd.mm.yyyy</code>, <code>mm/dd/yyyy</code>… from <code>Intl</code>), digits fill the selected segment and auto-advance, ArrowUp/Down step it with wrap-around, ArrowLeft/Right (mirrored in RTL) and Home/End move between segments, Backspace/Delete clear, a typed separator moves on, <code>a</code>/<code>p</code> set AM/PM, paste reads a whole date and Alt+ArrowDown opens the picker. Commits on blur/Enter like typed text; impossible dates show the invalid state and revert. <code>displayFormat</code> is not used while it is on.',
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
          name: 'firstDayOfWeek / showWeekNumbers / zoomLevel / calendarCellTemplate / locale',
          type: 'calendar passthroughs',
          description:
            'Exposed individually — no <code>calendarOptions</code> kitchen-sink object.',
        },
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Picker visibility — two-way.',
        },
      ],
    },
    {
      title: 'OgeDateRangeBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;[Date | null, Date | null]&gt;',
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
          type: 'boolean | undefined / boolean',
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
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-screen dialog showing one month, where picking both ends waits for an explicit Done that applies the range on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeDateBox methods',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: 'void',
          description: 'Picker control (no-ops while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeDateBox events',
      entries: [
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Picker visibility changes, from any trigger.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Date types',
      entries: [
        {
          name: 'parseDateText(text, locale, kind, reference?)',
          type: 'function',
          description:
            'Exported: locale-aware text → local <code>Date | null</code> via Intl part order — never <code>Date.parse</code>.',
        },
        {
          name: 'OgeDateBoxType / OgeDateBoxApplyValueMode / OgeDateBoxDisplayFormat / OgeDateBoxTimeView',
          type: 'types',
          description: 'The string unions and the display-format shape.',
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
            'Built-in presets, each <code>(options?: { label?, now? }) =&gt; OgeDateRangePreset</code> covering whole local days; <code>thisWeek</code>/<code>lastWeek</code> also take <code>firstDayOfWeek</code> / <code>locale</code>. <code>now</code> overrides the clock (tests, "as of" pages).',
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

export const OGE_AUTOCOMPLETE_API: ApiSections = {
  properties: [
    {
      title: 'OgeAutocomplete',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description:
            'The typed text — the committed value is the string itself, not an item value; two-way.',
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectBoxItemsFn',
          default: '[]',
          description:
            'The suggestion items: an array, or a function invoked lazily on first open (sync or promise; loading/error rows render while pending).',
        },
        {
          name: 'displayExpr / disabledExpr / imageExpr / searchExpr / searchMode / groupBy / itemTemplate',
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
          type: 'number | undefined',
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
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet with its own text field at the top on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering for large lists — same contract as the select box.',
        },
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Popup visibility — two-way.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt; | undefined',
          description:
            'Remote, paged suggestions — the typed text is the <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), further pages load as the list scrolls, superseded requests are aborted and pages are cached per search. <code>maxItemCount</code> does not apply; <code>pageSize</code> does.',
        },
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: 'config: 30',
          description: 'Rows requested per <code>dataSource</code> page.',
        },
        {
          name: 'selectedItem',
          type: 'Signal&lt;TItem | null&gt;',
          description:
            'Read-only: the last picked suggestion; <code>null</code> once the text diverges from it.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeAutocomplete methods',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: 'void',
          description: 'Popup control (no-ops while disabled/readonly).',
        },
        {
          name: 'reload()',
          type: 'void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeAutocomplete events',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeAutocompleteSelectionChangedEvent',
          description:
            'A suggestion was picked or the selection was canceled — <code>{ item: TItem | null, event? }</code>.',
        },
        {
          name: 'itemClick',
          type: 'OgeAutocompleteItemClickEvent',
          description:
            'A suggestion row was activated — <code>{ item, index, event }</code>.',
        },
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'searchChanged',
          type: 'OgeSelectBoxSearchChangedEvent',
          description:
            'Raw search text on every keystroke — drive server-side filtering from here.',
        },
        {
          name: 'pageLoaded',
          type: 'OgeListPageLoadedEvent',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Autocomplete types',
      entries: [
        {
          name: 'OgeAutocompleteSelectionChangedEvent',
          type: 'interface',
          description:
            '<code>{ item: TItem | null; event?: Event }</code> — <code>null</code> means the selection was canceled.',
        },
        {
          name: 'OgeVirtualScrollOptions',
          type: 'interface',
          description:
            '<code>{ itemHeight?: number; overscan?: number }</code>; default heights come from <code>OGE_SELECT_OPTION_HEIGHT</code> (28/34/40px for sm/md/lg).',
        },
      ],
    },
  ],
};

export const OGE_TAG_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeTagBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;readonly unknown[]&gt;',
          default: '[]',
          description:
            'Committed values — the <code>valueExpr</code> of every selected item; two-way.',
        },
        {
          name: 'items / displayExpr / valueExpr / disabledExpr / imageExpr',
          type: 'shared with OgeSelectBox',
          description:
            'The tag box reuses the select box expression vocabulary verbatim — <code>items</code> may be a lazy function (loading / error rows render while pending).',
        },
        {
          name: 'searchEnabled / searchMode / searchExpr',
          type: 'shared with OgeSelectBox',
          description: 'Client-side filtering of the option list.',
        },
        {
          name: 'searchTimeout',
          type: 'number | undefined',
          description:
            'Debounce before typed text filters. <code>undefined</code> filters local items immediately and debounces <code>dataSource</code> requests by the config default (250ms).',
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
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeSelectItemTemplateContext&gt;',
          description:
            'Custom option content; the checkbox stays in front of it.',
        },
        {
          name: 'groupTemplate',
          type: 'TemplateRef&lt;OgeSelectGroupTemplateContext&gt;',
          description: 'Custom group header rendering.',
        },
        {
          name: 'tagTemplate',
          type: 'TemplateRef&lt;OgeTagBoxTagTemplateContext&gt;',
          description:
            'Custom chip content; context <code>$implicit</code> (item), <code>index</code>, <code>text</code>. The remove button stays.',
        },
        {
          name: 'acceptCustomValue',
          type: 'boolean',
          default: 'false',
          description:
            'Enter on typed text that matches no item creates a new tag — see <code>customItemCreating</code>. An exact display match toggles the existing item instead.',
        },
        {
          name: 'showSelectAll',
          type: 'boolean',
          default: 'false',
          description:
            'A tri-state "select all" row above the options (<code>aria-checked</code> true / false / mixed; ArrowUp from the first option reaches it). It acts on the visible, enabled items — the current filter or the loaded pages — honours <code>maxSelectedItems</code> and keeps values selected under other searches. Text: <code>messages.selectAllText</code>.',
        },
        {
          name: 'maxSelectedItems',
          type: 'number | undefined',
          description:
            'Caps the selection. At the cap unselected options turn inert and the popup shows <code>messages.maxSelectedItemsMessage</code> in a status line.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description: 'Shows a loading row instead of items.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt; | undefined',
          description:
            "Remote, paged data: any <code>&#64;oge-ui/core</code> <code>DataSource</code> (<code>CustomDataSource</code>, <code>ArrayDataSource</code>, <code>CursorDataSource</code>, <code>ODataDataSource</code>) or an object with the same <code>load()</code>, plus an optional <code>byKey()</code>. Replaces <code>items</code> while set: pages of <code>pageSize</code> rows load as the list scrolls (virtual window or scroll position, and the keyboard reaching the end), the typed text is sent as <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), superseded requests are aborted through the <code>AbortSignal</code>, each search's pages are cached, and a committed value no loaded page holds resolves through <code>byKey</code>. Without <code>totalCount</code> the list keeps paging until a short page arrives.",
        },
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: 'config: 30',
          description:
            'Rows requested per <code>dataSource</code> page (<code>take</code>); <code>undefined</code> = <code>provideOgeInputsConfig({ dataPageSize })</code>.',
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
          type: 'number | undefined',
          description:
            'Caps the rendered chips; the rest collapse into a <code>+N more</code> chip (<code>messages.moreTags</code>).',
        },
        {
          name: 'opened / dropdownPlacement / dropdownWidth / dropdownMaxHeight / showDropDownButton / openOnFieldClick',
          type: 'shared with OgeSelectBox',
          description: 'Popup configuration and two-way visibility.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (search field when <code>searchEnabled</code>, picks keep it open, a Done action closes it) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
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
      title: 'OgeTagBox methods',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: 'void',
          description:
            'Popup control (no-ops while disabled/readonly); <code>close()</code> returns <code>false</code> when a <code>closing</code> handler cancels.',
        },
        {
          name: 'selectAll() / unselectAll()',
          type: 'void',
          description:
            'Selects (up to <code>maxSelectedItems</code>) / clears the visible, enabled items.',
        },
        {
          name: 'reload()',
          type: 'void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeTagBox events',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeTagBoxSelectionChangedEvent',
          description:
            'Per-commit delta — <code>{ addedItems, removedItems }</code>.',
        },
        {
          name: 'itemClick',
          type: 'OgeTagBoxItemClickEvent',
          description:
            'An option row was toggled — <code>{ item, index, event }</code>.',
        },
        {
          name: 'selectAllValueChanged',
          type: 'OgeTagBoxSelectAllEvent',
          description:
            'The "select all" row was toggled — <code>{ selected, event }</code>.',
        },
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup visibility changes, from any trigger.',
        },
        {
          name: 'opening / closing',
          type: 'OgeDropDownOpeningEvent / OgeDropDownClosingEvent',
          description:
            'Cancelable pre-events — same contract as the select box.',
        },
        {
          name: 'searchChanged',
          type: 'OgeSelectBoxSearchChangedEvent',
          description: 'Raw search text on every keystroke.',
        },
        {
          name: 'customItemCreating',
          type: 'OgeSelectBoxCustomItemEvent',
          description:
            '<code>acceptCustomValue</code> commit: assign <code>customItem</code> (an item, a promise of one, or <code>null</code> to reject).',
        },
        {
          name: 'pageLoaded',
          type: 'OgeListPageLoadedEvent',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Tag box types',
      entries: [
        {
          name: 'OgeTagBoxTagTemplateContext',
          type: 'interface',
          description:
            '<code>{ $implicit: TItem; index: number; text: string }</code>.',
        },
        {
          name: 'OgeTagBoxSelectAllEvent',
          type: 'interface',
          description: '<code>{ selected: boolean; event: Event }</code>.',
        },
        {
          name: 'OgeSelectAllState',
          type: "boolean | 'mixed'",
          description: 'State of the "select all" row.',
        },
      ],
    },
  ],
};

export const OGE_TREE_SELECT_API: ApiSections = {
  properties: [
    {
      title: 'Value & data',
      entries: [
        {
          name: 'value',
          type: 'RowKey | readonly RowKey[] | null',
          default: 'null',
          description:
            "Committed value — two-way. The selected node's key in <code>single</code> mode, an array of keys in <code>multiple</code>.",
        },
        {
          name: 'items',
          type: 'readonly TItem[] | undefined',
          description:
            'Nodes to display — a flat parent-referencing list or nested children.',
        },
        {
          name: 'keyExpr / parentIdExpr / itemsExpr',
          type: 'string | ((row: TItem) => …)',
          description:
            'Identity and structure accessors, forwarded to the popup tree. <code>itemsExpr</code> switches to hierarchical data.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((row: TItem) => unknown)',
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
            "<code>'chips'</code> renders the selected nodes as removable chips inside the field (each ✕ is labelled <code>removeTagButton</code> + the node text; Backspace removes the last one); <code>'text'</code> keeps the comma list / <code>displayMode</code>.",
        },
        {
          name: 'maxDisplayedTags',
          type: 'number | undefined',
          description:
            'In chips mode, caps the rendered chips; the rest fold into a <code>+N more</code> chip.',
        },
      ],
    },
    {
      title: 'Popup',
      entries: [
        {
          name: 'opened',
          type: 'boolean',
          default: 'false',
          description: 'Whether the popup is open — two-way.',
        },
        {
          name: 'expandedKeys',
          type: 'readonly RowKey[]',
          default: '[]',
          description:
            'Expanded nodes — two-way, so the shape survives close and reopen.',
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
          type: '(parent: TItem, key: RowKey) => Promise&lt;readonly TItem[]&gt;',
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
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet (a Done action in <code>'multiple'</code> mode) on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
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
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: '() => void',
          description: 'Imperative popup control.',
        },
        {
          name: 'focus() / blur() / reset() / clear()',
          type: '() => void',
          description:
            'Inherited field-chrome control methods. `clear()` empties the value, commits immediately and keeps focus in the field.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeTreeSelectSelectionChangedEvent',
          description:
            'Emitted after the committed selection changed, with <code>keys</code> and <code>previousKeys</code> (always arrays, even in single mode).',
        },
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup lifecycle.',
        },
        {
          name: 'valueCommitted',
          type: 'OgeInputValueCommittedEvent',
          description: 'Inherited commit event carrying the previous value.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
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
          type: '{ keys, previousKeys }',
          description: 'Payload of <code>selectionChanged</code>.',
        },
      ],
    },
  ],
};

export const OGE_SLIDER_API: ApiSections = {
  properties: [
    {
      title: 'OgeSlider',
      entries: [
        {
          name: 'value',
          type: 'model&lt;number&gt;',
          default: '0',
          description:
            'The slider value — two-way. Programmatic writes clamp and snap to the step grid.',
        },
        {
          name: 'min / max',
          type: 'number | undefined',
          default: '0 / 100',
          description:
            'Scale bounds. Typed <code>number | undefined</code> because the Signal Forms contract reserves these member names — <code>undefined</code> falls back to 0/100.',
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
          type: 'number | undefined',
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
          type: 'boolean / number | undefined',
          default: 'false',
          description:
            'Tick marks on the <code>tickStep</code> grid — falling back to <code>largeStep</code>, then <code>step</code>; capped at 200 marks.',
        },
        {
          name: 'showTickLabels',
          type: 'boolean',
          default: 'false',
          description:
            "Formatted labels under each tick (Kendo's tick <code>title</code> callback, fed by <code>formatValue</code>).",
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
            "The inline value bubble: <code>'active'</code> while focused, dragged <strong>or hovered</strong> (Material's discrete plus DevExtreme's <code>showMode: 'onHover'</code>), <code>'always'</code> permanent.",
        },
        {
          name: 'formatValue',
          type: '(value: number) =&gt; string | undefined',
          description:
            'Formats the bubble, the end labels <strong>and</strong> <code>aria-valuetext</code> — display and announcement never diverge.',
        },
        {
          name: 'showButtons',
          type: 'boolean',
          default: 'false',
          description:
            "Kendo-style increment/decrement buttons with press-and-hold repeat — the number box's spin timing config.",
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the thumb; the localized <code>sliderHandle</code> message is the fallback.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeSlider events',
      entries: [
        {
          name: 'dragStarted',
          type: 'OgeSliderDragStartedEvent',
          description: 'A drag gesture began on the thumb or the track.',
        },
        {
          name: 'slideEnded',
          type: 'OgeSliderSlideEndedEvent&lt;number&gt;',
          description:
            "Fires once per gesture at release — DevExtreme's <code>onHandleRelease</code> timing without a mode switch (live changes stream through <code>valueCommitted</code>, throttled by <code>debounce</code>). Not emitted when Escape cancels the gesture.",
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
      ],
    },
  ],
};

export const OGE_RANGE_SLIDER_API: ApiSections = {
  properties: [
    {
      title: 'OgeRangeSlider',
      entries: [
        {
          name: 'value',
          type: 'model&lt;readonly [number, number]&gt;',
          default: '[0, 0]',
          description:
            'The <code>[start, end]</code> pair — two-way. Programmatic writes clamp, snap and sort.',
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
          type: 'string | undefined',
          description:
            'Accessible names of the thumbs; the localized <code>sliderStartHandle</code>/<code>sliderEndHandle</code> messages are the fallbacks.',
        },
        {
          name: 'startName / endName',
          type: 'string',
          default: "''",
          description:
            "Hidden-input names for plain HTML form posts — DevExtreme's <code>startName</code>/<code>endName</code> contract (the single slider uses the inherited <code>name</code>).",
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
            'The full scale/appearance surface of <code>OgeSlider</code>, identical semantics. <code>showButtons</code> is single-slider only (the Kendo split). Clicking the track moves the <strong>nearest</strong> thumb.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeRangeSlider events',
      entries: [
        {
          name: 'dragStarted / slideEnded',
          type: 'OgeSliderSlideEndedEvent&lt;readonly [number, number]&gt;',
          description:
            'The drag gesture pair; an unchanged pair never re-emits <code>valueCommitted</code>.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
};

export const OGE_COLOR_BOX_API: ApiSections = {
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
          default: "config: 'none' / 600",
          description: `<code>'auto'</code> presents the popup as a full-width bottom sheet on viewports narrower than <code>adaptiveBreakpoint</code> px — a titled <code>role="dialog"</code> surface with a close button, scroll lock, inert background, a Tab trap, focus restore, safe-area insets and 16px / 44px touch sizing; Escape, a backdrop tap or a swipe down the handle dismiss it. <code>'none'</code> keeps the anchored drop-down. App-wide defaults come from <code>provideOgeInputsConfig()</code>.`,
        },
        {
          name: 'showDropDownButton',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the rail button that toggles the picker; the field click and the keyboard still open it when hidden.',
        },
        {
          name: 'value',
          type: 'model&lt;string | null&gt;',
          default: 'null',
          description:
            'The committed color as a CSS string, normalized to <code>format</code> on user commits. Programmatic writes keep any parseable CSS color verbatim (never reformatted); unparseable writes land as <code>null</code>.',
        },
        {
          name: 'format',
          type: "'hex' | 'rgb' | 'rgba' | 'hsl'",
          default: "'hex'",
          description:
            'Committed string shape (hex — the DevExtreme default; Kendo defaults to rgba). Translucent colors widen to carry alpha: <code>#rrggbbaa</code> / <code>rgba()</code> / <code>hsla()</code>.',
        },
        {
          name: 'view',
          type: "'gradient' | 'palette' | 'both'",
          default: "'gradient'",
          description:
            "Popup surfaces: the saturation/brightness gradient with sliders and inputs, the swatch palette, or both stacked — no view switcher (Kendo's <code>activeView</code> is deliberately skipped).",
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
            'OK/Cancel footer collects panel interactions in a draft when <code>useButtons</code>; the default commits live (dragging streams through <code>valueCommitted</code>, throttled by <code>debounce</code>).',
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
            'Arrow-key increment of the panel parts in value units — hue degrees, alpha percent, surface saturation/brightness percent. PageUp/PageDown move by 5× (value-space, not Kendo’s pixel steps — zoom-independent).',
        },
        {
          name: 'palette',
          type: 'readonly string[] | undefined',
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
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Picker visibility — two-way.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeColorBox methods',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: 'void',
          description: 'Picker control (no-ops while disabled/readonly).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeColorBox events',
      entries: [
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Picker visibility changes, from any trigger.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Color types',
      entries: [
        {
          name: 'OgeColorBoxView / OgeColorBoxApplyValueMode',
          type: 'types',
          description:
            'The string unions of <code>view</code> and <code>applyValueMode</code>.',
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
            'All popup strings localize through the family config: <code>colorPickerLabel</code>, <code>hueSliderLabel</code>/<code>hueValueText</code>, <code>alphaSliderLabel</code>/<code>alphaValueText</code>, <code>colorSurfaceLabel</code>/<code>colorSurfaceRoleDescription</code>/<code>surfaceValueText</code>, <code>paletteLabel</code>, the hex/R/G/B/A input labels, <code>eyedropperButton</code> and <code>invalidColorError</code>.',
        },
        {
          name: 'parseColor / formatColor / normalizeColor / rgbaToHsva / hsvaToRgba / relativeLuminance / contrastForeground / colorsEqual',
          type: '@oge-ui/core',
          description:
            'The DOM-free color kernel (<code>OgeRgba</code> / <code>OgeHsva</code> / <code>OgeColorFormat</code>): CSS color-text parsing, HSV↔RGB conversion, canonical formatting and the WCAG swatch-contrast decision — unit-tested without a DOM, the slider-math precedent.',
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
        'WCAG 2.x contrast ratio (1–21). A translucent foreground is composited over the background first, so the ratio describes the rendered pair. Re-exported from <code>@oge-ui/behavior</code>.',
    },
    {
      name: 'contrastLevels',
      type: '(ratio: number) =&gt; OgeContrastLevels',
      description:
        'Classifies a ratio against AA (4.5), AA large (3), AAA (7) and AAA large (4.5). The comparison runs on the unrounded ratio; the displayed <code>ratio</code> is truncated, never rounded up into a pass.',
    },
    {
      name: 'OgeContrastLevels',
      type: '{ ratio; aa; aaLarge; aaa; aaaLarge }',
      description: 'Result of <code>contrastLevels</code>.',
    },
  ],
};

export const OGE_COLOR_GRADIENT_API: ApiSections = {
  properties: [
    {
      title: 'OgeColorGradient',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string | null&gt;',
          default: 'null',
          description:
            'The committed color as a CSS string, normalized to <code>format</code> on commit; parseable programmatic values are kept verbatim — two-way.',
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
            'Committed string shape (<code>hex</code> / <code>rgb</code> / <code>rgba</code> / <code>hsl</code>); translucent colors widen to carry alpha.',
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
            'Arrow-key increment of the surface and sliders (degrees / percent); PageUp/PageDown move 5×.',
        },
        {
          name: 'showInputs',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the hex + R/G/B(/A) inputs. They commit on <code>change</code> (blur / Enter); unusable text is reverted, never applied.',
        },
        {
          name: 'showContrast',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the WCAG contrast readout — a sample, the ratio and AA / AAA pass-fail badges (Kendo’s <code>contrastTool</code>).',
        },
        {
          name: 'contrastBackground',
          type: 'string',
          default: "'#ffffff'",
          description:
            'The background (any CSS color) the contrast ratio is measured against — set it to the surface the color will sit on.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [COMMON_EVENTS],
  types: [
    CONTRAST_TYPES,
    {
      title: 'Color gradient messages',
      entries: [
        {
          name: 'colorGradientLabel / contrastLabel / contrastRatioText / contrastPass / contrastFail',
          type: 'OgeInputsMessages keys',
          description:
            'The gradient’s own strings (<code>{ratio}</code> / <code>{level}</code> placeholders); the surface, slider and channel-input labels are the color box’s keys.',
        },
      ],
    },
  ],
};

export const OGE_COLOR_PALETTE_API: ApiSections = {
  properties: [
    {
      title: 'OgeColorPalette',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string | null&gt;',
          default: 'null',
          description:
            'The picked swatch string as listed in the palette — two-way.',
        },
        {
          name: 'palette',
          type: 'OgeColorPalettePreset | readonly string[]',
          default: "'default'",
          description:
            "A preset (<code>'default' | 'basic' | 'office' | 'material' | 'monochrome'</code>) or your own CSS color list; unparseable entries are dropped.",
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
            'Tile edge in px; <code>undefined</code> lets the tiles share the available width.',
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
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
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
            'The preset data — <code>{ colors, columns }</code> each — for building your own picker around the same sets.',
        },
        {
          name: 'OgeColorPalettePresetData',
          type: '{ colors: readonly string[]; columns: number }',
          description: 'One preset.',
        },
        {
          name: 'Keyboard',
          type: 'APG grid',
          description:
            'Arrows move by tile / row (RTL-mirrored; no wrap, no row crossing), Home/End to the row edges, Ctrl+Home/Ctrl+End to the corners, Enter/Space picks. One roving tab stop — the selected tile, else the first.',
        },
      ],
    },
  ],
};

export const OGE_CHECK_BOX_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeCheckBoxGroup',
      entries: [
        {
          name: 'value',
          type: 'model&lt;readonly unknown[]&gt;',
          default: '[]',
          description:
            'The checked items’ <code>valueExpr</code> results, in items order (not click order); values no item produces are kept — two-way.',
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
            'Field-name string or function expressions. Disabled items keep their checked state — select all never changes them.',
        },
        {
          name: 'layout',
          type: 'OgeCheckBoxGroupLayout',
          default: "'vertical'",
          description:
            "<code>'vertical'</code>, <code>'horizontal'</code> (wrapping row) or <code>'columns'</code> (a <code>columns</code>-column grid).",
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
          description:
            'Visible group label and the group’s accessible name (<code>aria-labelledby</code>); a required marker follows it.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Helper text under the items (<code>aria-describedby</code>), hidden while an error shows.',
        },
        {
          name: 'showSelectAll',
          type: 'boolean',
          default: 'false',
          description:
            'A tri-state “select all” box above the items — checked / mixed / unchecked over the enabled items; from mixed it selects all.',
        },
        {
          name: 'selectAllText',
          type: 'string | undefined',
          description:
            'Text of the select-all box; <code>undefined</code> = the <code>selectAllText</code> message.',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeCheckBoxGroupItemTemplateContext&gt;',
          description:
            'Custom label next to each glyph; context: <code>$implicit</code>, <code>index</code>, <code>checked</code>.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeCheckBoxGroup methods',
      entries: [
        {
          name: 'selectAll() / unselectAll()',
          type: '() => void',
          description:
            'Checks / unchecks every enabled item (disabled items keep their state); commits immediately.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeCheckBoxGroup events',
      entries: [
        {
          name: 'itemClick',
          type: 'OgeCheckBoxGroupItemClickEvent',
          description:
            'One check box was toggled by the user — <code>{ item, index, checked, event }</code>.',
        },
        {
          name: 'selectAllChanged',
          type: 'OgeCheckBoxGroupSelectAllEvent',
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
          name: 'OgeCheckBoxGroupItemClickEvent / OgeCheckBoxGroupSelectAllEvent',
          type: 'interfaces',
          description:
            'Payloads of <code>itemClick</code> / <code>selectAllChanged</code>.',
        },
        {
          name: 'OgeCheckBoxGroupItemTemplateContext',
          type: '{ $implicit; index; checked }',
          description: 'Context of <code>itemTemplate</code>.',
        },
        {
          name: 'Validation',
          type: 'forms',
          description:
            "Reactive <code>Validators.required</code> treats <code>[]</code> as empty. Signal Forms' <code>required()</code> does not — express “at least one” as <code>minLength(p.field, 1, { message })</code>.",
        },
      ],
    },
  ],
};

export const OGE_TOGGLE_GROUP_API: ApiSections = {
  properties: [
    {
      title: 'OgeToggleGroup',
      entries: [
        {
          name: 'value',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            "The selected item's <code>valueExpr</code> result (<code>single</code>; <code>null</code> = none) or an array of them in items order (<code>multiple</code>) — two-way.",
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
            "<code>'single'</code> — the APG radio group (arrows move focus and selection; the selected segment cannot be pressed off). <code>'multiple'</code> — <code>aria-pressed</code> toggle buttons (arrows move focus only).",
        },
        {
          name: 'label',
          type: 'string',
          default: "''",
          description:
            'Visible caption and the accessible name of the segment track.',
        },
        {
          name: 'hideLabel',
          type: 'boolean',
          default: 'false',
          description:
            'Keeps <code>label</code> as the accessible name only (<code>aria-label</code>), without the caption.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Helper text under the segments, hidden while an error shows.',
        },
        {
          name: 'fluid',
          type: 'boolean',
          default: 'false',
          description:
            'Stretches the track to the container width; segments share it equally.',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeToggleGroupItemTemplateContext&gt;',
          description:
            'Custom segment content (icons, badges); context: <code>$implicit</code>, <code>index</code>, <code>selected</code>.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeToggleGroup events',
      entries: [
        {
          name: 'itemClick',
          type: 'OgeToggleGroupItemClickEvent',
          description:
            'A segment was pressed by click or keyboard, before any value change — <code>{ item, index, event }</code>.',
        },
        {
          name: 'selectionChanged',
          type: 'OgeToggleGroupSelectionChangedEvent',
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
          name: 'OgeToggleGroupItemClickEvent / OgeToggleGroupSelectionChangedEvent',
          type: 'interfaces',
          description:
            'Payloads of <code>itemClick</code> / <code>selectionChanged</code>.',
        },
        {
          name: 'OgeToggleGroupItemTemplateContext',
          type: '{ $implicit; index; selected }',
          description: 'Context of <code>itemTemplate</code>.',
        },
        {
          name: 'vs. OgeButtonGroup',
          type: 'choice',
          description:
            '<code>oge-button-group</code> is an action / segmented control with <code>selectedKeys</code>; <code>oge-toggle-group</code> is the form editor — label, hint, validation, Signal Forms and reactive forms, scalar single value. Both run the same <code>@oge-ui/behavior</code> selection and arrow-key functions.',
        },
      ],
    },
  ],
};

export const OGE_MULTI_COLUMN_COMBO_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeMultiColumnComboBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            "Committed value — the selected row's <code>valueExpr</code> (<code>null</code> when empty), or an array of them in <code>multiple</code> mode; two-way.",
        },
        {
          name: 'items',
          type: 'readonly TItem[] | OgeSelectBoxItemsFn',
          default: '[]',
          description:
            'The rows: an array, or a function invoked lazily on first open.',
        },
        {
          name: 'columns',
          type: 'readonly OgeComboBoxColumn&lt;TItem&gt;[]',
          default: '[]',
          description:
            'Popup columns, left to right: <code>field</code> (dot-notation), <code>caption</code>, <code>width</code> (px or any CSS track), <code>format</code> (Intl options or a function), <code>alignment</code>, <code>searchable</code>, <code>cssClass</code> and an optional <code>cellTemplate</code>.',
        },
        {
          name: 'displayExpr',
          type: 'string | ((item) =&gt; string)',
          description:
            "Row &rarr; field text. Omitted, the first column's formatted cell text.",
        },
        {
          name: 'valueExpr / disabledExpr',
          type: 'string | fn',
          description:
            'Committed value and per-row disabling — the select box vocabulary.',
        },
        {
          name: 'selectionMode',
          type: "'single' | 'multiple'",
          default: "'single'",
          description:
            '<code>multiple</code> makes <code>value</code> an array, renders removable chips, keeps the popup open while picking and sets <code>aria-multiselectable</code>.',
        },
        {
          name: 'searchEnabled',
          type: 'boolean',
          default: 'true',
          description: 'Typing filters the rows (it is a combo box).',
        },
        {
          name: 'searchMode / searchExpr / searchTimeout / minSearchLength / showDataBeforeSearch',
          type: 'shared with OgeSelectBox',
          description:
            'Without <code>searchExpr</code> every column whose <code>searchable</code> is not <code>false</code> is searched by its formatted cell text.',
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
          type: 'number | undefined',
          description:
            'In <code>multiple</code> mode, folds chips past the cap into <code>+N more</code>.',
        },
        {
          name: 'dropdownPlacement / dropdownWidth / dropdownMaxHeight',
          type: "OgePopupPlacement / number | 'anchor' / number",
          description:
            "Popup geometry. With <code>'anchor'</code>, all-pixel column widths still set the grid's minimum width — the popup scrolls horizontally rather than squeezing columns.",
        },
        {
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed row rendering. The sticky header shares the scroller, so the window math subtracts one header row.',
        },
        {
          name: 'dataSource',
          type: 'OgeListDataSource&lt;TItem&gt; | undefined',
          description:
            "Remote, paged data: any <code>&#64;oge-ui/core</code> <code>DataSource</code> (<code>CustomDataSource</code>, <code>ArrayDataSource</code>, <code>CursorDataSource</code>, <code>ODataDataSource</code>) or an object with the same <code>load()</code>, plus an optional <code>byKey()</code>. Replaces <code>items</code> while set: pages of <code>pageSize</code> rows load as the list scrolls (virtual window or scroll position, and the keyboard reaching the end), the typed text is sent as <code>searchText</code> (debounced by <code>searchTimeout</code>, gated by <code>minSearchLength</code>), superseded requests are aborted through the <code>AbortSignal</code>, each search's pages are cached, and a committed value no loaded page holds resolves through <code>byKey</code>. Without <code>totalCount</code> the list keeps paging until a short page arrives.",
        },
        {
          name: 'pageSize',
          type: 'number | undefined',
          default: 'config: 30',
          description:
            'Rows requested per <code>dataSource</code> page (<code>take</code>); <code>undefined</code> = <code>provideOgeInputsConfig({ dataPageSize })</code>.',
        },
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Popup visibility — two-way.',
        },
        {
          name: 'adaptiveMode / adaptiveBreakpoint',
          type: "'auto' | 'none' / number",
          default: "config: 'none' / 600",
          description:
            "<code>'auto'</code> presents the grid as a bottom sheet (title, close button, a search field, a Done action in <code>multiple</code> mode) on viewports narrower than the breakpoint.",
        },
        {
          name: 'selectedItems / selectedItem',
          type: 'Signal&lt;readonly TItem[]&gt; / Signal&lt;TItem | null&gt;',
          description: 'Read-only: the rows the value resolves to.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMultiColumnComboBox methods',
      entries: [
        {
          name: 'open() / close() / toggle()',
          type: 'void',
          description:
            'Popup control; <code>close()</code> returns <code>false</code> when a <code>closing</code> handler cancels.',
        },
        {
          name: 'reload()',
          type: 'void',
          description:
            'Drops every cached <code>dataSource</code> page and re-requests the current search.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeMultiColumnComboBox events',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeMultiColumnComboBoxSelectionChangedEvent',
          description:
            '<code>{ selectedItems, addedItems, removedItems }</code> on every commit.',
        },
        {
          name: 'rowClick',
          type: 'OgeMultiColumnComboBoxRowClickEvent',
          description:
            'A row was activated — <code>{ item, index, event }</code>.',
        },
        {
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup visibility changes.',
        },
        {
          name: 'opening / closing',
          type: 'OgeDropDownOpeningEvent / OgeDropDownClosingEvent',
          description: 'Cancelable pre-events.',
        },
        {
          name: 'searchChanged',
          type: 'OgeSelectBoxSearchChangedEvent',
          description: 'Raw search text on every keystroke.',
        },
        {
          name: 'pageLoaded',
          type: 'OgeListPageLoadedEvent',
          description: 'A <code>dataSource</code> page landed.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [
    {
      title: 'Multi-column combo box types',
      entries: [
        {
          name: 'OgeComboBoxColumn',
          type: 'interface',
          description:
            "<code>{ field; caption?; width?: number | string; format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | ((value, item) =&gt; string); alignment?: 'start' | 'center' | 'end'; searchable?; cssClass?; cellTemplate? }</code>.",
        },
        {
          name: 'OgeComboBoxCellTemplateContext',
          type: 'interface',
          description:
            '<code>{ $implicit: TItem; value; text; rowIndex }</code>.',
        },
        {
          name: 'OgeMultiColumnComboBoxSelectionMode',
          type: "'single' | 'multiple'",
          description: 'How many rows may be committed.',
        },
        {
          name: 'Keyboard (APG combobox with grid popup)',
          type: 'keys',
          description:
            'Down/Up open and move rows; once in the grid Left/Right/Home/End move between cells (mirrored in RTL) and Ctrl+Home/End jump to the first/last row; PageUp/PageDown move ten rows; Enter (and Space after navigating) commits; Alt+Up commits and closes; Escape closes, then clears the search; Backspace removes the last chip in <code>multiple</code> mode.',
        },
      ],
    },
  ],
};

export const OGE_RATING_API: ApiSections = {
  properties: [
    {
      title: 'OgeRating',
      entries: [
        {
          name: 'value',
          type: 'model&lt;number | null&gt;',
          default: 'null',
          description:
            'The rating — two-way; <code>null</code> means not rated. Snapped to <code>precision</code> inside <code>0…max</code>.',
        },
        {
          name: 'max',
          type: 'number | undefined',
          default: '5',
          description:
            'Number of items (stars); <code>undefined</code> means 5. A Signal Forms schema <code>max()</code> writes it through <code>[formField]</code>.',
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
            "The built-in glyph: <code>'star' | 'heart' | 'circle'</code>. An item template replaces it.",
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
          type: 'string | undefined',
          description:
            'Locale of the spoken value (<code>aria-valuetext</code>); falls back to the config <code>locale</code>, then <code>LOCALE_ID</code>.',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeRatingItemTemplateContext&gt; | undefined',
          description:
            'Custom glyph per item — the input form of the <code>[ogeRatingItemTemplate]</code> slot.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Item size preset — 18 / 24 / 32px.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeRating events',
      entries: [
        {
          name: 'hoverChanged',
          type: 'OgeRatingHoverEvent',
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
          name: 'OgeRatingItemTemplate',
          type: 'directive',
          description:
            '<code>&lt;ng-template ogeRatingItemTemplate let-item let-filled="filled"&gt;</code> — rendered for the empty and the filled (clipped) layer of every item, so fractional fills work with any markup.',
        },
        {
          name: 'OgeRatingItemTemplateContext',
          type: '{ $implicit: OgeRatingItemState; filled: boolean; hovered: boolean }',
          description: 'Context of the item template.',
        },
        {
          name: 'OgeRatingItemState',
          type: '{ index; itemValue; fill; full; partial }',
          description:
            'One item: zero-based <code>index</code>, the <code>itemValue</code> a full press commits, the filled share <code>fill</code> (0…1).',
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
          description: 'Payload of <code>hoverChanged</code>.',
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

export const OGE_OTP_INPUT_API: ApiSections = {
  properties: [
    {
      title: 'OgeOtpInput',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description:
            'The characters entered — always a contiguous prefix, so <code>value.length === length</code> means complete. Two-way.',
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
          type: 'string | undefined',
          description:
            'Helper text under the cells (hidden while an error shows).',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'Locale of the cell names’ digits; falls back to the config <code>locale</code>, then <code>LOCALE_ID</code>.',
        },
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Cell size preset.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [
    {
      title: 'OgeOtpInput events',
      entries: [
        {
          name: 'completed',
          type: 'OgeOtpCompletedEvent',
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
          description: 'Payload of <code>completed</code>.',
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

const LIST_BOX_KEYBOARD = {
  name: 'Keyboard',
  type: 'APG listbox',
  description:
    'One Tab stop (<code>aria-activedescendant</code>). ↑/↓, Home/End, PageUp/PageDown move the active option — in <code>single</code> mode the selection follows. Typing jumps by prefix (accent-insensitive; repeat a letter to cycle). Multiple: Space/Enter toggle, Shift+↑/↓ and Shift+Space extend from the anchor, Ctrl+Shift+Home/End select to an edge, Ctrl+A (⌘A) selects all — or none when all are selected. In the search field ↓ moves into the list.',
};

export const OGE_LIST_BOX_API: ApiSections = {
  properties: [
    {
      title: 'OgeListBox',
      entries: [
        {
          name: 'value',
          type: 'model&lt;unknown&gt;',
          default: 'null',
          description:
            'The selection — one <code>valueExpr</code> result (or <code>null</code>) in single mode, an items-ordered array in multiple mode. Two-way.',
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
          name: 'allowReordering',
          type: 'boolean',
          default: 'false',
          description:
            'Lets the user reorder the options: Alt+↑/↓ moves the active option, a pointer drag (touch: after a long press) drops it before / after another. The list shows the new order at once and announces it; persist the <code>reordered</code> payload&#39;s <code>items</code> — a new <code>items</code> array resets the order. Moves stay inside a group, pass rows a search hides, and never move a disabled option.',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeListBoxItemTemplateContext&lt;TItem&gt;&gt; | undefined',
          description:
            'Option content as a <code>TemplateRef</code>; wins over a projected <code>[ogeListBoxItemTemplate]</code>. The option keeps its role, state and check glyph.',
        },
        {
          name: 'groupTemplate',
          type: 'TemplateRef&lt;OgeListBoxGroupTemplateContext&gt; | undefined',
          description:
            'Group header content; wins over a projected <code>[ogeListBoxGroupTemplate]</code>.',
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeListBox methods',
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
        {
          name: 'reorderItem(item, target, position?, cause?): boolean',
          type: 'boolean',
          description:
            "Moves <code>item</code> before (default) / after <code>target</code> through the same cancelable path as the keys and the pointer; <code>false</code> when it cannot move or a <code>reordering</code> handler cancelled it. <code>cause</code> defaults to <code>'api'</code> (the transfer list passes <code>'drag'</code>).",
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeListBox events',
      entries: [
        {
          name: 'selectionChanged',
          type: 'OgeListBoxSelectionChangedEvent&lt;TItem&gt;',
          description:
            'The selection changed — <code>{ value, previousValue, addedItems, removedItems, event }</code>.',
        },
        {
          name: 'itemClick',
          type: 'OgeListBoxItemClickEvent&lt;TItem&gt;',
          description:
            'An enabled option was clicked — <code>{ item, index, event }</code> (fires in read-only mode too).',
        },
        {
          name: 'reordering',
          type: 'OgeListBoxReorderingEvent&lt;TItem&gt;',
          description:
            'Cancelable pre-event of every reorder — <code>{ item, fromIndex, toIndex, cause, event, cancel }</code>; indices into the whole <code>items</code> array.',
        },
        {
          name: 'reordered',
          type: 'OgeListBoxReorderedEvent&lt;TItem&gt;',
          description:
            'An option moved — <code>{ item, fromIndex, toIndex, cause, items, event }</code>, after the announcement (<code>listBoxReorderedAnnouncement</code>).',
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
          name: 'OgeListBoxItemTemplate',
          type: '[ogeListBoxItemTemplate]',
          description:
            'Structural directive for the option content; context <code>OgeListBoxItemTemplateContext</code> = <code>{ $implicit: item, index, selected, active, disabled }</code>.',
        },
        {
          name: 'OgeListBoxGroupTemplate',
          type: '[ogeListBoxGroupTemplate]',
          description:
            'Structural directive for group headers; context <code>OgeListBoxGroupTemplateContext</code> = <code>{ $implicit: label, count }</code>.',
        },
        {
          name: 'OgeListBoxSelectionChangedEvent / OgeListBoxItemClickEvent / OgeListBoxReorderingEvent / OgeListBoxReorderedEvent',
          type: 'event payloads',
          description: 'See the events table.',
        },
        {
          name: 'OgeListBoxReorderCause',
          type: "'keyboard' | 'drag' | 'api'",
          description: 'What started a reorder.',
        },
        LIST_BOX_KEYBOARD,
      ],
    },
  ],
};

export const OGE_TRANSFER_LIST_API: ApiSections = {
  properties: [
    {
      title: 'OgeTransferList',
      entries: [
        {
          name: 'value',
          type: 'model&lt;readonly unknown[]&gt;',
          default: '[]',
          description:
            'The target side — the moved items’ <code>valueExpr</code> results in arrival order. Two-way.',
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
            'A search field above each list. The buttons act on what a list shows: “move all” is enabled only while the filtered view holds a movable item, “move selected” only while a selected item is visible.',
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
          name: 'itemTemplate / groupTemplate',
          type: 'TemplateRef | undefined',
          description:
            'Option / group header content for both lists; win over projected <code>[ogeListBoxItemTemplate]</code> / <code>[ogeListBoxGroupTemplate]</code>.',
        },
        {
          name: 'allowReordering',
          type: 'OgeTransferListReorderSides',
          default: 'false',
          description:
            "Lets the user reorder a list — <code>true</code> both, <code>'source'</code> / <code>'target'</code> only that one. Alt+↑/↓ moves the active option; one drag reorders when dropped inside its own list and moves when dropped on the other. The target&#39;s order is the value&#39;s order (a reorder commits it); a reordered source keeps its order until <code>items</code> changes.",
        },
      ],
    },
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeTransferList methods',
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
      title: 'OgeTransferList events',
      entries: [
        {
          name: 'moving',
          type: 'OgeTransferListMovingEvent&lt;TItem&gt;',
          description:
            "Cancelable pre-event of every move — <code>{ items, values, from, to, cause, cancel }</code>; <code>cause</code> is <code>'button' | 'keyboard' | 'drag'</code>.",
        },
        {
          name: 'moved',
          type: 'OgeTransferListMovedEvent&lt;TItem&gt;',
          description:
            'Items changed sides — <code>{ items, values, from, to, cause, value }</code>, after the commit and the live announcement.',
        },
        {
          name: 'reordering',
          type: 'OgeTransferListReorderingEvent&lt;TItem&gt;',
          description:
            'Cancelable pre-event of a reorder inside one list — <code>{ side, item, fromIndex, toIndex, cause, event, cancel }</code>.',
        },
        {
          name: 'reordered',
          type: 'OgeTransferListReorderedEvent&lt;TItem&gt;',
          description:
            'An item moved inside one list — <code>{ side, item, fromIndex, toIndex, cause, items, value, event }</code>; a target reorder has already committed the new <code>value</code>.',
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
          name: 'OgeTransferListReorderSides',
          type: "boolean | 'source' | 'target'",
          description: 'Which lists <code>allowReordering</code> opens.',
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
          name: 'Announcements',
          type: 'OgeLiveAnnouncer',
          description:
            'Every move is announced politely through the shared live announcer (<code>transferMovedAnnouncement</code>, an ICU plural).',
        },
      ],
    },
  ],
};

const SIGNATURE_TYPES: ApiGroup = {
  title: 'Signature pad types',
  entries: [
    {
      name: 'OgeSignatureFormat',
      type: "'png' | 'svg'",
      description:
        'Export format. PNG renders through a canvas (falling back to SVG where no 2D context exists, e.g. SSR or jsdom); SVG is built without the DOM and embeds the strokes in a <code>&lt;metadata&gt;</code> element, so the value restores an editable pad.',
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
        'A sample in surface-relative coordinates (<code>0..1</code> on both axes) with its time in ms — why a resized pad redraws exactly.',
    },
    {
      name: 'OgeSignatureStrokeEvent',
      type: '{ stroke: OgeSignatureStroke; strokeCount: number; event: Event | undefined }',
      description: 'Payload of the stroke-ended event.',
    },
    {
      name: 'Keyboard',
      type: 'buttons + text field',
      description:
        'Draw / Type is a pressed-state button pair; Undo (also <kbd>Ctrl</kbd>+<kbd>Z</kbd> anywhere in the pad) and Clear are real buttons; <kbd>Escape</kbd> mid-stroke cancels the stroke. The surface is <code>role="img"</code> named “label, signed / not signed”.',
    },
  ],
};

export const OGE_SIGNATURE_PAD_API: ApiSections = {
  properties: [
    {
      title: 'OgeSignaturePad',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string | null&gt;',
          default: 'null',
          description:
            'The signature as a <code>data:</code> URL in <code>format</code> — two-way. Writing a stored value back restores the pad’s own SVG export as strokes; any other image URL is shown (sanitized) until the next stroke replaces it.',
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
          type: 'string | undefined',
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
          type: 'model&lt;OgeSignatureMode&gt;',
          default: "'draw'",
          description: 'Draw with a pointer or type a name — two-way.',
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
          type: 'string | undefined',
          description:
            'Ink colour; <code>undefined</code> = the <code>--oge-signature-ink</code> token (forced colors repaint it).',
        },
        {
          name: 'backgroundColor',
          type: 'string | undefined',
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
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeSignaturePad methods',
      entries: [
        {
          name: 'undo(): void',
          type: 'void',
          description: 'Removes the last stroke and re-exports the value.',
        },
        {
          name: 'toDataUrl(format?): string | null',
          type: 'string | null',
          description:
            'The signature as a <code>data:</code> URL (default: <code>format</code>); <code>null</code> when empty.',
        },
        {
          name: 'toSvg(): string | null',
          type: 'string | null',
          description:
            'The signature as an SVG document string; <code>null</code> when empty.',
        },
        {
          name: 'setMode(mode): void',
          type: 'void',
          description:
            'Switches between drawing and typing, re-exporting the value.',
        },
        {
          name: 'isEmpty(): boolean',
          type: 'boolean',
          description: 'No signature (<code>value === null</code>).',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeSignaturePad events',
      entries: [
        {
          name: 'strokeEnded',
          type: 'OgeSignatureStrokeEvent',
          description: 'A stroke was completed (pen up) and committed.',
        },
        {
          name: 'modeChange',
          type: 'OgeSignatureMode',
          description: 'Implicit output of the <code>mode</code> model.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [SIGNATURE_TYPES],
};

const MENTION_TYPES: ApiGroup = {
  title: 'Mention types',
  entries: [
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
      description: 'Payload of the mention-selected event.',
    },
    {
      name: 'OgeMentionSearchChangedEvent',
      type: '{ trigger: string; text: string }',
      description: 'Payload of the search-changed event.',
    },
    {
      name: 'OgeMentionItemTemplate',
      type: 'directive',
      description:
        '<code>&lt;ng-template ogeMentionItemTemplate let-item&gt;</code> child — a custom suggestion row; wins over <code>itemTemplate</code>.',
    },
    {
      name: 'OgeMentionItemTemplateContext&lt;T&gt;',
      type: '{ $implicit: T; item: T; index: number; trigger: string; query: string; active: boolean }',
      description: 'Context of a custom suggestion row.',
    },
    {
      name: 'Keyboard',
      type: 'APG combobox',
      description:
        '<kbd>ArrowDown</kbd>/<kbd>ArrowUp</kbd> move the active suggestion, <kbd>PageUp</kbd>/<kbd>PageDown</kbd> jump to the ends, <kbd>Enter</kbd> or <kbd>Tab</kbd> insert, <kbd>Escape</kbd> closes until the next trigger. A trigger counts only at the start or after whitespace. The single-line field is <code>role="combobox"</code>; the text area keeps its textbox role (ARIA allows no combobox role there) with <code>aria-autocomplete</code>, <code>aria-controls</code> and <code>aria-activedescendant</code>.',
    },
  ],
};

export const OGE_MENTION_API: ApiSections = {
  properties: [
    {
      title: 'OgeMention',
      entries: [
        {
          name: 'value',
          type: 'model&lt;string&gt;',
          default: "''",
          description:
            'The text, mentions included as plain-text tokens — two-way.',
        },
        {
          name: 'mentions',
          type: 'model&lt;readonly OgeMentionToken&lt;T&gt;[]&gt;',
          default: '[]',
          description:
            'The inserted mentions in text order — two-way, kept in step with every edit (a token edited away drops out).',
        },
        {
          name: 'triggers',
          type: 'readonly OgeMentionTrigger&lt;T&gt;[] | undefined',
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
          type: 'OgeSelectBoxDisplayExpr&lt;T&gt; | undefined',
          description:
            'Shorthand: item → display text, also the inserted token text.',
        },
        {
          name: 'valueExpr',
          type: 'OgeSelectBoxValueExpr&lt;T&gt; | undefined',
          description:
            'Shorthand: item → the <code>value</code> reported in <code>mentions</code> (default: the item).',
        },
        {
          name: 'searchExpr',
          type: 'OgeSelectBoxSearchExpr&lt;T&gt; | undefined',
          description:
            'Shorthand: which text the local filter matches (default: the display text).',
        },
        {
          name: 'searchMode',
          type: 'OgeSelectBoxSearchMode',
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
            'Lets a query run across spaces (<code>@Ada Lo</code>); line breaks always end it.',
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
          type: 'number | undefined',
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
          type: 'number | undefined',
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
          type: 'number | undefined',
          description:
            'Suggestion list height cap; <code>undefined</code> = the CSS default (320px).',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeMentionItemTemplateContext&lt;T&gt;&gt; | undefined',
          description:
            'Custom suggestion row; an <code>[ogeMentionItemTemplate]</code> child wins.',
        },
      ],
    },
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [
    {
      title: 'OgeMention methods',
      entries: [
        {
          name: 'close(): void',
          type: 'void',
          description: 'Closes the suggestion list.',
        },
      ],
    },
    COMMON_METHODS,
  ],
  events: [
    {
      title: 'OgeMention events',
      entries: [
        {
          name: 'mentionSelected',
          type: 'OgeMentionSelectedEvent&lt;T&gt;',
          description: 'A suggestion was inserted.',
        },
        {
          name: 'mentionsChange',
          type: 'readonly OgeMentionToken&lt;T&gt;[]',
          description:
            'Implicit output of the <code>mentions</code> model — after an insert and after an edit that shifted or dropped a mention.',
        },
        {
          name: 'searchChanged',
          type: 'OgeMentionSearchChangedEvent',
          description:
            'The query after a trigger changed — drive your own server-side suggestions from here.',
        },
      ],
    },
    COMMON_EVENTS,
  ],
  types: [MENTION_TYPES],
};
