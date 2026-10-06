// Hand-compiled from packages/charts/src/lib/chart/{circular-gauge,
// linear-gauge, bullet-chart, funnel-chart, heatmap, treemap, sunburst-chart,
// sankey-chart, vector-map}.ts and packages/charts/sparkline — keep in sync
// with the source TSDoc.
//
// The W8c chart components exist in both render layers with the same
// members, so one builder emits both tables: the Angular page passes
// `'angular'` (two-way models, outputs, public methods) and
// `../react-charts/react-visuals-api-data.ts` passes `'react'` (controlled
// pairs, `on…` callbacks, a `ref` handle). The parity gate then diffs them
// member by member like any other pair of tables.
import type {
  ApiEntry,
  ApiGroup,
  ApiSections,
} from '../../shared/api-reference';

export type VisualsLayer = 'angular' | 'react';

const SHARED: ApiEntry = {
  name: 'title / locale / messages',
  type: 'string / string | undefined / Partial&lt;OgeChartsMessages&gt;',
  description:
    'Shared with every chart: the heading (also the start of the accessible name), the BCP 47 locale of every number, and per-instance message overrides — the strings of these charts live in the <code>visuals</code> block (<code>OgeChartsVisualMessages</code>).',
};

const ANIMATION: ApiEntry = {
  name: 'animation',
  type: 'boolean | OgeChartAnimationOptions',
  default: 'true',
  description:
    'The first-render draw-in and the hover / value transitions (<code>{ enabled, duration, easing }</code>); <code>prefers-reduced-motion</code> always wins.',
};

const RTL: ApiEntry = {
  name: 'rtlEnabled',
  type: 'boolean | undefined',
  default: 'undefined',
  description:
    'Mirrored layout; unset follows the page <code>dir</code> (and a later flip of it). An explicit value is also set as <code>dir</code> on the host.',
};

const REACT_HOST: ApiEntry = {
  name: 'className / style',
  type: 'string / CSSProperties',
  description:
    'Host styling props (the docs size every chart with <code>style</code>).',
};

const VALUE_FORMAT: ApiEntry = {
  name: 'valueFormat',
  type: '(value: number) =&gt; string | undefined',
  description:
    'The text of every value — labels, tooltip, announcements, the screen-reader table; default the locale number.',
};

const PALETTE: ApiEntry = {
  name: 'palette',
  type: 'readonly string[] | undefined',
  description: 'Colours in order; default <code>OGE_CHART_PALETTE</code>.',
};

/** A two-way value: Angular `model()`, React `x` + `defaultX` + `onXChange`. */
function model(
  layer: VisualsLayer,
  name: string,
  type: string,
  defaultValue: string,
  description: string,
): ApiEntry {
  const pascal = name[0].toUpperCase() + name.slice(1);
  return layer === 'angular'
    ? {
        name,
        type,
        default: defaultValue,
        description: `${description} Two-way (<code>[(${name})]</code>).`,
      }
    : {
        name: `${name} / default${pascal}`,
        type,
        default: `undefined / ${defaultValue}`,
        description: `${description} Controlled when <code>${name}</code> is provided.`,
      };
}

/** An output (`click`) / callback (`onClick`). */
function event(
  layer: VisualsLayer,
  name: string,
  payload: string,
  description: string,
): ApiEntry {
  return layer === 'angular'
    ? { name, type: payload, description }
    : {
        name: `on${name[0].toUpperCase()}${name.slice(1)}`,
        type: `(event: ${payload}) =&gt; void`,
        description,
      };
}

function changeEvent(
  layer: VisualsLayer,
  name: string,
  type: string,
): ApiEntry {
  const pascal = name[0].toUpperCase() + name.slice(1);
  return layer === 'angular'
    ? {
        name: `${name}Change`,
        type,
        description: `The two-way <code>${name}</code> output.`,
      }
    : {
        name: `on${pascal}Change`,
        type: `(${name}: ${type}) =&gt; void`,
        description: `The controlled half of <code>${name}</code>.`,
      };
}

function methods(
  layer: VisualsLayer,
  handle: string,
  entries: ApiEntry[],
): ApiGroup[] {
  return [
    layer === 'angular' ? { entries } : { title: `${handle} (ref)`, entries },
  ];
}

const EXPORT_METHODS: ApiEntry = {
  name: 'getSvgElement() / print(options?)',
  type: 'SVGSVGElement / Promise&lt;void&gt;',
  description:
    'The live SVG root — what the image and PDF exporters serialize (token colours are resolved to their computed values) / the browser print dialog for the chart alone.',
};

