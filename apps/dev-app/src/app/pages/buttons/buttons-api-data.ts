import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/buttons/src/lib/** — keep in sync with the
 * source TSDoc when the public API changes.
 */

export const OGE_BUTTON_API: ApiSections = {
  properties: [
    {
      title: 'Appearance',
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description:
            'Label text; alternative (or addition) to projecting content.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description:
            'Tooltip — rendered as the native <code>title</code> attribute.',
        },
        {
          name: 'stylingMode',
          type: 'OgeButtonStylingMode | undefined',
          description:
            'Fill style; falls back to the enclosing group, then <code>contained</code>.',
        },
        {
          name: 'severity',
          type: 'OgeButtonSeverity | undefined',
          description:
            'Semantic color; falls back to the enclosing group, then <code>normal</code>.',
        },
        {
          name: 'size',
          type: 'OgeButtonSize | undefined',
          description:
            'Size preset; falls back to the enclosing group, then <code>md</code>.',
        },
        {
          name: 'color',
          type: 'string | undefined',
          description:
            'Custom main color (any CSS color) — overrides the severity palette; the soft tint is derived via <code>color-mix</code>.',
        },
        {
          name: 'iconPosition',
          type: 'OgeButtonIconPosition',
          default: "'before'",
          description:
            'Where <code>[ogeButtonIcon]</code> content renders relative to the label.',
        },
        {
          name: 'badge',
          type: 'string | number | boolean | undefined',
          description:
            'String/number renders a pill (numbers cap at <code>99+</code> and join the accessible name); <code>true</code> renders a plain dot.',
        },
      ],
    },
    {
      title: 'Behavior',
      entries: [
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the button.',
        },
        {
          name: 'loading',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description:
            'Busy state — two-way; managed automatically while <code>action</code> is pending.',
        },
        {
          name: 'action',
          type: '(() =&gt; unknown) | undefined',
          description:
            'Async click handler: sets <code>loading</code> while pending, single-flight; sync returns emit <code>actionDone</code> immediately.',
        },
        {
          name: 'clickGuard',
          type: 'boolean | OgeClickGuardOptions',
          default: 'false',
          description:
            'Rate-limits the <code>clicked</code> output; <code>true</code> throttles with <code>config.clickGuardMs</code>.',
        },
        {
          name: 'holdToConfirm',
          type: 'boolean | OgeHoldToConfirmOptions',
          default: 'false',
          description:
            'Fires <code>clicked</code> only after an uninterrupted press; wins over <code>autoRepeat</code>. <code>true</code> uses <code>config.holdToConfirmMs</code>.',
        },
        {
          name: 'autoRepeat',
          type: 'boolean | OgeAutoRepeatOptions',
          default: 'false',
          description:
            'Repeats <code>clicked</code> while held; ignored when <code>holdToConfirm</code> is set.',
        },
        {
          name: 'useSubmitBehavior',
          type: 'boolean',
          default: 'false',
          description:
            'Renders <code>type="submit"</code> so the button submits the enclosing form.',
        },
        {
          name: 'buttonType',
          type: "'button' | 'submit' | 'reset'",
          default: "'button'",
          description:
            'Native button type; <code>useSubmitBehavior</code> is sugar for <code>submit</code>.',
        },
        {
          name: 'value',
          type: 'string | undefined',
          description:
            'Selection key inside an <code>&lt;oge-button-group&gt;</code>; unused standalone.',
        },
        {
          name: 'tabIndex',
          type: 'number',
          default: '0',
          description: 'Tab order of the native button.',
        },
        {
          name: 'accessKey',
          type: 'string | undefined',
          description: 'Native <code>accesskey</code> of the inner button.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeButtonsMessages&gt; | undefined',
          description: 'Per-instance overrides of user-facing strings.',
        },
      ],
    },
    {
      title: 'Accessibility',
      entries: [
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the native button — required for icon-only buttons.',
        },
        {
          name: 'ariaHasPopup',
          type: 'string | undefined',
          description:
            '<code>aria-haspopup</code> of the native button — for popup triggers.',
        },
        {
          name: 'ariaExpanded',
          type: 'boolean | undefined',
          description:
            '<code>aria-expanded</code>; <code>undefined</code> omits the attribute.',
        },
        {
          name: 'ariaControls',
          type: 'string | undefined',
          description:
            '<code>aria-controls</code> — id of the controlled popup.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus(): void',
          type: 'void',
          description:
            'Moves keyboard focus to the inner native button (<code>preventScroll: true</code>).',
        },
        {
          name: 'isDisabled',
          type: 'Signal&lt;boolean&gt;',
          description:
            'Read-only computed: disabled, busy, or inside a disabled group.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'clicked',
          type: 'OgeButtonClickEvent',
          description:
            'Fires after the gesture/guard pipeline accepts a click. Bind this instead of native <code>(click)</code>, which bypasses every guard.',
        },
        {
          name: 'actionDone',
          type: 'OgeButtonActionDoneEvent',
          description: 'The <code>action</code> callback settled successfully.',
        },
        {
          name: 'actionFailed',
          type: 'OgeButtonActionFailedEvent',
          description: 'The <code>action</code> callback threw or rejected.',
        },
        {
          name: 'loadingChange',
          type: 'boolean',
          description: 'Implicit output of the <code>loading</code> model.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeButtonStylingMode',
          type: "'contained' | 'outlined' | 'text'",
          description: 'Fill style.',
        },
        {
          name: 'OgeButtonSeverity',
          type: "'normal' | 'accent' | 'success' | 'warning' | 'danger'",
          description: 'Semantic color mapped to the severity tokens.',
        },
        {
          name: 'OgeButtonSize',
          type: "'sm' | 'md' | 'lg'",
          description: 'Height/padding preset.',
        },
        {
          name: 'OgeButtonIconPosition',
          type: "'before' | 'after'",
          description: 'Icon slot placement.',
        },
        {
          name: 'OgeButtonClickEvent',
          type: '{ event: MouseEvent | KeyboardEvent }',
          description:
            '<code>KeyboardEvent</code> when produced by Space/Enter during hold/repeat.',
        },
        {
          name: 'OgeButtonActionDoneEvent',
          type: '{ result: unknown }',
          description:
            'Resolved value (or sync return) of <code>action</code>.',
        },
        {
          name: 'OgeButtonActionFailedEvent',
          type: '{ error: unknown }',
          description:
            'Rejection reason or thrown error of <code>action</code>.',
        },
        {
          name: 'OgeClickGuardOptions',
          type: "{ mode: 'debounce' | 'throttle'; ms?: number }",
          description:
            '<code>ms</code> defaults to <code>config.clickGuardMs</code>; <code>true</code> shorthand ≡ throttle.',
        },
        {
          name: 'OgeHoldToConfirmOptions',
          type: '{ ms?: number }',
          description:
            'Hold duration; defaults to <code>config.holdToConfirmMs</code>.',
        },
        {
          name: 'OgeAutoRepeatOptions',
          type: '{ delayMs?: number; intervalMs?: number }',
          description:
            'Defaults from <code>config.autoRepeatDelayMs</code> / <code>autoRepeatIntervalMs</code>.',
        },
        {
          name: 'OgeButtonIcon',
          type: 'directive — [ogeButtonIcon]',
          description:
            'Marks projected content as the icon slot; placement follows <code>iconPosition</code>.',
        },
      ],
    },
  ],
};

