// Hand-compiled from packages/react/charts/src/lib/** — keep in sync with the
// source TSDoc.
//
// Mirrors `pages/charts/charts-api-data.ts` block for block and group for
// group, so the two views read as one page across the switch and the parity
// gate can diff them member by member. What differs is the idiom — controlled
// `value` + `onValueChange` pairs instead of `model()`, `on`-prefixed callbacks
// instead of outputs, a `ref` handle instead of public methods, render props
// instead of structural directives, a context provider instead of DI.
import type { ApiSections } from '../../shared/api-reference';

export const OGE_REACT_CHART_API: ApiSections = {
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
            'Series definitions: <code>type</code> (16 kinds), field mapping (<code>valueField</code>/<code>argumentField</code> — names, dotted paths or getters), <code>name</code>, <code>color</code>, <code>axis</code> (value-axis index), <code>stack</code> group, <code>dashStyle</code>/<code>width</code>/<code>opacity</code>, <code>showInLegend</code>, rangeArea bounds (<code>value1Field</code>/<code>value2Field</code>) and candlestick OHLC (<code>openField</code>/<code>highField</code>/<code>lowField</code>/<code>closeField</code>), <code>sizeField</code> (bubble area), <code>visible</code> (start hidden; the legend re-shows) and <code>showLabels</code> (SI-formatted value labels on small series). Null/NaN values render as gaps. Inline arrays are fine: structurally equal props never rebuild the chart.',
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
        {
          name: 'annotations',
          type: 'readonly OgeChartAnnotation[]',
          default: '[]',
          description:
            "Plot annotations: <code>type: 'point'</code> draws a marker dot with a connector into a label box at (<code>argument</code>, <code>value</code>); <code>'text'</code> places the label alone (top of the plot without a value). <code>axis</code>, <code>color</code> and <code>offsetX/Y</code> refine placement.",
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
            'Cursor-centered wheel zoom (a non-passive listener, so the page does not scroll under it), drag-select zoom (Escape cancels mid-drag, 8px threshold), Shift+drag pan. Escape on the focused plot resets the zoom.',
        },
        {
          name: 'visualRange / defaultVisualRange',
          type: 'OgeChartRange | null',
          default: 'undefined / null',
          description:
            'The zoom window in argument-axis units (<code>null</code> = full extent) — controlled when <code>visualRange</code> is provided (pair it with <code>onVisualRangeChange</code>), otherwise seeded by <code>defaultVisualRange</code>. Writes clamp into the data bounds.',
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
          name: 'selectionMode / selectedPoints / defaultSelectedPoints',
          type: "'point' | 'series' | 'none' / readonly OgeChartPointRef[]",
          default: "'none' / undefined / []",
          description:
            'Click (or Enter) selects; Ctrl adds points to the set; series mode selects the whole series. <code>selectedPoints</code> is controlled when provided (pair it with <code>onSelectedPointsChange</code>).',
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
            'Per-instance message overrides, merged over the provider config per top-level block.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description:
            'Applied to the <code>.oge-chart</code> host element — give it a height (<code>style={{ height: 380 }}</code>).',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeChartHandle (ref)',
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
          type: '@oge-ui/react-charts/export-image',
          description:
            'The same functions as <code>@oge-ui/charts/export-image</code> (they live in the shared engine): the live SVG is cloned with computed styles inlined, then downloaded as a standalone <code>.svg</code> or rasterized onto a canvas for <code>.png</code> (<code>pixelRatio</code>, <code>background</code>). Pass any chart’s <code>ref</code> handle; import the entry point dynamically.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onPointClick / onSeriesClick',
          type: '(event: OgeChartPointEvent&lt;T&gt;) =&gt; void / (event: OgeChartSeriesEvent) =&gt; void',
          description:
            'Pointer (and keyboard Enter) activation with the normalized point payload.',
        },
        {
          name: 'onLegendClick',
          type: '(event: OgeChartLegendClickEvent) =&gt; void',
          description:
            'Cancelable — set <code>event.cancel = true</code> to veto the visibility toggle; carries <code>willHide</code>.',
        },
        {
          name: 'onTooltipShowing',
          type: '(event: OgeChartTooltipShowingEvent&lt;T&gt;) =&gt; void',
          description:
            'Cancelable, before the tooltip shows for a new argument.',
        },
        {
          name: 'onVisualRangeChange / onSelectedPointsChange',
          type: '(range: OgeChartRange | null) =&gt; void / (points: readonly OgeChartPointRef[]) =&gt; void',
          description:
            'The controlled halves of <code>visualRange</code> / <code>selectedPoints</code>; Angular’s <code>[(…)]</code> models are both halves at once.',
        },
        {
          name: 'onDrawn',
          type: '() =&gt; void',
          description: 'After every render pass of the series.',
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
            "'line' | 'spline' | 'stepLine' | 'area' | 'splineArea' | 'stepArea' | 'stackedArea' | 'fullStackedArea' | 'bar' | 'stackedBar' | 'fullStackedBar' | 'rangeBar' | 'scatter' | 'bubble' | 'rangeArea' | 'candlestick'.",
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
          name: 'OgeChartHandle&lt;T&gt;',
          type: 'ref handle',
          description:
            'Every method above: <code>zoomToRange</code>, <code>resetZoom</code>, <code>hideTooltip</code>, <code>refresh</code>, <code>focus</code>, <code>getExportData</code>, <code>getSvgElement</code>.',
        },
      ],
    },
    {
      title: 'Template directives (render props)',
      entries: [
        {
          name: 'renderTooltip',
          type: '(points: readonly OgeChartPointEvent&lt;T&gt;[]) =&gt; ReactNode',
          description:
            "Replaces the tooltip's content — the React face of <code>*ogeChartTooltipTemplate</code>; one entry per series in shared mode.",
        },
        {
          name: 'renderAnnotation',
          type: '(note: { text: string }) =&gt; ReactNode',
          description:
            "Replaces an annotation's label (rendered in a <code>foreignObject</code>, so any markup works) — <code>*ogeChartAnnotationTemplate</code>.",
        },
        {
          name: 'renderLegendItem',
          type: '(item: OgeChartLegendItem) =&gt; ReactNode',
          description:
            "Replaces a legend item's content — <code>*ogeChartLegendTemplate</code>; the item is <code>{ name, color, hidden }</code>.",
        },
      ],
    },
  ],
};

