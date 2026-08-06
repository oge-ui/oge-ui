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
      ],
    },
  ],
};