export const OGE_BUTTON_GROUP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeButtonGroupItem[] | undefined',
          description:
            'Data-driven items rendered after projected <code>&lt;oge-button&gt;</code> children.',
        },
        {
          name: 'selectionMode',
          type: 'OgeButtonGroupSelectionMode',
          default: "'none'",
          description:
            'Selection behavior; also drives the ARIA role (toolbar / radiogroup / group).',
        },
        {
          name: 'selectedKeys',
          type: 'model&lt;readonly string[]&gt;',
          default: '[]',
          description:
            'Selected <code>value</code>s — two-way; <code>single</code> keeps at most one entry.',
        },
        {
          name: 'stylingMode',
          type: 'OgeButtonStylingMode',
          default: "'contained'",
          description: 'Cascaded to children without their own.',
        },
        {
          name: 'severity',
          type: 'OgeButtonSeverity',
          default: "'normal'",
          description: 'Cascaded to children without their own.',
        },
        {
          name: 'size',
          type: 'OgeButtonSize',
          default: "'md'",
          description: 'Cascaded to children without their own.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables every button in the group.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the toolbar/radiogroup/group element.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus(): void',
          type: 'void',
          description:
            'Moves keyboard focus to the roving-tabindex target button.',
        },
        {
          name: 'isSelected(value: string | undefined): boolean',
          type: 'boolean',
          description:
            'Whether the given button <code>value</code> is currently selected (reactive).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'itemClick',
          type: 'OgeButtonGroupItemClickEvent',
          description:
            'Every accepted child click, before any selection change.',
        },
        {
          name: 'selectionChanged',
          type: 'OgeButtonGroupSelectionChangedEvent',
          description:
            '<code>selectedKeys</code> changed through user interaction.',
        },
        {
          name: 'selectedKeysChange',
          type: 'readonly string[]',
          description:
            'Implicit output of the <code>selectedKeys</code> model.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeButtonGroupSelectionMode',
          type: "'none' | 'single' | 'multiple'",
          description: 'Selection behavior of the group.',
        },
        {
          name: 'OgeButtonGroupItem',
          type: '{ value: string; text?; hint?; disabled?; severity?; badge? }',
          description: 'Data-driven item; icons require declarative children.',
        },
        {
          name: 'OgeButtonGroupItemClickEvent',
          type: '{ value: string | undefined; event: MouseEvent | KeyboardEvent; item?: OgeButtonGroupItem; index: number }',
          description:
            '<code>index</code> is DOM-order; <code>-1</code> when unresolvable.',
        },
        {
          name: 'OgeButtonGroupSelectionChangedEvent',
          type: '{ selectedKeys: readonly string[]; addedKeys: readonly string[]; removedKeys: readonly string[] }',
          description: 'Full state plus diffs.',
        },
      ],
    },
  ],
};

