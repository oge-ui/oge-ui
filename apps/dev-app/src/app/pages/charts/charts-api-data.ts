// Hand-compiled from packages/charts/src/lib/** — keep in sync with the
// source TSDoc.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_CHART_API: ApiSections = {
  properties: [
    {
      title: 'Data & series',
      entries: [
        {
          name: 'dataSource',
          type: 'readonly T[]',
          default: '[]',
          description: 'Data items; never mutated.',
        },
        {
          name: 'series',
          type: 'readonly OgeChartSeriesInput[]',
          default: '[]',
          description:
            'Series definitions: <code>type</code> (11 kinds), field mapping (<code>valueField</code>/<code>argumentField</code> — names, dotted paths or getters), <code>name</code>, <code>color</code>, <code>axis</code> (value-axis index), <code>stack</code> group, <code>dashStyle</code>/<code>width</code>/<code>opacity</code>, <code>showInLegend</code>, rangeArea bounds (<code>value1Field</code>/<code>value2Field</code>) and candlestick OHLC (<code>openField</code>/<code>highField</code>/<code>lowField</code>/<code>closeField</code>). Null/NaN values render as gaps.',
        },
        {
          name: 'commonSeries',
          type: 'Partial&lt;OgeChartSeriesInput&gt;',
          default: '{}',
          description:
            'Defaults merged under every series (dx <code>commonSeriesSettings</code> parity).',
        },
        {
          name: 'palette',
          type: 'readonly string[] | undefined',
          description:
            'Series colors; defaults to the 10-color <code>OGE_CHART_PALETTE</code> (concrete hex values so exported images keep their colors).',
        },
      ],
    },
    {
      title: 'Axes',
      entries: [
        {
          name: 'argumentAxis',
          type: 'OgeChartAxisOptions',
          default: '{}',
          description:
            'Argument axis: <code>type</code> auto-detects (numbers / dates / categories) when unset; <code>min</code>/<code>max</code>, <code>inverted</code>, <code>grid</code>, <code>title</code>, <code>labelFormat</code>, <code>labelOverlap</code> (<code>rotate</code>/<code>skip</code>/<code>none</code>).',
        },
        {
          name: 'valueAxis',
          type: 'OgeChartAxisOptions | readonly OgeChartAxisOptions[]',
          default: '{}',
          description:
            "One or more value axes; series pick theirs via <code>axis</code>. <code>position: 'end'</code> renders on the right, <code>type: 'logarithmic'</code> spaces decades evenly, <code>abbreviate: false</code> disables SI labels (<code>1.2K</code>).",
        },
        {
          name: 'stripLines',
          type: 'readonly OgeChartStripLine[]',
          default: '[]',
          description:
            'Argument-axis markers: <code>{ start, end?, label?, color? }</code> — a line without <code>end</code>, a shaded band with it.',
        },
      ],
    },
    {
      title: 'Interaction',
      entries: [
        {
          name: 'zoomEnabled / panEnabled',
          type: "'none' | 'wheel' | 'drag' | 'both' / boolean",
          default: "'none' / false",
          description:
            'Cursor-centered wheel zoom, drag-select zoom (Escape cancels mid-drag, 8px threshold), Shift+drag pan. Escape on the focused plot resets the zoom.',
        },
        {
          name: 'visualRange',
          type: 'OgeChartRange | null',
          default: 'null',
          description:
            'The zoom window in argument-axis units (<code>null</code> = full extent). Two-way (<code>[(visualRange)]</code>); writes clamp into the data bounds.',
        },
        {
          name: 'tooltip',
          type: 'OgeChartTooltipOptions',
          default: '{}',
          description:
            '<code>{ enabled?, shared? }</code> — shared lists every series at the hovered argument; otherwise the value-nearest series wins.',
        },
        {
          name: 'crosshair',
          type: 'OgeChartCrosshairOptions',
          default: '{}',
          description:
            '<code>{ enabled?, horizontal? }</code> — the vertical tracker snaps to the nearest argument (binary search).',
        },
        {
          name: 'legend',
          type: 'OgeChartLegendOptions',
          default: '{}',
          description:
            '<code>{ visible?, position? (top/bottom/start/end), interactive? }</code> — real buttons with <code>aria-pressed</code>; clicking toggles the series and the axes rescale.',
        },
        {
          name: 'selectionMode / selectedPoints',
          type: "'point' | 'series' | 'none' / readonly OgeChartPointRef[]",
          default: "'none' / []",
          description:
            'Click (or Enter) selects; Ctrl adds points to the set; series mode selects the whole series. Two-way (<code>[(selectedPoints)]</code>).',
        },
      ],
    },
    {
      title: 'Appearance & i18n',
      entries: [
        {
          name: 'title / subtitle',
          type: 'string',
          default: "''",
          description: 'Headings above the plot.',
        },
        {
          name: 'animation',
          type: 'boolean',
          default: 'true',
          description:
            'Hover/selection transitions; honors <code>prefers-reduced-motion</code>.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format; defaults to the config locale, then the browser locale.',
        },
        {
          name: 'messages',
          type: 'Partial&lt;OgeChartsMessages&gt;',
          default: '{}',
          description:
            'Per-instance message overrides, merged over the DI config per top-level block.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'zoomToRange(range) / resetZoom()',
          type: 'void',
          description:
            'Programmatic zoom (clamped into the data bounds) / back to the full extent, announced.',
        },
        {
          name: 'hideTooltip()',
          type: 'void',
          description: 'Clears the hover state (tooltip + crosshair).',
        },
        {
          name: 'refresh()',
          type: 'void',
          description:
            'Re-measures the container (ResizeObserver normally covers it).',
        },
        {
          name: 'focus()',
          type: 'void',
          description: 'Focuses the keyboard-inspectable plot region.',
        },
        {
          name: 'getExportData()',
          type: 'OgeChartExportData&lt;T&gt;',
          description:
            'Snapshot for custom pipelines: per-series names/types/colors/visibility/points plus the plotted range.',
        },
        {
          name: 'getSvgElement()',
          type: 'SVGSVGElement',
          description:
            'The live SVG root — what the image exporters serialize.',
        },
      ],
    },
    {
      title: 'Export entry point (lazy, dependency-free)',
      entries: [
        {
          name: 'exportChartToPng(chart, options?) / exportChartToSvg(chart, options?) / serializeChartSvg(svg, options?)',
          type: '@oge-ui/charts/export-image',
          description:
            'No third-party libraries: the live SVG is cloned with computed styles inlined, then downloaded as a standalone <code>.svg</code> or rasterized onto a canvas for <code>.png</code> (<code>pixelRatio</code>, <code>background</code>). Import the entry point dynamically.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'pointClick / seriesClick',
          type: 'OgeChartPointEvent&lt;T&gt; / OgeChartSeriesEvent',
          description:
            'Pointer (and keyboard Enter) activation with the normalized point payload.',
        },
        {
          name: 'legendClick',
          type: 'OgeChartLegendClickEvent',
          description:
            'Cancelable — set <code>cancel = true</code> to veto the visibility toggle; carries <code>willHide</code>.',
        },
        {
          name: 'tooltipShowing',
          type: 'OgeChartTooltipShowingEvent&lt;T&gt;',
          description:
            'Cancelable, before the tooltip shows for a new argument.',
        },
        {
          name: 'visualRangeChange / selectedPointsChange',
          type: 'OgeChartRange | null / readonly OgeChartPointRef[]',
          description: 'The two-way model outputs.',
        },
        {
          name: 'drawn',
          type: 'void',
          description: 'After every render pass.',
        },
      ],
    },
  ],
  types: [
    {
      entries: [
        {
          name: 'OgeChartSeriesType',
          type: 'string union',
          description:
            "'line' | 'spline' | 'area' | 'splineArea' | 'stackedArea' | 'bar' | 'stackedBar' | 'fullStackedBar' | 'scatter' | 'rangeArea' | 'candlestick'.",
        },
        {
          name: 'OgeChartPoint&lt;T&gt;',
          type: 'interface',
          description:
            'The normalized point: <code>argument</code>, <code>argNumeric</code>, <code>value</code>(s incl. OHLC), <code>source</code>, <code>index</code>.',
        },
        {
          name: 'OgeChartAxisType / OgeChartRange',
          type: "'linear' | 'logarithmic' | 'category' | 'time' / { min, max }",
          description:
            'Axis kinds and the numeric window type (time axes: epoch ms; category: index space).',
        },
        {
          name: '[ogeChartTooltipTemplate]',
          type: 'structural directive (OgeChartTooltipTemplate)',
          description:
            "Replaces the tooltip's content; context <code>OgeChartTooltipTemplateContext</code>: <code>{ $implicit: OgeChartPointEvent[] }</code>.",
        },
        {
          name: '[ogeChartLegendTemplate]',
          type: 'structural directive (OgeChartLegendTemplate)',
          description:
            "Replaces a legend item's content; context <code>OgeChartLegendTemplateContext</code>: <code>{ $implicit: { name, color, hidden } }</code>.",
        },
      ],
    },
  ],
};

