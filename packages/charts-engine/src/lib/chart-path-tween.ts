/**
 * Path morphing for the chart tweens: a line or area path glides point by
 * point from its previous geometry to the new one. Paths with the same
 * command structure (the same point count) interpolate their numbers
 * directly, so curves stay curves; different structures are flattened and
 * resampled to a common point count first. Works on the absolute `M`/`L`/
 * `C`/`Z` paths the engine's path builders emit, in the logical frame
 * (`y` is the value dimension). Pure.
 */

type Command = 'M' | 'L' | 'C' | 'Z';

const ARITY: Readonly<Record<Command, number>> = { M: 2, L: 2, C: 6, Z: 0 };

/** One subpath: its commands and their flattened coordinate list. */
interface SubPath {
  readonly cmds: readonly Command[];
  readonly nums: readonly number[];
  readonly closed: boolean;
}

interface XY {
  x: number;
  y: number;
}

/** Points sampled per cubic segment when a path is flattened. */
const CURVE_SAMPLES = 8;
/** Upper bound of a resampled subpath (the performance contract). */
const MAX_RESAMPLED = 2400;

const fmt = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * Parses an absolute `M`/`L`/`C`/`Z` path; `null` when it holds anything
 * else (relative commands, arcs), which the tween then cross-fades instead.
 */
function parsePath(d: string): SubPath[] | null {
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  if (tokens === null) return [];
  const subs: SubPath[] = [];
  let cmds: Command[] = [];
  let nums: number[] = [];
  let closed = false;
  const flush = (): void => {
    if (cmds.length > 0) subs.push({ cmds, nums, closed });
    cmds = [];
    nums = [];
    closed = false;
  };
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i++];
    if (!(token in ARITY)) return null;
    const cmd = token as Command;
    if (cmd === 'M') flush();
    else if (cmds.length === 0) return null;
    if (cmd === 'Z') {
      cmds.push('Z');
      closed = true;
      continue;
    }
    // implicit repeats (`L 1 2 3 4`) are not emitted by the builders, but
    // read them anyway
    do {
      for (let k = 0; k < ARITY[cmd]; k++) {
        const value = Number(tokens[i++]);
        if (!Number.isFinite(value)) return null;
        nums.push(value);
      }
      cmds.push(cmds.length === 0 || cmd !== 'M' ? cmd : 'L');
    } while (i < tokens.length && !(tokens[i] in ARITY));
  }
  flush();
  return subs;
}

function sameStructure(a: readonly SubPath[], b: readonly SubPath[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ca = a[i].cmds;
    const cb = b[i].cmds;
    if (ca.length !== cb.length) return false;
    for (let k = 0; k < ca.length; k++) if (ca[k] !== cb[k]) return false;
  }
  return true;
}

function serialize(subs: readonly SubPath[]): string {
  const parts: string[] = [];
  for (const sub of subs) {
    let n = 0;
    let d = '';
    for (const cmd of sub.cmds) {
      d += d === '' ? cmd : ` ${cmd}`;
      for (let k = 0; k < ARITY[cmd]; k++) d += ` ${fmt(sub.nums[n++])}`;
    }
    parts.push(d);
  }
  return parts.join(' ');
}

/** Every `y` of the subpaths set to `baseline` (the value-axis baseline). */
function collapse(subs: readonly SubPath[], baseline: number): SubPath[] {
  return subs.map((sub) => ({
    ...sub,
    nums: sub.nums.map((value, index) => (index % 2 === 1 ? baseline : value)),
  }));
}

/** The subpath as a polyline (cubics sampled). */
function flatten(sub: SubPath): XY[] {
  const points: XY[] = [];
  let n = 0;
  let last: XY = { x: 0, y: 0 };
  for (const cmd of sub.cmds) {
    if (cmd === 'M' || cmd === 'L') {
      last = { x: sub.nums[n], y: sub.nums[n + 1] };
      points.push(last);
      n += 2;
    } else if (cmd === 'C') {
      const [x1, y1, x2, y2, x, y] = sub.nums.slice(n, n + 6);
      const x0 = last.x;
      const y0 = last.y;
      for (let s = 1; s <= CURVE_SAMPLES; s++) {
        const t = s / CURVE_SAMPLES;
        const mt = 1 - t;
        const a = mt * mt * mt;
        const b = 3 * mt * mt * t;
        const c = 3 * mt * t * t;
        const e = t * t * t;
        points.push({
          x: a * x0 + b * x1 + c * x2 + e * x,
          y: a * y0 + b * y1 + c * y2 + e * y,
        });
      }
      last = { x, y };
      n += 6;
    }
  }
  return points;
}