export const OGE_DROP_DOWN_BUTTON_API: ApiSections = {
  properties: [
    {
      title: 'Trigger button',
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description: 'Label of the (main) trigger button.',
        },
        {
          name: 'hint',
          type: 'string | undefined',
          description: 'Tooltip of the trigger.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the whole control.',
        },
        {
          name: 'stylingMode',
          type: 'OgeButtonStylingMode | undefined',
          description: 'Same fallback chain as <code>OgeButton</code>.',
        },
        {
          name: 'severity',
          type: 'OgeButtonSeverity | undefined',
          description: 'Same fallback chain as <code>OgeButton</code>.',
        },
        {
          name: 'size',
          type: 'OgeButtonSize | undefined',
          description: 'Same fallback chain as <code>OgeButton</code>.',
        },
        {
          name: 'color',
          type: 'string | undefined',
          description: 'Custom main color — overrides the severity palette.',
        },
        {
          name: 'iconPosition',
          type: 'OgeButtonIconPosition',
          default: "'before'",
          description: 'Icon slot placement on the trigger.',
        },
        {
          name: 'badge',
          type: 'string | number | boolean | undefined',
          description: 'Badge on the trigger, as on <code>OgeButton</code>.',
        },
        {
          name: 'splitButton',
          type: 'boolean',
          default: 'false',
          description:
            '<code>true</code> renders a separate chevron toggle next to an action main button.',
        },
        {
          name: 'action',
          type: '(() =&gt; unknown) | undefined',
          description:
            'Async click handler of the split main button (single-flight, drives <code>loading</code>).',
        },
        {
          name: 'clickGuard',
          type: 'boolean | OgeClickGuardOptions',
          default: 'false',
          description: 'Click guard of the split main button.',
        },
        {
          name: 'loading',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Busy state of the (main) button — two-way.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeButtonsMessages&gt; | undefined',
          description:
            'Per-instance overrides of user-facing strings (status rows, toggle label).',
        },
      ],
    },
    {
      title: 'Drop-down panel',
      entries: [
        {
          name: 'items',
          type: 'readonly OgeMenuItem[] | OgeDropDownItemsFn | undefined',
          description:
            'Menu items — an array, or a function invoked lazily on first open (result cached until the function reference changes).',
        },
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description: 'Panel visibility — two-way.',
        },
        {
          name: 'dropdownPlacement',
          type: 'OgePopupPlacement',
          default: "'bottom-start'",
          description:
            'Preferred panel placement (flips/clamps automatically).',
        },
        {
          name: 'dropdownWidth',
          type: "number | 'anchor' | undefined",
          description:
            "Fixed pixels or <code>'anchor'</code> to match the button width.",
        },
        {
          name: 'rememberLastAction',
          type: 'boolean',
          default: 'false',
          description:
            "Split mode: the last clicked item becomes the main button's label + action.",
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeMenuItemTemplateContext&gt; | undefined',
          description:
            'Custom rendering for menu items — see <code>OgeMenuList</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'open(): void',
          type: 'void',
          description: 'Opens the panel programmatically.',
        },
        {
          name: 'close(): void',
          type: 'void',
          description: 'Closes the panel programmatically.',
        },
        {
          name: 'toggle(): void',
          type: 'void',
          description: 'Toggles <code>opened</code>.',
        },
        {
          name: 'focus(): void',
          type: 'void',
          description: 'Focuses the trigger (split mode: the chevron toggle).',
        },
        {
          name: 'panel',
          type: 'OgeAnchoredPanel',
          description:
            'The anchored-panel model — public so templates/tests can read <code>panelId</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'itemClick',
          type: 'OgeDropDownButtonItemClickEvent',
          description: 'Menu item activated; the panel closes afterwards.',
        },
        {
          name: 'selectionChanged',
          type: 'OgeDropDownSelectionChangedEvent',
          description:
            '<code>rememberLastAction</code> mode: the remembered item changed.',
        },
        {
          name: 'clicked',
          type: 'OgeButtonClickEvent',
          description:
            'Split mode only: the main action button was clicked. In non-split mode the trigger only toggles the panel.',
        },
        {
          name: 'actionDone',
          type: 'OgeButtonActionDoneEvent',
          description:
            'The split-button <code>action</code> settled successfully.',
        },
        {
          name: 'actionFailed',
          type: 'OgeButtonActionFailedEvent',
          description:
            'The split-button <code>action</code> threw or rejected.',
        },
        {
          name: 'openedChange',
          type: 'boolean',
          description:
            'Implicit output of the <code>opened</code> model — fires on both open and close.',
        },
        {
          name: 'loadingChange',
          type: 'boolean',
          description: 'Implicit output of the <code>loading</code> model.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeDropDownItemsFn',
          type: '() =&gt; readonly OgeMenuItem[] | Promise&lt;readonly OgeMenuItem[]&gt;',
          description: 'Lazy items factory — invoked on first open.',
        },
        {
          name: 'OgeDropDownButtonItemClickEvent',
          type: '{ item: OgeMenuItem; index: number; event: MouseEvent | KeyboardEvent }',
          description:
            'Index within the resolved items list (separators included).',
        },
        {
          name: 'OgeDropDownSelectionChangedEvent',
          type: '{ item: OgeMenuItem; previousItem: OgeMenuItem | null }',
          description:
            'Remembered-item change in <code>rememberLastAction</code> mode.',
        },
        {
          name: 'OgeDropDownContent',
          type: 'directive — [ogeDropDownContent]',
          description:
            'Replaces the item menu with arbitrary panel content; context <code>{ $implicit: () =&gt; void }</code> closes the panel and restores focus.',
        },
      ],
    },
  ],
};

