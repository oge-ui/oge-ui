import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/overlay/src/** — keep in sync with the source
 * TSDoc when the public API changes.
 */

export const OGE_MENU_LIST_API: ApiSections = {
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
            'Id of the <code>role="menu"</code> element; generated (<code>oge-menu-N</code>) when omitted.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name of the menu.',
        },
        {
          name: 'itemTemplate',
          type: 'TemplateRef&lt;OgeMenuItemTemplateContext&gt; | undefined',
          description:
            'Replaces the default check+text item rendering (icons, badges…).',
        },
      ],
    },
  ],
  methods: [
    {
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
          name: 'itemClick',
          type: 'OgeMenuListItemClickEvent',
          description:
            'An enabled item was activated (click, Enter or Space). Order: <code>itemClick</code> → <code>item.action?.()</code> → <code>closeRequest</code>.',
        },
        {
          name: 'closeRequest',
          type: 'OgeMenuCloseRequestEvent',
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
          type: '{ text: string; value?: T; hint?; disabled?; checked?; severity?; separator?; action?: () =&gt; void }',
          description:
            'Canonical menu item of the suite. A defined <code>checked</code> renders <code>menuitemcheckbox</code>; <code>separator: true</code> ignores every other field.',
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
            'Index within the <code>items</code> input (separators included).',
        },
        {
          name: 'OgeMenuCloseRequestEvent',
          type: "{ reason: 'escape' | 'tab' | 'select'; event: KeyboardEvent | MouseEvent }",
          description: 'Why the menu wants to close.',
        },
        {
          name: 'OgeMenuItemTemplateContext',
          type: '{ $implicit: OgeMenuItem; index: number }',
          description: 'Context of <code>itemTemplate</code>.',
        },
      ],
    },
  ],
};

export const OGE_ANCHORED_PANEL_API: ApiSections = {
  properties: [
    {
      title: 'Members',
      entries: [
        {
          name: 'panelId',
          type: 'string',
          description:
            'Unique id applied to the panel element (<code>oge-popup-N</code>) — wire to <code>aria-controls</code>.',
        },
        {
          name: 'isOpen',
          type: 'Signal&lt;boolean&gt;',
          description: 'Open state.',
        },
        {
          name: 'position',
          type: 'Signal&lt;OgeResolvedPopupPosition | null&gt;',
          description:
            '<code>null</code> until the first measure after open; hide the panel while <code>null</code>.',
        },
      ],
    },
    {
      title: 'OgeAnchoredPanelOptions (constructor)',
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
            'Reactive getter — read signals inside so the next update sees changes.',
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
      ],
    },
  ],
  methods: [
    {
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
        {
          name: 'destroy(): void',
          type: 'void',
          description:
            "Removes every listener and pending frame; call from the owner's <code>DestroyRef.onDestroy</code>.",
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgePopupCloseReason',
          type: "'api' | 'outside' | 'escape' | 'select' | 'tab'",
          description: 'Why a panel closed.',
        },
      ],
    },
  ],
};

export const OGE_POPUP_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'panel',
          type: 'OgeAnchoredPanel (required)',
          description:
            'The anchored-panel model driving id, position and visibility.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: '&lt;oge-popup&gt;',
          type: 'component',
          description:
            'Presentational chrome: fixed positioning, popup surface tokens, <code>--oge-z-popup</code> stacking, transparent (via <code>opacity</code>, so the subtree stays focusable) until the first measure. Projects arbitrary content.',
        },
      ],
    },
  ],
};

export const RESOLVE_POPUP_POSITION_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'resolvePopupPosition(req: OgePopupPositionRequest): OgeResolvedPopupPosition',
          type: 'OgeResolvedPopupPosition',
          description:
            'Pure anchored-popup placement: preferred side with flip when the opposite side has more room, cross-axis alignment fallback, and a final clamp into the viewport. Coordinates are viewport-relative (<code>position: fixed</code>).',
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
            'Panel width when anchor-width matching or a fixed width was requested (set by <code>OgeAnchoredPanel</code>, not by the pure function).',
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

export const OGE_OVERLAY_CONFIG_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'provideOgeOverlayConfig(config: OgeOverlayConfigInput): Provider',
          type: 'Provider',
          description: 'Application- or component-scoped defaults.',
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
          name: 'messages',
          type: 'OgeOverlayMessages',
          description:
            'User-facing strings of the modal header buttons: <code>modalClose</code>, <code>modalMaximize</code>, <code>modalRestore</code>.',
        },
      ],
    },
  ],
};