const REFRESH: ApiEntry = {
  name: 'refresh()',
  type: 'void',
  description:
    'Re-measures the container and re-reads the page direction (rarely needed — a ResizeObserver and a <code>dir</code> observer cover it).',
};

const FOCUS: ApiEntry = {
  name: 'focus()',
  type: 'void',
  description: 'Moves the keyboard focus to the plot.',
};

function withHost(layer: VisualsLayer, entries: ApiEntry[]): ApiEntry[] {
  return layer === 'react' ? [...entries, REACT_HOST] : entries;
}

/* ------------------------------------------------------------------ */
/* gauges                                                              */
/* ------------------------------------------------------------------ */

const GAUGE_COMMON: ApiEntry[] = [
  {
    name: 'value',
    type: 'number | null',
    default: 'null',
    description:
      'The reading; <code>null</code> draws the scale alone (and reads <em>no data</em>). Values outside the scale clamp the indicator, while <code>aria-valuetext</code> speaks the real value.',
  },
  {
    name: 'scale',
    type: 'OgeGaugeScaleOptions',
    default: '{}',
    description:
      '<code>{ min?, max?, tickInterval?, minorTickInterval?, visible?, labelsVisible?, labelFormat? }</code> — default 0..100 with 1-2-5 major ticks (about five intervals) and a fifth of that as minor ticks (<code>0</code> hides them); labels thin out when they would collide.',
  },
  {
    name: 'ranges',
    type: 'readonly OgeChartValueRange[]',
    default: '[]',
    description:
      'Coloured bands <code>{ start, end, color?, label? }</code>; unset colours cycle the success / warning / danger tokens. A <code>label</code> is spoken with the value when it falls in the band (<code>aria-valuetext</code> “85, Warning”) and lists in the screen-reader table — colour is never the only channel.',
  },
  {
    name: 'barBase',
    type: 'number | undefined',
    description:
      'Where the bar indicator starts (a bar from 0 on a −50..50 scale); default the scale minimum.',
  },
  {
    name: 'subvalues',
    type: 'readonly number[]',
    default: '[]',
    description:
      'Secondary readings drawn as small markers (targets, last week).',
  },
  {
    name: 'showValue',
    type: 'boolean',
    default: 'true',
    description: 'The value text on the gauge.',
  },
  {
    ...VALUE_FORMAT,
    description:
      'Value text and <code>aria-valuetext</code> (<code>v =&gt; v + &#39; km/h&#39;</code>); default the locale number.',
  },
  {
    name: 'color',
    type: 'string | undefined',
    description:
      'Indicator colour — any CSS colour or token; default the accent.',
  },
];

function circularGaugeApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          ...GAUGE_COMMON,
          {
            name: 'indicator',
            type: 'OgeCircularGaugeIndicator',
            default: "'needle'",
            description:
              "<code>'needle'</code>, <code>'bar'</code> (a filled arc from <code>barBase</code>) or <code>'marker'</code> (a triangle on the scale). The needle and the marker rotate, the bar fills through <code>stroke-dasharray</code> — all three transition on value changes and sweep in from the minimum on the first render.",
          },
          {
            name: 'startAngle / endAngle',
            type: 'number / number',
            default: '-120 / 120',
            description:
              'The arc in degrees, 0 = 12 o&#39;clock, clockwise (<code>-90 / 90</code> is a half gauge); the radius is fitted to the arc&#39;s bounding box, so partial gauges fill their box.',
          },
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeGaugeHandle', [EXPORT_METHODS, REFRESH]),
    types: [
      {
        entries: [
          {
            name: 'OgeGaugeScaleOptions / OgeChartValueRange',
            type: 'interfaces',
            description:
              'The <code>scale</code> and <code>ranges</code> shapes, shared by both gauges and the bullet chart.',
          },
          {
            name: 'OgeCircularGaugeIndicator',
            type: "'needle' | 'bar' | 'marker'",
            description: 'The circular gauge&#39;s value indicators.',
          },
          {
            name: 'role="meter"',
            type: 'semantics',
            description:
              'The plot is a <code>role="meter"</code> with <code>aria-valuenow</code> (clamped into the scale), <code>aria-valuemin</code>, <code>aria-valuemax</code> and <code>aria-valuetext</code>; the svg is <code>aria-hidden</code>, and a screen-reader table outside the meter lists value, bounds, ranges and subvalues.',
          },
        ],
      },
    ],
  };
}

function linearGaugeApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          ...GAUGE_COMMON,
          {
            name: 'orientation',
            type: 'OgeGaugeOrientation',
            default: "'horizontal'",
            description:
              "<code>'horizontal'</code> or <code>'vertical'</code> (minimum at the bottom; give the host a height).",
          },
          {
            name: 'indicator',
            type: 'OgeLinearGaugeIndicator',
            default: "'bar'",
            description:
              "<code>'bar'</code> fills the track from <code>barBase</code>; <code>'marker'</code> slides a triangle along it. Both transition and sweep in like the circular gauge.",
          },
          RTL,
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeGaugeHandle', [EXPORT_METHODS, REFRESH]),
    types: [
      {
        entries: [
          {
            name: 'OgeLinearGaugeIndicator / OgeGaugeOrientation',
            type: "'bar' | 'marker' / 'horizontal' | 'vertical'",
            description:
              'The linear gauge&#39;s indicators and orientations; the meter semantics are the circular gauge&#39;s.',
          },
        ],
      },
    ],
  };
}

function bulletChartApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'value / target',
            type: 'number | null / number | null',
            default: 'null / null',
            description:
              'The measure (the bar, from zero) and the comparative measure (the target marker).',
          },
          {
            name: 'ranges',
            type: 'readonly OgeChartValueRange[]',
            default: '[]',
            description:
              'Qualitative bands, low → high; unset colours are shades of the muted colour, darkest first (poor → good). Labels list in the screen-reader table.',
          },
          {
            name: 'scale',
            type: 'OgeGaugeScaleOptions',
            default: '{}',
            description:
              '<code>min</code> / <code>max</code> default to 0 and the nice ceiling of bands, value and target; <code>visible: false</code> drops the axis.',
          },
          {
            name: 'orientation',
            type: 'OgeGaugeOrientation',
            default: "'horizontal'",
            description:
              'Vertical bullets stand the bar up (give the host a height).',
          },
          {
            name: 'color / targetColor',
            type: 'string | undefined / string | undefined',
            description: 'Bar and target colours; default the text colour.',
          },
          VALUE_FORMAT,
          {
            name: 'tooltipEnabled',
            type: 'boolean',
            default: 'true',
            description: 'Hovering shows the value and the target.',
          },
          RTL,
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeGaugeHandle', [EXPORT_METHODS, REFRESH]),
    types: [
      {
        entries: [
          {
            name: 'role="img"',
            type: 'semantics',
            description:
              'The svg&#39;s accessible name speaks title, value and target (<code>visuals.bulletLabel</code>); the screen-reader table lists value, target and every band.',
          },
        ],
      },
    ],
  };
}

function sparklineApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'dataSource',
            type: 'readonly (T | number | null)[]',
            default: '[]',
            description: 'Plain numbers or items; <code>null</code> is a gap.',
          },
          {
            name: 'valueField / argumentField',
            type: 'string | getter / string | getter | undefined',
            default: "'value' / undefined",
            description:
              'Field mapping for items (names, dotted paths or getters); the argument only feeds the tooltip (default the 1-based position).',
          },
          {
            name: 'type',
            type: 'OgeSparklineType',
            default: "'line'",
            description:
              "<code>'line'</code>, <code>'area'</code>, <code>'bar'</code> (bars from zero, negatives in <code>negativeColor</code>) or <code>'winloss'</code> (equal-height ticks above / below the middle, flat for a draw).",
          },
          {
            name: 'markers',
            type: 'boolean | OgeSparklineMarkers',
            default: 'false',
            description:
              'Dots on the <code>first</code> / <code>last</code> / <code>min</code> / <code>max</code> points (<code>true</code> = all four; max in the success colour, min in danger).',
          },
          {
            name: 'winlossThreshold',
            type: 'number',
            default: '0',
            description: 'Win-loss: above wins, below loses, equal draws.',
          },
          {
            name: 'minValue / maxValue',
            type: 'number | undefined',
            description:
              'A fixed value range, so sparklines of one column compare; default the data range (bars always include 0).',
          },
          {
            name: 'color / negativeColor',
            type: 'string | undefined',
            description:
              'Series / positive colour (default the accent) and negative bars / losses (default danger).',
          },
          {
            name: 'lineWidth',
            type: 'number',
            default: '1.5',
            description: 'Line stroke width, px.',
          },
          {
            name: 'tooltipEnabled',
            type: 'boolean',
            default: 'false',
            description:
              'A hover balloon with <code>argument: value</code> of the nearest point.',
          },
          VALUE_FORMAT,
          RTL,
          {
            name: 'title / locale / messages',
            type: 'string / string | undefined / Partial&lt;OgeChartsMessages&gt;',
            description:
              'The prefix of the accessible label — the svg is a <code>role="img"</code> summarizing the series (<code>visuals.sparklineLabel</code>: “Sales sparkline, 7 points: first 171, last 182, low 171, high 182”), the locale of its numbers and message overrides.',
          },
        ]),
      },
    ],
    methods: methods(layer, 'OgeSparklineHandle', [
      {
        name: 'getSvgElement()',
        type: 'SVGSVGElement',
        description: 'The live SVG root, for the image exporters.',
      },
    ]),
    types: [
      {
        entries: [
          {
            name: 'OgeSparklineType / OgeSparklineMarkers',
            type: "'line' | 'area' | 'bar' | 'winloss' / { first?, last?, min?, max? }",
            description:
              layer === 'angular'
                ? 'Import the component from <code>@oge-ui/charts/sparkline</code> (also re-exported by <code>@oge-ui/charts</code>): that entry never loads the cartesian chart. It has no frame, no animation and no screen-reader table — a cell-sized chart speaks one summary sentence.'
                : 'Import the component from <code>@oge-ui/react-charts/sparkline</code> (also re-exported by the main entry): that entry never loads the cartesian chart. It has no frame, no animation and no screen-reader table — a cell-sized chart speaks one summary sentence.',
          },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* non-cartesian                                                       */
/* ------------------------------------------------------------------ */

const PLOT_METHODS: ApiEntry[] = [FOCUS, REFRESH, EXPORT_METHODS];

const KEYBOARD_NOTE = (keys: string): ApiEntry => ({
  name: 'Keyboard',
  type: 'focusable plot (role="group")',
  description: `${keys} Each move is announced in a polite live region; the screen-reader table carries every value.`,
});

function funnelChartApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'dataSource / argumentField / valueField',
            type: 'readonly T[] / string | getter / string | getter',
            default: "[] / 'argument' / 'value'",
            description: 'One stage per item; negative values clamp to zero.',
          },
          {
            name: 'colorField / customizePoint',
            type: 'field / (info: OgeChartPointInfo) =&gt; OgeChartPointStyle',
            description:
              'Per-stage colour, or <code>{ color?, label?, description? }</code> overrides; <code>description</code> is spoken with the value.',
          },
          {
            name: 'type',
            type: 'OgeFunnelType',
            default: "'funnel'",
            description:
              "<code>'funnel'</code> or <code>'pyramid'</code> (a dynamic-height triangle with the apex on top and the first stage at the base).",
          },
          {
            name: 'algorithm',
            type: 'OgeFunnelAlgorithm',
            default: "'dynamicSlope'",
            description:
              "<code>'dynamicSlope'</code>: equal heights, widths follow the values. <code>'dynamicHeight'</code>: one fixed outline narrowing to the neck, heights follow the values.",
          },
          {
            name: 'neckWidth / neckHeight',
            type: 'number / number',
            default: '0 / 0',
            description:
              'The neck as fractions of the width and (dynamic height) of the height.',
          },
          {
            name: 'inverted / sortData / itemGap',
            type: 'boolean / boolean / number',
            default: 'false / true / 2',
            description:
              'Upside down; sort the stages largest first; the gap between stages, px.',
          },
          {
            name: 'showLabels / label',
            type: 'boolean / OgeChartLabelOptions',
            default: 'true / undefined',
            description:
              "Labels inside the stages (dropped where they do not fit, contrast-picked colour) or <code>position: 'outside'</code> in a column beside the shape with connectors; <code>format(info)</code> with <code>info.percent</code> = the share of the first stage. Default text <code>stage: value</code>.",
          },
          {
            name: 'legend / tooltipEnabled',
            type: 'OgeChartLegendOptions / boolean',
            default: '{} / true',
            description:
              'One legend button per stage (toggles its selection, <code>legendClick</code> is cancelable); the tooltip adds the share of the first and of the previous stage.',
          },
          PALETTE,
          VALUE_FORMAT,
          model(
            layer,
            'selectedItems',
            'readonly number[]',
            '[]',
            'Selected stage indexes (drawing order).',
          ),
          RTL,
          ANIMATION,
          SHARED,
          ...(layer === 'react'
            ? [
                {
                  name: 'renderLegendItem / renderLabel',
                  type: 'see OgeChart',
                  description:
                    'The legend-item and data-label render props, as on the pie chart.',
                },
              ]
            : []),
        ]),
      },
    ],
    methods: methods(layer, 'OgeVisualChartHandle', PLOT_METHODS),
    events: [
      {
        entries: [
          event(
            layer,
            'itemClick',
            'OgeChartFunnelItemEvent&lt;T&gt;',
            'Stage click or Enter: <code>{ index, argument, value, percentOfFirst, percentOfPrevious, source }</code>.',
          ),
          event(
            layer,
            'legendClick',
            'OgeChartLegendClickEvent',
            'Cancelable legend toggle.',
          ),
          changeEvent(layer, 'selectedItems', 'readonly number[]'),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'Up/Down (and Left/Right, mirrored in RTL) walk the stages, Home/End jump, Enter/Space select.',
          ),
          {
            name: 'OgeFunnelType / OgeFunnelAlgorithm',
            type: "'funnel' | 'pyramid' / 'dynamicSlope' | 'dynamicHeight'",
            description:
              layer === 'angular'
                ? 'Shapes and algorithms. The <code>[ogeChartLegendTemplate]</code> and <code>[ogeChartLabelTemplate]</code> slots of the pie chart work here too.'
                : 'Shapes and algorithms.',
          },
        ],
      },
    ],
  };
}

function heatmapApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'dataSource',
            type: 'readonly T[]',
            default: '[]',
            description:
              'One item per cell; missing cells render empty and read <em>no data</em>.',
          },
          {
            name: 'xField / yField / valueField',
            type: 'string | getter',
            default: "'x' / 'y' / 'value'",
            description: 'Column category, row category and the value.',
          },
          {
            name: 'xCategories / yCategories',
            type: 'readonly unknown[] | undefined',
            description:
              'Explicit column / row orders (top to bottom); default the order of first appearance. Items outside them are skipped.',
          },
          {
            name: 'colorScale',
            type: 'OgeChartColorScale | undefined',
            description:
              "<code>{ type?: 'linear' | 'segmented', min?, max?, colors?, ranges?, emptyColor?, labelFormat? }</code> — two or more <code>colors</code> blend evenly with <code>color-mix()</code> (three make a diverging scale; theme tokens follow the theme), <code>segmented</code> paints <code>ranges</code> flat. Default: the <code>--oge-chart-heat-low</code> / <code>--oge-chart-heat-high</code> tokens over the data range.",
          },
          {
            name: 'showLabels',
            type: 'boolean',
            default: 'true',
            description: 'Values in the cells where they fit.',
          },
          VALUE_FORMAT,
          {
            name: 'cellGap / xAxisPosition',
            type: "number / 'top' | 'bottom'",
            default: "2 / 'bottom'",
            description:
              'Gap between cells, px; column labels above or below the grid.',
          },
          {
            name: 'legend / tooltipEnabled',
            type: 'OgeChartLegendOptions / boolean',
            default: '{} / true',
            description:
              'The colour-scale legend (a gradient bar with ticks, or swatches when segmented; mirrored in RTL) and the cell tooltip.',
          },
          model(
            layer,
            'selectedCells',
            'readonly OgeChartCellRef[]',
            '[]',
            'Selected <code>{ row, column }</code> cells (click / Enter toggles).',
          ),
          RTL,
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeVisualChartHandle', PLOT_METHODS),
    events: [
      {
        entries: [
          event(
            layer,
            'cellClick',
            'OgeChartHeatmapCellEvent&lt;T&gt;',
            'Cell click or Enter: <code>{ row, column, x, y, value, source }</code>.',
          ),
          changeEvent(layer, 'selectedCells', 'readonly OgeChartCellRef[]'),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'The APG grid&#39;s navigation keys: arrows move one cell (the horizontal pair mirrors in RTL), Home/End to the row&#39;s ends, Ctrl+Home/End to the first/last cell, PageUp/PageDown to the column&#39;s ends, Enter/Space select. The screen-reader table is two-dimensional — one row per row category, one column per column category.',
          ),
          {
            name: 'OgeChartColorScale / OgeChartCellRef',
            type: 'interfaces',
            description:
              'The colour scale (shared with the treemap and the map) and a selected cell.',
          },
        ],
      },
    ],
  };
}

