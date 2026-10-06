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
            "Viewport position: the centre, an edge (<code>'top'</code> — command-palette style — <code>'bottom'</code>, logical <code>'start'</code> / <code>'end'</code>) or a corner (<code>'top-start'</code> … <code>'bottom-end'</code>). Logical values mirror in RTL.",
        },
        {
          name: 'dialogRole',
          type: 'OgeModalRole',
          default: "'dialog'",
          description:
            "ARIA role of the panel; <code>'alertdialog'</code> for urgent confirmations (APG alert dialog) — what <code>confirm()</code> / <code>alert()</code> use.",
        },
        {
          name: 'ariaDescribedBy',
          type: 'string | undefined',
          description:
            'Id(s) of the element(s) describing the dialog — wired to <code>aria-describedby</code>.',
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
          type: "'center' | 'top' | 'bottom' | 'start' | 'end' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'",
          description:
            'Where the panel sits in the viewport; <code>start</code> / <code>end</code> are logical (mirror in RTL).',
        },
        {
          name: 'OgeModalRole',
          type: "'dialog' | 'alertdialog'",
          description: 'ARIA role of the modal panel.',
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
        {
          name: 'confirm(options: string | OgeConfirmOptions): Promise&lt;boolean&gt;',
          type: 'Promise&lt;boolean&gt;',
          description:
            'Asks a yes/no question in an APG alert dialog (<code>role="alertdialog"</code>, described by the message): <code>true</code> for the primary button, <code>false</code> for Cancel and Escape. <code>danger</code> (default: <code>severity === \'danger\'</code>) styles the primary button as destructive and moves the initial focus to Cancel; otherwise the primary button has it. A string argument is the message.',
        },
        {
          name: 'alert(options: string | OgeAlertOptions): Promise&lt;void&gt;',
          type: 'Promise&lt;void&gt;',
          description:
            'Shows a message with a single OK button (APG alert dialog); Escape acknowledges it too.',
        },
        {
          name: 'prompt(options: string | OgePromptOptions): Promise&lt;string | null&gt;',
          type: 'Promise&lt;string | null&gt;',
          description:
            'Asks for a line of text: the submitted value, or <code>null</code> for Cancel and Escape. The field has the initial focus and <kbd>Enter</kbd> submits unless invalid; <code>required</code> and <code>validate</code> (sync or async — OK waits, latest call wins) render the error beside the field with <code>aria-invalid</code> + <code>aria-describedby</code> and announce it.',
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
        {
          name: 'OgeConfirmOptions',
          type: '{ title?; message?; severity?; icon?; okText?; cancelText?; danger?; width? }',
          description:
            'Options of <code>confirm()</code>. <code>title</code> defaults to the localized <code>dialogConfirmTitle</code>, <code>okText</code> / <code>cancelText</code> to <code>dialogOk</code> / <code>dialogCancel</code>; <code>icon</code>: <code>false</code> hides the severity icon, any React node replaces it; <code>width</code> defaults to 400.',
        },
        {
          name: 'OgeAlertOptions',
          type: '{ title?; message?; severity?; icon?; okText?; width? }',
          description:
            'Options of <code>alert()</code> (no Cancel button; the title defaults to <code>dialogAlertTitle</code>).',
        },
        {
          name: 'OgePromptOptions',
          type: 'OgeConfirmOptions &amp; { defaultValue?; placeholder?; label?; inputType?; required?; validate? }',
          description:
            'Options of <code>prompt()</code>: the field’s initial text, placeholder, visible label (without one the field is labelled by the message or title), native type, the required rule (<code>dialogRequired</code> message) and the custom validator; the title defaults to <code>dialogPromptTitle</code>.',
        },
        {
          name: 'OgeDialogSeverity',
          type: "'info' | 'success' | 'warning' | 'danger'",
          description:
            'Tone of a helper dialog — picks the built-in icon and its colour.',
        },
        {
          name: 'OgePromptInputType',
          type: "'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search'",
          description: 'Native <code>type</code> of the prompt field.',
        },
        {
          name: 'OgePromptValidator',
          type: '(value: string) =&gt; string | null | Promise&lt;string | null&gt;',
          description:
            'Return an error message to block the submit, <code>null</code> to accept; a rejected promise blocks without a message.',
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
            'Hosts the toast regions (announcements go through the shared <code>useOgeLiveAnnouncer</code> regions); mount once near the app root. The React counterpart of the root-provided Angular service.',
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

export const OGE_REACT_LIVE_ANNOUNCER_API: ApiSections = {
  methods: [
    {
      title: 'OgeLiveAnnouncerHandle',
      entries: [
        {
          name: 'announce(message: string, options?: OgeLiveAnnounceOptions | OgeLivePoliteness): void',
          type: 'void',
          description:
            'Speaks <code>message</code> through the polite (default) or assertive region. Written after <code>delay</code> ms (default 100) — a newer message to the same region inside that window supersedes it (debounce); the identical message inside a second is dropped; the region clears after <code>clearAfter</code> ms (default 5000) so a repeat is announced again. Empty text and the server are no-ops.',
        },
        {
          name: 'clear(politeness?: OgeLivePoliteness): void',
          type: 'void',
          description:
            'Empties one region (or both) and drops anything still pending.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'useOgeLiveAnnouncer(): OgeLiveAnnouncerHandle',
          type: 'hook',
          description:
            'Stable handle from <code>@oge-ui/react-overlay</code>; needs no provider. The document is resolved per call, never during render, so the hook is SSR-safe — call <code>announce</code> from handlers or effects.',
        },
        {
          name: 'OgeLivePoliteness',
          type: "'polite' | 'assertive'",
          description: 'Which of the two shared regions speaks.',
        },
        {
          name: 'OgeLiveAnnounceOptions',
          type: '{ politeness?: OgeLivePoliteness; delay?: number; clearAfter?: number }',
          description:
            '<code>delay: 0</code> writes synchronously — for a caller that already cleared and waited itself (the toast engine).',
        },
        {
          name: 'OgeLiveAnnouncerCore / getOgeLiveAnnouncer(doc?)',
          type: '@oge-ui/behavior',
          description:
            'The framework-free engine both layers wrap: one polite and one assertive visually hidden <code>aria-live</code> region per document (<code>.oge-live-announcer[data-oge-live-announcer]</code>, no role, created on the first announcement, never inerted by a modal’s <code>inertBackground</code>). Every OGE announcement — grid, tree list, toast, Gantt, uploader — goes through it; components never render their own live regions.',
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
          type: 'string',
          default: "''",
          description:
            'Tooltip text — the React face of the <code>ogeTooltip</code> binding. The child element gets <code>aria-describedby</code> pointing at the bubble while it is shown. Empty (with no <code>content</code>) disables it.',
        },
        {
          name: 'content',
          type: 'ReactNode | (() =&gt; ReactNode)',
          description:
            'Rich content — a node or a render function (formatting, icons; never focusable controls: a tooltip is not interactive). Wins over <code>text</code>; the React face of a template <code>ogeTooltip</code>.',
        },
        {
          name: 'showMode',
          type: 'OgeTooltipShowMode',
          default: "'hover'",
          description:
            "What shows it: <code>'hover'</code> (dwell + keyboard focus), <code>'focus'</code>, <code>'click'</code> (activation toggles; blur and Escape hide it) or <code>'manual'</code> (only the ref handle).",
        },
        {
          name: 'arrow',
          type: 'boolean',
          default: 'false',
          description:
            'Draws a callout arrow pointing at the trigger (shared geometry with the popover).',
        },
        {
          name: 'maxWidth',
          type: 'number | string | undefined',
          default: '—',
          description:
            'Maximum bubble width — px number or any CSS length; the stylesheet default is 280px.',
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
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'open(): void',
          type: 'void',
          description:
            'Shows the tooltip now, whatever the show mode (no dwell).',
        },
        {
          name: 'close(): void',
          type: 'void',
          description: 'Hides the tooltip now.',
        },
        {
          name: 'toggle(): void',
          type: 'void',
          description: 'Shows a hidden tooltip, hides a visible one.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeTooltipShowMode',
          type: "'hover' | 'focus' | 'click' | 'manual'",
          description: 'Which trigger interactions show the tooltip.',
        },
        {
          name: 'OgeTooltipHandle',
          type: '{ open(); close(); toggle() }',
          description: 'The ref handle.',
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
            'Items of the menu opened on right-click or Shift+F10 — the React face of the <code>ogeContextMenu</code> binding. An empty array falls back to the native browser menu — unless an <code>onOpening</code> handler builds the items per target.',
        },
        {
          name: 'target',
          type: 'string | undefined',
          default: '—',
          description:
            'CSS selector delegating the menu to matching elements inside the child (<code>closest()</code> from the clicked / focused element): one menu serves many rows. Requests outside every match keep the browser menu; the match becomes the anchor, the <code>onOpening</code> target and the focus-return point.',
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
          name: 'open(x: number, y: number): void',
          type: 'void',
          description:
            'Opens the menu at a viewport point through the same pipeline as a right-click (<code>onOpening</code> runs with <code>event: null</code>); with <code>target</code>, the target is the match under the point.',
        },
        {
          name: 'open(event: MouseEvent | React.MouseEvent): void',
          type: 'void',
          description:
            'Opens at a pointer event’s location (a keyboard-synthesized event anchors to the target) — e.g. a “More” button’s <code>onClick</code>.',
        },
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
          name: 'onOpening',
          type: '(event: OgeContextMenuOpeningEvent) =&gt; void',
          description:
            'Cancelable, before every open (pointer, keyboard, <code>open()</code>): <code>{ target, items, cancel, event }</code>. Assign <code>items</code> to build the menu for this target; <code>cancel</code> keeps it closed (and the browser menu suppressed).',
        },
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
  types: [
    {
      entries: [
        {
          name: 'OgeContextMenuOpeningEvent',
          type: '{ readonly target: Element; items: readonly OgeMenuItem[]; cancel: boolean; readonly event: Event | null }',
          description:
            'Payload of <code>onOpening</code>; shared with the Angular <code>contextMenuOpening</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_POPOVER_API: ApiSections = {
  properties: [
    {
      title: 'Trigger & content slots (render props)',
      entries: [
        {
          name: 'trigger',
          type: 'ReactElement',
          description:
            'The trigger, rendered in place inside a <code>display: contents</code> wrapper carrying the listeners — the React face of Angular’s <code>[ogePopover]</code>. Its focusable control (the inner <code>&lt;button&gt;</code> of an <code>&lt;OgeButton&gt;</code>) gets the trigger ARIA: <code>aria-haspopup="dialog"</code> for click / manual, <code>aria-expanded</code>, <code>aria-controls</code> while open.',
        },
        {
          name: 'renderTitle',
          type: '(context: OgePopoverSlotContext) =&gt; ReactNode',
          description:
            'Rich title, replacing the plain <code>title</code> text (still labels the dialog).',
        },
        {
          name: 'renderFooter',
          type: '(context: OgePopoverSlotContext) =&gt; ReactNode',
          description:
            'Footer (actions) bar; <code>close</code> closes the popover with reason <code>closeButton</code>.',
        },
        {
          name: 'children',
          type: 'ReactNode | ((context: OgePopoverSlotContext) =&gt; ReactNode)',
          description:
            'Body content, or a render function receiving the slot context.',
        },
      ],
    },
    {
      entries: [
        {
          name: 'open / defaultOpen',
          type: 'boolean',
          default: 'uncontrolled, false',
          description:
            'Controlled open state (pair with <code>onOpenChange</code>) or the initial state when uncontrolled — the React face of <code>[(visible)]</code>. Changes run the cancelable <code>onOpening</code> / <code>onClosing</code> with reason <code>api</code>.',
        },
        {
          name: 'onOpenChange',
          type: '(open: boolean) =&gt; void',
          description:
            'The open state changed — a user interaction, the ref handle, or a vetoed controlled change reporting the state actually reached.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description:
            'Title text in the header; labels the dialog (<code>aria-labelledby</code>).',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name when there is no title.',
        },
        {
          name: 'showOn',
          type: 'OgePopoverShowOn',
          default: "'click'",
          description:
            "What opens it from the trigger: <code>'click'</code> (the APG disclosure), <code>'hover'</code> (dwell + a grace period that survives moving into the panel; keyboard focus opens it too), <code>'focus'</code> or <code>'manual'</code> (code only).",
        },
        {
          name: 'placement',
          type: 'OgePopupPlacement',
          default: "'bottom'",
          description:
            'Preferred side; flips and clamps against the viewport, RTL-aware.',
        },
        {
          name: 'arrow',
          type: 'boolean',
          default: 'false',
          description:
            'Draws a callout arrow on the edge facing the trigger (geometry shared with the tooltip).',
        },
        {
          name: 'modal',
          type: 'boolean',
          default: 'false',
          description:
            '<code>true</code>: an <code>aria-modal</code> dialog — focus moves in, Tab is trapped, focus returns to the trigger on close. <code>false</code>: a non-modal dialog — focus stays on the trigger, Tab moves into the panel and on past it (as if it followed the trigger inline), and focus leaving closes it.',
        },
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the header ✕ — labelled by <code>messages.popoverClose</code>.',
        },
        {
          name: 'width',
          type: 'number | string | undefined',
          description: 'Content width — px number or CSS length.',
        },
        {
          name: 'maxWidth',
          type: 'number | string | undefined',
          description:
            'Maximum content width — px number or CSS length; the stylesheet default is 360px.',
        },
        {
          name: 'showDelay',
          type: 'number | undefined',
          default: '—',
          description:
            'Hover dwell before opening (hover mode); falls back to <code>popoverShowDelayMs</code>.',
        },
        {
          name: 'hideDelay',
          type: 'number | undefined',
          default: '—',
          description:
            'Grace period before closing after the pointer left trigger and panel; falls back to <code>popoverHideDelayMs</code>.',
        },
        {
          name: 'initialFocus',
          type: 'OgePopoverInitialFocus',
          default: "'auto'",
          description:
            "Focus target on click / API opens: <code>'auto'</code> (first tabbable when modal, none otherwise), <code>'none'</code>, <code>'first-tabbable'</code>, <code>'panel'</code> or a CSS selector. Hover / focus opens never move focus; an <code>autoFocus</code> element always wins.",
        },
        {
          name: 'restoreFocus',
          type: 'boolean',
          default: 'true',
          description:
            'Returns focus to the trigger when a close would lose it (never after an outside click or a focus move).',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Escape closes it — through the shared overlay stack, so a select box open inside closes first.',
        },
        {
          name: 'closeOnOutsideClick',
          type: 'boolean',
          default: 'true',
          description: 'A pointer-down outside trigger and panel closes it.',
        },
        {
          name: 'disabled',
          type: 'boolean',
          default: 'false',
          description: 'Prevents opening; closes an open popover.',
        },
        {
          name: 'anchor',
          type: 'HTMLElement | RefObject&lt;HTMLElement | null&gt; | null',
          description:
            'Element (or ref) to anchor to when there is no <code>trigger</code> — a popover driven only from code.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeOverlayMessages&gt; | undefined',
          description:
            'Per-instance message overrides — <code>popoverClose</code> labels the ✕.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Extra class / inline style on the panel.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'open(): void',
          type: 'void',
          description:
            'Opens it (reason <code>api</code>; runs <code>onOpening</code>).',
        },
        {
          name: 'close(): void',
          type: 'void',
          description:
            'Closes it (reason <code>api</code>; runs <code>onClosing</code>).',
        },
        {
          name: 'toggle(): void',
          type: 'void',
          description: 'Opens a closed popover, closes an open one.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onOpening',
          type: '(event: OgePopoverOpeningEvent) =&gt; void',
          description:
            'Cancelable, before every open: <code>{ reason, cancel }</code>, reason <code>click</code> | <code>hover</code> | <code>focus</code> | <code>api</code>.',
        },
        {
          name: 'onOpened',
          type: '(event: OgePopoverOpenedEvent) =&gt; void',
          description: 'After it opened: <code>{ reason }</code>.',
        },
        {
          name: 'onClosing',
          type: '(event: OgePopoverClosingEvent) =&gt; void',
          description:
            'Cancelable, before every close: <code>{ reason, cancel }</code>, reason <code>api</code> | <code>trigger</code> | <code>pointerLeave</code> | <code>focusOut</code> | <code>outside</code> | <code>escape</code> | <code>closeButton</code>.',
        },
        {
          name: 'onClosed',
          type: '(event: OgePopoverClosedEvent) =&gt; void',
          description: 'After it closed: <code>{ reason }</code>.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgePopoverShowOn',
          type: "'click' | 'hover' | 'focus' | 'manual'",
          description: 'Trigger interaction model.',
        },
        {
          name: 'OgePopoverOpenReason',
          type: "'api' | 'click' | 'hover' | 'focus'",
          description: 'Why it opened.',
        },
        {
          name: 'OgePopoverCloseReason',
          type: "'api' | 'trigger' | 'pointerLeave' | 'focusOut' | 'outside' | 'escape' | 'closeButton'",
          description: 'Why it closed.',
        },
        {
          name: 'OgePopoverInitialFocus',
          type: "'auto' | 'none' | 'first-tabbable' | 'panel' | (string &amp; {})",
          description: 'Initial-focus strategy (a string is a CSS selector).',
        },
        {
          name: 'OgePopoverSlotContext',
          type: '{ close: () =&gt; void }',
          description:
            'Context of <code>renderTitle</code> / <code>renderFooter</code> / function children.',
        },
        {
          name: 'OgePopoverHandle',
          type: '{ open(); close(); toggle() }',
          description: 'The ref handle.',
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
            'An enabled item was activated (click, Enter or Space). Order: <code>onItemClick</code> → <code>item.action?.()</code> → <code>onCloseRequest</code> — skipped when the row stays open (Space on a checkbox/radio row, or <code>keepOpen</code>). For checkbox/radio rows <code>checked</code> is the next state.',
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
          type: '{ text: string; value?: T; hint?; disabled?; type?: OgeMenuItemType; checked?; group?: string; keepOpen?: boolean; icon?; iconClass?; severity?; separator?; action?: () =&gt; void; url?; badge?; shortcut?; items?: readonly OgeMenuItem&lt;T&gt;[] }',
          description:
            "Canonical menu item of the suite, shared with the Angular overlay via <code>&#64;oge-ui/behavior</code>. <code>separator: true</code> ignores every other field; <code>type</code> picks the row kind: <code>'checkbox'</code> renders <code>menuitemcheckbox</code> and <code>'radio'</code> <code>menuitemradio</code>, both with <code>aria-checked</code> from <code>checked</code> (a check mark / an accent dot); radios of one <code>group</code> render inside a <code>role=\"group\"</code>, and checking one unchecks the rest of the group (see <code>applyMenuItemCheck</code>). <code>'header'</code> is a non-focusable caption that labels the rows after it — up to the next separator or header — as a <code>role=\"group\"</code>; the arrow keys and type-ahead skip it. The menu never mutates <code>checked</code>: the item-click event carries the next state. Space toggles a <code>checkbox</code>/<code>radio</code> row without closing the menu (APG); <code>keepOpen</code> keeps the menu open on any activation. Without <code>type</code> the historical rule holds: a defined <code>checked</code> renders <code>menuitemcheckbox</code>. Also: <code>url</code> renders a real <code>&lt;a href&gt;</code>; <code>items</code> makes the row a submenu parent.",
        },
        {
          name: 'OgeMenuItemType',
          type: "'normal' | 'checkbox' | 'radio' | 'header'",
          description:
            'Row kind of an <code>OgeMenuItem</code>: a command, a <code>menuitemcheckbox</code>, a <code>menuitemradio</code> (grouped by <code>group</code>) or a non-focusable section caption.',
        },
        {
          name: 'applyMenuItemCheck',
          type: '(items: readonly I[], target: OgeMenuItem) =&gt; readonly I[]',
          description:
            'Returns <code>items</code> with the activation of <code>target</code> applied — immutably and at any depth: a checkbox toggles, a radio becomes checked and every other radio of its <code>group</code> on the same level is unchecked. Untouched rows keep their references; pass the item the click event carried. Framework-free (<code>&#64;oge-ui/behavior</code>), re-exported here.',
        },
        {
          name: 'OgeMenuItemSeverity',
          type: "'normal' | 'danger'",
          description: 'Destructive items render with the danger token.',
        },
        {
          name: 'OgeMenuListItemClickEvent',
          type: '{ item: OgeMenuItem; index: number; checked?: boolean; event: MouseEvent | KeyboardEvent }',
          description:
            '<code>checked</code> is the state the activation moves a checkbox/radio row to (<code>undefined</code> for plain rows). Index within the <code>items</code> prop (separators included).',
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
        {
          name: 'arrow',
          type: '() =&gt; boolean | undefined',
          description:
            'When it returns <code>true</code>, every measure also resolves the callout-arrow geometry into <code>position.arrow</code> (<code>resolvePopupArrow</code>) — the popover and the tooltip render their arrow from it.',
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
  methods: [
    {
      title: 'Adaptive presentation helpers',
      entries: [
        {
          name: 'useOgeAdaptivePresentation(mode, breakpoint, kind?): OgeAdaptivePresentation',
          type: 'OgeAdaptivePresentation',
          description:
            "The hook every popup editor uses: <code>'popup'</code> unless <code>mode</code> is <code>'auto'</code> and the viewport is narrower than <code>breakpoint</code>, then <code>kind</code> (<code>'sheet'</code> default). Pass it to <code>&lt;OgePopup adaptive&gt;</code> in your own popup.",
        },
        {
          name: 'useOgeAdaptiveViewport(breakpoint): boolean',
          type: 'boolean',
          description:
            'Whether the viewport is narrower than <code>breakpoint</code> — follows <code>matchMedia</code> crossings; <code>false</code> on the server and the first client render, so hydration matches.',
        },
      ],
    },
  ],
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
        {
          name: 'adaptive',
          type: "'popup' | 'sheet' | 'fullscreen'",
          default: "'popup'",
          description:
            'Presentation: anchored, a modal full-width bottom sheet, or a full-screen dialog — <code>role="dialog"</code> + <code>aria-modal</code>, titled, with a close button; the shared <code>OgeAdaptiveSheetCore</code> (<code>&#64;oge-ui/behavior</code>) locks scroll, inerts the background, traps Tab, moves focus in (an element marked <code>data-oge-sheet-focus</code> first), restores it, follows <code>visualViewport</code> above the on-screen keyboard and dismisses on a backdrop tap or a swipe down the handle. Popup editors resolve it from their <code>adaptiveMode</code>.',
        },
        {
          name: 'adaptiveTitle',
          type: 'string',
          default: "''",
          description:
            'Dialog title while adaptive (editors pass their field label).',
        },
        {
          name: 'closeLabel',
          type: 'string',
          default: "''",
          description:
            "Aria label of the adaptive close button, from the owner's messages catalog.",
        },
        {
          name: 'sheetHeader / sheetFooter',
          type: 'ReactNode',
          description:
            'Rendered under the adaptive title (a search field) and pinned at the bottom (a Done action); ignored while anchored.',
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
        {
          name: 'arrow?',
          type: 'OgePopupArrow',
          description:
            'Callout-arrow geometry <code>{ side, offset }</code>, present when the anchored panel was asked for an arrow — the panel edge facing the anchor and the arrow centre along it, in px.',
        },
      ],
    },
    {
      title: 'Callout arrow',
      entries: [
        {
          name: 'resolvePopupArrow(req: OgePopupArrowRequest): OgePopupArrow',
          type: 'OgePopupArrow',
          description:
            'Pure arrow geometry shared by the popover and the tooltip in both layers (import from <code>&#64;oge-ui/behavior</code>): the arrow sits on the panel edge facing the anchor (RTL-aware) and points at the anchor centre, clamped <code>edgePadding</code> (default 12px) inside the edge.',
        },
        {
          name: 'OGE_POPUP_ARROW_SIZE',
          type: 'number',
          default: '7',
          description:
            'How far the arrow tip reaches out of the edge; hosts add it to the panel <code>offset</code> while an arrow is shown.',
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
          name: 'popoverShowDelayMs / popoverHideDelayMs',
          type: 'number',
          default: '150 / 300',
          description:
            "Hover dwell before a <code>showOn='hover'</code> popover opens, and the grace period after the pointer left trigger and panel — long enough to travel across the gap into the panel.",
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
            'User-facing strings of the modal header buttons, the toast chrome, the popover and the action sheet: <code>modalClose</code>, <code>modalMaximize</code>, <code>modalRestore</code>, <code>toastClose</code>, <code>toastRegionLabel</code>, <code>toastCountBadge</code>, <code>popoverClose</code> and the action sheet’s <code>actionSheetCancel</code> / <code>actionSheetLabel</code> (optional; English “Close”, “Cancel” and “Actions” when a catalog predates them).',
        },
        {
          name: 'messages — dialog helpers & window',
          type: 'OgeOverlayMessages (optional keys)',
          description:
            "<code>dialogOk</code> ('OK'), <code>dialogCancel</code> ('Cancel'), <code>dialogConfirmTitle</code> ('Confirm'), <code>dialogAlertTitle</code> ('Notice'), <code>dialogPromptTitle</code> ('Enter a value'), <code>dialogRequired</code> ('This field is required.'), <code>windowMinimize</code> ('Minimize'), <code>windowMoved</code> ('Window moved to {x}, {y}'), <code>windowResized</code> ('Window resized to {width} by {height}'). Optional so existing catalogs keep type-checking; English fills the gaps.",
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

export const OGE_REACT_WINDOW_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'opened',
          type: 'boolean',
          description:
            'Open state — controlled when provided, so pass <code>onOpenedChange</code> with it. Setting it <code>false</code> closes without <code>onClosing</code>.',
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
          description: 'The controlled half of <code>opened</code>.',
        },
        {
          name: 'state',
          type: 'OgeWindowState',
          description:
            "Display state — controlled when provided: <code>'normal'</code>, <code>'minimized'</code> (title bar only) or <code>'maximized'</code> (fills the viewport). A prop change runs the cancelable pipeline.",
        },
        {
          name: 'defaultState',
          type: 'OgeWindowState',
          default: "'normal'",
          description: 'Uncontrolled initial display state.',
        },
        {
          name: 'onStateChange',
          type: '(state: OgeWindowState) =&gt; void',
          description: 'The controlled half of <code>state</code>.',
        },
        {
          name: 'title',
          type: 'string | undefined',
          description:
            'Title-bar text; also the accessible name (<code>aria-labelledby</code>).',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description: 'Accessible name when there is no <code>title</code>.',
        },
        {
          name: 'position',
          type: 'OgeWindowPosition | null | undefined',
          description:
            'Explicit top-left corner (<code>{ x, y }</code> in viewport px, <code>x</code> = left edge in both directions); wins over <code>placement</code> and moves the open window when it changes.',
        },
        {
          name: 'placement',
          type: 'OgeWindowPlacement',
          default: "'center'",
          description:
            'Where the window opens without a <code>position</code> — the modal’s nine placements, RTL-aware. A new placement re-places an open window; a reopened window otherwise keeps its last box.',
        },
        {
          name: 'width / height',
          type: 'number | string | undefined',
          description:
            'Initial size — numbers are px, strings pass through. Default width <code>min(420px, 100vw - 32px)</code>, height from the content. A user resize wins.',
        },
        {
          name: 'minWidth / minHeight',
          type: 'number | undefined',
          default: '200 / 120',
          description: 'Smallest size (px) a resize may reach.',
        },
        {
          name: 'maxWidth / maxHeight',
          type: 'number | undefined',
          description: 'Largest size (px); default the viewport.',
        },
        {
          name: 'zIndex',
          type: 'number | undefined',
          description:
            'Base z-index; the window’s stacking layer is added to it. Default: <code>calc(var(--oge-z-window) + layer)</code> — below anchored popups and modals.',
        },
        {
          name: 'draggable',
          type: 'boolean',
          default: 'true',
          description:
            'The title bar drags the window (shared pointer gesture; Escape mid-drag puts it back) and the arrow keys move the focused frame.',
        },
        {
          name: 'resizable',
          type: 'boolean',
          default: 'true',
          description:
            'Eight edge/corner handles resize the window; Ctrl/⌘ + arrows on the focused frame are the keyboard twin.',
        },
        {
          name: 'keepInViewport',
          type: 'boolean',
          default: 'true',
          description:
            'Keeps the whole window on screen; <code>false</code> lets it hang off the sides and bottom while 48px of the title bar stay reachable. A viewport resize re-clamps.',
        },
        {
          name: 'showMinimizeButton',
          type: 'boolean',
          default: 'true',
          description: 'Shows the minimize / restore title-bar button.',
        },
        {
          name: 'showMaximizeButton',
          type: 'boolean',
          default: 'true',
          description:
            'Shows the maximize / restore title-bar button; a title-bar double-click toggles too.',
        },
        {
          name: 'showCloseButton',
          type: 'boolean',
          default: 'true',
          description: 'Shows the ✕ title-bar button.',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          default: 'true',
          description:
            'Escape closes the window while focus is inside it and no popup or modal is open. Windows never join the modal Escape stack.',
        },
        {
          name: 'autoFocus',
          type: 'OgeWindowAutoFocus',
          default: "'first-tabbable'",
          description:
            'Where focus lands on open — resolved in the body (never on the title-bar buttons), falling back to the frame; <code>false</code> leaves focus alone.',
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
          description: '<code>false</code> makes the body flush.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeOverlayMessages&gt; | undefined',
          description:
            'Per-instance message overrides (button labels <code>windowMinimize</code> / <code>modalMaximize</code> / <code>modalRestore</code> / <code>modalClose</code>, announcements <code>windowMoved</code> / <code>windowResized</code>).',
        },
        {
          name: 'children',
          type: 'ReactNode',
          description:
            'Body content (Angular projects it via <code>&lt;ng-content&gt;</code>).',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Applied to the window frame.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'Handle (ref)',
      entries: [
        {
          name: 'open(): void',
          type: 'void',
          description: 'Opens the window.',
        },
        {
          name: 'close(): void',
          type: 'void',
          description:
            "Closes through the cancelable closing event; reason <code>'api'</code>.",
        },
        {
          name: 'toggle(): void',
          type: 'void',
          description: 'Open ⇄ close.',
        },
        {
          name: 'minimize(): boolean',
          type: 'boolean',
          description:
            'Collapses the window to its title bar; <code>false</code> when vetoed.',
        },
        {
          name: 'maximize(): boolean',
          type: 'boolean',
          description:
            'Fills the viewport (inside the safe-area insets); <code>false</code> when vetoed.',
        },
        {
          name: 'restore(): boolean',
          type: 'boolean',
          description:
            'Back to the normal box; <code>false</code> when vetoed or already normal.',
        },
        {
          name: 'bringToFront(): void',
          type: 'void',
          description:
            'Raises the window above the other open windows (a press or focus does it too).',
        },
        {
          name: 'center(): void',
          type: 'void',
          description:
            'Re-centres the window in the viewport and fires the moved event.',
        },
        {
          name: 'moveTo(x: number, y: number): void',
          type: 'void',
          description:
            "Moves the top-left corner (clamped) and fires the moved event with source <code>'api'</code>.",
        },
        {
          name: 'resizeTo(width: number, height: number): void',
          type: 'void',
          description:
            'Resizes (min/max-limited, top-left fixed) and fires the resized event.',
        },
        {
          name: 'focus(): void',
          type: 'void',
          description:
            'Moves focus into the window (the <code>autoFocus</code> resolution).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onOpening',
          type: '(event: OgeWindowOpeningEvent) =&gt; void',
          description:
            'Cancelable: fires before the window opens (any open path).',
        },
        {
          name: 'onClosing',
          type: '(event: OgeWindowClosingEvent) =&gt; void',
          description:
            'Cancelable: fires before Escape / ✕ / <code>close()</code> closes the window, with the <code>reason</code>.',
        },
        {
          name: 'onClosed',
          type: '(event: OgeWindowClosedEvent) =&gt; void',
          description: 'Fires after the window closed, with the reason.',
        },
        {
          name: 'onMoved',
          type: '(event: OgeWindowMovedEvent) =&gt; void',
          description:
            "Fires after a drag, a keyboard move, <code>center()</code>, <code>moveTo()</code> or a <code>position</code> / <code>placement</code> change — new <code>x</code>/<code>y</code> and the <code>source</code> (<code>'pointer' | 'keyboard' | 'api'</code>).",
        },
        {
          name: 'onResized',
          type: '(event: OgeWindowResizedEvent) =&gt; void',
          description:
            'Fires after a resize gesture (with the <code>edge</code>), a keyboard resize or <code>resizeTo()</code>.',
        },
        {
          name: 'onStateChanging',
          type: '(event: OgeWindowStateChangingEvent) =&gt; void',
          description:
            'Cancelable: fires before minimize / maximize / restore (buttons, double-click, Alt+↑/↓, the state binding, methods).',
        },
        {
          name: 'onStateChanged',
          type: '(event: OgeWindowStateChangedEvent) =&gt; void',
          description: 'Fires after the display state changed.',
        },
        {
          name: 'onActivated',
          type: '() =&gt; void',
          description:
            'Fires when the window becomes the frontmost (active) one.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeWindowState',
          type: "'normal' | 'minimized' | 'maximized'",
          description: 'Display state.',
        },
        {
          name: 'OgeWindowPlacement',
          type: 'OgeModalPlacement',
          description:
            "The modal's placements: <code>'center'</code>, edges and corners.",
        },
        {
          name: 'OgeWindowPosition',
          type: '{ x: number; y: number }',
          description: 'Top-left corner in viewport px.',
        },
        {
          name: 'OgeWindowAutoFocus',
          type: 'OgeModalAutoFocus | false',
          description:
            'Initial-focus strategy; <code>false</code> leaves focus where it is.',
        },
        {
          name: 'OgeWindowCloseReason',
          type: "'api' | 'escape' | 'closeButton'",
          description: 'Why the window closed.',
        },
        {
          name: 'OgeWindowMovedEvent',
          type: "{ x; y; source: 'pointer' | 'keyboard' | 'api'; event? }",
          description: 'Payload of the moved event.',
        },
        {
          name: 'OgeWindowResizedEvent',
          type: '{ width; height; edge?: OgeWindowResizeEdge; source; event? }',
          description: 'Payload of the resized event.',
        },
        {
          name: 'OgeWindowResizeEdge',
          type: "'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'",
          description: 'The eight resize handles (physical compass edges).',
        },
        {
          name: 'OgeWindowStateChangingEvent',
          type: '{ state; previousState; cancel: boolean }',
          description: 'Cancelable pre-state-change event.',
        },
        {
          name: 'OgeWindowStateChangedEvent',
          type: '{ state; previousState }',
          description: 'Post-state-change event.',
        },
        {
          name: 'OgeWindowOpeningEvent / OgeWindowClosingEvent / OgeWindowClosedEvent',
          type: '{ cancel } / { reason; cancel } / { reason }',
          description: 'Open/close pipeline payloads.',
        },
        {
          name: 'Keyboard (focused frame)',
          type: 'aria-keyshortcuts',
          description:
            'Arrows move 10px, Ctrl/⌘ + arrows resize, Shift = 1px steps, Alt+↑ maximize (or restore from minimized), Alt+↓ minimize (or restore from maximized), Escape closes (focus inside, no popup open). Moves and resizes are announced politely.',
        },
        {
          name: 'OgeWindowHandle',
          type: '{ opened; state; open(); close(); toggle(); minimize(); maximize(); restore(); bringToFront(); center(); moveTo(); resizeTo(); focus() }',
          description: 'The <code>ref</code> handle.',
        },
      ],
    },
  ],
};
