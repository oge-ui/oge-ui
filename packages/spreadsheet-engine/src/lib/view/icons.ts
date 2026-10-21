/**
 * The conditional-format icon sets, drawn as our own SVG shapes in a 16 × 16
 * view box. The shapes follow what each set means (arrows, flags, lights,
 * signs, ratings…); the colours are Excel's current palette, measured on
 * screen (Excel 16.0, build 17932): red #D86344, yellow #EAC282, green
 * #76A797, grey #808080, light grey #B3B3B3, dark grey #505050, pink #EDB9AB,
 * blue #4D82B8. Index 0 is the set's lowest icon.
 */

/** One element of an icon: a path, filled or stroked. */
export interface OgeIconPart {
  readonly d: string;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  /** SVG `transform`, e.g. a rotation about the centre. */
  readonly transform?: string;
}

const RED = '#D86344';
const YELLOW = '#EAC282';
const GREEN = '#76A797';
const GREY = '#808080';
const LIGHT = '#B3B3B3';
const DARK = '#505050';
const PINK = '#EDB9AB';
const BLUE = '#4D82B8';
const WHITE = '#FFFFFF';

/** Darker outline of a colour (the icons carry a thin edge). */
function edge(color: string): string {
  const n = parseInt(color.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((n >> shift) & 255) * 0.8)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`.toUpperCase();
}

const solid = (d: string, color: string, transform?: string): OgeIconPart => ({
  d,
  fill: color,
  stroke: edge(color),
  strokeWidth: 0.75,
  ...(transform ? { transform } : {}),
});

const UP = 'M8 1.2L14.6 7.8H10.6V14.8H5.4V7.8H1.4Z';
const arrow = (color: string, degrees: number) => [
  solid(UP, color, degrees ? `rotate(${degrees} 8 8)` : undefined),
];
const CIRCLE = 'M1.5 8a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0Z';
const circle = (color: string) => [solid(CIRCLE, color)];
const flag = (color: string): OgeIconPart[] => [
  { d: 'M2.4 1H3.8V15H2.4Z', fill: GREY },
  solid('M3.8 1.6L14 5.4L3.8 9.2Z', color),
];
const housed = (color: string): OgeIconPart[] => [
  {
    d: 'M3.5 1h9a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1 -2.5 2.5h-9a2.5 2.5 0 0 1 -2.5 -2.5v-9a2.5 2.5 0 0 1 2.5 -2.5Z',
    fill: DARK,
  },
  { d: 'M3 8a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z', fill: color },
];
const glyph = (d: string, width: number): OgeIconPart => ({
  d,
  fill: 'none',
  stroke: WHITE,
  strokeWidth: width,
});
const X = 'M5.2 5.2L10.8 10.8M10.8 5.2L5.2 10.8';
const CHECK = 'M4.4 8.4L7 11L11.6 5.4';
const symbol = (index: number): OgeIconPart[] =>
  index === 0
    ? [solid(CIRCLE, RED), glyph(X, 1.8)]
    : index === 1
      ? [
          solid(CIRCLE, YELLOW),
          glyph('M8 4.2V9.2', 1.8),
          { d: 'M7 11.6a1 1 0 1 0 2 0a1 1 0 1 0 -2 0Z', fill: WHITE },
        ]
      : [solid(CIRCLE, GREEN), glyph(CHECK, 1.8)];
const bare = (index: number): OgeIconPart[] =>
  index === 0
    ? [
        {
          d: 'M3 3L13 13M13 3L3 13',
          fill: 'none',
          stroke: RED,
          strokeWidth: 3.2,
        },
      ]
    : index === 1
      ? [
          solid('M6.6 1.5H9.4L9 10.5H7Z', YELLOW),
          solid('M6.7 13.2a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0Z', YELLOW),
        ]
      : [
          {
            d: 'M1.8 8.4L6 12.6L14.2 3.6',
            fill: 'none',
            stroke: GREEN,
            strokeWidth: 3,
          },
        ];
const bars = (blue: number): OgeIconPart[] =>
  [4, 7, 10, 13].map((height, i) => ({
    d: `M${1.4 + i * 3.6} ${15 - height}h2.8v${height}h-2.8Z`,
    fill: i < blue ? BLUE : LIGHT,
    stroke: edge(i < blue ? BLUE : LIGHT),
    strokeWidth: 0.5,
  }));
const quarter = (index: number): OgeIconPart[] => {
  const ring: OgeIconPart = {
    d: CIRCLE,
    fill: WHITE,
    stroke: DARK,
    strokeWidth: 1,
  };
  if (index === 0) return [ring];
  if (index === 4)
    return [{ d: CIRCLE, fill: DARK, stroke: DARK, strokeWidth: 1 }];
  // a wedge from twelve o'clock, clockwise: a quarter, half or three quarters
  const wedge = [
    '',
    'M8 8V1.5A6.5 6.5 0 0 1 14.5 8Z',
    'M8 8V1.5A6.5 6.5 0 0 1 8 14.5Z',
    'M8 8V1.5A6.5 6.5 0 1 1 1.5 8Z',
  ][index];
  return [ring, { d: wedge, fill: DARK }];
};
const STAR =
  'M8 1.2L10.1 5.6L14.9 6.2L11.4 9.5L12.3 14.3L8 11.9L3.7 14.3L4.6 9.5L1.1 6.2L5.9 5.6Z';
const star = (index: number): OgeIconPart[] =>
  index === 0
    ? [{ d: STAR, fill: WHITE, stroke: GREY, strokeWidth: 0.8 }]
    : index === 1
      ? [
          { d: STAR, fill: WHITE, stroke: GREY, strokeWidth: 0.8 },
          {
            d: 'M8 1.2L5.9 5.6L1.1 6.2L4.6 9.5L3.7 14.3L8 11.9Z',
            fill: YELLOW,
            stroke: edge(YELLOW),
            strokeWidth: 0.8,
          },
        ]
      : [solid(STAR, YELLOW)];
const triangle = (index: number): OgeIconPart[] =>
  index === 0
    ? [solid('M1.5 4H14.5L8 12.5Z', RED)]
    : index === 1
      ? [solid('M2 6.5H14V9.5H2Z', YELLOW)]
      : [solid('M8 3.5L14.5 12H1.5Z', GREEN)];
const boxes = (blue: number): OgeIconPart[] => {
  // filled bottom-left, bottom-right, top-left, then top-right
  const order: [number, number][] = [
    [1, 8.5],
    [8.5, 8.5],
    [1, 1],
    [8.5, 1],
  ];
  return order.map(([x, y], i) => ({
    d: `M${x} ${y}h6.5v6.5h-6.5Z`,
    fill: i < blue ? BLUE : LIGHT,
    stroke: edge(i < blue ? BLUE : LIGHT),
    strokeWidth: 0.5,
  }));
};

// a Map, not an object: set names come from untrusted files ('constructor' is no set)
const SETS = new Map<string, (index: number) => OgeIconPart[]>(
  Object.entries({
    '3Arrows': (i) => [arrow(RED, 180), arrow(YELLOW, 90), arrow(GREEN, 0)][i],
    '3ArrowsGray': (i) => arrow(GREY, [180, 90, 0][i]),
    '4Arrows': (i) =>
      [arrow(RED, 180), arrow(YELLOW, 135), arrow(YELLOW, 45), arrow(GREEN, 0)][
        i
      ],
    '4ArrowsGray': (i) => arrow(GREY, [180, 135, 45, 0][i]),
    '5Arrows': (i) =>
      [
        arrow(RED, 180),
        arrow(YELLOW, 135),
        arrow(YELLOW, 90),
        arrow(YELLOW, 45),
        arrow(GREEN, 0),
      ][i],
    '5ArrowsGray': (i) => arrow(GREY, [180, 135, 90, 45, 0][i]),
    '3Flags': (i) => flag([RED, YELLOW, GREEN][i]),
    '3TrafficLights1': (i) => circle([RED, YELLOW, GREEN][i]),
    '3TrafficLights2': (i) => housed([RED, YELLOW, GREEN][i]),
    '4TrafficLights': (i) => circle([DARK, RED, YELLOW, GREEN][i]),
    '4RedToBlack': (i) => circle([DARK, LIGHT, PINK, RED][i]),
    '3Signs': (i) =>
      [
        [solid('M8 1L15 8L8 15L1 8Z', RED)],
        [solid('M8 1.5L15 14.5H1Z', YELLOW)],
        circle(GREEN),
      ][i],
    '3Symbols': symbol,
    '3Symbols2': bare,
    '4Rating': (i) => bars(i + 1),
    '5Rating': (i) => bars(i),
    '5Quarters': quarter,
    '3Stars': star,
    '3Triangles': triangle,
    '5Boxes': (i: number) => boxes(i),
  } satisfies Record<string, (index: number) => OgeIconPart[]>),
);

/** The icon sets Excel has (the `iconSet` attribute values). */
export const OGE_ICON_SETS: readonly string[] = Object.freeze([...SETS.keys()]);

/** The parts of an icon of a set; empty for an unknown set or index (`NoIcons`). */
export function ogeIconParts(
  set: string,
  index: number,
): readonly OgeIconPart[] {
  const draw = SETS.get(set);
  const size = Number.parseInt(set, 10);
  if (!draw || !Number.isInteger(index) || index < 0 || index >= size)
    return [];
  return draw(index);
}
