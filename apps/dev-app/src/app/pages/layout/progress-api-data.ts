import type { ApiSections } from '../../shared/api-reference';

/**
 * Hand-compiled from packages/layout/src/lib/{progress-bar,load-indicator,
 * skeleton}/** — keep in sync with the source TSDoc when the public API
 * changes.
 */
export const OGE_PROGRESS_BAR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'value',
          type: 'number | null',
          default: 'null',
          description:
            'Current value; <code>null</code> renders the <strong>indeterminate</strong> sliding bar — and <code>aria-valuenow</code> is then omitted entirely (the ARIA rule), never pinned to a sentinel.',
        },
        {
          name: 'min / max',
          type: 'number',
          default: '0 / 100',
          description: 'Scale bounds; the fill ratio clamps into them.',
        },
        {
          name: 'type',
          type: "'linear' | 'circular'",
          default: "'linear'",
          description:
            "<code>circular</code> draws the same aria contract as an SVG ring (Kendo's CircularProgressBar) with the label centred inside; <code>value: null</code> spins. <code>bufferValue</code> and <code>chunkCount</code> apply to the linear bar only. The ring geometry is <code>ogeProgressRingGeometry</code> in <code>&#64;oge-ui/behavior</code>.",
        },
        {
          name: 'size',
          type: 'number | undefined',
          default: '48',
          description:
            'Ring diameter in px (<code>type="circular"</code> only); the centred label scales with it.',
        },
        {
          name: 'thickness',
          type: 'number | undefined',
          default: '4',
          description:
            'Ring stroke width in px (<code>type="circular"</code> only), clamped to half the size.',
        },
        {
          name: 'bufferValue',
          type: 'number | undefined',
          description:
            "Material's buffer layer — a soft second fill behind the primary one (media pre-loading behind the play position).",
        },
        {
          name: 'chunkCount',
          type: 'number | undefined',
          description:
            "Renders the bar as N discrete segments (Kendo's chunk progress bar); the filled count is the rounded ratio.",
        },
        {
          name: 'severity',
          type: "'accent' | 'success' | 'warning' | 'danger'",
          default: "'accent'",
          description:
            'Fill color — the card/toast severity vocabulary; recolors the fill only.',
        },
        {
          name: 'showLabel',
          type: 'boolean',
          default: 'false',
          description:
            'Renders the formatted value next to the bar (rounded percent by default).',
        },
        {
          name: 'formatLabel',
          type: '(value: number, ratio: number) => string | undefined',
          description:
            "Formats the visible label <strong>and</strong> <code>aria-valuetext</code> — DevExtreme's <code>statusFormat</code> in the house argument order; display and announcement never diverge.",
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name; the localized <code>progress</code> message is the fallback. A progressbar must always be named.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'completed',
          type: 'OgeProgressBarCompletedEvent',
          description:
            "The value reached <code>max</code> — DevExtreme's <code>onComplete</code>. Fired once per arrival: staying at max is silent, re-crossing after a reset fires again.",
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeProgressBarSeverity',
          type: "'accent' | 'success' | 'warning' | 'danger'",
          description: 'Fill color vocabulary.',
        },
        {
          name: 'OgeProgressBarType',
          type: "'linear' | 'circular'",
          description: 'Shape vocabulary of the <code>type</code> input.',
        },
        {
          name: 'OgeProgressBarCompletedEvent',
          type: '{ value: number }',
          description: 'Payload of <code>completed</code>.',
        },
      ],
    },
  ],
};

export const OGE_LOAD_INDICATOR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'size',
          type: "'sm' | 'md' | 'lg'",
          default: "'md'",
          description: 'Ring diameter preset — 16/24/32px.',
        },
        {
          name: 'inheritSize',
          type: 'boolean',
          default: 'false',
          description:
            'A <code>1em</code> ring that scales with the surrounding font — the inside-a-button case.',
        },
        {
          name: 'severity',
          type: "'accent' | 'success' | 'warning' | 'danger'",
          default: "'accent'",
          description: 'Ring color — the card/toast severity vocabulary.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name; the localized <code>loading</code> message is the fallback.',
        },
      ],
    },
    {
      title: 'Accessibility contract',
      entries: [
        {
          name: 'role="progressbar", no aria-valuenow',
          type: '—',
          description:
            'Deliberately indeterminate-only (dx, Kendo and PrimeNG all are — a circle filling toward completion is the progress bar&rsquo;s job), announced without <code>aria-valuenow</code> per the ARIA rule. Under <code>prefers-reduced-motion</code> the spin <strong>slows rather than stops</strong>: a frozen ring reads as finished.',
        },
      ],
    },
  ],
};