export const OGE_PIE_CHART_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'dataSource / argumentField / valueField',
          type: 'readonly T[] / string | getter',
          default: "[] / 'argument' / 'value'",
          description: 'One slice per item; negative values clamp to zero.',
        },
        {
          name: 'type / innerRadius / startAngle',
          type: "'pie' | 'doughnut' / number / number",
          default: "'pie' / 0.5 / 0",
          description:
            'Doughnut hole as an outer-radius fraction; start angle in radians (0 = 12 o&#39;clock, clockwise).',
        },
        {
          name: 'smallValuesGrouping',
          type: 'OgeChartSmallValuesGrouping | null',
          default: 'null',
          description:
            "<code>{ mode: 'topN' | 'smallValueThreshold', topCount?, threshold? }</code> — the tail folds into an &quot;Others&quot; slice (<code>othersLabel</code>).",
        },
        {
          name: 'showLabels',
          type: 'boolean',
          default: 'true',
          description:
            'Outside labels in two anti-overlap columns with connector lines.',
        },
        {
          name: 'selectedSlices',
          type: 'readonly number[]',
          default: '[]',
          description:
            'Selected slice indexes — selected slices explode. Two-way (<code>[(selectedSlices)]</code>).',
        },
        {
          name: 'legend / tooltipEnabled / palette / title / locale / messages',
          type: 'see OgeChart',
          description: 'Shared options with the cartesian chart.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'sliceClick',
          type: 'OgeChartPieSliceEvent&lt;T&gt;',
          description:
            'Slice activation: <code>argument</code>, <code>value</code>, <code>fraction</code>, merged <code>sources</code> and the <code>grouped</code> flag for the &quot;Others&quot; slice.',
        },
        {
          name: 'legendClick / selectedSlicesChange',
          type: 'OgeChartLegendClickEvent / readonly number[]',
          description:
            'Cancelable legend toggle; the two-way selection output.',
        },
      ],
    },
  ],
};

