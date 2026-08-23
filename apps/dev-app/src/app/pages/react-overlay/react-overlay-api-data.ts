import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/react/overlay/src/lib/** — keep in sync with
 * the source TSDoc when the public API changes.
 *
 * Mirrors `pages/overlay/overlay-api-data.ts` block for block: the same
 * eleven surfaces in the same order, so the two views read as one page across
 * the switch and the parity gate can diff them member by member. What differs
 * is the idiom — controlled/uncontrolled prop pairs instead of `model()`,
 * callbacks instead of outputs, a `ref` handle instead of public methods,
 * render props instead of structural directives, providers + hooks instead of
 * injectable services — and that is precisely what a reader crossing the
 * switch needs spelled out.
 */

export const OGE_REACT_MODAL_API: ApiSections = {
  properties: [
    {
      title: 'Content slots (render props)',
      entries: [
        {
          name: 'renderTitle',
          type: '(context: OgeModalSlotContext&lt;R&gt;) =&gt; ReactNode',
          description:
            'Rich title slot, replacing the plain <code>title</code> text — the React face of <code>*ogeModalTitle</code>.',
        },
        {
          name: 'renderHeaderActions',
          type: '(context: OgeModalSlotContext&lt;R&gt;) =&gt; ReactNode',
          description:
            'Extra buttons rendered next to ✕ — the React face of <code>*ogeModalHeaderActions</code>. Presses that start here never begin a header drag.',
        },
        {
          name: 'renderFooter',
          type: '(context: OgeModalSlotContext&lt;R&gt;) =&gt; ReactNode',
          description:
            'Footer slot — the React face of <code>*ogeModalFooter</code>; <code>context.close(result)</code> closes with a typed result.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Body content (Angular projects it via <code>&lt;ng-content&gt;</code>).',
        },
      ],
    },
    {
      entries: [
        {
          name: 'opened',
          type: 'boolean',
          description:
            'Open state — controlled when provided, so pass <code>onOpenedChange</code> with it. Setting it <code>false</code> directly closes without the guard pipeline.',
        },
        {
          name: 'defaultOpened',
          type: 'boolean',
          default: 'false',
          description: 'Uncontrolled initial open state.',
        },
        {
          name: 'onOpenedChange',
          type: '(opened: boolean) =&gt; void',
          description:
            'The controlled half of <code>opened</code>; Angular’s <code>[(opened)]</code> model is both halves at once.',
        },
        {
          name: 'fullScreen',
          type: 'boolean',
          description:
            'Full-screen state — controlled when provided; size props are ignored while <code>true</code>. Driven by the maximize button when shown.',
        },
        {
          name: 'defaultFullScreen',
          type: 'boolean',
          default: 'false',
          description: 'Uncontrolled initial full-screen state.',
        },
        {
          name: 'onFullScreenChange',
          type: '(fullScreen: boolean) =&gt; void',
          description: 'The controlled half of <code>fullScreen</code>.',
        },
        {
          name: 'title',
          type: 'string',
          description:
            'Header text; also the aria-label fallback when the header is hidden.',
        },
        {
          name: 'ariaLabel',
          type: 'string',
          description: 'Accessible name override for headerless modals.',
        },
        {
          name: 'width / height / minWidth / minHeight / maxWidth / maxHeight',
          type: 'number | string',
          description:
            'Panel size — numbers are px, strings pass through. Default width <code>min(560px, 100%)</code>.',
        },
        {
          name: 'placement',
          type: 'OgeModalPlacement',
          default: "'center'",
          description:
            "Viewport position: centered or pinned near the top edge (<code>'top'</code>, command-palette style).",
        },
        {
          name: 'shading',
          type: 'boolean',
          default: 'true',
          description:
            'Dims the page behind the modal. <code>false</code> keeps the backdrop transparent while staying fully modal.',
        },
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'true',
          description: 'Shows the header ✕ button.',
        },
        {
          name: 'showMaximizeButton',
          type: 'boolean',
          default: 'false',
          description:
            'Shows a maximize/restore toggle in the header, driving <code>fullScreen</code>.',
        },
        {
          name: 'dragEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'Lets the user drag the panel by its header (viewport-clamped unless <code>dragOutsideBoundary</code>).',
        },
        {
          name: 'dragOutsideBoundary',
          type: 'boolean',
          default: 'false',
          description: 'Allows dragging the panel beyond the viewport edges.',
        },
        {
          name: 'restorePosition',
          type: 'boolean',
          default: 'true',
          description: 'Resets drag offset and resized size on every reopen.',
        },
        {
          name: 'resizeEnabled',
          type: 'boolean',
          default: 'false',
          description:
            'Shows a bottom-end resize handle (min 160×120, viewport-capped).',
        },
        {
          name: 'inertBackground',
          type: 'boolean',
          default: 'false',
          description:
            'Marks everything outside the modal <code>inert</code> while open — opt-in; content appended to <code>body</code> after opening is not covered.',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Escape closes the modal when it is the topmost overlay (popups inside close first).',
        },
        {
          name: 'closeOnBackdropClick',
          type: 'boolean',
          default: 'true',
          description:
            'A click that starts <em>and</em> ends on the backdrop closes the modal — a text-selection drag released outside never does.',
        },
        {
          name: 'scrollLock',
          type: 'boolean',
          default: 'true',
          description:
            'Locks body scroll while open (scrollbar-width compensated, ref-counted across stacked modals).',
        },
        {
          name: 'autoFocus',
          type: 'OgeModalAutoFocus',
          default: "'first-tabbable'",
          description:
            'Initial focus target; an <code>[autofocus]</code> element inside the panel always wins.',
        },
        {
          name: 'restoreFocus',
          type: 'boolean',
          default: 'true',
          description:
            'Restores focus to the opener on close — only when focus would otherwise be lost.',
        },
        {
          name: 'padding',
          type: 'boolean',
          default: 'true',
          description:
            '<code>false</code> makes the body flush for grids and custom layouts.',
        },
        {
          name: 'busy',
          type: 'boolean',
          default: 'false',
          description:
            'Spinner veil + <code>aria-busy</code>; user-initiated closes are blocked, programmatic <code>close()</code> still works.',
        },
        {
          name: 'closeGuard',
          type: '() =&gt; boolean | Promise&lt;boolean&gt;',
          description:
            'Veto hook run before every pipeline close; may be async (single-flight — see <code>closePending</code>). A rejected promise vetoes with a dev warning.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeOverlayMessages&gt;',
          description: 'Per-instance message overrides.',
        },
        {
          name: 'closePending',
          type: 'boolean (handle + slot context)',
          description:
            '<code>true</code> while an async <code>closeGuard</code> is pending — read it off the <code>ref</code> handle or the slot context to disable footer actions; <code>onClosePendingChange</code> reports the transitions.',
        },
        {
          name: 'onClosePendingChange',
          type: '(pending: boolean) =&gt; void',
          description:
            'Fires whenever the async <code>closeGuard</code> starts or settles.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Applied to the modal layer.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        { name: 'open(): void', type: 'void', description: 'Opens the modal.' },
        {
          name: 'close(result?: R): void',
          type: 'void',
          description:
            "Closes through the full pipeline (<code>onClosing</code> → <code>closeGuard</code>); reason <code>'api'</code>, the argument becomes <code>closed.result</code>.",
        },
        { name: 'toggle(): void', type: 'void', description: 'Open ⇄ close.' },
        {
          name: 'focus(): void',
          type: 'void',
          description:
            'Re-applies the initial-focus resolution. No-op while closed.',
        },
        {
          name: 'toggleFullScreen(): void',
          type: 'void',
          description:
            'Switches between windowed and full-screen (the maximize button’s action).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onOpening',
          type: '(event: OgeModalOpeningEvent) =&gt; void',
          description:
            'Cancelable: fires before the modal opens (any open path). Set <code>cancel = true</code> to keep it closed.',
        },
        {
          name: 'onClosing',
          type: '(event: OgeModalClosingEvent) =&gt; void',
          description:
            'Cancelable: fires before any pipeline close (Escape, backdrop, ✕, <code>close()</code>). Set <code>cancel = true</code> to keep the modal open.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeModalClosedEvent&lt;R&gt;) =&gt; void',
          description:
            'Fires after the modal closed, with the reason and the optional result.',
        },
        {
          name: 'onResizeStarted / onResized',
          type: '(event: OgeModalResizeEvent) =&gt; void',
          description:
            'Fire when a resize gesture starts (starting size) and ends (final size).',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeModalCloseReason',
          type: "'api' | 'escape' | 'backdrop' | 'closeButton'",
          description: 'Why the modal closed.',
        },
        {
          name: 'OgeModalClosingEvent',
          type: '{ reason: OgeModalCloseReason; cancel: boolean }',
          description: 'Cancelable pre-close event.',
        },
        {
          name: 'OgeModalClosedEvent&lt;R&gt;',
          type: '{ reason: OgeModalCloseReason; result?: R }',
          description:
            'Post-close event; <code>result</code> comes from <code>close(result)</code> or the slot close function.',
        },
        {
          name: 'OgeModalAutoFocus',
          type: "'first-tabbable' | 'panel' | string",
          description:
            'Initial-focus strategy — a plain string is treated as a CSS selector inside the panel.',
        },
        {
          name: 'OgeModalPlacement',
          type: "'center' | 'top'",
          description: 'Where the panel sits in the viewport.',
        },
        {
          name: 'OgeModalOpeningEvent',
          type: '{ cancel: boolean }',
          description: 'Cancelable pre-open event.',
        },
        {
          name: 'OgeModalResizeEvent',
          type: '{ width: number; height: number; event: PointerEvent }',
          description: 'Payload of the resize callbacks.',
        },
        {
          name: 'OgeModalSlotContext&lt;R&gt;',
          type: '{ close: (result?: R) =&gt; void; closePending: boolean }',
          description:
            'Argument of <code>renderTitle</code> / <code>renderHeaderActions</code> / <code>renderFooter</code>.',
        },
        {
          name: 'OgeModalHandle&lt;R&gt;',
          type: '{ opened; closePending; open(); close(result?); toggle(); focus(); toggleFullScreen() }',
          description: 'The <code>ref</code> handle.',
        },
      ],
    },
  ],
};