export const OGE_LOAD_PANEL_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'visible',
          type: 'boolean',
          default: 'false',
          description:
            'Shows the panel — two-way (<code>[(visible)]</code>). The panel paints after <code>showDelay</code> and stays at least <code>minDisplayTime</code> — the timing machine is <code>OgeLoadPanelCore</code> in <code>&#64;oge-ui/behavior</code>.',
        },
        {
          name: 'target',
          type: 'Element | string | undefined',
          description:
            'The container to cover: an element or a CSS selector. <code>undefined</code> covers the panel&rsquo;s own parent. A target that is not the parent receives the panel as its last child while shown.',
        },
        {
          name: 'fullScreen',
          type: 'boolean',
          default: 'false',
          description:
            'Covers the viewport instead (<code>position: fixed</code>). Without an explicit <code>target</code> nothing is marked <code>aria-busy</code> — on the body it would also mute the live region the message goes to.',
        },
        {
          name: 'message',
          type: 'string | undefined',
          description:
            'Text under the indicator; the localized <code>loadPanelMessage</code> of the load-indicator messages is the fallback (default <code>Loading…</code>).',
        },
        {
          name: 'showIndicator',
          type: 'boolean',
          default: 'true',
          description:
            'Renders the load indicator. Without it the message is the readable text (no <code>aria-hidden</code>).',
        },
        {
          name: 'showPane',
          type: 'boolean',
          default: 'true',
          description:
            'Draws the raised card behind the indicator and message.',
        },
        {
          name: 'shading',
          type: 'boolean',
          default: 'true',
          description: 'Dims the covered area behind the pane.',
        },
        {
          name: 'position',
          type: "'center' | 'top' | 'bottom'",
          default: "'center'",
          description: 'Where the pane sits inside the covered area.',
        },
        {
          name: 'showDelay',
          type: 'number',
          default: '0',
          description:
            'Milliseconds <code>visible</code> must stay true before the panel appears — a load that finishes sooner never flashes a panel.',
        },
        {
          name: 'minDisplayTime',
          type: 'number',
          default: '0',
          description:
            'Once shown, the panel stays at least this many milliseconds.',
        },
        {
          name: 'ariaLabel',
          type: 'string | undefined',
          description:
            'Accessible name of the indicator; defaults to the message.',
        },
      ],
    },
    {
      title: 'Accessibility contract',
      entries: [
        {
          name: 'aria-busy on the target, one announcement, no focus trap',
          type: '—',
          description:
            'While shown the covered container is <code>aria-busy="true"</code> (ref-counted; its previous value is restored), the message is announced once through the shared live announcer (never a local live region), and the shade swallows pointer input. Focus is never taken or trapped, and the container is not made <code>inert</code> — that would blur a focused field and drop focus to the page.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'isShown()',
          type: 'boolean',
          description:
            'Whether the panel is currently painted — not the same as <code>visible</code> while a delay or minimum time runs.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'shown',
          type: 'void',
          description: 'The panel appeared (after <code>showDelay</code>).',
        },
        {
          name: 'hidden',
          type: 'void',
          description:
            'The panel disappeared (after <code>minDisplayTime</code>). A load that ended inside the delay fires neither.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeLoadPanelPosition',
          type: "'center' | 'top' | 'bottom'",
          description: 'Pane placement vocabulary.',
        },
      ],
    },
  ],
};

export const OGE_SKELETON_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'shape',
          type: "'text' | 'circle' | 'rectangle'",
          default: "'text'",
          description:
            'What the placeholder stands in for; a <code>text</code> skeleton with no height derives it from the font.',
        },
        {
          name: 'animation',
          type: "'shimmer' | 'pulse' | 'none'",
          default: "'shimmer'",
          description:
            "<code>shimmer</code> is the card/accordion moving-gradient recipe, <code>pulse</code> the data grid filler rows' opacity beat, <code>none</code> a static block.",
        },
        {
          name: 'width / height',
          type: 'string | number | undefined',
          description: 'Numbers mean pixels; strings pass through as CSS.',
        },
        {
          name: 'lines',
          type: 'number',
          default: '1',
          description:
            '<code>text</code> shape only: renders N stacked lines with the last one tapered — the card/accordion placeholder pattern as one input. Capped at 20.',
        },
      ],
    },
    {
      title: 'Accessibility contract',
      entries: [
        {
          name: 'aria-hidden, always',
          type: '—',
          description:
            'A skeleton is decoration — the loading <strong>region</strong> owns the announcement. Put <code>aria-busy</code> (and, where the change should be announced, a visually-hidden status text) on the container the skeleton stands in for.',
        },
      ],
    },
  ],
};

export const OGE_PROGRESS_CONFIG_API: ApiSections = {
  properties: [
    {
      title: 'provideOgeProgressBarConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeProgressBarMessages',
          description:
            'Every user-facing string: <code>progress</code> — the accessible name fallback (default <code>Progress</code>).',
        },
        {
          name: 'severity / showLabel',
          type: '—',
          description: 'Defaults for the matching inputs.',
        },
      ],
    },
    {
      title: 'provideOgeLoadIndicatorConfig()',
      entries: [
        {
          name: 'messages',
          type: 'OgeLoadIndicatorMessages',
          description:
            'Every user-facing string: <code>loading</code> — the accessible name fallback (default <code>Loading</code>) — and <code>loadPanelMessage</code>, the load panel&rsquo;s default message (default <code>Loading…</code>; the load panel reads this catalog too).',
        },
      ],
    },
    {
      title: 'provideOgeSkeletonConfig()',
      entries: [
        {
          name: 'shape / animation',
          type: '—',
          description:
            'Defaults for the matching inputs. Deliberately no messages block: a skeleton renders no user-facing strings — the loading region owns the announcement.',
        },
      ],
    },
  ],
};