export const OGE_BUTTONS_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'provideOgeButtonsConfig(config: OgeButtonsConfigInput): Provider',
          type: 'Provider',
          description:
            'Application- or component-scoped defaults; deep-merges <code>messages</code> over the defaults.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgeButtonsConfig',
      entries: [
        {
          name: 'clickGuardMs',
          type: 'number',
          default: '500',
          description:
            'Default window for <code>clickGuard: true</code> and guard options without <code>ms</code>.',
        },
        {
          name: 'holdToConfirmMs',
          type: 'number',
          default: '800',
          description:
            'Default hold duration for <code>holdToConfirm: true</code>.',
        },
        {
          name: 'autoRepeatDelayMs',
          type: 'number',
          default: '400',
          description: 'Delay before <code>autoRepeat</code> starts repeating.',
        },
        {
          name: 'autoRepeatIntervalMs',
          type: 'number',
          default: '80',
          description: 'Interval between repeated clicks.',
        },
        {
          name: 'messages',
          type: 'OgeButtonsMessages',
          description: 'User-facing strings (see below).',
        },
      ],
    },
    {
      title: 'OgeButtonsMessages',
      entries: [
        {
          name: 'loading',
          type: 'string',
          default: "'Loading'",
          description: 'Screen-reader text announced while a button is busy.',
        },
        {
          name: 'holdToConfirm',
          type: 'string',
          default: "'Hold to confirm'",
          description:
            'Tooltip fragment when <code>holdToConfirm</code> is enabled.',
        },
        {
          name: 'dropDownLoading',
          type: 'string',
          default: "'Loading…'",
          description: 'Status row while a drop-down loads async items.',
        },
        {
          name: 'dropDownNoItems',
          type: 'string',
          default: "'No items'",
          description: 'Status row when a drop-down has no items.',
        },
        {
          name: 'dropDownLoadError',
          type: 'string',
          default: "'Could not load items'",
          description: 'Status row when async items failed to load.',
        },
        {
          name: 'dropDownToggle',
          type: 'string',
          default: "'Open menu'",
          description: "Aria label of the split drop-down's chevron toggle.",
        },
      ],
    },
  ],
};