const HIERARCHY_FIELDS: ApiEntry[] = [
  {
    name: 'dataSource',
    type: 'readonly T[]',
    default: '[]',
    description:
      'Nested items (children under <code>childrenField</code>) or a flat list (<code>idField</code> + <code>parentField</code>; unknown parents and cycles are tolerated). Groups sum their children.',
  },
  {
    name: 'childrenField / idField / parentField',
    type: 'string | getter',
    default: "'items' / 'id' / undefined",
    description: 'Setting <code>parentField</code> switches to flat data.',
  },
  {
    name: 'labelField / valueField / colorField',
    type: 'string | getter',
    default: "'name' / 'value' / undefined",
    description:
      'Name, leaf value and an optional colour; unset colours come from the palette per top-level branch, lightened by depth.',
  },
];

function treemapApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          ...HIERARCHY_FIELDS,
          {
            name: 'layoutAlgorithm',
            type: 'OgeTreemapLayoutAlgorithm',
            default: "'squarified'",
            description:
              "<code>'squarified'</code> (tiles as close to squares as the data allows) or <code>'sliceAndDice'</code> (strips alternating per level, input order kept).",
          },
          {
            name: 'maxDepth',
            type: 'number | undefined',
            description:
              'Levels drawn below the current root; groups that are deep enough nest their children under a header band. Unset = all.',
          },
          {
            name: 'colorScale',
            type: 'OgeChartColorScale | undefined',
            description:
              'Colour the leaves by value instead (adds the colour-scale legend).',
          },
          PALETTE,
          {
            name: 'showLabels',
            type: 'boolean',
            default: 'true',
            description:
              'Name and value lines fitted to each tile (cut with an ellipsis).',
          },
          VALUE_FORMAT,
          {
            name: 'drillDown / tooltipEnabled',
            type: 'boolean / boolean',
            default: 'true / true',
            description:
              'Clicking a group (or Enter) makes it the root and shows the breadcrumb; the tooltip shows the path, value and share of the parent.',
          },
          model(
            layer,
            'rootKey',
            'string',
            "''",
            'The drill-down root&#39;s key (<code>&#39;&#39;</code> = the whole tree; keys are index paths like <code>&#39;0/2&#39;</code>).',
          ),
          RTL,
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeHierarchyChartHandle', [
      {
        name: 'drillTo(key) / drillUp()',
        type: 'void',
        description:
          'Re-roots on a node (announced) / one level up (no-op at the top).',
      },
      ...PLOT_METHODS,
    ]),
    events: [
      {
        entries: [
          event(
            layer,
            'tileClick',
            'OgeChartHierarchyNodeEvent&lt;T&gt;',
            'Tile click or Enter: <code>{ key, name, value, depth, percentOfParent, isGroup, source }</code> — fires before a group drills.',
          ),
          changeEvent(layer, 'rootKey', 'string'),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'Left/Right (mirrored in RTL) walk the siblings, Down goes to the first child, Up to the parent, Home/End to the first/last sibling, Enter/Space drill into a group (or activate a leaf) and Escape/Backspace drill up. The breadcrumb is a <code>&lt;nav&gt;</code> of buttons ending in the <code>aria-current</code> level.',
          ),
          {
            name: 'OgeChartHierarchyNodeEvent / OgeTreemapLayoutAlgorithm',
            type: 'interface / string union',
            description:
              'The node payload (shared with the sunburst) and the tilings.',
          },
        ],
      },
    ],
  };
}

function sunburstChartApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          ...HIERARCHY_FIELDS,
          {
            name: 'maxDepth',
            type: 'number | undefined',
            description: 'Rings drawn below the current root; unset = all.',
          },
          {
            name: 'innerRadius / startAngle',
            type: 'number / number',
            default: '0.25 / 0',
            description:
              'The centre hole as a fraction of the radius (it shows the root and goes up on click) and the start in radians (0 = 12 o&#39;clock, clockwise, as on the pie).',
          },
          PALETTE,
          {
            name: 'showLabels',
            type: 'boolean',
            default: 'true',
            description:
              'Radial labels where a segment is wide and deep enough.',
          },
          VALUE_FORMAT,
          {
            name: 'drillDown / tooltipEnabled',
            type: 'boolean / boolean',
            default: 'true / true',
            description:
              'Clicking a branch (or Enter) re-roots on it; the centre, the breadcrumb or Escape goes back up.',
          },
          model(
            layer,
            'rootKey',
            'string',
            "''",
            'The drill-down root&#39;s key (<code>&#39;&#39;</code> = the whole tree).',
          ),
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeHierarchyChartHandle', [
      {
        name: 'drillTo(key) / drillUp()',
        type: 'void',
        description: 'Re-roots on a node / one level up.',
      },
      ...PLOT_METHODS,
    ]),
    events: [
      {
        entries: [
          event(
            layer,
            'segmentClick',
            'OgeChartHierarchyNodeEvent&lt;T&gt;',
            'Segment click or Enter (before a branch drills).',
          ),
          changeEvent(layer, 'rootKey', 'string'),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'The treemap&#39;s keys: Left/Right siblings, Down first child, Up parent, Enter drills, Escape goes up.',
          ),
        ],
      },
    ],
  };
}

function sankeyChartApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'dataSource / sourceField / targetField / valueField',
            type: 'readonly T[] / string | getter',
            default: "[] / 'source' / 'target' / 'value'",
            description:
              'One item per flow; nodes are derived from the link ends. Zero links and self-loops are dropped; cycles are tolerated (their back-edges ignore the columns).',
          },
          {
            name: 'nodes',
            type: 'readonly OgeSankeyNode[]',
            default: '[]',
            description:
              'Optional per-node <code>{ id, label?, color? }</code>; listing nodes also fixes their order.',
          },
          {
            name: 'nodeWidth / nodePadding',
            type: 'number / number',
            default: '14 / 12',
            description:
              'Node bar width and the vertical gap within a column, px.',
          },
          {
            name: 'nodeAlign',
            type: 'OgeSankeyNodeAlign',
            default: "'justify'",
            description:
              "Columns from the longest path from a source: <code>'justify'</code> pushes sinks to the last column, <code>'left'</code> / <code>'right'</code> / <code>'center'</code> align by depth / height.",
          },
          {
            name: 'linkColor',
            type: 'OgeSankeyLinkColor',
            default: "'source'",
            description:
              "Bands take the <code>'source'</code> or <code>'target'</code> node colour, or a <code>'neutral'</code> grey (<code>--oge-chart-link</code>).",
          },
          {
            name: 'showLabels / tooltipEnabled',
            type: 'boolean / boolean',
            default: 'true / true',
            description:
              'Node labels facing the inside of the diagram; tooltips for nodes (in / out totals) and links (source → target: value).',
          },
          PALETTE,
          VALUE_FORMAT,
          RTL,
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeVisualChartHandle', PLOT_METHODS),
    events: [
      {
        entries: [
          event(
            layer,
            'nodeClick',
            'OgeChartSankeyNodeEvent',
            'Node click or Enter: <code>{ id, label, inflow, outflow }</code>.',
          ),
          event(
            layer,
            'linkClick',
            'OgeChartSankeyLinkEvent&lt;T&gt;',
            'Link click: <code>{ source, target, value, item }</code>.',
          ),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'Up/Down within a column, Left/Right to the neighbouring column (mirrored in RTL) at the closest rank, Home/End, Enter/Space. The active node lights up its links like a hover; the screen-reader table lists every flow.',
          ),
          {
            name: 'OgeSankeyNode / OgeSankeyNodeAlign / OgeSankeyLinkColor',
            type: 'interface / string unions',
            description:
              'Per-node settings, the column alignments and the link colourings.',
          },
        ],
      },
    ],
  };
}