export const OGE_MODAL_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'opened',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description:
            'Two-way open state. Setting it <code>false</code> directly closes without the guard pipeline.',
        },
        {
          name: 'fullScreen',
          type: 'model&lt;boolean&gt;',
          default: 'false',
          description:
            'Two-way full-screen state; size inputs are ignored while <code>true</code>. Driven by the maximize button when shown.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description:
            'Header text; also the aria-label fallback when the header is hidden.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name override for headerless modals.',
        },
        {
          name: 'width / height / minWidth / minHeight / maxWidth / maxHeight',
          type: 'number | string | undefined',
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
          type: '() =&gt; boolean | Promise&lt;boolean&gt; | undefined',
          description:
            'Veto hook run before every pipeline close; may be async (single-flight — see <code>closePending</code>). A rejected promise vetoes with a dev warning.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeOverlayMessages&gt; | undefined',
          description: 'Per-instance message overrides.',
        },
        {
          name: 'closePending',
          type: 'Signal&lt;boolean&gt;',
          description:
            '<code>true</code> while an async <code>closeGuard</code> is pending — disable footer actions with it.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        { name: 'open(): void', type: 'void', description: 'Opens the modal.' },
        {
          name: 'close(result?: R): void',
          type: 'void',
          description:
            "Closes through the full pipeline (<code>closing</code> → <code>closeGuard</code>); reason <code>'api'</code>, the argument becomes <code>closed.result</code>.",
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
          name: 'opening',
          type: 'OgeModalOpeningEvent',
          description:
            'Cancelable: fires before the modal opens (any open path). Set <code>cancel = true</code> to keep it closed.',
        },
        {
          name: 'closing',
          type: 'OgeModalClosingEvent',
          description:
            'Cancelable: fires before any pipeline close (Escape, backdrop, ✕, <code>close()</code>). Set <code>cancel = true</code> to keep the modal open.',
        },
        {
          name: 'closed',
          type: 'OgeModalClosedEvent&lt;R&gt;',
          description:
            'Fires after the modal closed, with the reason and the optional result.',
        },
        {
          name: 'resizeStarted / resized',
          type: 'OgeModalResizeEvent',
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
          description: 'Payload of the resize outputs.',
        },
        {
          name: 'OgeModalSlotContext',
          type: '{ $implicit: (result?: unknown) =&gt; void }',
          description:
            'Context of <code>*ogeModalTitle</code> / <code>*ogeModalHeaderActions</code> / <code>*ogeModalFooter</code>; the function closes the modal.',
        },
        {
          name: '*ogeModalHeaderActions',
          type: 'structural slot',
          description:
            'Custom title-bar buttons, rendered between the title and the maximize/✕ buttons; presses here never start a header drag.',
        },
      ],
    },
  ],
};

export const OGE_MODAL_SERVICE_API: ApiSections = {
  methods: [
    {
      entries: [
        {
          name: 'open&lt;R, D&gt;(content: Type&lt;unknown&gt; | TemplateRef, config?: OgeModalOpenConfig&lt;D&gt;): OgeModalRef&lt;R&gt;',
          type: 'OgeModalRef&lt;R&gt;',
          description:
            'Opens a body-appended modal hosting the component or template — the escape hatch for <code>transform</code>ed ancestors and for prompt/confirm flows without a declared <code>&lt;oge-modal&gt;</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeModalOpenConfig&lt;D&gt;',
          type: 'object',
          description:
            'The declarative inputs minus slots (<code>title</code>, sizing, <code>placement</code>, <code>closeGuard</code>, …) plus <code>data?: D</code>, made available to the content via <code>OGE_MODAL_DATA</code>.',
        },
        {
          name: 'OgeModalRef&lt;R&gt;',
          type: '{ close(result?: R): void; closed: Promise&lt;OgeModalClosedEvent&lt;R&gt;&gt; }',
          description:
            'Handle of a service-opened modal; content components can inject it to close themselves with a result.',
        },
        {
          name: 'OGE_MODAL_DATA',
          type: 'InjectionToken&lt;unknown&gt;',
          description:
            'The <code>config.data</code> payload, injectable in the content component.',
        },
      ],
    },
  ],
};

export const OGE_TOAST_API: ApiSections = {
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
          type: 'TemplateRef&lt;void&gt; | undefined',
          description:
            'Replaces the severity icon (the <code>loading</code> spinner still wins).',
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
          name: 'template',
          type: 'TemplateRef&lt;OgeToastSlotContext&gt; | undefined',
          description:
            'Replaces the title/message body; <code>$implicit</code> closes the toast, <code>data</code> is in context.',
        },
        {
          name: 'data',
          type: 'D | undefined',
          description:
            'Arbitrary payload surfaced in the template context and action event.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeToastService',
      entries: [
        {
          name: 'show&lt;D&gt;(toast: string | OgeToastOptions&lt;D&gt;): OgeToastRef&lt;D&gt;',
          type: 'OgeToastRef',
          description:
            'Shows a toast; a bare string becomes an info toast. SSR-safe no-op.',
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
          type: '{ $implicit: () =&gt; void; data?: D }',
          description: 'Context of a <code>template</code> toast body.',
        },
        {
          name: 'Config keys',
          type: 'toastPosition · toastDisplayTime · toastMaxVisible · toastProgressBar · toastCoalesceDuplicates',
          description:
            'Defaults via <code>provideOgeOverlayConfig()</code>; strings via <code>messages.toastClose/toastRegionLabel/toastCountBadge</code>.',
        },
      ],
    },
  ],
};
