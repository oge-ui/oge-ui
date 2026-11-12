import type { FilterExpr } from '@oge-ui/core';

/** A generated row of the grid benchmark. */
export interface BenchRow {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly department: string;
  readonly salary: number;
  readonly hired: Date;
  readonly active: boolean;
}

/** The columns both grids render. */
export const BENCH_COLUMNS = [
  { field: 'id', caption: 'ID', dataType: 'number', width: 90 },
  { field: 'name', caption: 'Name', dataType: 'string', width: 200 },
  { field: 'city', caption: 'City', dataType: 'string', width: 140 },
  {
    field: 'department',
    caption: 'Department',
    dataType: 'string',
    width: 150,
  },
  { field: 'salary', caption: 'Salary', dataType: 'number', width: 120 },
  { field: 'hired', caption: 'Hired', dataType: 'date', width: 130 },
  { field: 'active', caption: 'Active', dataType: 'boolean', width: 90 },
] as const;

const FIRST = [
  'Ayşe',
  'Mark',
  'Lena',
  'Kenji',
  'Sofia',
  'Omar',
  'Clara',
  'Pierre',
  'Mei',
  'İlker',
  'Ana',
  'Jonas',
];
const LAST = [
  'Demir',
  'Ellis',
  'Vogel',
  'Sato',
  'Rossi',
  'Haddad',
  'Núñez',
  'Martin',
  'Lin',
  'Kaya',
  'Silva',
  'Berg',
];
const CITIES = [
  'İzmir',
  'Berlin',
  'Lyon',
  'Osaka',
  'Milano',
  'Dubai',
  'Sevilla',
  'Toronto',
  'Taipei',
  'Ankara',
];
const DEPARTMENTS = [
  'Sales',
  'Engineering',
  'Marketing',
  'Finance',
  'Support',
  'Operations',
];

/** Deterministic rows: the same `count` always yields the same data. */
export function benchRows(count: number): BenchRow[] {
  let seed = 42;
  const next = () => {
    // mulberry32
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(next() * list.length)];
  const start = Date.UTC(2010, 0, 1);
  const span = Date.UTC(2026, 0, 1) - start;
  const rows: BenchRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: i + 1,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      city: pick(CITIES),
      department: pick(DEPARTMENTS),
      salary: Math.round(30_000 + next() * 120_000),
      hired: new Date(start + Math.floor(next() * span)),
      active: next() > 0.2,
    };
  }
  return rows;
}

/** One measured operation. */
export interface BenchTiming {
  readonly ms: number;
  readonly rows: number;
}

/** Frame statistics of a scripted scroll. */
export interface BenchScroll {
  readonly fps: number;
  readonly p95FrameMs: number;
  readonly longFrames: number;
  readonly frames: number;
}

/** What `window.__ogeBench` exposes to the runner. */
export interface BenchApi {
  readonly ready: Promise<number>;
  filter(expr: FilterExpr | null): Promise<BenchTiming>;
  sort(caption: string): Promise<BenchTiming>;
  scroll(frames?: number, step?: number): Promise<BenchScroll>;
}

const frame = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve)),
  );

/**
 * The link between the benchmark page and the runner: the page hands in how
 * to show the grid and set its filter; the bridge times what follows.
 */
export const benchmarkBridge = {
  setFilter: (_filter: FilterExpr | null): void => undefined,

  /** Shows the grid, times its first rows, and publishes `window.__ogeBench`. */
  start(host: HTMLElement, show: () => void): Promise<number> {
    let mutated = false;
    const observer = new MutationObserver(() => (mutated = true));
    const rowCount = () => host.querySelectorAll('.oge-row').length;
    /** Applies a change, then waits until the DOM changed and one more frame painted. */
    const timed = async (change: () => void): Promise<BenchTiming> => {
      await frame();
      mutated = false;
      const t0 = performance.now();
      change();
      const deadline = t0 + 10_000;
      while (!mutated && performance.now() < deadline) await frame();
      await frame();
      return { ms: performance.now() - t0, rows: rowCount() };
    };
    const ready = (async () => {
      const t0 = performance.now();
      show();
      while (!host.querySelector('.oge-row')) await frame();
      await frame();
      const ms = performance.now() - t0;
      observer.observe(host, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      return ms;
    })();
    const api: BenchApi = {
      ready,
      filter: (expr) => timed(() => benchmarkBridge.setFilter(expr)),
      sort: (caption) =>
        timed(() => {
          const header = Array.from(
            host.querySelectorAll<HTMLElement>('.oge-header-cell'),
          ).find((cell) => cell.textContent?.trim().startsWith(caption));
          header?.click();
        }),
      async scroll(frames = 180, step = 120) {
        const viewport = host.querySelector<HTMLElement>('.oge-viewport');
        if (!viewport) throw new Error('no viewport');
        viewport.scrollTop = 0;
        await frame();
        const stamps: number[] = [];
        await new Promise<void>((resolve) => {
          const tick = (time: number) => {
            stamps.push(time);
            if (stamps.length >= frames) return resolve();
            viewport.scrollTop += step;
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const gaps = stamps.slice(1).map((t, i) => t - stamps[i]);
        const sorted = [...gaps].sort((a, b) => a - b);
        return {
          fps: (gaps.length * 1000) / (stamps[stamps.length - 1] - stamps[0]),
          p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
          longFrames: gaps.filter((g) => g > 50).length,
          frames: stamps.length,
        };
      },
    };
    (window as unknown as { __ogeBench: BenchApi }).__ogeBench = api;
    return ready;
  },
};
