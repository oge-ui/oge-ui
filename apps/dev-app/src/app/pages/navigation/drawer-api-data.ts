import type { ApiSections } from '../../shared/api-reference';

export const OGE_DRAWER_API: ApiSections = {
  properties: [
    {
      title: 'Layout',
      entries: [
        {
          name: 'opened',
          type: 'boolean (two-way)',
          default: 'false',
          description:
            'Whether the drawer is open. Two-way, so <code>[(opened)]</code> is the whole state.',
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
      ],
    },
    {
      title: 'Dismissal',
      entries: [
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
            'Vetoes a close. Return <code>false</code>, throw, or reject to keep the drawer open; a promise reports pending through <code>closePending</code> and a second gesture meanwhile is dropped.',
        },
        {
          name: 'scrollLock',
          type: 'boolean',
          default: 'true',
          description:
            'Locks body scroll while a modal drawer is open, through the same ref-counted lock every other OGE overlay uses.',
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
            'Marks the page behind a modal drawer <code>inert</code>, so neither Tab nor assistive tech can reach it. None of the four reference drawers does this.',
        },
        {
          name: 'drawerId',
          type: 'string (readonly)',
          description:
            "id of the panel element. The panel stays in the DOM while closed, so a trigger's <code>aria-controls</code> always resolves to a real element.",
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Methods',
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
            "Closes through the full pipeline (<code>closing</code> → <code>closeGuard</code>) with reason <code>'api'</code>.",
        },
        {
          name: 'toggle()',
          type: 'void',
          description: 'Opens when closed, closes when open.',
        },
        {
          name: 'focus()',
          type: 'void',
          description:
            'Re-applies the initial-focus resolution. No-op unless the drawer is open and modal.',
        },
        {
          name: 'closePending',
          type: 'Signal&lt;boolean&gt;',
          description:
            'True while an async <code>closeGuard</code> is in flight.',
        },
      ],
    },
  ],
  events: [
    {
      title: 'Events',
      entries: [
        {
          name: 'opening',
          type: 'OgeDrawerOpeningEvent',
          description:
            'Cancelable — set <code>cancel</code> to keep the drawer closed; the two-way model is reset for you.',
        },
        {
          name: 'afterOpened',
          type: 'void',
          description:
            'The drawer finished opening. Fires on a render hook rather than <code>transitionend</code>, because the transition is CSS-only and <code>prefers-reduced-motion</code> zeroes it.',
        },
        {
          name: 'closing',
          type: 'OgeDrawerClosingEvent',
          description:
            'Cancelable, carries the <code>reason</code>. Runs before <code>closeGuard</code>.',
        },
        {
          name: 'closed',
          type: 'OgeDrawerClosedEvent',
          description: 'The drawer finished closing.',
        },
        {
          name: 'modeChanged',
          type: 'OgeDrawerModeChangedEvent',
          description:
            'The resolved layout mode changed, carrying the requested mode and whether <code>compactBelow</code> forced it.',
        },
      ],
    },
  ],
  types: [
    {
      title: 'Content slots',
      entries: [
        {
          name: '[ogeDrawerPanel]',
          type: 'attribute',
          description:
            'Marks the element that becomes the drawer panel. Everything else projected into <code>&lt;oge-drawer&gt;</code> is the content.',
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
          description: 'Payload of <code>closed</code>.',
        },
        {
          name: 'OgeDrawerModeChangedEvent',
          type: '{ mode; requestedMode; compact: boolean }',
          description: 'Payload of <code>modeChanged</code>.',
        },
        {
          name: 'resolveDrawerMode()',
          type: '(request: OgeDrawerModeRequest) =&gt; OgeDrawerModeResult',
          description:
            'The pure function in <code>&#64;oge-ui/core</code> that decides whether a drawer keeps its mode or goes compact. DOM-free, so the rule is unit-tested on its own. A non-positive <code>containerSize</code> means &ldquo;not measured yet&rdquo; and the requested mode is returned unchanged.',
        },
      ],
    },
  ],
};

export const OGE_DRAWER_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeDrawerConfig()',
      entries: [
        {
          name: 'mode',
          type: 'OgeDrawerMode',
          description: 'Default for the <code>mode</code> input.',
        },
        {
          name: 'position',
          type: 'OgeDrawerPosition',
          description: 'Default for the <code>position</code> input.',
        },
        {
          name: 'size',
          type: 'number | string',
          description: 'Default for the <code>size</code> input.',
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
          description: 'Label of a close affordance rendered in the panel.',
        },
      ],
    },
  ],
};
