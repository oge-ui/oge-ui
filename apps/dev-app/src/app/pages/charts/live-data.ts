/**
 * Data of the "Live data" demo, shared by the Angular and React pages — the
 * same rows `LIVE_DATA_SNIPPET` and its React twin generate.
 */
export interface LiveDataRow {
  readonly month: string;
  readonly orders: number;
  readonly returns: number;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Six months from `start`; `tick` reshuffles the values deterministically. */
export function liveDataRows(start: number, tick: number): LiveDataRow[] {
  return Array.from({ length: 6 }, (_, i) => {
    const n = start + i;
    const wave = Math.sin(n * 1.3 + tick * 2.1);
    return {
      month: MONTHS[n % MONTHS.length],
      orders: Math.round(60 + wave * 35 + ((n * 17 + tick * 11) % 20)),
      returns: Math.round(18 + Math.cos(n + tick) * 10),
    };
  });
}
