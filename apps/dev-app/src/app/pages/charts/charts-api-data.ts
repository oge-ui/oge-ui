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
            'Series definitions: <code>type</code> (16 kinds), field mapping (<code>valueField</code>/<code>argumentField</code> — names, dotted paths or getters), <code>name</code>, <code>color</code>, <code>axis</code> (value-axis index), <code>stack</code> group, <code>dashStyle</code>/<code>width</code>/<code>opacity</code>, <code>showInLegend</code>, rangeArea bounds (<code>value1Field</code>/<code>value2Field</code>) and candlestick OHLC (<code>openField</code>/<code>highField</code>/<code>lowField</code>/<code>closeField</code>), <code>sizeField</code> (bubble area), <code>visible</code> (start hidden; the legend re-shows) and <code>showLabels</code> (SI-formatted value labels on small series). Null/NaN values render as gaps.',
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
            'Argument axis: <code>type</code> auto-detects (numbers / dates / categories) when unset; <code>min</code>/<code>max</code>, <code>inverted</code>, <code>grid</code>, <code>title</code>; <code>label</code> (<code>OgeChartAxisLabelOptions</code>: <code>format</code> as a function or <code>Intl</code> options, <code>template</code> such as <code>&#39;{value} km&#39;</code>, <code>overlap</code> <code>rotate</code>/<code>stagger</code>/<code>hide</code>/<code>skip</code>/<code>none</code>, <code>visible</code>) — <code>labelFormat</code>/<code>labelOverlap</code> remain as shorthands; <code>tickInterval</code> (axis units, every n-th category, or a calendar interval such as <code>{ weeks: 1 }</code>), <code>minorTicks</code>, <code>strips</code> and <code>constantLines</code>.',
        },
        {
          name: 'valueAxis',
          type: 'OgeChartAxisOptions | readonly OgeChartAxisOptions[]',
          default: '{}',
          description:
            "One or more value axes; series pick theirs via <code>axis</code> (or by <code>pane</code>). <code>position: 'end'</code> renders on the far side (right, or on top when rotated), <code>type: 'logarithmic'</code> spaces decades evenly, <code>abbreviate: false</code> disables SI labels (<code>1.2K</code>). <code>pane</code> places the axis in a pane; <code>constantLines</code> (<code>{ value, label?, color?, dash?, width?, position: 'inside' | 'outside' }</code>) draw threshold / target lines whose labels stay clear of the plot edges; <code>strips</code> (<code>{ start, end, label?, color? }</code>) shade value bands; <code>breaks</code> (<code>{ start, end }[]</code>, linear axes) skip value ranges with a zig-zag marker; <code>tickInterval</code>, <code>minorTicks</code>, <code>allowDecimals: false</code> and <code>label</code> work as on the argument axis.",
        },
        {
          name: 'stripLines',
          type: 'readonly OgeChartStripLine[]',
          default: '[]',
          description:
            'Argument-axis markers: <code>{ start, end?, label?, color? }</code> — a line without <code>end</code>, a shaded band with it (see also <code>argumentAxis.strips</code> / <code>constantLines</code>).',
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
      title: 'Layout & direction',
      entries: [
        {
          name: 'rotated',
          type: 'boolean',
          default: 'false',
          description:
            'Swaps the axes: the argument axis runs vertically (first argument on top), the value axis horizontally. Applies to every series type — bars become horizontal bars (stacked and range bars too), lines run top-down — and the tooltip, crosshair, zoom/pan, the data table and the keyboard follow (Up/Down walk the arguments, Left/Right the series).',
        },
        {
          name: 'panes',
          type: 'readonly OgeChartPane[]',
          default: '[]',
          description:
            "Plot areas stacked over one shared argument axis (price + volume): <code>{ name, height? }</code> with <code>height</code> as a ratio. Series pick a pane with <code>pane</code> (binding to that pane's first value axis, or a default one) and value axes with <code>valueAxis[].pane</code>; stacks and bar slots are per pane. The argument axis sits under the last pane, the crosshair spans every pane (its horizontal line stays in the hovered one) and zoom/pan move them together. Rotated charts lay panes side by side.",
        },
        {
          name: 'rtlEnabled',
          type: 'boolean | undefined',
          default: 'undefined',
          description:
            "Right-to-left layout: mirrors the argument axis, moves the value axes to the other side, flips the legend, the tooltip's opening side and the Left/Right arrow keys. Unset follows the page — the computed <code>direction</code> or the nearest <code>dir</code> attribute, read after the first render (re-read by <code>refresh()</code>); an explicit value also sets <code>dir</code> on the host.",
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
            'Cursor-centered wheel zoom, drag-select zoom (Escape cancels mid-drag, 8px threshold), Shift+drag pan. Escape on the focused plot resets the zoom. On touch screens two fingers pinch-zoom and pan together (the argument values under both fingers stay under them) and one finger pans when <code>panEnabled</code> is on, otherwise drag-zooms; the plot declares <code>touch-action</code> so the page still scrolls across the argument axis.',
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
          type: 'boolean | OgeChartAnimationOptions',
          default: 'true',
          description:
            "Hover/selection transitions plus a one-time draw-in on the first render with data — each series grows from its value baseline (bars grow, lines rise) in every orientation. <code>{ enabled?, duration? (ms, 600), easing? ('linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut') }</code>; <code>false</code> turns both off and <code>prefers-reduced-motion: reduce</code> always does.",
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
          name: 'OgeChartConstantLine / OgeChartAxisStrip / OgeChartAxisBreak',
          type: 'interface',
          description:
            "Guides of an axis: <code>{ value, label?, color?, dash? ('solid' | 'dash' | 'dot'), width?, position? ('inside' | 'outside') }</code>, <code>{ start, end, label?, color? }</code> and <code>{ start, end }</code> (value axes only). Colours take any CSS colour, theme tokens included.",
        },
        {
          name: 'OgeChartPane',
          type: 'interface',
          description:
            '<code>{ name, height? }</code> — a pane of <code>panes</code>; <code>height</code> is a ratio against the other panes (default 1).',
        },
        {
          name: 'OgeChartTickInterval / OgeChartDateInterval / OgeChartMinorTickOptions',
          type: 'number | interface',
          description:
            '<code>tickInterval</code>: a number in axis units (ms on time axes, every n-th category on category axes) or a calendar interval <code>{ years?, months?, weeks?, days?, hours?, minutes? }</code> stepping real calendar boundaries; <code>minorTicks</code>: <code>true</code> or <code>{ visible?, count? (4) }</code>.',
        },
        {
          name: 'OgeChartAxisLabelOptions / OgeChartLabelFormat / OgeChartLabelOverlap',
          type: 'interface / union',
          description:
            "<code>{ visible?, format?, template?, overlap? }</code>; <code>format</code> is a function or <code>Intl.NumberFormatOptions</code> / <code>Intl.DateTimeFormatOptions</code>; <code>overlap</code> is <code>'rotate' | 'stagger' | 'hide' | 'skip' | 'none'</code> (a rotated chart's vertical argument axis falls back to <code>skip</code> for rotate/stagger).",
        },
        {
          name: 'OgeChartAnimationOptions / OgeChartAnimationEasing',
          type: 'interface / union',
          description:
            "<code>{ enabled?, duration?, easing? }</code> with <code>'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut'</code>.",
        },
        {
          name: 'OgeChartPeriod / OgeChartCustomPeriod',
          type: 'union / interface',
          description:
            "Range-selector periods: <code>'1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All'</code>, or <code>{ label, range }</code> where <code>range</code> is a window <code>{ min, max }</code>, a span in axis units back from the data end, or a calendar interval back from it.",
        },
        {
          name: '[ogeChartTooltipTemplate]',
          type: 'structural directive (OgeChartTooltipTemplate)',
          description:
            "Replaces the tooltip's content; context <code>OgeChartTooltipTemplateContext</code>: <code>{ $implicit: OgeChartPointEvent[] }</code>.",
        },
        {
          name: '[ogeChartAnnotationTemplate]',
          type: 'structural directive (OgeChartAnnotationTemplate)',
          description:
            "Replaces an annotation's label (rendered in a <code>foreignObject</code>, so any HTML works); context <code>OgeChartAnnotationTemplateContext</code>: <code>{ $implicit: { text } }</code>.",
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

export const OGE_POLAR_CHART_API: ApiSections = {
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
          name: 'selectionMode / selectedPoints',
          type: "'point' | 'none' / readonly OgeChartPointRef[]",
          default: "'none' / []",
          description:
            'Keyboard Enter on the active point selects it (a second Enter clears it); hovering markers and sectors shows the tooltip. Two-way (<code>[(selectedPoints)]</code>).',
        },
        {
          name: 'legend / tooltipEnabled / palette / title / locale / messages',
          type: 'see OgeChart',
          description:
            'Shared options — the legend, tooltip, sr data table and keyboard inspection (arrows walk categories and series) work exactly like the cartesian chart.',
        },
      ],
    },
  ],
  methods: [
    {
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
          name: 'pointClick / legendClick / selectedPointsChange',
          type: 'OgeChartPointEvent&lt;T&gt; / OgeChartLegendClickEvent / readonly OgeChartPointRef[]',
          description:
            'Point activation, the cancelable legend toggle and the two-way selection output.',
        },
      ],
    },
  ],
};