export const OGE_REACT_MODAL_SERVICE_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'open&lt;R, D&gt;(content: OgeModalContent&lt;D, R&gt;, config?: OgeModalOpenConfig&lt;D&gt;): OgeModalRef&lt;R&gt;',
          type: 'OgeModalRef&lt;R&gt;',
          description:
            'Opens <code>content</code> (a node, or a function receiving <code>{ data, close }</code>) in a body-appended modal — the escape hatch for <code>transform</code>ed ancestors and for prompt/confirm flows without a declared <code>&lt;OgeModal&gt;</code>. Returned by <code>useOgeModals()</code>; needs an <code>&lt;OgeModalProvider&gt;</code> above.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: '&lt;OgeModalProvider&gt;',
          type: 'component',
          description:
            'Hosts the imperative modals; mount once near the app root. The React counterpart of the root-provided Angular service.',
        },
        {
          name: 'useOgeModals()',
          type: 'OgeModalsHandle',
          description:
            'Hook returning the <code>open()</code> API — the counterpart of <code>inject(OgeModalService)</code>.',
        },
        {
          name: 'OgeModalOpenConfig&lt;D&gt;',
          type: 'object',
          description:
            'The declarative props minus slots (<code>title</code>, sizing, <code>placement</code>, <code>closeGuard</code>, …) plus <code>data?: D</code>, made available to the content via <code>useOgeModalData()</code>.',
        },
        {
          name: 'OgeModalRef&lt;R&gt;',
          type: '{ close(result?: R): void; closed: Promise&lt;OgeModalClosedEvent&lt;R&gt;&gt; }',
          description:
            'Handle of an imperatively opened modal; content reads it via <code>useOgeModalRef()</code> to close itself with a result.',
        },
        {
          name: 'useOgeModalData&lt;D&gt;()',
          type: 'D',
          description:
            'The <code>config.data</code> payload — the counterpart of injecting <code>OGE_MODAL_DATA</code>.',
        },
        {
          name: 'useOgeModalRef&lt;R&gt;()',
          type: 'OgeModalRef&lt;R&gt;',
          description:
            'The enclosing modal’s handle — the counterpart of injecting <code>OgeModalRef</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TOAST_API: ApiSections = {
  properties: [
    {
      title: 'OgeToastOptions',
      entries: [
        {
          name: 'message',
          type: 'string (required)',
          description: 'Body text; also the screen-reader announcement.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description: 'Optional bold first line above the message.',
        },
        {
          name: 'severity',
          type: 'OgeToastSeverity',
          default: "'info'",
          description: 'Drives the accent bar, icon and announcement mode.',
        },
        {
          name: 'displayTime',
          type: 'number',
          default: 'config toastDisplayTime (4000)',
          description: 'Auto-dismiss time in ms.',
        },
        {
          name: 'sticky',
          type: 'boolean',
          default: 'false',
          description:
            'Never auto-dismisses (<code>loading</code> toasts are implicitly sticky).',
        },
        {
          name: 'closable',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the ✕ button; aria label from <code>messages.toastClose</code>.',
        },
        {
          name: 'closeOnClick',
          type: 'boolean',
          default: 'false',
          description:
            "A click anywhere on the toast closes it (reason <code>'click'</code>); button presses excluded.",
        },
        {
          name: 'progressBar',
          type: 'boolean',
          default: 'config toastProgressBar (false)',
          description:
            'Remaining-time bar — freezes exactly in sync with the paused timer.',
        },
        {
          name: 'action',
          type: 'OgeToastAction | undefined',
          description:
            "Inline action button; pressing it runs <code>handler</code> and closes with reason <code>'action'</code>.",
        },
        {
          name: 'position',
          type: 'OgeToastPosition',
          default: "config toastPosition ('bottom-end')",
          description: 'Region override for this toast.',
        },
        {
          name: 'announce',
          type: 'OgeToastAnnounce',
          default: 'severity-derived',
          description:
            "<code>'assertive'</code> for errors, <code>'polite'</code> otherwise; <code>'off'</code> silences.",
        },
        {
          name: 'announceText',
          type: 'string | undefined',
          description:
            'Screen-reader text override — announced instead of <code>title</code> + <code>message</code>, so the visual text can stay short.',
        },
        {
          name: 'icon',
          type: 'ReactNode | undefined',
          description:
            'Replaces the severity icon (the <code>loading</code> spinner still wins). A node instead of Angular’s <code>TemplateRef</code>.',
        },
        {
          name: 'loading',
          type: 'boolean',
          default: 'false',
          description:
            'Spinner instead of the severity icon; implicitly sticky while <code>true</code>.',
        },
        {
          name: 'coalesce',
          type: 'boolean',
          default: 'config toastCoalesceDuplicates (false)',
          description:
            'Merge with an identical visible toast into one with a live ×N badge (timer restarts, same ref returned).',
        },
        {
          name: 'id',
          type: 'string | undefined',
          description:
            'Coalesce key override; defaults to severity+title+message.',
        },
        {
          name: 'cssClass',
          type: 'string | undefined',
          description: 'Extra class(es) on the toast element.',
        },
        {
          name: 'renderContent',
          type: '(context: OgeToastSlotContext&lt;D&gt;) =&gt; ReactNode',
          description:
            'Replaces the title/message body — the React face of the <code>template</code> option; <code>context.close()</code> closes the toast, <code>context.data</code> is the payload.',
        },
        {
          name: 'data',
          type: 'D | undefined',
          description:
            'Arbitrary payload surfaced in the content context and action event.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'useOgeToasts()',
      entries: [
        {
          name: 'show&lt;D&gt;(toast: string | OgeToastOptions&lt;D&gt;): OgeToastRef&lt;D&gt;',
          type: 'OgeToastRef',
          description:
            'Shows a toast; a bare string becomes an info toast. SSR-safe no-op. Needs an <code>&lt;OgeToastProvider&gt;</code> above.',
        },
        {
          name: 'success / info / warning / error(message, options?): OgeToastRef',
          type: 'OgeToastRef',
          description: 'Severity sugar for <code>show()</code>.',
        },
        {
          name: 'promise&lt;T, D&gt;(promise, options): OgeToastRef&lt;D&gt;',
          type: 'OgeToastRef',
          description:
            'Sticky spinner toast that morphs in place when the promise settles; the timer starts then. <code>success</code>/<code>error</code> accept a message or a function returning a message or an update patch.',
        },
        {
          name: 'clear(position?: OgeToastPosition): void',
          type: 'void',
          description:
            "Closes every toast (or one region) with reason <code>'clear'</code>.",
        },
      ],
    },
    {
      title: 'OgeToastRef',
      entries: [
        {
          name: 'close(): void',
          type: 'void',
          description: "Closes the toast (reason <code>'api'</code>).",
        },
        {
          name: 'update(patch: OgeToastUpdate): void',
          type: 'void',
          description:
            'Patches the toast in place; timing changes restart the timer, a changed message re-announces.',
        },
        {
          name: 'closed',
          type: 'Promise&lt;OgeToastClosedEvent&gt;',
          description:
            'Resolves after the toast closed (exit transition included), with the typed reason.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: '&lt;OgeToastProvider&gt;',
          type: 'component',
          description:
            'Hosts the toast regions and the live-region announcers; mount once near the app root. The React counterpart of the root-provided Angular service.',
        },
        {
          name: 'OgeToastSeverity',
          type: "'info' | 'success' | 'warning' | 'error'",
          description: 'Toast severity.',
        },
        {
          name: 'OgeToastPosition',
          type: "'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end'",
          description: 'Logical, RTL-aware region positions.',
        },
        {
          name: 'OgeToastCloseReason',
          type: "'timeout' | 'closeButton' | 'click' | 'action' | 'api' | 'clear'",
          description: 'Why a toast closed.',
        },
        {
          name: 'OgeToastAction&lt;D&gt;',
          type: '{ text: string; handler?: (event: OgeToastActionEvent&lt;D&gt;) =&gt; void }',
          description: 'Inline action button.',
        },
        {
          name: 'OgeToastSlotContext&lt;D&gt;',
          type: '{ close: () =&gt; void; data?: D }',
          description: 'Argument of <code>renderContent</code>.',
        },
        {
          name: 'Config keys',
          type: 'toastPosition · toastDisplayTime · toastMaxVisible · toastProgressBar · toastCoalesceDuplicates',
          description:
            'Defaults via <code>&lt;OgeOverlayConfigProvider&gt;</code>; strings via <code>messages.toastClose/toastRegionLabel/toastCountBadge</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_TOOLTIP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'text',
          type: 'string (required)',
          description:
            'Tooltip text — the React face of the <code>ogeTooltip</code> binding. The child element gets <code>aria-describedby</code> pointing at the bubble while it is shown.',
        },
        {
          name: 'placement',
          type: 'OgePopupPlacement',
          default: "'top'",
          description:
            'Preferred side; flips and clamps against the viewport like every anchored panel.',
        },
        {
          name: 'showDelay',
          type: 'number | undefined',
          default: '—',
          description:
            'Hover dwell before showing, in ms. Falls back to <code>tooltipShowDelayMs</code> from the overlay config. Keyboard focus always shows immediately.',
        },
        {
          name: 'hideDelay',
          type: 'number | undefined',
          default: '—',
          description:
            'Grace period after the pointer leaves, in ms; falls back to <code>tooltipHideDelayMs</code>.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Suppresses the tooltip without removing the wrapper — hides an already open bubble.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'The trigger — exactly one element child. Angular attaches the directive to the element itself; React wraps it in a <code>display: contents</code> span carrying the listeners, so the child keeps its own ref and props.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CONTEXT_MENU_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeMenuItem[] (required)',
          description:
            'Items of the menu opened on right-click or Shift+F10 — the React face of the <code>ogeContextMenu</code> binding. An empty array falls back to the native browser menu.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          default: '—',
          description: 'Accessible name of the menu.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description:
            'Leaves the browser menu in charge without removing the wrapper.',
        },
        {
          name: 'renderItem',
          type: '(item: OgeMenuItem, index: number) =&gt; ReactNode',
          description:
            'Replaces the default item rendering of the hosted <code>&lt;OgeMenuList&gt;</code>.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'The target — exactly one element child; give it <code>tabIndex={0}</code> when it is not natively focusable.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'close(): void',
          type: 'void',
          description: 'Closes the menu programmatically.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeMenuListItemClickEvent) =&gt; void',
          description:
            'An item was activated — same payload as <code>&lt;OgeMenuList&gt;</code>. The menu closes afterwards and focus returns to the target.',
        },
        {
          name: 'onOpened',
          type: '() =&gt; void',
          description:
            'The menu opened at the pointer (or at the target for Shift+F10).',
        },
        {
          name: 'onClosed',
          type: '() =&gt; void',
          description:
            'The menu closed — by selection, Escape, an outside click or a scroll.',
        },
      ],
    },
  ],
};

export const OGE_REACT_MENU_LIST_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'items',
          type: 'readonly OgeMenuItem[] (required)',
          description: 'Menu items, separators included.',
        },
        {
          name: 'menuId',
          type: 'string | undefined',
          description:
            'Id of the <code>role="menu"</code> element; generated when omitted.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name of the menu.',
        },
        {
          name: 'renderItem',
          type: '(item: OgeMenuItem, index: number) =&gt; ReactNode',
          description:
            'Replaces the default check+text item rendering (icons, badges…) — the React face of <code>itemTemplate</code>.',
        },
        {
          name: 'nested',
          type: 'boolean',
          default: 'false',
          description:
            "Set on the nested list a submenu parent opens: ArrowLeft then closes the level (<code>'back'</code>) instead of bubbling to the owner. The component sets it on its own submenus; Angular derives it from the template.",
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: "focus(position: 'first' | 'last' = 'first'): void",
          type: 'void',
          description:
            'Focuses the menu container and activates the first/last enabled item.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onItemClick',
          type: '(event: OgeMenuListItemClickEvent) =&gt; void',
          description:
            'An enabled item was activated (click, Enter or Space). Order: <code>onItemClick</code> → <code>item.action?.()</code> → <code>onCloseRequest</code>.',
        },
        {
          name: 'onCloseRequest',
          type: '(event: OgeMenuCloseRequestEvent) =&gt; void',
          description:
            'The menu asks its owner to close it; the owner handles focus. Tab does not <code>preventDefault</code>, so the browser keeps tabbing from the owner.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeMenuItem&lt;T&gt;',
          type: '{ text: string; value?: T; hint?; disabled?; checked?; icon?; iconClass?; severity?; separator?; action?: () =&gt; void; url?; badge?; shortcut?; items?: readonly OgeMenuItem&lt;T&gt;[] }',
          description:
            'Canonical menu item of the suite, shared with the Angular overlay via <code>&#64;oge-ui/behavior</code>. A defined <code>checked</code> renders <code>menuitemcheckbox</code>; <code>separator: true</code> ignores every other field; <code>url</code> renders a real <code>&lt;a href&gt;</code>; <code>items</code> makes the row a submenu parent.',
        },
        {
          name: 'OgeMenuItemSeverity',
          type: "'normal' | 'danger'",
          description: 'Destructive items render with the danger token.',
        },
        {
          name: 'OgeMenuListItemClickEvent',
          type: '{ item: OgeMenuItem; index: number; event: MouseEvent | KeyboardEvent }',
          description:
            'Index within the <code>items</code> prop (separators included).',
        },
        {
          name: 'OgeMenuCloseRequestEvent',
          type: "{ reason: 'escape' | 'tab' | 'select' | 'back'; event: KeyboardEvent | MouseEvent }",
          description:
            "Why the menu wants to close. <code>'back'</code> is a nested submenu returning to its parent item — absorbed by the parent menu, it never reaches the root owner.",
        },
        {
          name: 'OgeMenuListHandle',
          type: "{ focus(position?: 'first' | 'last'): void }",
          description: 'The <code>ref</code> handle.',
        },
      ],
    },
  ],
};

