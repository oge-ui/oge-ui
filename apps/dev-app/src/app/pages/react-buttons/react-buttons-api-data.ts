import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/buttons/src/lib/** — keep in sync with the
 * source TSDoc when the public API changes.
 *
 * Deliberately a separate table from the Angular package's: the members that
 * differ (callbacks instead of outputs, controlled/uncontrolled pairs instead
 * of `model()`) are exactly what a reader needs spelled out. The parity gate
 * compares the two and flags anything missing on either side.
 */

export const OGE_REACT_BUTTON_API: ApiSections = {
  properties: [
    {
      title: 'Appearance',
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description: 'Label text; alternative (or addition) to children.',
        },
        {
          name: 'hint',
          type: 'string',
          description:
            'Tooltip — rendered as the native <code>title</code> attribute.',
        },
        {
          name: 'stylingMode',
          type: 'OgeButtonStylingMode',
          description:
            'Fill style; falls back to the enclosing group, then <code>contained</code>.',
        },
        {
          name: 'severity',
          type: 'OgeButtonSeverity',
          description:
            'Semantic color; falls back to the enclosing group, then <code>normal</code>.',
        },
        {
          name: 'size',
          type: 'OgeButtonSize',
          description:
            'Size preset; falls back to the enclosing group, then <code>md</code>.',
        },
        {
          name: 'color',
          type: 'string',
          description:
            'Custom main color (any CSS color); the soft tint is derived automatically.',
        },
        {
          name: 'icon',
          type: 'ReactNode',
          description:
            'Icon node rendered before or after the label. React slots take nodes, not directive markup.',
        },
        {
          name: 'iconPosition',
          type: 'OgeButtonIconPosition',
          default: "'before'",
          description: 'Where <code>icon</code> renders relative to the label.',
        },
        {
          name: 'badge',
          type: 'string | number | boolean',
          description:
            'Notification badge: a string/number renders a pill (numbers cap at <code>99+</code> and join the accessible name), <code>true</code> renders a plain dot.',
        },
        {
          name: 'className',
          type: 'string',
          description: 'Extra class names appended to the host element.',
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
          name: 'value',
          type: 'string',
          description:
            'Selection key within an enclosing <code>&lt;OgeButtonGroup&gt;</code>; also stamped as <code>data-oge-value</code> so the group resolves clicks and arrow-selection off the DOM.',
        },
        {
          name: 'loading',
          type: 'boolean',
          description:
            'Busy state. Omit it to let the component own the flag while an <code>action</code> is pending; pass it to control the flag yourself.',
        },
        {
          name: 'action',
          type: '() => unknown',
          description:
            'Async click handler. Turns <code>loading</code> on while the returned promise is pending and ignores further clicks until it settles (single-flight).',
        },
        {
          name: 'clickGuard',
          type: 'boolean | OgeClickGuardOptions',
          default: 'false',
          description:
            'Rate-limits <code>onClick</code>. <code>true</code> throttles with <code>config.clickGuardMs</code>.',
        },
        {
          name: 'holdToConfirm',
          type: 'boolean | OgeHoldToConfirmOptions',
          default: 'false',
          description:
            'Fires <code>onClick</code> only after an uninterrupted press. Mutually exclusive with <code>autoRepeat</code>, which it wins.',
        },
        {
          name: 'autoRepeat',
          type: 'boolean | OgeAutoRepeatOptions',
          default: 'false',
          description:
            'Repeats <code>onClick</code> while the button is held. Ignored when <code>holdToConfirm</code> is also set.',
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
          description: 'Native button type.',
        },
        {
          name: 'messages',
          type: 'Partial<OgeButtonsMessages>',
          description: 'Per-instance overrides of user-facing strings.',
        },
      ],
    },
    {
      title: 'Accessibility',
      entries: [
        {
          name: 'ariaLabel',
          type: 'string',
          description:
            'Accessible name of the native button — required for icon-only buttons.',
        },
        {
          name: 'ariaHasPopup',
          type: "AriaAttributes['aria-haspopup']",
          description: 'For popup triggers.',
        },
        {
          name: 'ariaExpanded',
          type: 'boolean',
          description: 'Omitted from the DOM when undefined.',
        },
        {
          name: 'ariaControls',
          type: 'string',
          description: 'Id of the controlled popup.',
        },
        {
          name: 'tabIndex',
          type: 'number',
          default: '0',
          description:
            'Ignored inside a group, which owns the roving tabindex itself.',
        },
        {
          name: 'accessKey',
          type: 'string',
          description: 'Native <code>accesskey</code> of the inner button.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'focus()',
          type: '() => void',
          description:
            'Moves keyboard focus to the inner native button. Reached through a <code>ref</code> typed <code>OgeButtonHandle</code>.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onClick',
          type: '(event: MouseEvent | KeyboardEvent) => void',
          description:
            'Fires after the gesture/guard pipeline accepts a click. Use this rather than a native click handler — the native event bypasses <code>clickGuard</code>, <code>holdToConfirm</code>, <code>autoRepeat</code> and the single-flight protection.',
        },
        {
          name: 'onActionDone',
          type: '(result: unknown) => void',
          description: 'The <code>action</code> settled successfully.',
        },
        {
          name: 'onActionFailed',
          type: '(error: unknown) => void',
          description: 'The <code>action</code> threw or rejected.',
        },
        {
          name: 'onLoadingChange',
          type: '(loading: boolean) => void',
          description:
            'The busy state changed — the controlled half of <code>loading</code>.',
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
          description: 'Shared with the Angular package via @oge-ui/behavior.',
        },
        {
          name: 'OgeButtonSeverity',
          type: "'normal' | 'accent' | 'success' | 'warning' | 'danger'",
          description: 'Shared with the Angular package via @oge-ui/behavior.',
        },
        {
          name: 'OgeButtonSize',
          type: "'sm' | 'md' | 'lg'",
          description: 'Shared with the Angular package via @oge-ui/behavior.',
        },
        {
          name: 'OgeButtonHandle',
          type: '{ focus(): void }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_BUTTON_GROUP_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'focus()',
          type: '() => void',
          description:
            'Moves keyboard focus to the button currently holding the roving tabindex. Reached through a <code>ref</code> typed <code>OgeButtonGroupHandle</code>.',
        },
      ],
    },
  ],
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeButtonGroupItem[]',
          description:
            'Data-driven entries rendered after the projected children.',
        },
        {
          name: 'selectionMode',
          type: "'none' | 'single' | 'multiple'",
          default: "'none'",
          description:
            'Drives the container role: <code>toolbar</code>, <code>radiogroup</code> or <code>group</code>.',
        },
        {
          name: 'selectedKeys',
          type: 'readonly string[]',
          description: 'Controlled selection. Pair with onSelectionChange.',
        },
        {
          name: 'defaultSelectedKeys',
          type: 'readonly string[]',
          description:
            'Uncontrolled initial selection — the component owns it from there.',
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
          type: 'string',
          description:
            'Accessible name of the toolbar/radiogroup/group element.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSelectionChange',
          type: '(change: OgeButtonGroupSelectionChange) => void',
          description:
            'The selection changed through user interaction. The payload carries <code>selectedKeys</code>, <code>addedKeys</code> and <code>removedKeys</code>.',
        },
        {
          name: 'onItemClick',
          type: '(event: OgeButtonGroupItemClickEvent) => void',
          description:
            'Every accepted child click, before any selection change. The payload carries <code>value</code>, the raw <code>event</code>, the matching <code>item</code> and the DOM-order <code>index</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeButtonGroupItem',
          type: '{ value: string; text?: string; hint?: string; disabled?: boolean; severity?: OgeButtonSeverity; badge?: string | number | boolean }',
          description: 'A data-driven group entry.',
        },
        {
          name: 'OgeButtonGroupHandle',
          type: '{ focus(): void }',
          description: 'Imperative handle exposed through <code>ref</code>.',
        },
        {
          name: 'OgeButtonGroupSelectionChange',
          type: '{ selectedKeys: readonly string[]; addedKeys: readonly string[]; removedKeys: readonly string[] }',
          description:
            'Computed by @oge-ui/behavior, so the delta rules match the Angular group exactly.',
        },
      ],
    },
  ],
};

