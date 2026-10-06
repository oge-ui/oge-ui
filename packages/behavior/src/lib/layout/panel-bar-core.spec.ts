import { describe, expect, it } from 'vitest';
import {
  flattenOgePanelBarItems,
  ogePanelBarExpansionAfter,
  ogePanelBarIndex,
  ogePanelBarInitialExpanded,
  ogePanelBarKeyAction,
  ogePanelBarKeyIntent,
  ogePanelBarVisibleIds,
  type OgePanelBarItem,
} from './panel-bar-core';

const ITEMS: OgePanelBarItem[] = [
  {
    key: 'mail',
    title: 'Mail',
    expanded: true,
    children: [
      { key: 'inbox', title: 'Inbox' },
      { key: 'sent', title: 'Sent', disabled: true },
      { key: 'drafts', title: 'Drafts' },
    ],
  },
  {
    key: 'projects',
    title: 'Projects',
    expanded: true,
    children: [
      {
        key: 'archive',
        title: 'Archive',
        children: [{ key: 'old', title: 'Old' }],
      },
      { title: 'Untitled' },
    ],
  },
  { key: 'about', title: 'About', content: 'Version 1' },
  { key: 'hidden', title: 'Hidden', visible: false },
];

describe('flattenOgePanelBarItems', () => {
  const nodes = flattenOgePanelBarItems(ITEMS);
  const byId = ogePanelBarIndex(nodes);

  it('flattens visible items in document order', () => {
    expect(nodes.map((n) => n.id)).toEqual([
      'mail',
      'inbox',
      'sent',
      'drafts',
      'projects',
      'archive',
      'old',
      'p1-1',
      'about',
    ]);
  });

  it('records levels, parents and children', () => {
    expect(byId.get('old')?.level).toBe(3);
    expect(byId.get('old')?.parentId).toBe('archive');
    expect(byId.get('projects')?.childIds).toEqual(['archive', 'p1-1']);
  });

  it('classifies groups, content items and leaves', () => {
    const mail = byId.get('mail')!;
    const about = byId.get('about')!;
    const inbox = byId.get('inbox')!;
    expect([mail.hasChildren, mail.expandable, mail.selectable]).toEqual([
      true,
      true,
      false,
    ]);
    expect([about.hasContent, about.expandable, about.selectable]).toEqual([
      true,
      true,
      false,
    ]);
    expect([inbox.expandable, inbox.selectable]).toEqual([false, true]);
  });

  it('inherits disabled from the ancestors', () => {
    const tree = flattenOgePanelBarItems([
      { key: 'g', disabled: true, children: [{ key: 'c' }] },
    ]);
    expect(ogePanelBarIndex(tree).get('c')?.disabled).toBe(true);
  });

  it('children win over content; selectable can be forced', () => {
    const tree = flattenOgePanelBarItems([
      { key: 'g', content: 'x', selectable: true, children: [{ key: 'c' }] },
    ]);
    const g = ogePanelBarIndex(tree).get('g')!;
    expect(g.hasContent).toBe(false);
    expect(g.selectable).toBe(true);
  });
});

describe('expansion rules', () => {
  const nodes = flattenOgePanelBarItems(ITEMS);

  it('seeds every flagged group in multiple mode', () => {
    expect([...ogePanelBarInitialExpanded(nodes, 'multiple')]).toEqual([
      'mail',
      'projects',
    ]);
  });

  it('seeds one group per sibling set in single and full mode', () => {
    expect([...ogePanelBarInitialExpanded(nodes, 'single')]).toEqual(['mail']);
    expect([...ogePanelBarInitialExpanded(nodes, 'full')]).toEqual(['mail']);
  });

  it('single mode collapses the open siblings only', () => {
    const change = ogePanelBarExpansionAfter(
      nodes,
      new Set(['mail', 'archive']),
      'projects',
      true,
      'single',
    );
    expect([...change.next].sort()).toEqual(['archive', 'projects']);
    expect(change.collapsed).toEqual(['mail']);
  });

  it('multiple mode adds; collapse keeps the subtree state', () => {
    const open = ogePanelBarExpansionAfter(
      nodes,
      new Set(['mail']),
      'projects',
      true,
      'multiple',
    );
    expect([...open.next]).toEqual(['mail', 'projects']);
    const closed = ogePanelBarExpansionAfter(
      nodes,
      new Set(['projects', 'archive']),
      'projects',
      false,
      'multiple',
    );
    expect([...closed.next]).toEqual(['archive']);
  });

  it('visible ids follow the expanded ancestors', () => {
    expect(ogePanelBarVisibleIds(nodes, new Set(['projects']))).toEqual([
      'mail',
      'projects',
      'archive',
      'p1-1',
      'about',
    ]);
    // an expanded child under a collapsed parent stays hidden
    expect(ogePanelBarVisibleIds(nodes, new Set(['archive']))).toEqual([
      'mail',
      'projects',
      'about',
    ]);
  });
});

describe('keyboard', () => {
  const nodes = flattenOgePanelBarItems(ITEMS);
  const open = new Set(['mail']);

  it('maps keys to intents and mirrors Right/Left in RTL', () => {
    expect(ogePanelBarKeyIntent('ArrowDown')).toBe('next');
    expect(ogePanelBarKeyIntent('ArrowUp')).toBe('previous');
    expect(ogePanelBarKeyIntent('Home')).toBe('first');
    expect(ogePanelBarKeyIntent('End')).toBe('last');
    expect(ogePanelBarKeyIntent('ArrowRight')).toBe('expand');
    expect(ogePanelBarKeyIntent('ArrowLeft')).toBe('collapse');
    expect(ogePanelBarKeyIntent('ArrowRight', {}, true)).toBe('collapse');
    expect(ogePanelBarKeyIntent('ArrowLeft', {}, true)).toBe('expand');
    expect(ogePanelBarKeyIntent('ArrowDown', { ctrlKey: true })).toBeNull();
    expect(ogePanelBarKeyIntent('a')).toBeNull();
  });

  it('next / previous walk rendered headers and skip disabled ones', () => {
    expect(ogePanelBarKeyAction(nodes, open, 'inbox', 'next')).toEqual({
      kind: 'focus',
      id: 'drafts',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'drafts', 'previous')).toEqual({
      kind: 'focus',
      id: 'inbox',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'drafts', 'next')).toEqual({
      kind: 'focus',
      id: 'projects',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'about', 'next')).toBeNull();
  });

  it('first / last jump to the edges', () => {
    expect(ogePanelBarKeyAction(nodes, open, 'drafts', 'first')).toEqual({
      kind: 'focus',
      id: 'mail',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'mail', 'last')).toEqual({
      kind: 'focus',
      id: 'about',
    });
  });

  it('expand opens a closed group, then enters it', () => {
    expect(ogePanelBarKeyAction(nodes, open, 'projects', 'expand')).toEqual({
      kind: 'expand',
      id: 'projects',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'mail', 'expand')).toEqual({
      kind: 'focus',
      id: 'inbox',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'inbox', 'expand')).toBeNull();
  });

  it('collapse closes an open group, else moves to the parent', () => {
    expect(ogePanelBarKeyAction(nodes, open, 'mail', 'collapse')).toEqual({
      kind: 'collapse',
      id: 'mail',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'drafts', 'collapse')).toEqual({
      kind: 'focus',
      id: 'mail',
    });
    expect(ogePanelBarKeyAction(nodes, open, 'about', 'collapse')).toBeNull();
  });

  it('an unknown header resolves nothing', () => {
    expect(ogePanelBarKeyAction(nodes, open, 'nope', 'next')).toBeNull();
  });
});