export const OGE_REACT_POLAR_CHART_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'dataSource / series / commonSeries',
          type: 'readonly T[] / readonly OgeChartSeriesInput[] / Partial',
          default: '[] / [] / {}',
          description:
            "Same field mapping as the cartesian chart; supported polar types: <code>'line'</code> and <code>'area'</code> (closed radar loops — a null value breaks the loop into a gap), <code>'scatter'</code> (markers) and <code>'bar'</code> (sectors from the center).",
        },
        {
          name: 'spider',
          type: 'boolean',
          default: 'false',
          description:
            'Straight-segment (polygon) grid rings instead of circles.',
        },
        {
          name: 'startAngle',
          type: 'number',
          default: '0',
          description:
            "First category's angle in radians (0 = 12 o'clock, clockwise).",
        },
        {
          name: 'valueAxis',
          type: 'OgeChartAxisOptions',
          default: '{}',
          description:
            'The radial axis: <code>max</code> override and <code>labelFormat</code> of the nice-tick rings.',
        },
        {
          name: 'selectionMode / selectedPoints / defaultSelectedPoints',
          type: "'point' | 'none' / readonly OgeChartPointRef[]",
          default: "'none' / undefined / []",
          description:
            'Keyboard Enter on the active point selects it (a second Enter clears it); hovering markers and sectors shows the tooltip. <code>selectedPoints</code> is controlled when provided.',
        },
        {
          name: 'legend / tooltipEnabled / palette / title / locale / messages',
          type: 'see OgeChart',
          description:
            'Shared options — the legend, tooltip, sr data table and keyboard inspection (arrows walk categories and series) work exactly like the cartesian chart.',
        },
        {
          name: 'renderLegendItem / className / style',
          type: 'see OgeChart',
          description:
            'The legend render prop (<code>*ogeChartLegendTemplate</code>) and the host styling props.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgePolarChartHandle (ref)',
      entries: [
        {
          name: 'focus() / getSvgElement()',
          type: 'void / SVGSVGElement',
          description:
            'Focuses the keyboard-inspectable plot / the live SVG root for the image exporters.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onPointClick / onLegendClick / onSelectedPointsChange',
          type: '(event: OgeChartPointEvent&lt;T&gt;) =&gt; void / (event: OgeChartLegendClickEvent) =&gt; void / (points) =&gt; void',
          description:
            'Point activation, the cancelable legend toggle and the controlled half of <code>selectedPoints</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_RANGE_SELECTOR_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'dataSource / series',
          type: 'readonly T[] / readonly OgeChartSeriesInput[]',
          default: '[] / []',
          description:
            'The mini background chart (line/area recommended) drawn behind the selection window.',
        },
        {
          name: 'value / defaultValue',
          type: 'OgeChartRange | null',
          default: 'undefined / null',
          description:
            "The selected window in argument units (<code>null</code> = full range) — controlled when provided. Share one state between it and a chart's <code>visualRange</code> and the two stay in lockstep.",
        },
        {
          name: 'scaleType',
          type: "'time' | 'linear' | undefined",
          description:
            'Auto-detects from the first argument (dates → time) when unset.',
        },
        {
          name: 'palette / locale / messages',
          type: 'see OgeChart',
          description:
            'Shared options; handle labels come from <code>messages.aria.rangeStart/rangeEnd/rangeWindow</code>.',
        },
        {
          name: 'className / style',
          type: 'string / CSSProperties',
          description: 'Applied to the <code>.oge-range-selector</code> host.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgeRangeSelectorHandle (ref)',
      entries: [
        {
          name: 'reset()',
          type: 'void',
          description:
            'Back to the full range (<code>onValueChange(null)</code>).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onValueChange',
          type: '(value: OgeChartRange | null) =&gt; void',
          description:
            'The controlled half of <code>value</code>. Interaction: drag the window (grab cursor), drag either handle, click the track to center the window there — Escape mid-drag restores; the handles are WAI-ARIA sliders (arrow keys adjust by 2%, Home/End jump to the bounds, changes announced).',
        },
      ],
    },
  ],
};

