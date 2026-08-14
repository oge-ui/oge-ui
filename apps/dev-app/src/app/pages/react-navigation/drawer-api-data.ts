import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/navigation/src/lib/drawer.tsx — keep in
 * sync with the source TSDoc when the public API changes.
 *
 * Block-for-block mirror of `../navigation/drawer-api-data.ts` (the parity gate
 * diffs the two member by member): the same groups in the same order, the
 * Angular `[(opened)]` model as the controlled `opened` + `onOpenedChange`
 * pair, the outputs as `on*` callbacks, the public methods on the imperative
 * handle, and the `[ogeDrawerPanel]` slot as the `panel` node prop.
 */
export const OGE_REACT_DRAWER_API: ApiSections = {
  properties: [
    {
      title: 'Layout',
      entries: [
        {
          name: 'opened / defaultOpened / onOpenedChange',
          type: 'boolean | (opened: boolean) =&gt; void',
          default: 'false',
          description:
            'Whether the drawer is open. Controlled through <code>opened</code> + <code>onOpenedChange</code>, uncontrolled through <code>defaultOpened</code> — the React halves of Angular&rsquo;s <code>[(opened)]</code> model.',
        },
        {
          name: 'mode',
          type: "'overlay' | 'push' | 'side'",
          default: "'overlay'",
          description:
            '<code>overlay</code> floats over the content, <code>push</code> shifts it aside without resizing it, <code>side</code> shrinks it so both share the row. <strong>This also decides modality</strong> — see the accessibility group.',
        },
        {
          name: 'position',
          type: "'start' | 'end' | 'top' | 'bottom'",
          default: "'start'",
          description:
            'Edge the panel is attached to. Logical, so <code>start</code>/<code>end</code> mirror in RTL with no flag to set.',
        },
        {
          name: 'size',
          type: 'number | string',
          default: '260',
          description:
            'Size of the open panel along its cross axis. A number means pixels.',
        },
        {
          name: 'minSize',
          type: 'number | string | undefined',
          description:
            "Size of the <em>closed</em> panel — the compact rail that keeps icons visible. Only meaningful for <code>mode: 'side'</code>: a rail belongs to the layout, and a modal drawer still partly on screen is not closed.",
        },
        {
          name: 'compactBelow',
          type: 'number | undefined',
          description:
            "Below this <strong>container</strong> inline size the drawer downgrades to <code>'overlay'</code> and closes. Measured against the drawer's own box, never the window, so a drawer nested in a dialog or a split pane adapts to the room it actually has.",
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Blocks every open and close gesture, the handle&rsquo;s <code>open()</code> and <code>close()</code> included. A drawer already open stays open and stays usable; only a <code>compact</code> close still goes through, because a drawer with no room left must stop covering the content.',
        },
        {
          name: 'animationEnabled',
          type: 'boolean',
          default: 'true',
          description: 'Enables the open/close transition.',
        },
        {
          name: 'animationDuration',
          type: 'number',
          default: '240',
          description:
            'Duration of that transition in milliseconds. Suppressed entirely under <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'className / style',
          type: 'string | CSSProperties',
          description:
            'Merged onto the drawer host. <code>className</code> is appended to the generated <code>oge-drawer*</code> classes; the Angular host takes <code>class</code>/<code>style</code> natively.',
        },
      ],
    },
    {
      title: 'Dismissal',
      entries: [
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the built-in close button in the panel, labelled by the <code>close</code> message. It closes through the full pipeline, so <code>closeGuard</code> still applies.',
        },
        {
          name: 'shading',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the backdrop of a modal drawer. A persistent drawer never shades the content it shares the row with.',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Escape closes a modal drawer, and only when it is the topmost overlay — a popup opened inside it closes first. A persistent drawer never takes Escape from the page.',
        },
        {
          name: 'closeOnBackdropClick',
          type: 'boolean',
          default: 'true',
          description:
            'A click on the backdrop closes the drawer. Only a press that <em>started</em> on the backdrop counts, so a drag ending there does not close it.',
        },
        {
          name: 'closeGuard',
          type: '(() => boolean | Promise&lt;boolean&gt;) | undefined',
          description:
            'Vetoes a close. Return <code>false</code>, throw, or reject to keep the drawer open; a promise reports pending through the handle&rsquo;s <code>closePending</code> and <code>onClosePendingChange</code>, and a second gesture meanwhile is dropped.',
        },
        {
          name: 'scrollLock',
          type: 'boolean',
          default: 'false',
          description:
            'Locks body scroll while a modal drawer is open, through the same ref-counted lock every other OGE overlay uses. Off by default, because a drawer is usually an in-page region rather than a page-level dialog.',
        },
      ],
    },
    {
      title: 'Accessibility',
      entries: [
        {
          name: 'landmark',
          type: "'navigation' | 'complementary' | 'region'",
          default: "'navigation'",
          description:
            'Landmark role while persistent. Ignored while modal, which is always <code>role="dialog"</code>.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the panel. Falls back to the <code>drawer</code> message.',
        },
        {
          name: 'ariaLabelledBy',
          type: 'string | undefined',
          description:
            'id of an element naming the panel. Wins over <code>ariaLabel</code>, which is then cleared so there is only one name.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeDrawerMessages&gt; | undefined',
          description:
            'Per-instance overrides of the config strings — the panel&rsquo;s fallback accessible name (<code>drawer</code>) and the close button&rsquo;s label (<code>close</code>).',
        },
        {
          name: 'autoFocus',
          type: "'first-tabbable' | 'panel' | 'none' | string",
          default: "'first-tabbable'",
          description:
            'Where focus lands when a <em>modal</em> drawer opens; any other string is a CSS selector, and an <code>[autofocus]</code> element always wins. A persistent drawer never moves focus.',
        },
        {
          name: 'restoreFocus',
          type: 'boolean',
          default: 'true',
          description:
            'Returns focus to the opener on close, but only when focus would otherwise be orphaned — it never steals a target the user has moved to.',
        },
        {
          name: 'inertBackground',
          type: 'boolean',
          default: 'true',
          description:
            'Marks the content behind a modal drawer <code>inert</code>, so neither Tab nor assistive tech can reach it. None of the four reference drawers does this.',
        },
        {
          name: 'drawerId',
          type: 'string (handle)',
          description:
            "id of the panel element, read from the ref. The panel stays in the DOM while closed, so a trigger's <code>aria-controls</code> always resolves to a real element.",
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'open()',
          type: 'void',
          description: 'Opens the drawer through the cancelable pre-event.',
        },
        {
          name: 'close()',
          type: 'void',
          description:
            "Closes through the full pipeline (<code>onClosing</code> → <code>closeGuard</code>) with reason <code>'api'</code>.",
        },
        {
          name: 'toggle(force?: boolean)',
          type: 'void',
          description:
            'Opens when closed, closes when open; <code>force</code> drives it to a known state.',
        },
        {
          name: 'focus()',
          type: 'void',
          description:
            'Re-applies the initial-focus resolution. No-op unless the drawer is open and modal.',
        },
        {
          name: 'closePending',
          type: 'boolean',
          description:
            'True while an async <code>closeGuard</code> is in flight. <code>onClosePendingChange</code> reports the same transitions as a callback.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Callbacks',
      entries: [
        {
          name: 'onOpening',
          type: '(event: OgeDrawerOpeningEvent) =&gt; void',
          description:
            'Cancelable — set <code>cancel</code> to keep the drawer closed; the controlled value is reset for you.',
        },
        {
          name: 'onAfterOpened',
          type: '() =&gt; void',
          description:
            'The drawer finished opening. Fires on the render pass rather than <code>transitionend</code>, because the transition is CSS-only and <code>prefers-reduced-motion</code> zeroes it.',
        },
        {
          name: 'onClosing',
          type: '(event: OgeDrawerClosingEvent) =&gt; void',
          description:
            'Cancelable, carries the <code>reason</code>. Runs before <code>closeGuard</code>.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeDrawerClosedEvent) =&gt; void',
          description: 'The drawer finished closing.',
        },
        {
          name: 'onModeChanged',
          type: '(event: OgeDrawerModeChangedEvent) =&gt; void',
          description:
            'The resolved layout mode changed, carrying the requested mode and whether <code>compactBelow</code> forced it.',
        },
        {
          name: 'onClosePendingChange',
          type: '(pending: boolean) =&gt; void',
          description:
            'Fires whenever the async <code>closeGuard</code> starts or settles — the callback half of the handle&rsquo;s <code>closePending</code>.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Content slots',
      entries: [
        {
          name: 'panel',
          type: 'ReactNode',
          description:
            'The drawer panel itself — the React counterpart of the <code>[ogeDrawerPanel]</code> attribute slot.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Everything the drawer sits next to: the content <code>overlay</code> covers, <code>push</code> shifts and <code>side</code> shrinks.',
        },
      ],
    },
    {
      title: 'Types',
      entries: [
        {
          name: 'OgeDrawerMode',
          type: "'overlay' | 'push' | 'side'",
          description: 'Layout mode, and therefore modality.',
        },
        {
          name: 'OgeDrawerPosition',
          type: "'start' | 'end' | 'top' | 'bottom'",
          description: 'Edge the panel attaches to; logical for RTL.',
        },
        {
          name: 'OgeDrawerLandmark',
          type: "'navigation' | 'complementary' | 'region'",
          description: 'Landmark role of a persistent drawer.',
        },
        {
          name: 'OgeDrawerAutoFocus',
          type: "'first-tabbable' | 'panel' | 'none' | string",
          description: 'Initial-focus strategy of a modal drawer.',
        },
        {
          name: 'OgeDrawerCloseReason',
          type: "'api' | 'escape' | 'backdrop' | 'outside' | 'compact'",
          description: 'Why the drawer closed.',
        },
        {
          name: 'OgeDrawerOpeningEvent',
          type: '{ cancel: boolean }',
          description: 'Cancelable pre-event for opening.',
        },
        {
          name: 'OgeDrawerClosingEvent',
          type: '{ cancel: boolean; reason: OgeDrawerCloseReason }',
          description: 'Cancelable pre-event for closing.',
        },
        {
          name: 'OgeDrawerClosedEvent',
          type: '{ reason: OgeDrawerCloseReason }',
          description: 'Payload of <code>onClosed</code>.',
        },
        {
          name: 'OgeDrawerModeChangedEvent',
          type: '{ mode; requestedMode; compact: boolean }',
          description: 'Payload of <code>onModeChanged</code>.',
        },
        {
          name: 'OgeDrawerProps / OgeDrawerHandle',
          type: 'interface',
          description:
            'Props of <code>&lt;OgeDrawer&gt;</code> and the shape of its <code>ref</code>.',
        },
        {
          name: 'resolveDrawerMode()',
          type: '(request: OgeDrawerModeRequest) =&gt; OgeDrawerModeResult',
          description:
            'The pure function in <code>&#64;oge-ui/behavior</code> that decides whether a drawer keeps its mode or goes compact. DOM-free, so the rule is unit-tested on its own — and shared verbatim with the Angular drawer. A non-positive <code>containerSize</code> means &ldquo;not measured yet&rdquo; and the requested mode is returned unchanged.',
        },
      ],
    },
  ],
};

export const OGE_REACT_DRAWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: '&lt;OgeDrawerConfigProvider&gt;',
      entries: [
        {
          name: 'mode',
          type: 'OgeDrawerMode',
          description: 'Default for the <code>mode</code> prop.',
        },
        {
          name: 'position',
          type: 'OgeDrawerPosition',
          description: 'Default for the <code>position</code> prop.',
        },
        {
          name: 'size',
          type: 'number | string',
          description: 'Default for the <code>size</code> prop.',
        },
        {
          name: 'messages.drawer',
          type: 'string',
          default: "'Drawer'",
          description:
            'Accessible name of the panel when the application supplies none.',
        },
        {
          name: 'messages.close',
          type: 'string',
          default: "'Close drawer'",
          description: 'Label of the built-in close button.',
        },
        {
          name: 'useOgeDrawerConfig()',
          type: '() =&gt; OgeDrawerConfig',
          description:
            'Reads the resolved config of the nearest provider, merged over <code>OGE_DEFAULT_DRAWER_CONFIG</code> — the hook behind the component, exported for drawers you compose yourself.',
        },
      ],
    },
  ],
};
