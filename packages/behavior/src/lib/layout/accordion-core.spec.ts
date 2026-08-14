import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_ACCORDION_MESSAGES,
  accordionAriaDisabled,
  accordionItemDescriptor,
  accordionNavIntent,
  accordionPageDirection,
  accordionTypeAheadStart,
  canCollapseAccordionPanel,
  expandedIdsAfterCollapse,
  expandedIdsAfterExpand,
  isAccordionTypeAheadKey,
  matchAccordionTitle,
  resolveAccordionIndex,
  resolveOgeAccordionConfig,
  sameAccordionIds,
  sameAccordionKeys,
  shouldRenderAccordionPanel,
  type OgeAccordionDescriptorCore,
} from './accordion-core';

const panels = (
  ...titles: Array<string | { title: string; key?: string; disabled?: boolean }>
): OgeAccordionDescriptorCore[] =>
  titles.map((entry, index) => {
    const spec = typeof entry === 'string' ? { title: entry } : entry;
    return {
      id: spec.key ?? `i${index}`,
      key: spec.key,
      title: spec.title,
      disabled: spec.disabled ?? false,
      invalid: false,
      initiallyExpanded: false,
    };
  });

describe('resolveOgeAccordionConfig', () => {
  it('defaults everything and merges messages key by key', () => {
    expect(resolveOgeAccordionConfig(undefined).messages).toEqual(
      OGE_DEFAULT_ACCORDION_MESSAGES,
    );
    const config = resolveOgeAccordionConfig({
      messages: { retry: 'Yeniden' },
    });
    expect(config.messages.retry).toBe('Yeniden');
    expect(config.messages.noData).toBe(OGE_DEFAULT_ACCORDION_MESSAGES.noData);
  });

  it('carries the layout defaults through', () => {
    const config = resolveOgeAccordionConfig({
      hideToggle: true,
      collapsedHeaderHeight: '3rem',
    });
    expect(config.hideToggle).toBe(true);
    expect(config.collapsedHeaderHeight).toBe('3rem');
  });
});

describe('accordionItemDescriptor', () => {
  it('keys off the item key, falling back to a positional auto id', () => {
    expect(accordionItemDescriptor({ key: 'a' }, 3).id).toBe('a');
    expect(accordionItemDescriptor({}, 3).id).toBe('i3');
  });

  it('fills the flags with their documented defaults', () => {
    expect(accordionItemDescriptor({}, 0)).toMatchObject({
      title: '',
      disabled: false,
      invalid: false,
      initiallyExpanded: false,
    });
  });

  it('keeps the source item, guard and loader attached', () => {
    const expandGuard = () => false;
    const contentLoader = () => Promise.resolve(1);
    const item = { title: 'One', expanded: true, expandGuard, contentLoader };
    const descriptor = accordionItemDescriptor(item, 0);
    expect(descriptor.item).toBe(item);
    expect(descriptor.expandGuard).toBe(expandGuard);
    expect(descriptor.contentLoader).toBe(contentLoader);
    expect(descriptor.initiallyExpanded).toBe(true);
  });
});

describe('resolveAccordionIndex', () => {
  const descriptors = panels(
    { title: 'A', key: 'a' },
    { title: 'B', key: 'b' },
  );

  it('accepts an in-range index and a known key', () => {
    expect(resolveAccordionIndex(descriptors, 1)).toBe(1);
    expect(resolveAccordionIndex(descriptors, 'a')).toBe(0);
  });

  it('reports -1 for anything it cannot resolve', () => {
    expect(resolveAccordionIndex(descriptors, 5)).toBe(-1);
    expect(resolveAccordionIndex(descriptors, -1)).toBe(-1);
    expect(resolveAccordionIndex(descriptors, 'zzz')).toBe(-1);
  });
});

describe('expansion rules', () => {
  it('adds to the set in multiple mode and replaces it otherwise', () => {
    const current = new Set(['a']);
    expect([...expandedIdsAfterExpand(current, 'b', true)]).toEqual(['a', 'b']);
    expect([...expandedIdsAfterExpand(current, 'b', false)]).toEqual(['b']);
  });

  it('never mutates the incoming set', () => {
    const current = new Set(['a']);
    expandedIdsAfterExpand(current, 'b', true);
    expandedIdsAfterCollapse(current, 'a');
    expect([...current]).toEqual(['a']);
  });

  it('removes on collapse and tolerates an id that is not expanded', () => {
    expect([...expandedIdsAfterCollapse(new Set(['a', 'b']), 'a')]).toEqual([
      'b',
    ]);
    expect([...expandedIdsAfterCollapse(new Set(['a']), 'zzz')]).toEqual(['a']);
  });
});

describe('canCollapseAccordionPanel', () => {
  it('always allows collapse in a collapsible accordion', () => {
    expect(canCollapseAccordionPanel(new Set(['a']), 'a', true)).toBe(true);
  });

  it('keeps the last expanded panel open when collapse is not allowed', () => {
    expect(canCollapseAccordionPanel(new Set(['a']), 'a', false)).toBe(false);
    expect(canCollapseAccordionPanel(new Set(['a', 'b']), 'a', false)).toBe(
      true,
    );
  });

  it('says no for a panel that is not expanded at all', () => {
    expect(canCollapseAccordionPanel(new Set(['a', 'b']), 'c', false)).toBe(
      false,
    );
  });
});