export const OGE_REACT_ANCHORED_PANEL_API: ApiSections = {
  properties: [
    {
      title: 'Handle members',
      entries: [
        {
          name: 'panelId',
          type: 'string',
          description:
            'Unique id applied to the panel element (<code>oge-popup-N</code>) — wire to <code>aria-controls</code>.',
        },
        {
          name: 'isOpen',
          type: 'boolean',
          description:
            'Open state — re-renders the owner when it changes (Angular exposes a <code>Signal</code>).',
        },
        {
          name: 'position',
          type: 'OgeResolvedPopupPosition | null',
          description:
            '<code>null</code> until the first measure after open; hide the panel while <code>null</code>.',
        },
      ],
    },
    {
      title: 'UseAnchoredPanelOptions (hook argument)',
      entries: [
        {
          name: 'anchor',
          type: '() =&gt; HTMLElement | null',
          description:
            'Anchor element getter (<code>null</code> while not rendered). Required.',
        },
        {
          name: 'panel',
          type: '() =&gt; HTMLElement | null',
          description:
            'Panel element getter (<code>null</code> while closed). Required.',
        },
        {
          name: 'placement',
          type: '() =&gt; OgePopupPlacement',
          default: "'bottom-start'",
          description:
            'Live getter — read current props/state inside so the next update sees changes.',
        },
        {
          name: 'width',
          type: "() =&gt; number | 'anchor' | undefined",
          description:
            "Fixed pixel value or <code>'anchor'</code> to match the anchor width.",
        },
        {
          name: 'offset',
          type: '() =&gt; number | undefined',
          default: '4',
          description: 'Main-axis gap between anchor and panel.',
        },
        {
          name: 'viewportPadding',
          type: '() =&gt; number | undefined',
          default: '8',
          description:
            'Minimum distance kept from viewport edges when clamping.',
        },
        {
          name: 'closeOnOutsidePointerDown',
          type: 'boolean',
          default: 'true',
          description:
            'Close on document pointerdown outside anchor+panel (capture phase, composedPath-aware).',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Close on Escape — stacked overlays only close the topmost.',
        },
        {
          name: 'restoreFocus',
          type: '() =&gt; void',
          description:
            'Restores focus after closes caused by <code>escape</code>/<code>select</code> (only when focus would otherwise be orphaned).',
        },
        {
          name: 'onClosed',
          type: '(reason: OgePopupCloseReason) =&gt; void',
          description: 'Notified after every close with its reason.',
        },
        {
          name: 'anchorRect',
          type: '() =&gt; OgeRect | null',
          description:
            'Virtual anchor rectangle used for positioning when it returns a rect — e.g. the pointer location of a context menu.',
        },
        {
          name: 'transient',
          type: 'boolean',
          default: 'false',
          description:
            'Transient surfaces (tooltips) skip the Escape stack so an open tooltip never swallows the Escape meant for the popup underneath.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle methods',
      entries: [
        {
          name: 'open(): void',
          type: 'void',
          description:
            'Opens (SSR-safe no-op without <code>window</code>); pushes onto the open-panel stack, adds listeners, measures.',
        },
        {
          name: "close(reason: OgePopupCloseReason = 'api'): void",
          type: 'void',
          description:
            'Closes, removes listeners, restores focus for <code>escape</code>/<code>select</code>, then calls <code>onClosed(reason)</code>.',
        },
        { name: 'toggle(): void', type: 'void', description: 'Open ⇄ close.' },
        {
          name: 'updatePosition(): void',
          type: 'void',
          description:
            'Re-measures anchor/panel and recomputes the position (rAF-coalesced). Also runs automatically on scroll/resize/panel growth.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgePopupCloseReason',
          type: "'api' | 'outside' | 'escape' | 'select' | 'tab' | 'back'",
          description: 'Why a panel closed.',
        },
        {
          name: 'OgeAnchoredPanelHandle',
          type: '{ panelId; isOpen; position; open(); close(reason?); toggle(); updatePosition() }',
          description:
            'What <code>useAnchoredPanel()</code> returns — a stable object whose state fields update per render.',
        },
      ],
    },
  ],
};

export const OGE_REACT_POPUP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'panel',
          type: 'OgeAnchoredPanelHandle (required)',
          description:
            'The anchored-panel handle driving id, position and visibility.',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description: 'Projected content.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Merged onto the popup element.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: '&lt;OgePopup&gt;',
          type: 'component (forwardRef)',
          description:
            'Presentational chrome: fixed positioning, popup surface tokens, <code>--oge-z-popup</code> stacking, transparent (via <code>opacity</code>, so the subtree stays focusable) until the first measure. Hand its <code>ref</code> to the hook’s <code>panel</code> getter.',
        },
      ],
    },
  ],
};

