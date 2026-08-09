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
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [COMMON_EVENTS],
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
            "Display formatting applied while unfocused; focus shows the raw number. <code>style: 'percent'</code> formats display only — the model value is not rescaled.",
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
          description: 'Opens the popup (no-op while disabled/readonly).',
        },
        { name: 'close()', type: 'void', description: 'Closes the popup.' },
        {
          name: 'toggle()',
          type: 'void',
          description: 'Toggles the popup.',
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
            'Time picker layout: one interval list, or hour + minute columns.',
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
          type: "'date' | 'datetime'",
          default: "'date'",
          description:
            "<code>'datetime'</code> adds start/end time lists to the picker: day and time picks collect in a draft and commit together on OK; both sides parse and render times.",
        },
        {
          name: 'interval',
          type: 'number',
          default: '30',
          description:
            "Time list step in minutes (<code>type: 'datetime'</code>).",
        },
        {
          name: 'min / max / disabledDates / firstDayOfWeek / showWeekNumbers / locale / displayFormat / openOnFieldClick / acceptCustomValue',
          type: 'as OgeDateBox',
          description: 'Shared configuration surface.',
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
            'The tag box reuses the select box expression vocabulary verbatim.',
        },
        {
          name: 'searchEnabled / searchMode / searchExpr',
          type: 'shared with OgeSelectBox',
          description: 'Client-side filtering of the option list.',
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
            'Caps the rendered chips; the rest collapse into a <code>+N</code> chip.',
        },
        {
          name: 'opened / dropdownPlacement / dropdownWidth / dropdownMaxHeight / showDropDownButton / openOnFieldClick',
          type: 'shared with OgeSelectBox',
          description: 'Popup configuration and two-way visibility.',
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
          description: 'Popup control (no-ops while disabled/readonly).',
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
          name: 'dropDownOpened / dropDownClosed',
          type: 'void',
          description: 'Popup visibility changes, from any trigger.',
        },
      ],
    },
    COMMON_EVENTS,
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
          name: 'focus() / blur() / reset()',
          type: '() => void',
          description: 'Inherited field-chrome control methods.',
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
          name: 'OgeTreeSelectSelectionChangedEvent',
          type: '{ keys, previousKeys }',
          description: 'Payload of <code>selectionChanged</code>.',
        },
      ],
    },
  ],
};
