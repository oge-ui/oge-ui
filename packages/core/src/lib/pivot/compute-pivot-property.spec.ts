import { computePivot, pathKey } from './compute-pivot';
import type {
  PivotAxisNode,
  PivotFieldConfig,
  PivotResult,
} from './pivot-types';

/**
 * Property-based checks of the pivot aggregation: for random fact tables and
 * random expansion states, every subtotal and grand total equals the sum of
 * what it summarises, and the grand total equals the sum of the source.
 *
 * Generated with a small seeded PRNG (deterministic: a failure prints the
 * seed and the input; `OGE_PROPERTY_SEED=<n>` replays a run). Amounts are
 * integers so the sums are exact.
 */
type Rand = () => number;

function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rand: Rand, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(rand: Rand, items: readonly T[]): T =>
  items[int(rand, 0, items.length - 1)];

const BASE_SEED = Number(process.env['OGE_PROPERTY_SEED'] ?? 20_260_316);

function forAll<T>(
  generate: (rand: Rand) => T,
  check: (value: T) => void,
  runs = 150,
): void {
  for (let run = 0; run < runs; run++) {
    const seed = BASE_SEED + run;
    const value = generate(rng(seed));
    try {
      check(value);
    } catch (error) {
      throw new Error(
        `property failed for seed ${seed} (OGE_PROPERTY_SEED=${seed}):\n` +
          `${JSON.stringify(value).slice(0, 2_000)}\n${String(error)}`,
      );
    }
  }
}

interface Fact {
  region: string;
  city: string;
  year: number;
  quarter: string;
  amount: number | null;
}

const REGIONS = ['EU', 'US', 'APAC'];
const CITIES = ['A', 'B', 'C', 'D'];
const YEARS = [2023, 2024, 2025];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const FIELDS: PivotFieldConfig[] = [
  { id: 'region', dataField: 'region', area: 'row', areaIndex: 0 },
  { id: 'city', dataField: 'city', area: 'row', areaIndex: 1 },
  { id: 'year', dataField: 'year', area: 'column', areaIndex: 0 },
  { id: 'quarter', dataField: 'quarter', area: 'column', areaIndex: 1 },
  {
    id: 'sum',
    dataField: 'amount',
    area: 'data',
    areaIndex: 0,
    summaryType: 'sum',
  },
  {
    id: 'count',
    dataField: 'amount',
    area: 'data',
    areaIndex: 1,
    summaryType: 'count',
  },
];

interface Case {
  facts: Fact[];
  rowExpanded: string[];
  columnExpanded: string[];
}

function generateCase(rand: Rand): Case {
  const facts = Array.from({ length: int(rand, 1, 60) }, () => ({
    region: pick(rand, REGIONS),
    city: pick(rand, CITIES),
    year: pick(rand, YEARS),
    quarter: pick(rand, QUARTERS),
    amount: rand() < 0.1 ? null : int(rand, -500, 1_000),
  }));
  return {
    facts,
    rowExpanded: REGIONS.filter(() => rand() < 0.6),
    columnExpanded: YEARS.filter(() => rand() < 0.6).map(String),
  };
}

function compute({ facts, rowExpanded, columnExpanded }: Case): PivotResult {
  return computePivot({
    rows: facts,
    fields: FIELDS,
    rowExpandedPaths: new Set(rowExpanded.map((r) => pathKey([r]))),
    columnExpandedPaths: new Set(
      columnExpanded.map((y) => pathKey([Number(y)])),
    ),
  });
}

const cell = (result: PivotResult, row: number, column: number, m = 0) =>
  Number(result.values[row][column][m] ?? 0);

/** Every axis node, depth first. */
function nodes(roots: readonly PivotAxisNode[]): PivotAxisNode[] {
  return roots.flatMap((node) => [node, ...nodes(node.children)]);
}