export const OGE_REACT_PIE_CHART_API: ApiSections = {
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
          name: 'othersLabel',
          type: 'string',
          default: "'Others'",
          description:
            'Label (and <code>argument</code> of the event payload) of the grouped tail slice.',
        },
        {
          name: 'showLabels',
          type: 'boolean',
          default: 'true',
          description:
            'Outside labels in two anti-overlap columns with connector lines.',
        },
        {
          name: 'selectedSlices / defaultSelectedSlices',
          type: 'readonly number[]',
          default: 'undefined / []',
          description:
            'Selected slice indexes — selected slices explode. Controlled when <code>selectedSlices</code> is provided.',
        },
        {
          name: 'legend / tooltipEnabled / palette / title / locale / messages',
          type: 'see OgeChart',
          description: 'Shared options with the cartesian chart.',
        },
        {
          name: 'renderLegendItem / className / style',
          type: 'see OgeChart',
          description:
            'The legend render prop (<code>*ogeChartLegendTemplate</code>) and the host styling props.',
        },
      ],
    },
  ],
  methods: [
    {
      title: 'OgePieChartHandle (ref)',
      entries: [
        {
          name: 'getSvgElement()',
          type: 'SVGSVGElement',
          description:
            'The live SVG root — what the image exporters serialize.',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'onSliceClick',
          type: '(event: OgeChartPieSliceEvent&lt;T&gt;) =&gt; void',
          description:
            'Slice activation: <code>argument</code>, <code>value</code>, <code>fraction</code>, merged <code>sources</code> and the <code>grouped</code> flag for the &quot;Others&quot; slice.',
        },
        {
          name: 'onLegendClick / onSelectedSlicesChange',
          type: '(event: OgeChartLegendClickEvent) =&gt; void / (slices: readonly number[]) =&gt; void',
          description:
            'Cancelable legend toggle; the controlled half of <code>selectedSlices</code>.',
        },
      ],
    },
  ],
};

export const OGE_REACT_CHARTS_CONFIG_API: ApiSections = {
  properties: [
    {
      entries: [
        {
          name: 'OgeChartsConfigProvider',
          type: 'component ({ config?: OgeChartsConfigInput })',
          description:
            'Configures every chart below the provider — the React counterpart of <code>provideOgeChartsConfig()</code>. Shallow merge over the outer provider (or <code>OGE_DEFAULT_CHARTS_CONFIG</code>) per top-level key — a partial <code>messages</code> replaces whole nested blocks — and it re-resolves whenever <code>config</code> changes, which is how the UI language switches at runtime.',
        },
        {
          name: 'useOgeChartsConfig()',
          type: 'OgeChartsConfig',
          description: 'The resolved config of the current subtree.',
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
            'BCP 47 locale for every <code>Intl</code> format in scope; a per-instance <code>locale</code> prop wins.',
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
            'Marker circles render only up to this many points per series — beyond it the single path carries the series alone. Line-family paths additionally auto-downsample with LTTB to about one point per pixel once a series outgrows the plot width (hit-testing and tooltips keep the full data).',
        },
      ],
    },
  ],
};