export const OGE_REACT_RESOLVE_POPUP_POSITION_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'resolvePopupPosition(req: OgePopupPositionRequest): OgeResolvedPopupPosition',
          type: 'OgeResolvedPopupPosition',
          description:
            'Pure anchored-popup placement, imported from <code>&#64;oge-ui/behavior</code>: preferred side with flip when the opposite side has more room, cross-axis alignment fallback, and a final clamp into the viewport. Coordinates are viewport-relative (<code>position: fixed</code>).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgePopupPositionRequest',
      entries: [
        {
          name: 'anchor',
          type: 'OgeRect',
          description: 'Anchor rectangle (viewport-relative). Required.',
        },
        {
          name: 'panel',
          type: '{ width: number; height: number }',
          description: 'Measured panel size. Required.',
        },
        {
          name: 'viewport',
          type: '{ width: number; height: number }',
          description: 'Viewport size. Required.',
        },
        {
          name: 'placement',
          type: 'OgePopupPlacement',
          description: 'Preferred placement. Required.',
        },
        {
          name: 'offset',
          type: 'number',
          default: '4',
          description: 'Gap between anchor and panel on the main axis.',
        },
        {
          name: 'viewportPadding',
          type: 'number',
          default: '8',
          description:
            'Minimum distance kept from viewport edges when clamping.',
        },
        {
          name: 'rtl',
          type: 'boolean',
          default: 'false',
          description:
            'Resolves logical <code>start</code>/<code>end</code> (and left/right sides) against RTL.',
        },
      ],
    },
    {
      title: 'OgeResolvedPopupPosition',
      entries: [
        {
          name: 'top / left',
          type: 'number',
          description:
            'Viewport-relative — apply with <code>position: fixed</code>.',
        },
        {
          name: 'placement',
          type: 'OgePopupPlacement',
          description: 'Logical placement actually used after flipping.',
        },
        {
          name: 'width?',
          type: 'number',
          description:
            'Panel width when anchor-width matching or a fixed width was requested (set by the hook, not by the pure function).',
        },
      ],
    },
    {
      title: 'Supporting types',
      entries: [
        {
          name: 'OgePopupPlacement',
          type: "'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end'",
          description: 'Side + cross-axis alignment.',
        },
        {
          name: 'OgePopupSide',
          type: "'top' | 'bottom' | 'left' | 'right'",
          description: 'Main-axis side.',
        },
        {
          name: 'OgePopupAlign',
          type: "'start' | 'end'",
          description: 'Cross-axis alignment.',
        },
        {
          name: 'OgeRect',
          type: '{ top: number; left: number; width: number; height: number }',
          description: 'Structurally compatible with <code>DOMRect</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_OVERLAY_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: '&lt;OgeOverlayConfigProvider config={…}&gt;',
          type: 'component',
          description:
            'Subtree-scoped defaults — the React counterpart of <code>provideOgeOverlayConfig()</code>. Nested providers merge over the outer one, messages one level deep.',
        },
        {
          name: 'useOgeOverlayConfig(): OgeOverlayConfig',
          type: 'OgeOverlayConfig',
          description:
            'Reads the resolved config for the current subtree (the counterpart of <code>inject(OGE_OVERLAY_CONFIG)</code>).',
        },
      ],
    },
  ],
  types: [
    {
      title: 'OgeOverlayConfig',
      entries: [
        {
          name: 'offset',
          type: 'number',
          default: '4',
          description: 'Gap between anchor and panel on the main axis.',
        },
        {
          name: 'viewportPadding',
          type: 'number',
          default: '8',
          description:
            'Minimum distance kept from viewport edges when clamping.',
        },
        {
          name: 'typeAheadMs',
          type: 'number',
          default: '500',
          description:
            'Idle time after which the menu type-ahead buffer resets.',
        },
        {
          name: 'menuShowDelayMs',
          type: 'number',
          default: '50',
          description:
            'Hover dwell time before a submenu parent row opens its submenu.',
        },
        {
          name: 'menuHideDelayMs',
          type: 'number',
          default: '300',
          description:
            'Grace period before an open submenu closes after hovering a sibling row — the diagonal-pointer allowance.',
        },
        {
          name: 'tooltipShowDelayMs / tooltipHideDelayMs',
          type: 'number',
          default: '400 / 100',
          description:
            'Hover dwell before a tooltip shows (focus shows immediately) and the grace period before it hides.',
        },
        {
          name: 'toastPosition / toastDisplayTime / toastMaxVisible / toastProgressBar / toastCoalesceDuplicates',
          type: 'OgeToastPosition / number / number / boolean / boolean',
          default: "'bottom-end' / 4000 / 5 / false / false",
          description: 'Toast defaults.',
        },
        {
          name: 'messages',
          type: 'OgeOverlayMessages',
          description:
            'User-facing strings of the modal header buttons and the toast chrome: <code>modalClose</code>, <code>modalMaximize</code>, <code>modalRestore</code>, <code>toastClose</code>, <code>toastRegionLabel</code>, <code>toastCountBadge</code>.',
        },
      ],
    },
  ],
};

