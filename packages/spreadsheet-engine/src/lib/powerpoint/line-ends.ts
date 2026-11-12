/**
 * Arrowheads (`headEnd` / `tailEnd`) on an outline's open ends: where each
 * sits, which way it points and how the line is pulled back so it does not
 * poke through a filled head. SVG path data in points, in the shape's own
 * box, as the geometry presets draw.
 */
import type { OgeSlideLineEnd } from './model';

/** A drawn arrowhead: filled (`triangle`, `stealth`, `diamond`, `oval`) or stroked (`arrow`). */
export interface OgeSlideArrowhead {
  readonly d: string;
  readonly filled: boolean;
}

const FACTORS: Readonly<Record<string, number>> = { sm: 2, med: 3, lg: 5 };
/**
 * Office draws the heads of thin lines as if the line were 0.7 mm (≈ 2 pt)
 * wide — a hairline's triangle would otherwise be a speck.
 */
const MIN_BASE_WIDTH = 1.98;

const n = (value: number): number => Math.round(value * 1000) / 1000;

interface Command {
  letter: string;
  values: number[];
}

function parse(d: string): Command[] {
  const commands: Command[] = [];
  for (const match of d.matchAll(/([MLCAZ])([^MLCAZ]*)/gi)) {
    commands.push({
      letter: match[1].toUpperCase(),
      values: (match[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number),
    });
  }
  return commands;
}

function serialize(commands: readonly Command[]): string {
  return commands
    .map((c) => c.letter + c.values.map((v) => n(v)).join(' '))
    .join(' ');
}

type Point = readonly [number, number];

/** The first open sub-path's start and its direction, and the path's end and its direction. */
function ends(commands: readonly Command[]): {
  start: Point;
  startFrom: Point;
  end: Point;
  endFrom: Point;
} | null {
  if (!commands.length || commands[0].letter !== 'M') return null;
  const at = (c: Command): Point => [
    c.values[c.values.length - 2],
    c.values[c.values.length - 1],
  ];
  const start = at(commands[0]);
  const second = commands[1];
  if (!second || second.letter === 'Z' || second.letter === 'M') return null;
  // a curve leaves toward its first control point (unless it sits on the start)
  let startFrom: Point = at(second);
  if (second.letter === 'C') {
    const control: Point = [second.values[0], second.values[1]];
    if (control[0] !== start[0] || control[1] !== start[1]) startFrom = control;
  }
  const last = commands[commands.length - 1];
  if (last.letter === 'Z') return null;
  const end = at(last);
  const before = commands[commands.length - 2];
  let endFrom: Point = at(before);
  if (last.letter === 'C') {
    const control: Point = [last.values[2], last.values[3]];
    if (control[0] !== end[0] || control[1] !== end[1]) endFrom = control;
    else endFrom = [last.values[0], last.values[1]];
  }
  return { start, startFrom, end, endFrom };
}

function head(
  tip: Point,
  from: Point,
  end: OgeSlideLineEnd,
  lineWidth: number,
): { arrow: OgeSlideArrowhead; pullBack: number } | null {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const base = Math.max(lineWidth, MIN_BASE_WIDTH);
  const w = (FACTORS[end.width] ?? 3) * base;
  const l = (FACTORS[end.length] ?? 3) * base;
  const p = (along: number, across: number): string =>
    `${n(tip[0] + ux * along + nx * across)} ${n(tip[1] + uy * along + ny * across)}`;
  switch (end.type) {
    case 'triangle':
      return {
        arrow: {
          d: `M${p(0, 0)} L${p(-l, w / 2)} L${p(-l, -w / 2)} Z`,
          filled: true,
        },
        pullBack: l * 0.9,
      };
    case 'stealth':
      return {
        arrow: {
          d: `M${p(0, 0)} L${p(-l, w / 2)} L${p(-l * 0.6, 0)} L${p(-l, -w / 2)} Z`,
          filled: true,
        },
        pullBack: l * 0.5,
      };
    case 'diamond':
      return {
        arrow: {
          d: `M${p(l / 2, 0)} L${p(0, w / 2)} L${p(-l / 2, 0)} L${p(0, -w / 2)} Z`,
          filled: true,
        },
        pullBack: 0,
      };
    case 'oval': {
      const angle = n((Math.atan2(uy, ux) * 180) / Math.PI);
      return {
        arrow: {
          d:
            `M${p(l / 2, 0)} A${n(l / 2)} ${n(w / 2)} ${angle} 1 1 ${p(-l / 2, 0)} ` +
            `A${n(l / 2)} ${n(w / 2)} ${angle} 1 1 ${p(l / 2, 0)} Z`,
          filled: true,
        },
        pullBack: 0,
      };
    }
    case 'arrow':
      return {
        arrow: {
          d: `M${p(-l, w / 2)} L${p(0, 0)} L${p(-l, -w / 2)}`,
          filled: false,
        },
        pullBack: 0,
      };
    default:
      return null;
  }
}

function moveToward(point: Point, from: Point, by: number): Point {
  const dx = from[0] - point[0];
  const dy = from[1] - point[1];
  const length = Math.hypot(dx, dy);
  if (length === 0 || by <= 0) return point;
  const t = Math.min(by, length * 0.9) / length;
  return [point[0] + dx * t, point[1] + dy * t];
}

/**
 * The arrowheads of an open outline and the outline pulled back under the
 * filled ones. `lineWidth` is in points. The path is returned unchanged when
 * it has no open ends to put a head on.
 */
export function ogeSlideLineEnds(
  d: string,
  lineWidth: number,
  start: OgeSlideLineEnd | undefined,
  finish: OgeSlideLineEnd | undefined,
): { d: string; heads: OgeSlideArrowhead[] } {
  if (!start && !finish) return { d, heads: [] };
  const commands = parse(d);
  const found = ends(commands);
  if (!found) return { d, heads: [] };
  const heads: OgeSlideArrowhead[] = [];
  const first = start
    ? head(found.start, found.startFrom, start, lineWidth)
    : null;
  const last = finish
    ? head(found.end, found.endFrom, finish, lineWidth)
    : null;
  if (first) {
    heads.push(first.arrow);
    const moved = moveToward(found.start, found.startFrom, first.pullBack);
    commands[0].values = [moved[0], moved[1]];
  }
  if (last) {
    heads.push(last.arrow);
    const moved = moveToward(found.end, found.endFrom, last.pullBack);
    const tail = commands[commands.length - 1];
    tail.values.splice(tail.values.length - 2, 2, moved[0], moved[1]);
  }
  return { d: first || last ? serialize(commands) : d, heads };
}
