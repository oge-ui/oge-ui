import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_TABS_MESSAGES,
  applyTabOrder,
  canSelectTab,
  reorderTabIds,
  resolveOgeTabsConfig,
  resolveTabIndex,
  tabItemDescriptor,
  type OgeTabDescriptorCore,
} from './tabs-core';

const descriptors = (
  ...specs: Array<Partial<OgeTabDescriptorCore> & { id: string }>
): OgeTabDescriptorCore[] =>
  specs.map((spec) => ({
    text: spec.id,
    disabled: false,
    closable: false,
    dirty: false,
    ...spec,
  }));

describe('resolveOgeTabsConfig', () => {
  it('returns the defaults for an absent config', () => {
    expect(resolveOgeTabsConfig(undefined).messages).toEqual(
      OGE_DEFAULT_TABS_MESSAGES,
    );
  });

  it('merges messages key by key rather than replacing the table', () => {
    const config = resolveOgeTabsConfig({ messages: { closeTab: 'Kapat' } });
    expect(config.messages.closeTab).toBe('Kapat');
    expect(config.messages.noData).toBe(OGE_DEFAULT_TABS_MESSAGES.noData);
  });

  it('does not mutate the shared defaults', () => {
    resolveOgeTabsConfig({ messages: { closeTab: 'Kapat' } });
    expect(OGE_DEFAULT_TABS_MESSAGES.closeTab).toBe('Close tab');
  });
});

describe('tabItemDescriptor', () => {
  it('falls back to a per-source auto id when the item has no key', () => {
    expect(tabItemDescriptor({ text: 'One' }, 2, false).id).toBe('i2');
    expect(tabItemDescriptor({ key: 'a', text: 'One' }, 2, false).id).toBe('a');
  });

  it('fills the optional fields with their documented defaults', () => {
    const descriptor = tabItemDescriptor({}, 0, false);
    expect(descriptor).toMatchObject({
      text: '',
      disabled: false,
      closable: false,
      dirty: false,
    });
  });

  it('lets a per-tab closable override the component-level default', () => {
    expect(tabItemDescriptor({ closable: false }, 0, true).closable).toBe(
      false,
    );
    expect(tabItemDescriptor({}, 0, true).closable).toBe(true);
  });

  it('keeps the source item and its close guard attached', () => {
    const closeGuard = () => false;
    const item = { text: 'One', closeGuard };
    const descriptor = tabItemDescriptor(item, 0, false);
    expect(descriptor.item).toBe(item);
    expect(descriptor.closeGuard).toBe(closeGuard);
  });
});

describe('applyTabOrder', () => {
  const source = descriptors({ id: 'a' }, { id: 'b' }, { id: 'c' });

  it('leaves the source order alone when nothing was reordered', () => {
    expect(applyTabOrder(source, [])).toBe(source);
  });

  it('applies a saved display order', () => {
    expect(applyTabOrder(source, ['c', 'a', 'b']).map((t) => t.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('appends tabs added after the order was saved, in source order', () => {
    const grown = descriptors(
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
    );
    expect(applyTabOrder(grown, ['c', 'a']).map((t) => t.id)).toEqual([
      'c',
      'a',
      'b',
      'd',
    ]);
  });

  it('ignores ids that no longer exist', () => {
    expect(
      applyTabOrder(source, ['gone', 'c', 'b', 'a']).map((t) => t.id),
    ).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the source array', () => {
    const copy = [...source];
    applyTabOrder(source, ['c', 'b', 'a']);
    expect(source).toEqual(copy);
  });
});

describe('resolveTabIndex', () => {
  const tabs = descriptors(
    { id: 'a', key: 'a' },
    { id: 'b', key: 'b' },
    { id: 'i2' },
  );

  it('passes an in-range index through and rejects an out-of-range one', () => {
    expect(resolveTabIndex(tabs, 1)).toBe(1);
    expect(resolveTabIndex(tabs, 3)).toBe(-1);
    expect(resolveTabIndex(tabs, -1)).toBe(-1);
  });

  it('looks a key up, and reports -1 for an unknown one', () => {
    expect(resolveTabIndex(tabs, 'b')).toBe(1);
    expect(resolveTabIndex(tabs, 'nope')).toBe(-1);
  });

  it('never matches a keyless tab by its auto id', () => {
    // ids are internal; only `key` is part of the public selection contract
    expect(resolveTabIndex(tabs, 'i2')).toBe(-1);
  });
});

describe('reorderTabIds', () => {
  const tabs = descriptors({ id: 'a' }, { id: 'b' }, { id: 'c' });

  it('moves a tab forward and backward', () => {
    expect(reorderTabIds(tabs, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderTabIds(tabs, 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when the tab lands where it started', () => {
    expect(reorderTabIds(tabs, 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('canSelectTab', () => {
  const tabs = descriptors(
    { id: 'a' },
    { id: 'b', disabled: true },
    { id: 'c' },
  );

  it('allows a move to another enabled tab', () => {
    expect(canSelectTab(tabs, 2, 0, false)).toBe(true);
  });

  it('refuses a disabled target, the current tab, and a disabled component', () => {
    expect(canSelectTab(tabs, 1, 0, false)).toBe(false);
    expect(canSelectTab(tabs, 0, 0, false)).toBe(false);
    expect(canSelectTab(tabs, 2, 0, true)).toBe(false);
  });

  it('refuses an index that does not exist', () => {
    expect(canSelectTab(tabs, 9, 0, false)).toBe(false);
    expect(canSelectTab([], 0, -1, false)).toBe(false);
  });
});