/**
 * The primitives a modal surface implemented in *another* package needs,
 * imported from `@oge-ui/behavior` (the React overlay does not re-export
 * them). They are the exact objects the Angular overlay uses, so a React
 * surface joins the same Escape stack and the same scroll-lock ref count.
 */
export const OGE_REACT_OVERLAY_PRIMITIVES_API: ApiSections = {
  methods: [
    {
      title: 'Escape stack',
      entries: [
        {
          name: 'pushOverlay(surface: object): void',
          type: 'void',
          description:
            'Registers a surface as the new topmost overlay. No-op if it is already in the stack.',
        },
        {
          name: 'removeOverlay(surface: object): void',
          type: 'void',
          description:
            'Removes a surface from the stack; tolerates surfaces that were never pushed.',
        },
        {
          name: 'isTopOverlay(surface: object): boolean',
          type: 'boolean',
          description:
            'True only for the topmost surface. Gate your Escape handler on this and a popup opened inside a modal or a drawer closes before its host does.',
        },
      ],
    },
    {
      title: 'Focus trap',
      entries: [
        {
          name: 'getTabbableElements(root: HTMLElement): HTMLElement[]',
          type: 'HTMLElement[]',
          description:
            'Tabbable descendants in DOM order. Recomputed per call rather than cached behind sentinel elements, so content added or removed after open is always accounted for.',
        },
        {
          name: 'trapTabKey(event, root, fallback): void',
          type: 'void',
          description:
            'Wraps Tab and Shift+Tab inside <code>root</code>. With no tabbable descendants it focuses <code>fallback</code>, so focus can never escape a modal surface.',
        },
      ],
    },
    {
      title: 'Scroll lock',
      entries: [
        {
          name: 'lockBodyScroll(): void',
          type: 'void',
          description:
            'Locks body scroll and compensates for the scrollbar width. Ref-counted, so nested surfaces cannot unlock each other.',
        },
        {
          name: 'unlockBodyScroll(): void',
          type: 'void',
          description:
            'Releases one reference; the last release restores the inline styles exactly as they were.',
        },
      ],
    },
  ],
};