export const OGE_RANGE_SELECTOR_API: ApiSections = {
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
          name: 'value',
          type: 'OgeChartRange | null',
          default: 'null',
          description:
            "The selected window in argument units (<code>null</code> = full range). Two-way (<code>[(value)]</code>) — bind the same signal to a chart's <code>[(visualRange)]</code> and the two stay in lockstep.",
        },
        {
          name: 'scaleType',
          type: "'time' | 'linear' | undefined",
          description:
            'Auto-detects from the first argument (dates → time) when unset.',
        },
        {
          name: 'periods',
          type: 'readonly (OgeChartPeriod | OgeChartCustomPeriod)[]',
          default: '[]',
          description:
            "Period buttons above the strip (a <code>role=\"group\"</code> of toggle buttons with <code>aria-pressed</code>): <code>'1M' | '3M' | '6M' | '1Y'</code> count calendar months back from the data end, <code>'YTD'</code> starts on January 1st, <code>'All'</code> resets; custom <code>{ label, range }</code> entries take a window, a span or a calendar interval. Calendar periods only render on time scales; the texts and accessible descriptions come from <code>messages.periods</code>.",
        },
        {
          name: 'palette / locale / messages',
          type: 'see OgeChart',
          description:
            'Shared options; handle labels come from <code>messages.aria.rangeStart/rangeEnd/rangeWindow</code>.',
        },
      ],
    },
  ],
  methods: [
    {
      entries: [
        {
          name: 'reset()',
          type: 'void',
          description: 'Back to the full range (<code>value = null</code>).',
        },
      ],
    },
  ],
  events: [
    {
      entries: [
        {
          name: 'valueChange',
          type: 'OgeChartRange | null',
          description:
            'The two-way model output. Interaction: drag the window (grab cursor), drag either handle, click the track to center the window there — Escape mid-drag restores; the handles are WAI-ARIA sliders (arrow keys adjust by 2%, Home/End jump to the bounds, changes announced).',
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
  methods: [
    {
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
            'Every user-facing string, aria labels included: <code>aria</code> (<code>OgeChartsAriaMessages</code> — chart/pie labels with <code>{title}</code>/<code>{count}</code>, table caption, plot hint, legend label), <code>announcements</code> (<code>OgeChartsAnnouncementMessages</code> — live-region templates with <code>{series}</code>/<code>{argument}</code>/<code>{value}</code>), <code>periods</code> (<code>OgeChartsPeriodMessages</code> — the range-selector period group label, button texts and their spelled-out descriptions) and <code>noData</code>. Defaults: <code>OGE_DEFAULT_CHARTS_MESSAGES</code>.',
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
            'Marker circles render only up to this many points per series — beyond it the single path carries the series alone. Line-family paths additionally auto-downsample with LTTB to about one point per pixel once a series outgrows the plot width (hit-testing and tooltips keep the full data).',
        },
      ],
    },
  ],
};
