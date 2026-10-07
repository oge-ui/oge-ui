import { describe, expect, it } from 'vitest';
import tokenFile from './generated/design-tokens.json';
import {
  filterTokens,
  groupTokens,
  shortPackage,
  tokenAnchor,
  type TokenFile,
} from './tokens-data';

const DATA = tokenFile as unknown as TokenFile;

describe('design-tokens.json (generated)', () => {
  it('holds the core tokens with their theme values', () => {
    const accent = DATA.tokens.find((token) => token.n === '--oge-accent');
    expect(accent?.c).toBe('color');
    expect(accent?.v.light).toBe('#2563eb');
    expect(accent?.v.dark).toBe('#60a5fa');
    expect(accent?.s?.tailwind).toBe('#4f46e5');
    expect(accent?.u).toContain('@oge-ui/grid');
  });

  it('marks derived tokens and categorizes every row', () => {
    const soft = DATA.tokens.find((token) => token.n === '--oge-accent-soft');
    expect(soft?.k).toBe('d');
    const ids = new Set(DATA.categories.map((category) => category.id));
    for (const token of DATA.tokens)
      expect(ids.has(token.c), token.n).toBe(true);
    expect(DATA.tokens.find((t) => t.n === '--oge-z-popup')?.c).toBe('z-index');
  });

  it('has one row per token name', () => {
    const names = DATA.tokens.map((token) => token.n);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('filterTokens', () => {
  it('matches every word against name, values, note and packages', () => {
    const names = filterTokens(DATA.tokens, 'accent soft', 'all').map(
      (t) => t.n,
    );
    expect(names).toContain('--oge-accent-soft');
    expect(names).not.toContain('--oge-accent');
    expect(
      filterTokens(DATA.tokens, '#2563eb', 'all').map((t) => t.n),
    ).toContain('--oge-accent');
    expect(filterTokens(DATA.tokens, 'kanban', 'all').length).toBeGreaterThan(
      3,
    );
  });

  it('filters by category', () => {
    const rows = filterTokens(DATA.tokens, '', 'z-index');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.c === 'z-index')).toBe(true);
  });

  it('groups in category order and drops empty groups', () => {
    const groups = groupTokens(
      filterTokens(DATA.tokens, 'radius', 'all'),
      DATA.categories,
    );
    expect(groups.map((group) => group.id)).toEqual(['radius']);
  });
});

describe('helpers', () => {
  it('anchors and short names', () => {
    expect(tokenAnchor('--oge-accent')).toBe('oge-accent');
    expect(shortPackage('@oge-ui/grid')).toBe('grid');
  });
});
