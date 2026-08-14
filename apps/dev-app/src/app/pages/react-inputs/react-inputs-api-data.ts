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
    COMMON_CHROME,
    COMMON_STATE,
  ],
  methods: [COMMON_METHODS],
  events: [FIELD_EVENTS],
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
          type: '{ focus(); blur(); clear() }',
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
            "Display formatting applied while unfocused; focus shows the raw number. <code>style: 'percent'</code> formats display only — the value is not rescaled.",
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
          description: 'Opens the popup (no-op while disabled/readonly).',
        },
        {
          name: 'close()',
          type: '() =&gt; void',
          description: 'Closes the popup.',
        },
        {
          name: 'toggle()',
          type: '() =&gt; void',
          description: 'Toggles the popup.',
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
          type: '{ focus(); blur(); clear(); open(); close(); toggle() }',
          description: 'Imperative handle exposed through <code>ref</code>.',
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
          type: 'number',
          description:
            'Caps the rendered chips; the rest collapse into a <code>+N</code> chip.',
        },
        {
          name: 'opened / defaultOpened / dropdownPlacement / dropdownWidth / dropdownMaxHeight / showDropDownButton / openOnFieldClick',
          type: 'shared with OgeSelectBox',
          description:
            'Popup configuration and the controlled/uncontrolled visibility pair.',
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
          description: 'Popup control (no-ops while disabled/readonly).',
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
      ],
    },
    FIELD_EVENTS,
  ],
  types: [
    {
      entries: [
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
          name: 'virtualScroll',
          type: 'boolean | OgeVirtualScrollOptions',
          default: 'false',
          description:
            'Windowed rendering for large lists — same contract as the select box.',
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
          name: 'messages',
          type: 'OgeInputsMessages',
          description:
            'User-facing strings — the same key set the Angular package documents (clear/reveal/copy/spin labels, counter patterns and the validation messages).',
        },
      ],
    },
  ],
};