/** `count` points evenly spaced by arc length along the polyline. */
function resample(points: readonly XY[], count: number): XY[] {
  if (points.length === 0) return [];
  if (points.length === 1 || count <= 1) {
    return Array.from({ length: Math.max(1, count) }, () => ({
      ...points[0],
    }));
  }
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1];
  const result: XY[] = [];
  let segment = 1;
  for (let i = 0; i < count; i++) {
    if (total === 0) {
      // a degenerate run: spread by index instead
      const at = (i / (count - 1)) * (points.length - 1);
      const lo = Math.floor(at);
      const hi = Math.min(points.length - 1, lo + 1);
      const f = at - lo;
      result.push({
        x: points[lo].x + (points[hi].x - points[lo].x) * f,
        y: points[lo].y + (points[hi].y - points[lo].y) * f,
      });
      continue;
    }
    const target = (total * i) / (count - 1);
    while (segment < lengths.length - 1 && lengths[segment] < target) {
      segment++;
    }
    const span = lengths[segment] - lengths[segment - 1];
    const f = span > 0 ? (target - lengths[segment - 1]) / span : 0;
    const a = points[segment - 1];
    const b = points[segment];
    result.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  return result;
}

/**
 * Splits a closed area outline at the point farthest along `x` from its
 * start — the turn from the top edge to the bottom edge — so both edges
 * resample separately and never slide into each other.
 */
function splitOutline(points: readonly XY[]): [XY[], XY[]] {
  if (points.length < 3) return [[...points], []];
  let turn = 0;
  let best = -1;
  for (let i = 0; i < points.length; i++) {
    const distance = Math.abs(points[i].x - points[0].x);
    if (distance > best + 1e-9) {
      best = distance;
      turn = i;
    }
  }
  return [points.slice(0, turn + 1), points.slice(turn + 1)];
}

function polylineSub(points: readonly XY[], closed: boolean): SubPath {
  const cmds: Command[] = points.map((_, i) => (i === 0 ? 'M' : 'L'));
  if (closed) cmds.push('Z');
  const nums: number[] = [];
  for (const point of points) nums.push(point.x, point.y);
  return { cmds, nums, closed };
}

/** Two subpaths brought to the same structure (polylines of equal length). */
function align(a: SubPath, b: SubPath): [SubPath, SubPath] {
  const fa = flatten(a);
  const fb = flatten(b);
  const closed = a.closed || b.closed;
  if (closed) {
    const [topA, backA] = splitOutline(fa);
    const [topB, backB] = splitOutline(fb);
    const top = Math.min(MAX_RESAMPLED, Math.max(topA.length, topB.length, 2));
    const back = Math.min(
      MAX_RESAMPLED,
      Math.max(backA.length, backB.length, 1),
    );
    const edge = (points: readonly XY[], count: number, fallback: XY): XY[] =>
      points.length > 0 ? resample(points, count) : resample([fallback], count);
    return [
      polylineSub(
        [
          ...resample(topA, top),
          ...edge(backA, back, topA[topA.length - 1] ?? { x: 0, y: 0 }),
        ],
        true,
      ),
      polylineSub(
        [
          ...resample(topB, top),
          ...edge(backB, back, topB[topB.length - 1] ?? { x: 0, y: 0 }),
        ],
        true,
      ),
    ];
  }
  const count = Math.min(MAX_RESAMPLED, Math.max(fa.length, fb.length, 2));
  return [
    polylineSub(resample(fa, count), false),
    polylineSub(resample(fb, count), false),
  ];
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Prepares a morph from path `from` to path `to` and returns the frame
 * function (`t` 0 → 1, eased; it may overshoot). A side that is `null`
 * (the series had / gets no such path) grows from or shrinks to the value
 * `baseline`. At `t >= 1` the function returns `to` verbatim, so a finished
 * tween lands on exactly the scene's own path. Paths the parser does not
 * understand switch at the end.
 */
export function interpolateChartPath(
  from: string | null,
  to: string | null,
  baseline: number,
): (t: number) => string | null {
  if (from === to) return () => to;
  const parsedTo = to === null ? [] : parsePath(to);
  const parsedFrom = from === null ? [] : parsePath(from);
  if (parsedTo === null || parsedFrom === null) {
    return (t) => (t >= 1 ? to : from);
  }
  const target = to === null ? collapse(parsedFrom, baseline) : parsedTo;
  const source = from === null ? collapse(parsedTo, baseline) : parsedFrom;
  let pairs: [SubPath, SubPath][];
  if (sameStructure(source, target)) {
    pairs = source.map((sub, i) => [sub, target[i]]);
  } else {
    pairs = [];
    const count = Math.max(source.length, target.length);
    for (let i = 0; i < count; i++) {
      const a = source[i];
      const b = target[i];
      if (a !== undefined && b !== undefined) {
        pairs.push(
          a.cmds.length === b.cmds.length &&
            a.cmds.every((cmd, k) => cmd === b.cmds[k])
            ? [a, b]
            : align(a, b),
        );
      } else if (b !== undefined) {
        // a new gap run grows from the baseline
        pairs.push([collapse([b], baseline)[0], b]);
      } else if (a !== undefined) {
        pairs.push([a, collapse([a], baseline)[0]]);
      }
    }
  }
  return (t) => {
    if (t >= 1) return to;
    if (t <= 0 && from !== null) return from;
    const subs: SubPath[] = pairs.map(([a, b]) => ({
      cmds: b.cmds,
      closed: b.closed,
      nums: b.nums.map((value, i) => lerp(a.nums[i] ?? value, value, t)),
    }));
    return serialize(subs);
  };
}