describe('accordionAriaDisabled', () => {
  it('marks a genuinely disabled header', () => {
    expect(
      accordionAriaDisabled({
        disabled: true,
        expanded: false,
        canCollapse: true,
      }),
    ).toBe(true);
  });

  it('omits the attribute for a collapsed or collapsible header', () => {
    expect(
      accordionAriaDisabled({
        disabled: false,
        expanded: false,
        canCollapse: false,
      }),
    ).toBe(null);
    expect(
      accordionAriaDisabled({
        disabled: false,
        expanded: true,
        canCollapse: true,
      }),
    ).toBe(null);
  });

  it('uses aria-disabled — not disabled — for the un-collapsible open panel', () => {
    // APG: it must stay focusable, so the attribute is the only signal
    expect(
      accordionAriaDisabled({
        disabled: false,
        expanded: true,
        canCollapse: false,
      }),
    ).toBe(true);
  });
});

describe('shouldRenderAccordionPanel', () => {
  const render = (
    options: Partial<Parameters<typeof shouldRenderAccordionPanel>[0]>,
  ) =>
    shouldRenderAccordionPanel({
      deferRendering: true,
      keepAlive: false,
      expanded: false,
      rendered: false,
      ...options,
    });

  it('renders everything up front without deferRendering', () => {
    expect(render({ deferRendering: false })).toBe(true);
  });

  it('renders an expanded panel', () => {
    expect(render({ expanded: true })).toBe(true);
  });

  it('drops a collapsed panel unless keepAlive already rendered it', () => {
    expect(render({})).toBe(false);
    expect(render({ keepAlive: true })).toBe(false);
    expect(render({ keepAlive: true, rendered: true })).toBe(true);
    expect(render({ rendered: true })).toBe(false);
  });
});

describe('set and key comparison', () => {
  it('compares id sets by membership, not order', () => {
    expect(sameAccordionIds(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(
      true,
    );
    expect(sameAccordionIds(new Set(['a']), new Set(['a', 'b']))).toBe(false);
    expect(sameAccordionIds(new Set(['a']), new Set(['b']))).toBe(false);
  });

  it('compares key lists position by position', () => {
    expect(sameAccordionKeys(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameAccordionKeys(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameAccordionKeys([], [])).toBe(true);
  });
});

describe('keyboard', () => {
  it('maps the APG navigation keys', () => {
    expect(accordionNavIntent('ArrowDown')).toBe('next');
    expect(accordionNavIntent('ArrowUp')).toBe('previous');
    expect(accordionNavIntent('Home')).toBe('first');
    expect(accordionNavIntent('End')).toBe('last');
    expect(accordionNavIntent('Enter')).toBe(null);
  });

  it('never navigates on a modified keystroke', () => {
    expect(accordionNavIntent('ArrowDown', { ctrlKey: true })).toBe(null);
    expect(accordionNavIntent('Home', { altKey: true })).toBe(null);
    expect(accordionNavIntent('End', { metaKey: true })).toBe(null);
  });

  it('reads the Ctrl+Page shortcuts and nothing else', () => {
    expect(accordionPageDirection('PageDown', { ctrlKey: true })).toBe(1);
    expect(accordionPageDirection('PageUp', { ctrlKey: true })).toBe(-1);
    expect(accordionPageDirection('PageDown')).toBe(null);
    expect(accordionPageDirection('ArrowDown', { ctrlKey: true })).toBe(null);
  });

  it('feeds only printable, unmodified characters to the type-ahead', () => {
    expect(isAccordionTypeAheadKey('a')).toBe(true);
    expect(isAccordionTypeAheadKey('7')).toBe(true);
    expect(isAccordionTypeAheadKey(' ')).toBe(false); // Space toggles
    expect(isAccordionTypeAheadKey('Enter')).toBe(false);
    expect(isAccordionTypeAheadKey('a', { ctrlKey: true })).toBe(false);
  });

  it('starts a fresh single-letter search after the focused header', () => {
    expect(accordionTypeAheadStart(2, 'a')).toBe(2);
    // a growing prefix re-tests the header the user is already on
    expect(accordionTypeAheadStart(2, 'ab')).toBe(1);
  });
});

describe('matchAccordionTitle', () => {
  const descriptors = panels(
    'Billing',
    'Shipping',
    { title: 'Support', disabled: true },
    'Security',
  );
  const isDisabled = (index: number) => descriptors[index].disabled;

  it('finds the next title starting with the prefix', () => {
    expect(matchAccordionTitle(descriptors, 's', 0, isDisabled)).toBe(1);
  });

  it('cycles through same-letter titles on repeated presses', () => {
    expect(matchAccordionTitle(descriptors, 's', 1, isDisabled)).toBe(3);
    expect(matchAccordionTitle(descriptors, 's', 3, isDisabled)).toBe(1);
  });

  it('skips disabled panels', () => {
    expect(matchAccordionTitle(descriptors, 'su', 0, isDisabled)).toBe(null);
  });

  it('re-tests the focused header for a growing prefix', () => {
    expect(matchAccordionTitle(descriptors, 'sh', 1, isDisabled)).toBe(1);
  });

  it('reports null when nothing matches', () => {
    expect(matchAccordionTitle(descriptors, 'z', 0, isDisabled)).toBe(null);
  });
});
