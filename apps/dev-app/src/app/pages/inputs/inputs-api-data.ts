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
        'Every committed change with <code>previousValue</code> + originating DOM event (<code>undefined</code> for programmatic writes) — the DevExtreme <code>onValueChanged</code> shape.',
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
            'Mutable payload (DevExtreme-style): assign <code>customItem</code> — an item, a promise of one, or <code>null</code> to reject the text. Left unset, the raw text becomes the item.',
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