export const OGE_CHARTS_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'provideOgeChartsConfig(config)',
          type: 'Provider',
          description:
            'Configures every chart below the provider (<code>OgeChartsConfigInput</code>); shallow merge over <code>OGE_DEFAULT_CHARTS_CONFIG</code> per top-level key — a partial <code>messages</code> replaces whole nested blocks. The token is <code>OGE_CHARTS_CONFIG</code> (<code>OgeChartsConfig</code>).',
        },
        {
          name: 'messages',
          type: 'OgeChartsMessages',
          description:
            'Every user-facing string, aria labels included: <code>aria</code> (<code>OgeChartsAriaMessages</code> — chart/pie labels with <code>{title}</code>/<code>{count}</code>, table caption, plot hint, legend label), <code>announcements</code> (<code>OgeChartsAnnouncementMessages</code> — live-region templates with <code>{series}</code>/<code>{argument}</code>/<code>{value}</code>) and <code>noData</code>. Defaults: <code>OGE_DEFAULT_CHARTS_MESSAGES</code>.',
        },
        {
          name: 'locale',
          type: 'string | undefined',
          description:
            'BCP 47 locale for every <code>Intl</code> format in scope; a per-instance <code>[locale]</code> input wins.',
        },
        {
          name: 'a11yTableLimit',
          type: 'number',
          default: '50',
          description: 'Rows of the screen-reader data table.',
        },
        {
          name: 'markerThreshold',
          type: 'number',
          default: '200',
          description:
            'Marker circles render only up to this many points per series — beyond it the single path carries the series alone (the 10k+ point performance contract).',
        },
      ],
    },
  ],
};
