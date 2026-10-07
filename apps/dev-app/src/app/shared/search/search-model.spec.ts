import { describe, expect, it } from 'vitest';
import type { DocsFramework } from '../framework.service';
import {
  flattenIndex,
  matchTerm,
  resultUrl,
  searchItems,
  type SearchIndexFile,
  type SearchItem,
} from './search-model';

const INDEX: SearchIndexFile = {
  version: 1,
  pages: [
    { p: '/components/buttons', t: 'Buttons', c: 'Components', d: 'Buttons.' },
    { p: '/components/buttons/api', t: 'Buttons API', c: 'Buttons' },
    {
      p: '/components/data-grid/sorting',
      t: 'Sorting & Paging',
      c: 'Data Grid',
    },
  ],
  sections: [
    { p: 0, a: 'sizes', t: 'Sizes' },
    { p: 0, a: 'toggle-button', t: 'Toggle button', f: 'angular' },
  ],
  api: [
    {
      p: 1,
      a: 'ogebutton',
      t: 'OgeButton',
      o: '@oge-ui/buttons',
      f: 'angular',
      m: { properties: ['size', 'toggleable'], events: ['pressedChange'] },
    },
    {
      p: 1,
      a: 'ogebutton',
      t: '<OgeButton>',
      o: '@oge-ui/react-buttons',
      f: 'react',
      m: { events: ['onPressedChange'] },
    },
  ],
};

const ITEMS = flattenIndex(INDEX);
const BOTH: readonly DocsFramework[] = ['angular', 'react'];
const frameworksOf = (item: SearchItem): readonly DocsFramework[] =>
  item.framework ? [item.framework] : BOTH;

describe('flattenIndex', () => {
  it('expands pages, sections, API blocks and members', () => {
    expect(ITEMS.filter((item) => item.kind === 'page')).toHaveLength(3);
    expect(ITEMS.filter((item) => item.kind === 'section')).toHaveLength(2);
    const size = ITEMS.find((item) => item.title === 'size');
    expect(size).toMatchObject({
      kind: 'api',
      path: '/components/buttons/api',
      anchor: 'ogebutton-properties',
      context: 'OgeButton',
      detail: 'Property',
      framework: 'angular',
    });
  });
});

describe('design tokens', () => {
  const withTokens = flattenIndex({
    ...INDEX,
    pages: [...INDEX.pages, { p: '/getting-started/tokens', t: 'Tokens' }],
    tokens: {
      p: 3,
      t: [
        ['--oge-accent', 'color', '#2563eb'],
        ['--oge-z-modal', 'z-index', '1100'],
      ],
    },
  });

  it('become their own group, anchored at the row', () => {
    const groups = searchItems(withTokens, 'accent', 'angular', frameworksOf);
    const tokens = groups.find((group) => group.kind === 'token');
    expect(tokens?.label).toBe('Tokens');
    expect(tokens?.results[0].item).toMatchObject({
      title: '--oge-accent',
      path: '/getting-started/tokens',
      anchor: 'oge-accent',
      detail: 'Colour · #2563eb',
    });
  });

  it('match by value too', () => {
    const groups = searchItems(withTokens, '2563eb', 'angular', frameworksOf);
    expect(groups.map((group) => group.kind)).toEqual(['token']);
  });
});

describe('matchTerm', () => {
  it('ranks exact > prefix > word start > substring', () => {
    const score = (text: string, term: string): number =>
      matchTerm(text, text.toLowerCase(), term).score;
    expect(score('size', 'size')).toBeGreaterThan(score('sizes', 'size'));
    expect(score('sizes', 'size')).toBeGreaterThan(
      score('Button size', 'size'),
    );
    expect(score('pressedChange', 'change')).toBe(score('Button size', 'size'));
    expect(score('Button size', 'size')).toBeGreaterThan(
      score('oversized', 'size'),
    );
    expect(score('button', 'zzz')).toBe(0);
  });
});

describe('searchItems', () => {
  it('groups pages, sections and API results', () => {
    const groups = searchItems(ITEMS, 'button', 'angular', frameworksOf);
    expect(groups.map((group) => group.label)).toEqual([
      'Pages',
      'Sections',
      'API',
    ]);
    expect(groups[0].results[0].item.title).toBe('Buttons');
  });

  it('puts the active framework first and flags the other', () => {
    const angular = searchItems(
      ITEMS,
      'pressedchange',
      'angular',
      frameworksOf,
    );
    const api = angular.find((group) => group.kind === 'api');
    expect(api?.results[0].item.title).toBe('pressedChange');
    expect(api?.results[0].inFramework).toBe(true);
    const react = searchItems(ITEMS, 'pressedchange', 'react', frameworksOf);
    const reactApi = react.find((group) => group.kind === 'api');
    expect(reactApi?.results[0].item.title).toBe('onPressedChange');
    expect(reactApi?.results[1].inFramework).toBe(false);
  });

  it('requires every word to match somewhere', () => {
    expect(
      searchItems(ITEMS, 'sorting grid', 'angular', frameworksOf),
    ).toHaveLength(1);
    expect(
      searchItems(ITEMS, 'sorting kanban', 'angular', frameworksOf),
    ).toEqual([]);
    expect(searchItems(ITEMS, '   ', 'angular', frameworksOf)).toEqual([]);
  });
});

describe('resultUrl', () => {
  it('keeps the framework query and the anchor', () => {
    expect(resultUrl({ path: '/a', anchor: 'b' }, 'react')).toBe(
      '/a?framework=react#b',
    );
    expect(resultUrl({ path: '/a' }, 'angular')).toBe('/a');
  });
});
