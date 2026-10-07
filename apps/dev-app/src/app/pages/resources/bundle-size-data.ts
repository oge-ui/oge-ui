/**
 * Shapes `tools/size-budgets.json` (the gzip baseline `size-check` enforces)
 * into the `/bundle-size` table: entry points grouped by package, each
 * package marked MIT or commercial from the ADR 0003 list
 * (`tools/commercial-families.json`, the same list the license-boundary gate
 * reads). Pure, so the spec can feed it fixtures.
 */

export type LicenseTier = 'mit' | 'commercial';
export type SortKey = 'name' | 'size';
export type SortDirection = 'ascending' | 'descending';

export interface SizeBudgets {
  readonly tolerance: number;
  readonly entries: Readonly<Record<string, number>>;
}

export interface EntryRow {
  /** Full specifier, e.g. `@oge-ui/grid/export-excel`. */
  readonly entry: string;
  /** `.` for the package root, else the subpath (`export-excel`). */
  readonly subpath: string;
  /** Gzip bytes in the committed baseline. */
  readonly bytes: number;
  /** What CI accepts before it fails: baseline × (1 + tolerance). */
  readonly ceiling: number;
}

export interface PackageGroup {
  readonly name: string;
  readonly tier: LicenseTier;
  readonly rows: readonly EntryRow[];
  /** The package's largest entry — what a size sort orders packages by. */
  readonly largest: number;
}

/** `@oge-ui/grid/export-excel` → `@oge-ui/grid`; `oge-ui/x` → `oge-ui`. */
export function packageOf(entry: string): string {
  const parts = entry.split('/');
  return entry.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** Commercial when the package is `<family>`, `<family>-engine` or `react-<family>`. */
export function tierOf(
  packageName: string,
  commercialFamilies: readonly string[],
): LicenseTier {
  const bare = packageName.replace(/^@oge-ui\//, '');
  return commercialFamilies.some(
    (family) =>
      bare === family ||
      bare === `${family}-engine` ||
      bare === `react-${family}`,
  )
    ? 'commercial'
    : 'mit';
}

export function groupBudgets(
  budgets: SizeBudgets,
  commercialFamilies: readonly string[],
): PackageGroup[] {
  const byPackage = new Map<string, EntryRow[]>();
  for (const [entry, bytes] of Object.entries(budgets.entries)) {
    const name = packageOf(entry);
    const subpath = entry === name ? '.' : entry.slice(name.length + 1);
    const rows = byPackage.get(name) ?? [];
    rows.push({
      entry,
      subpath,
      bytes,
      ceiling: Math.floor(bytes * (1 + budgets.tolerance)),
    });
    byPackage.set(name, rows);
  }
  return [...byPackage].map(([name, rows]) => ({
    name,
    tier: tierOf(name, commercialFamilies),
    rows,
    largest: Math.max(...rows.map((row) => row.bytes)),
  }));
}

/**
 * Orders packages and the entries inside each. By name, the package root
 * leads its group; by size, packages follow their largest entry.
 */
export function sortGroups(
  groups: readonly PackageGroup[],
  key: SortKey,
  direction: SortDirection,
): PackageGroup[] {
  const sign = direction === 'ascending' ? 1 : -1;
  const byName = (a: string, b: string): number => a.localeCompare(b, 'en');
  const rowOrder = (a: EntryRow, b: EntryRow): number =>
    key === 'size'
      ? sign * (a.bytes - b.bytes) || byName(a.entry, b.entry)
      : a.subpath === '.'
        ? -1
        : b.subpath === '.'
          ? 1
          : sign * byName(a.subpath, b.subpath);
  return [...groups]
    .sort((a, b) =>
      key === 'size'
        ? sign * (a.largest - b.largest) || byName(a.name, b.name)
        : sign * byName(a.name, b.name),
    )
    .map((group) => ({ ...group, rows: [...group.rows].sort(rowOrder) }));
}

/** 55524 → "55.5 kB" (1 kB = 1000 bytes, as size-limit and npm report). */
export function formatKb(bytes: number): string {
  return `${(bytes / 1000).toFixed(1)} kB`;
}