/** The top-level slots that partition the axis (the grand total excluded). */
function topSlots(roots: readonly PivotAxisNode[]): number[] {
  return roots
    .filter((node) => !node.isGrandTotal && node.leafIndex >= 0)
    .map((node) => node.leafIndex);
}

function grandSlot(roots: readonly PivotAxisNode[], count: number): number {
  return roots.find((node) => node.isGrandTotal)?.leafIndex ?? count - 1;
}

describe('pivot aggregation properties', () => {
  it('the grand total equals the sum of the source and the row count', () => {
    forAll(generateCase, (input) => {
      const result = compute(input);
      const gr = grandSlot(result.rowRoot, result.rowLeafCount);
      const gc = grandSlot(result.columnRoot, result.columnLeafCount);
      const expected = input.facts.reduce((s, f) => s + (f.amount ?? 0), 0);
      expect(cell(result, gr, gc)).toBe(expected);
      expect(cell(result, gr, gc, 1)).toBe(input.facts.length);
    });
  });

  it('the top-level cells of the grid sum to the grand total', () => {
    forAll(generateCase, (input) => {
      const result = compute(input);
      const rows = topSlots(result.rowRoot);
      const columns = topSlots(result.columnRoot);
      const gr = grandSlot(result.rowRoot, result.rowLeafCount);
      const gc = grandSlot(result.columnRoot, result.columnLeafCount);
      let total = 0;
      for (const r of rows)
        for (const c of columns) total += cell(result, r, c);
      expect(total).toBe(cell(result, gr, gc));
      // and each margin: a row's grand-column cell sums that row
      for (const r of rows) {
        const sum = columns.reduce((s, c) => s + cell(result, r, c), 0);
        expect(sum).toBe(cell(result, r, gc));
      }
      for (const c of columns) {
        const sum = rows.reduce((s, r) => s + cell(result, r, c), 0);
        expect(sum).toBe(cell(result, gr, c));
      }
    });
  });

  it('an expanded node’s subtotal equals the sum of its children', () => {
    forAll(generateCase, (input) => {
      const result = compute(input);
      const gc = grandSlot(result.columnRoot, result.columnLeafCount);
      const gr = grandSlot(result.rowRoot, result.rowLeafCount);
      for (const node of nodes(result.rowRoot)) {
        if (node.children.length === 0 || node.leafIndex < 0) continue;
        const sum = node.children.reduce(
          (s, child) => s + cell(result, child.leafIndex, gc),
          0,
        );
        expect(sum).toBe(cell(result, node.leafIndex, gc));
      }
      for (const node of nodes(result.columnRoot)) {
        if (node.children.length === 0 || node.leafIndex < 0) continue;
        const sum = node.children.reduce(
          (s, child) => s + cell(result, gr, child.leafIndex),
          0,
        );
        expect(sum).toBe(cell(result, gr, node.leafIndex));
      }
    });
  });

  it('expansion never changes a collapsed total', () => {
    forAll(generateCase, (input) => {
      const expanded = compute(input);
      const collapsed = compute({
        ...input,
        rowExpanded: [],
        columnExpanded: [],
      });
      const total = (result: PivotResult) =>
        cell(
          result,
          grandSlot(result.rowRoot, result.rowLeafCount),
          grandSlot(result.columnRoot, result.columnLeafCount),
        );
      expect(total(expanded)).toBe(total(collapsed));
      // per region: the region's own slot holds the same total either way
      for (const region of expanded.rowRoot.filter((n) => !n.isGrandTotal)) {
        const twin = collapsed.rowRoot.find((n) => n.text === region.text);
        expect(twin).toBeDefined();
        expect(
          cell(
            expanded,
            region.leafIndex,
            grandSlot(expanded.columnRoot, expanded.columnLeafCount),
          ),
        ).toBe(
          cell(
            collapsed,
            twin!.leafIndex,
            grandSlot(collapsed.columnRoot, collapsed.columnLeafCount),
          ),
        );
      }
    });
  });
});