export const OGE_REACT_DROP_DOWN_BUTTON_API: ApiSections = {
  properties: [
    {
      title: 'Trigger appearance',
      entries: [
        {
          name: 'text',
          type: 'string',
          default: "''",
          description:
            'Label of the (main) trigger button. rememberLastAction replaces it with the remembered item&#8217;s text.',
        },
        {
          name: 'hint',
          type: 'string',
          description: 'Tooltip of the trigger (native <code>title</code>).',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Disables the trigger (and the split toggle).',
        },
        {
          name: 'stylingMode',
          type: 'OgeButtonStylingMode',
          description: 'Fill style, forwarded to the buttons.',
        },
        {
          name: 'severity',
          type: 'OgeButtonSeverity',
          description: 'Semantic color, forwarded to the buttons.',
        },
        {
          name: 'size',
          type: 'OgeButtonSize',
          description: 'Size preset, forwarded to the buttons.',
        },
        {
          name: 'color',
          type: 'string',
          description:
            'Custom main color (any CSS color) — overrides the severity palette.',
        },
        {
          name: 'icon',
          type: 'ReactNode',
          description: 'Leading icon of the (main) trigger — any inline SVG.',
        },
        {
          name: 'iconPosition',
          type: 'OgeButtonIconPosition',
          default: "'before'",
          description: 'Places the icon before or after the label.',
        },
        {
          name: 'badge',
          type: 'string | number | boolean',
          description:
            'Corner pill on the trigger; numbers cap at 99+, <code>true</code> renders a dot.',
        },
      ],
    },
    {
      title: 'Menu &amp; panel',
      entries: [
        {
          name: 'items',
          type: 'readonly OgeMenuItem[] | OgeDropDownItemsFn',
          description:
            'Menu items — an array, or a function invoked lazily on first open (cached until its reference changes; loading/empty/error rows render while it settles).',
        },
        {
          name: 'dropdownPlacement',
          type: 'OgePopupPlacement',
          default: "'bottom-start'",
          description: 'Preferred panel placement; flips near viewport edges.',
        },
        {
          name: 'dropdownWidth',
          type: "number | 'anchor'",
          description:
            'Panel width: fixed pixels or <code>anchor</code> to match the button width.',
        },
        {
          name: 'renderItem',
          type: '(item: OgeMenuItem, index: number) =&gt; ReactNode',
          description:
            'Custom rendering for menu items (icons, badges…) — the React counterpart of the Angular item template.',
        },
        {
          name: 'renderContent',
          type: '(close: () =&gt; void) =&gt; ReactNode',
          description:
            'Replaces the menu entirely with arbitrary panel content — the counterpart of <code>*ogeDropDownContent</code>. <code>close()</code> shuts the panel and restores focus.',
        },
        {
          name: 'opened / defaultOpened',
          type: 'boolean',
          description:
            'Panel visibility — controlled with <code>opened</code> + <code>onOpenedChange</code>, or uncontrolled starting from <code>defaultOpened</code>.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeButtonsMessages&gt;',
          description:
            'Per-instance overrides of the loading/empty/error/toggle strings.',
        },
      ],
    },
    {
      title: 'Split mode',
      entries: [
        {
          name: 'splitButton',
          type: 'boolean',
          default: 'false',
          description:
            'Renders a separate chevron toggle next to an action main button.',
        },
        {
          name: 'action',
          type: '() =&gt; unknown',
          description:
            'Async click handler of the split main button (single-flight, automatic loading).',
        },
        {
          name: 'clickGuard',
          type: 'boolean | OgeClickGuardOptions',
          default: 'false',
          description: 'Click guard of the split main button.',
        },
        {
          name: 'rememberLastAction',
          type: 'boolean',
          default: 'false',
          description:
            'Split mode: the last clicked menu item becomes the main button&#8217;s label and action for the session (the IDE Run-button pattern).',
        },
        {
          name: 'loading / onLoadingChange',
          type: 'boolean / (loading: boolean) =&gt; void',
          description:
            'Busy state of the (main) button — controlled when <code>loading</code> is provided.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Imperative handle (via ref)',
      entries: [
        {
          name: 'focus()',
          type: '() =&gt; void',
          description:
            'Moves keyboard focus to the trigger (split mode: the chevron toggle).',
        },
        {
          name: 'open() / close() / toggle()',
          type: '() =&gt; void',
          description: 'Programmatic panel control.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeDropDownButtonItemClickEvent) =&gt; void',
          description:
            'A menu item was activated; the panel closes afterwards. In non-split mode this is the selection callback — the trigger click only toggles the panel.',
        },
        {
          name: 'onSelectionChange',
          type: '(event: OgeDropDownSelectionChangedEvent) =&gt; void',
          description:
            '<code>rememberLastAction</code> mode: the remembered item changed.',
        },
        {
          name: 'onClick',
          type: '(event: MouseEvent | KeyboardEvent) =&gt; void',
          description: 'Split mode only: the main action button was clicked.',
        },
        {
          name: 'onActionDone / onActionFailed',
          type: '(value: unknown) =&gt; void',
          description:
            'The split main button&#8217;s <code>action</code> settled.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description: 'Panel visibility changed (open or close, any reason).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeMenuItem',
          type: 'interface',
          description:
            'The canonical menu item (text, value, checked, severity, icon, url, badge, shortcut, separator, action, nested items) — shared with the Angular overlay via <code>@oge-ui/behavior</code>.',
        },
        {
          name: 'OgeDropDownItemsFn',
          type: '() =&gt; readonly OgeMenuItem[] | Promise&lt;readonly OgeMenuItem[]&gt;',
          description: 'Lazy items source — see <code>items</code>.',
        },
        {
          name: 'OgeDropDownButtonItemClickEvent',
          type: '{ item; index; event }',
          description: 'Payload of <code>onItemClick</code>.',
        },
        {
          name: 'OgeDropDownSelectionChangedEvent',
          type: '{ item; previousItem }',
          description: 'Payload of <code>onSelectionChange</code>.',
        },
      ],
    },
  ],
};
