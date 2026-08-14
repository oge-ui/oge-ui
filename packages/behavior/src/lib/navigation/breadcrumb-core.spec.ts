import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_BREADCRUMB_MESSAGES,
  breadcrumbDataDescriptors,
  breadcrumbMenuItems,
  fitBreadcrumbDescriptors,
  resolveOgeBreadcrumbConfig,
  type OgeBreadcrumbDescriptorCore,
} from './breadcrumb-core';

const trail = (...texts: string[]): OgeBreadcrumbDescriptorCore[] =>
  texts.map((text, index) => ({ id: `i${index}`, item: { text } }));

const sizesOf = (ids: readonly string[], size: number) =>
  new Map(ids.map((id) => [id, size]));

describe('breadcrumbDataDescriptors', () => {
  it('keys off the item key, falling back to a positional id', () => {
    const descriptors = breadcrumbDataDescriptors([
      { text: 'Home', key: 'home' },
      { text: 'Docs' },
    ]);
    expect(descriptors.map((d) => d.id)).toEqual(['home', 'i1']);
  });

  it('drops invisible crumbs', () => {
    expect(
      breadcrumbDataDescriptors([
        { text: 'Home' },
        { text: 'Hidden', visible: false },
        { text: 'Docs' },
      ]).map((d) => d.item.text),
    ).toEqual(['Home', 'Docs']);
  });

  it('treats an absent items array as an empty trail', () => {
    expect(breadcrumbDataDescriptors(undefined)).toEqual([]);
  });
});

describe('fitBreadcrumbDescriptors', () => {
  const descriptors = trail('Home', 'Docs', 'Guides', 'Routing');
  const ids = descriptors.map((d) => d.id);

  const fit = (
    overrides: Partial<Parameters<typeof fitBreadcrumbDescriptors>[0]> = {},
  ) =>
    fitBreadcrumbDescriptors({
      descriptors,
      collapseMode: 'auto',
      containerSize: 1000,
      sizes: sizesOf(ids, 100),
      ellipsisSize: 44,
      ...overrides,
    });

  it('collapses nothing while the trail fits', () => {
    expect(fit()).toEqual({ inMenu: [], menuVisible: false });
  });

  it('folds the oldest middle crumbs first, keeping the ends', () => {
    const result = fit({ containerSize: 260 });
    expect(result.menuVisible).toBe(true);
    expect(result.inMenu).toContain(1);
    expect(result.inMenu).not.toContain(0);
    expect(result.inMenu).not.toContain(descriptors.length - 1);
  });

  it('keeps the first and last crumb inline even at an impossible width', () => {
    const result = fit({ containerSize: 10 });
    expect(result.inMenu.sort()).toEqual([1, 2]);
  });

  it('stays inline in the non-auto collapse modes', () => {
    expect(fit({ collapseMode: 'wrap', containerSize: 10 })).toEqual({
      inMenu: [],
      menuVisible: false,
    });
    expect(fit({ collapseMode: 'none', containerSize: 10 })).toEqual({
      inMenu: [],
      menuVisible: false,
    });
  });

  it('never collapses a trail of two crumbs or fewer', () => {
    const short = trail('Home', 'Docs');
    expect(
      fitBreadcrumbDescriptors({
        descriptors: short,
        collapseMode: 'auto',
        containerSize: 10,
        sizes: sizesOf(
          short.map((d) => d.id),
          100,
        ),
        ellipsisSize: 44,
      }).menuVisible,
    ).toBe(false);
  });

  it('waits for a measured container rather than guessing', () => {
    expect(fit({ containerSize: 0 }).menuVisible).toBe(false);
  });

  it('waits until every crumb has been measured', () => {
    const partial = new Map(sizesOf(ids, 100));
    partial.delete('i2');
    expect(fit({ containerSize: 100, sizes: partial }).menuVisible).toBe(false);
  });

  it('falls back to the estimated ellipsis width until it is measured', () => {
    // an unmeasured ellipsis must still cost room, or the trail would flicker
    expect(fit({ containerSize: 260, ellipsisSize: 0 }).menuVisible).toBe(true);
  });
});

describe('breadcrumbMenuItems', () => {
  const descriptors: OgeBreadcrumbDescriptorCore[] = [
    { id: 'i0', item: { text: 'Home', url: '/' } },
    {
      id: 'i1',
      item: { text: 'Docs', url: '/docs', icon: 'M0', hint: 'Docs' },
    },
    { id: 'i2', item: { text: 'Guides', disabled: true } },
  ];

  it('renders the collapsed crumbs in trail order, whatever order they arrive in', () => {
    expect(
      breadcrumbMenuItems(descriptors, [2, 0]).map((row) => row.text),
    ).toEqual(['Home', 'Guides']);
  });

  it('keeps a hidden crumb a real link and carries its trail index back', () => {
    const [row] = breadcrumbMenuItems(descriptors, [1]);
    expect(row).toMatchObject({
      text: 'Docs',
      url: '/docs',
      icon: 'M0',
      hint: 'Docs',
      value: 1,
    });
  });

  it('carries the disabled state into the menu', () => {
    expect(breadcrumbMenuItems(descriptors, [2])[0].disabled).toBe(true);
  });

  it('ignores indexes that no longer exist', () => {
    expect(breadcrumbMenuItems(descriptors, [9])).toEqual([]);
  });
});

describe('resolveOgeBreadcrumbConfig', () => {
  it('defaults, merges messages key by key and carries the mode default', () => {
    expect(resolveOgeBreadcrumbConfig(undefined).messages).toEqual(
      OGE_DEFAULT_BREADCRUMB_MESSAGES,
    );
    const config = resolveOgeBreadcrumbConfig({
      collapseMode: 'wrap',
      messages: { breadcrumb: 'Kırıntı yolu' },
    });
    expect(config.collapseMode).toBe('wrap');
    expect(config.messages.breadcrumb).toBe('Kırıntı yolu');
    expect(config.messages.collapsed).toBe(
      OGE_DEFAULT_BREADCRUMB_MESSAGES.collapsed,
    );
  });
});
