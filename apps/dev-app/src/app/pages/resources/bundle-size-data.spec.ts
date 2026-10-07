import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import budgets from '../../../../../../tools/size-budgets.json';
// eslint-disable-next-line @nx/enforce-module-boundaries -- a build-time data file at the repo root, not a project import
import commercial from '../../../../../../tools/commercial-families.json';
import {
  formatKb,
  groupBudgets,
  packageOf,
  sortGroups,
  tierOf,
} from './bundle-size-data';

const FIXTURE = {
  tolerance: 0.1,
  entries: {
    '@oge-ui/grid': 50_000,
    '@oge-ui/grid/export-excel': 9_000,
    '@oge-ui/pivot': 80_000,
    '@oge-ui/core/themes/dark.css': 2_000,
    '@oge-ui/core': 40_000,
    'oge-ui': 100,
  },
};

describe('bundle-size data', () => {
  it('derives the package of an entry point', () => {
    expect(packageOf('@oge-ui/core/themes/dark.css')).toBe('@oge-ui/core');
    expect(packageOf('oge-ui')).toBe('oge-ui');
  });

  it('marks the ADR 0003 families and their engines and React twins', () => {
    const families = ['pivot', 'charts'];
    expect(tierOf('@oge-ui/pivot', families)).toBe('commercial');
    expect(tierOf('@oge-ui/pivot-engine', families)).toBe('commercial');
    expect(tierOf('@oge-ui/react-charts', families)).toBe('commercial');
    expect(tierOf('@oge-ui/grid', families)).toBe('mit');
    expect(tierOf('oge-ui', families)).toBe('mit');
  });

  it('groups by package with the CI ceiling', () => {
    const groups = groupBudgets(FIXTURE, ['pivot']);
    const grid = groups.find((group) => group.name === '@oge-ui/grid');
    expect(grid?.rows.map((row) => row.subpath)).toEqual(['.', 'export-excel']);
    expect(grid?.rows[0].ceiling).toBe(55_000);
    expect(grid?.largest).toBe(50_000);
  });

  it('sorts by name with the root first, or by size', () => {
    const groups = groupBudgets(FIXTURE, ['pivot']);
    const byName = sortGroups(groups, 'name', 'ascending');
    expect(byName.map((group) => group.name)).toEqual([
      '@oge-ui/core',
      '@oge-ui/grid',
      '@oge-ui/pivot',
      'oge-ui',
    ]);
    expect(byName[0].rows[0].subpath).toBe('.');
    const bySize = sortGroups(groups, 'size', 'descending');
    expect(bySize[0].name).toBe('@oge-ui/pivot');
    expect(bySize.at(-1)?.name).toBe('oge-ui');
  });

  it('reads the committed baseline and marks commercial packages', () => {
    const groups = groupBudgets(budgets, commercial.families);
    expect(groups.length).toBeGreaterThan(10);
    expect(groups.find((group) => group.name === '@oge-ui/pivot')?.tier).toBe(
      'commercial',
    );
    expect(groups.find((group) => group.name === '@oge-ui/grid')?.tier).toBe(
      'mit',
    );
  });

  it('formats kilobytes', () => {
    expect(formatKb(55_524)).toBe('55.5 kB');
  });
});