function vectorMapApi(layer: VisualsLayer): ApiSections {
  return {
    properties: [
      {
        entries: withHost(layer, [
          {
            name: 'geoJson',
            type: 'OgeGeoJsonFeatureCollection | null',
            default: 'null',
            description:
              'Any GeoJSON <code>FeatureCollection</code>; <code>Polygon</code> and <code>MultiPolygon</code> features are drawn, fitted into the box. No tiles, no projection library.',
          },
          {
            name: 'projection',
            type: 'OgeMapProjection',
            default: "'mercator'",
            description:
              "<code>'mercator'</code> or <code>'equirectangular'</code>.",
          },
          {
            name: 'regionKey / nameField',
            type: '(feature) =&gt; string / string',
            default: "undefined / 'name'",
            description:
              'A feature&#39;s join key (default <code>feature.id</code>, then <code>properties.name</code>) and the property holding its display name.',
          },
          {
            name: 'dataSource / keyField / valueField',
            type: 'readonly T[] / string | getter / string | getter',
            default: "[] / 'key' / 'value'",
            description:
              'The values, joined to the regions by key; regions without one read <em>no data</em>.',
          },
          {
            name: 'colorScale',
            type: 'OgeChartColorScale | undefined',
            description:
              'The choropleth scale (see the heatmap); default the heat tokens.',
          },
          {
            name: 'showLabels',
            type: 'boolean',
            default: 'true',
            description:
              'Region names where the region is wide enough at the current zoom.',
          },
          VALUE_FORMAT,
          {
            name: 'legend / tooltipEnabled',
            type: 'OgeChartLegendOptions / boolean',
            default: '{} / true',
            description: 'The colour-scale legend and the region tooltip.',
          },
          {
            name: 'zoomEnabled / maxZoom',
            type: 'boolean / number',
            default: 'true / 8',
            description:
              'Wheel (a non-passive listener), pinch, the zoom buttons and the keyboard zoom; dragging pans while zoomed (the shared chart gesture machine, Escape cancels). The view is clamped so the map never leaves the box.',
          },
          model(
            layer,
            'selectedRegions',
            'readonly string[]',
            '[]',
            'Selected region keys (click / Enter toggles).',
          ),
          ANIMATION,
          SHARED,
        ]),
      },
    ],
    methods: methods(layer, 'OgeVectorMapHandle', [
      {
        name: 'zoomIn() / zoomOut() / resetZoom()',
        type: 'void',
        description: 'Zoom about the centre / back to the fitted view.',
      },
      ...PLOT_METHODS,
    ]),
    events: [
      {
        entries: [
          event(
            layer,
            'regionClick',
            'OgeChartMapRegionEvent&lt;T&gt;',
            'Region click or Enter: <code>{ index, key, name, value, feature, source }</code> (not fired by the click that ends a drag).',
          ),
          changeEvent(layer, 'selectedRegions', 'readonly string[]'),
        ],
      },
    ],
    types: [
      {
        entries: [
          KEYBOARD_NOTE(
            'Arrows move to the nearest region in that screen direction (by centroid) and pan it into view, <code>+</code> / <code>-</code> zoom, Shift+arrows pan, <code>0</code> resets, Home/End jump, Enter/Space select. The keys are described to screen readers (<code>visuals.mapHint</code>).',
          ),
          {
            name: 'OgeGeoJsonFeatureCollection / OgeGeoJsonFeature / OgeGeoJsonGeometry / OgeMapProjection',
            type: 'interfaces / string union',
            description:
              'The minimal GeoJSON shapes the map reads and the projections.',
          },
        ],
      },
    ],
  };
}

/** The ten W8c blocks of a layer, in page order. */
export function chartVisualsApi(layer: VisualsLayer): {
  readonly circularGauge: ApiSections;
  readonly linearGauge: ApiSections;
  readonly bulletChart: ApiSections;
  readonly sparkline: ApiSections;
  readonly funnelChart: ApiSections;
  readonly heatmap: ApiSections;
  readonly treemap: ApiSections;
  readonly sunburstChart: ApiSections;
  readonly sankeyChart: ApiSections;
  readonly vectorMap: ApiSections;
} {
  return {
    circularGauge: circularGaugeApi(layer),
    linearGauge: linearGaugeApi(layer),
    bulletChart: bulletChartApi(layer),
    sparkline: sparklineApi(layer),
    funnelChart: funnelChartApi(layer),
    heatmap: heatmapApi(layer),
    treemap: treemapApi(layer),
    sunburstChart: sunburstChartApi(layer),
    sankeyChart: sankeyChartApi(layer),
    vectorMap: vectorMapApi(layer),
  };
}

const ANGULAR = chartVisualsApi('angular');

export const OGE_CIRCULAR_GAUGE_API: ApiSections = ANGULAR.circularGauge;
export const OGE_LINEAR_GAUGE_API: ApiSections = ANGULAR.linearGauge;
export const OGE_BULLET_CHART_API: ApiSections = ANGULAR.bulletChart;
export const OGE_SPARKLINE_API: ApiSections = ANGULAR.sparkline;
export const OGE_FUNNEL_CHART_API: ApiSections = ANGULAR.funnelChart;
export const OGE_HEATMAP_API: ApiSections = ANGULAR.heatmap;
export const OGE_TREEMAP_API: ApiSections = ANGULAR.treemap;
export const OGE_SUNBURST_CHART_API: ApiSections = ANGULAR.sunburstChart;
export const OGE_SANKEY_CHART_API: ApiSections = ANGULAR.sankeyChart;
export const OGE_VECTOR_MAP_API: ApiSections = ANGULAR.vectorMap;
