import { describe, expect, it, vi } from 'vitest';
import {
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  applyToolbarOverride,
  fitToolbarDescriptors,
  isToolbarStopDisabled,
  isToolbarTextEntry,
  loadToolbarItems,
  orderToolbarDescriptors,
  readToolbarStyleMetrics,
  resolveOgeToolbarConfig,
  toolbarCollapses,
  toolbarDataDescriptors,
  toolbarIconVisible,
  toolbarItemId,
  toolbarItemWidth,
  toolbarMenuItems,
  toolbarOverflowEvent,
  toolbarScrollState,
  toolbarTextVisible,
  withToolbarIndexes,
  type OgeToolbarDescriptorCore,
} from './toolbar-core';

const descriptor = (
  spec: Partial<OgeToolbarDescriptorCore> & { id: string },
): OgeToolbarDescriptorCore => ({
  type: 'button',
  location: 'before',
  locateInMenu: 'auto',
  disabled: false,
  severity: 'default',
  index: 0,
  ...spec,
});

describe('resolveOgeToolbarConfig', () => {
  it('defaults, and merges messages key by key', () => {
    expect(resolveOgeToolbarConfig(undefined).messages).toEqual(
      OGE_DEFAULT_TOOLBAR_MESSAGES,
    );
    const config = resolveOgeToolbarConfig({
      size: 'sm',
      messages: { toolbar: 'Araç çubuğu' },
    });
    expect(config.size).toBe('sm');
    expect(config.messages.toolbar).toBe('Araç çubuğu');
    expect(config.messages.noData).toBe(OGE_DEFAULT_TOOLBAR_MESSAGES.noData);
  });
});

describe('toolbarItemId / applyToolbarOverride', () => {
  it('keys off the item key, falling back to a positional auto id', () => {
    expect(toolbarItemId({ key: 'save' }, 3)).toBe('save');
    expect(toolbarItemId({}, 3)).toBe('i3');
  });

  it('merges a patch into the id’s entry without touching the others', () => {
    const first = applyToolbarOverride(new Map(), 'save', { visible: false });
    const second = applyToolbarOverride(first, 'save', { disabled: true });
    expect(second.get('save')).toEqual({ visible: false, disabled: true });
    expect(first.get('save')).toEqual({ visible: false }); // immutable
  });
});

describe('toolbarDataDescriptors', () => {
  const items = [
    { key: 'save', text: 'Save' },
    { key: 'undo', text: 'Undo', visible: false },
    { text: 'Redo' },
  ];

  it('drops items hidden by visible: false and re-indexes the rest', () => {
    const descriptors = toolbarDataDescriptors(items);
    expect(descriptors.map((d) => d.id)).toEqual(['save', 'i2']);
    expect(descriptors.map((d) => d.index)).toEqual([0, 1]);
  });

  it('fills the vocabulary defaults', () => {
    expect(toolbarDataDescriptors([{}])[0]).toMatchObject({
      type: 'button',
      location: 'before',
      locateInMenu: 'auto',
      severity: 'default',
      disabled: false,
    });
  });

  it('lets an imperative override win over the item’s own flags', () => {
    const overrides = new Map([
      ['save', { disabled: true }],
      ['i2', { visible: false }],
    ]);
    const descriptors = toolbarDataDescriptors(items, overrides);
    expect(descriptors.map((d) => d.id)).toEqual(['save']);
    expect(descriptors[0].disabled).toBe(true);
  });

  it('can show an item the data hid — hideItem/showItem are symmetrical', () => {
    const descriptors = toolbarDataDescriptors(
      items,
      new Map([['undo', { visible: true }]]),
    );
    expect(descriptors.map((d) => d.id)).toEqual(['save', 'undo', 'i2']);
  });
});

describe('ordering', () => {
  it('stamps the final index onto the merged list', () => {
    expect(
      withToolbarIndexes([{ id: 'a' }, { id: 'b' }]).map((d) => d.index),
    ).toEqual([0, 1]);
  });

  it('lays the sections out before → center → after, stable within each', () => {
    const ordered = orderToolbarDescriptors([
      { id: 'a', location: 'after' as const },
      { id: 'b', location: 'before' as const },
      { id: 'c', location: 'center' as const },
      { id: 'd', location: 'before' as const },
    ]);
    expect(ordered.map((d) => d.id)).toEqual(['b', 'd', 'c', 'a']);
  });
});

describe('fitToolbarDescriptors', () => {
  const ordered = [
    { id: 'a', locateInMenu: 'auto' as const, overflowPriority: undefined },
    { id: 'b', locateInMenu: 'auto' as const, overflowPriority: undefined },
    { id: 'c', locateInMenu: 'auto' as const, overflowPriority: undefined },
  ];
  const sizes = new Map([
    ['a', 100],
    ['b', 100],
    ['c', 100],
  ]);

  it('only collapses in the menu and extended modes', () => {
    expect(toolbarCollapses('menu')).toBe(true);
    expect(toolbarCollapses('extended')).toBe(true);
    expect(toolbarCollapses('scroll')).toBe(false);
    expect(toolbarCollapses('wrap')).toBe(false);
  });

  it('keeps everything inline in a non-collapsing mode, however narrow', () => {
    const result = fitToolbarDescriptors({
      ordered,
      overflow: 'scroll',
      sizes,
      containerSize: 10,
      menuButtonSize: 32,
      gap: 4,
    });
    expect(result.inline).toEqual([0, 1, 2]);
    expect(result.inMenu).toEqual([]);
    expect(result.menuVisible).toBe(false);
  });

  it('keeps everything inline when it fits', () => {
    const result = fitToolbarDescriptors({
      ordered,
      overflow: 'menu',
      sizes,
      containerSize: 1000,
      menuButtonSize: 32,
      gap: 4,
    });
    expect(result.inMenu).toEqual([]);
    expect(result.menuVisible).toBe(false);
  });

  it('collapses from the end once the bar runs out of room', () => {
    const result = fitToolbarDescriptors({
      ordered,
      overflow: 'menu',
      sizes,
      containerSize: 250,
      menuButtonSize: 32,
      gap: 4,
    });
    expect(result.menuVisible).toBe(true);
    expect(result.inMenu.length).toBeGreaterThan(0);
    expect([...result.inline, ...result.inMenu].sort()).toEqual([0, 1, 2]);
  });

  it('treats an unmeasured item as free, so it renders once and is measured next frame', () => {
    const result = fitToolbarDescriptors({
      ordered,
      overflow: 'menu',
      sizes: new Map(),
      // the same width that collapses the measured bar above
      containerSize: 250,
      menuButtonSize: 32,
      gap: 4,
    });
    expect(result.inline).toEqual([0, 1, 2]);
  });
});

describe('display decisions', () => {
  it('shows a label on the bar only in the bar-facing modes, and only with text', () => {
    const item = { text: 'Save' } as const;
    expect(toolbarTextVisible(item, 'always')).toBe(true);
    expect(toolbarTextVisible(item, 'onBar')).toBe(true);
    expect(toolbarTextVisible(item, 'inMenu')).toBe(false);
    expect(toolbarTextVisible(item, 'never')).toBe(false);
    expect(toolbarTextVisible({}, 'always')).toBe(false);
  });

  it('shows a label in the menu only in the menu-facing modes', () => {
    const item = { text: 'Save' } as const;
    expect(toolbarTextVisible(item, 'always', true)).toBe(true);
    expect(toolbarTextVisible(item, 'inMenu', true)).toBe(true);
    expect(toolbarTextVisible(item, 'onBar', true)).toBe(false);
  });

  it('lets the item override the toolbar-wide default', () => {
    expect(
      toolbarTextVisible({ text: 'Save', showText: 'never' }, 'always'),
    ).toBe(false);
    expect(toolbarIconVisible({ showIcon: 'always' }, 'never')).toBe(true);
  });

  it('keeps an icon when the command collapses into the menu', () => {
    // without the inMenu arm a command lost its icon the moment it collapsed
    expect(toolbarIconVisible({}, 'always', true)).toBe(true);
    expect(toolbarIconVisible({}, 'onBar', true)).toBe(false);
  });

  it('reads a bare width as pixels and a string as a CSS length', () => {
    expect(toolbarItemWidth(120)).toBe('120px');
    expect(toolbarItemWidth('12rem')).toBe('12rem');
    expect(toolbarItemWidth(undefined)).toBe(null);
  });
});

describe('toolbarMenuItems', () => {
  const defaults = {
    showText: 'always',
    showIcon: 'always',
    disabled: false,
  } as const;

  it('renders the collapsed commands as menu rows carrying their index', () => {
    const rows = toolbarMenuItems(
      [descriptor({ id: 'a', text: 'Save', icon: 'M0', index: 2 })],
      defaults,
    );
    expect(rows[0]).toMatchObject({ text: 'Save', value: 2, icon: 'M0' });
  });

  it('turns separators and spacers into menu separators', () => {
    const rows = toolbarMenuItems(
      [
        descriptor({ id: 'a', type: 'separator' }),
        descriptor({ id: 'b', type: 'spacer' }),
        descriptor({ id: 'c', type: 'button' }),
      ],
      defaults,
    );
    expect(rows.map((row) => row.separator)).toEqual([true, true, false]);
  });

  it('disables every row while the toolbar itself is disabled', () => {
    const rows = toolbarMenuItems([descriptor({ id: 'a' })], {
      ...defaults,
      disabled: true,
    });
    expect(rows[0].disabled).toBe(true);
  });

  it('carries the danger severity and the active checkmark', () => {
    const rows = toolbarMenuItems(
      [
        descriptor({ id: 'a', severity: 'danger', active: true }),
        descriptor({ id: 'b', severity: 'accent' }),
      ],
      defaults,
    );
    expect(rows[0]).toMatchObject({ severity: 'danger', checked: true });
    expect(rows[1].severity).toBeUndefined();
  });

  it('drops the text and icon the display modes hide', () => {
    const rows = toolbarMenuItems(
      [descriptor({ id: 'a', text: 'Save', icon: 'M0' })],
      { showText: 'onBar', showIcon: 'onBar', disabled: false },
    );
    expect(rows[0].text).toBe('');
    expect(rows[0].icon).toBeUndefined();
  });
});

describe('toolbarOverflowEvent', () => {
  it('reports the collapsed ids and their count', () => {
    expect(toolbarOverflowEvent([{ id: 'a' }, { id: 'b' }])).toEqual({
      keys: ['a', 'b'],
      count: 2,
    });
    expect(toolbarOverflowEvent([])).toEqual({ keys: [], count: 0 });
  });
});

describe('DOM helpers', () => {
  it('recognizes text-entry controls, whose own arrow keys must be left alone', () => {
    const input = document.createElement('input');
    expect(isToolbarTextEntry(input)).toBe(true);
    input.type = 'checkbox';
    expect(isToolbarTextEntry(input)).toBe(false);
    expect(isToolbarTextEntry(document.createElement('textarea'))).toBe(true);
    expect(isToolbarTextEntry(document.createElement('button'))).toBe(false);
    expect(isToolbarTextEntry(null)).toBe(false);
  });

  it('treats a contenteditable host as a text entry', () => {
    const div = document.createElement('div');
    Object.defineProperty(div, 'isContentEditable', { value: true });
    expect(isToolbarTextEntry(div)).toBe(true);
  });

  it('skips disabled stops however they are disabled', () => {
    const enabled = document.createElement('button');
    const disabled = document.createElement('button');
    disabled.disabled = true;
    const aria = document.createElement('a');
    aria.setAttribute('aria-disabled', 'true');
    expect(isToolbarStopDisabled(enabled)).toBe(false);
    expect(isToolbarStopDisabled(disabled)).toBe(true);
    expect(isToolbarStopDisabled(aria)).toBe(true);
    expect(isToolbarStopDisabled(undefined)).toBe(true);
  });
});

describe('readToolbarStyleMetrics', () => {
  const style = (values: Record<string, string>) =>
    values as unknown as CSSStyleDeclaration;

  it('sums the padding on the main axis and reads the matching gap', () => {
    const horizontal = readToolbarStyleMetrics(
      style({
        direction: 'ltr',
        paddingInlineStart: '8px',
        paddingInlineEnd: '12px',
        columnGap: '4px',
        rowGap: '9px',
      }),
      false,
    );
    expect(horizontal).toEqual({ rtl: false, padding: 20, gap: 4 });

    const vertical = readToolbarStyleMetrics(
      style({
        direction: 'rtl',
        paddingTop: '5px',
        paddingBottom: '5px',
        rowGap: '9px',
      }),
      true,
    );
    expect(vertical).toEqual({ rtl: true, padding: 10, gap: 9 });
  });

  it('falls back to the physical padding where the logical one is absent', () => {
    expect(
      readToolbarStyleMetrics(
        style({
          direction: 'ltr',
          paddingInlineStart: '',
          paddingInlineEnd: '',
          paddingLeft: '6px',
          paddingRight: '6px',
          columnGap: '0px',
        }),
        false,
      ).padding,
    ).toBe(12);
  });

  it('reports a non-numeric gap as null, and unreadable padding as 0', () => {
    const metrics = readToolbarStyleMetrics(
      style({ direction: 'ltr', columnGap: 'normal' }),
      false,
    );
    expect(metrics.gap).toBe(null);
    expect(metrics.padding).toBe(0);
  });
});

describe('toolbarScrollState', () => {
  it('reports no overflow when the content fits', () => {
    expect(
      toolbarScrollState({ viewport: 500, total: 500, offset: 0 }),
    ).toEqual({
      hasOverflow: false,
      canScrollBack: false,
      canScrollForward: false,
    });
  });

  it('lights the forward button at the start and the back button at the end', () => {
    expect(
      toolbarScrollState({ viewport: 500, total: 900, offset: 0 }),
    ).toMatchObject({ canScrollBack: false, canScrollForward: true });
    expect(
      toolbarScrollState({ viewport: 500, total: 900, offset: 400 }),
    ).toMatchObject({ canScrollBack: true, canScrollForward: false });
    expect(
      toolbarScrollState({ viewport: 500, total: 900, offset: 200 }),
    ).toMatchObject({ canScrollBack: true, canScrollForward: true });
  });

  it('tolerates the sub-pixel rounding browsers report', () => {
    expect(
      toolbarScrollState({ viewport: 500, total: 500.5, offset: 0.5 }),
    ).toEqual({
      hasOverflow: false,
      canScrollBack: false,
      canScrollForward: false,
    });
  });
});

describe('loadToolbarItems', () => {
  it('loads once, re-loads on change and stops applying after teardown', async () => {
    let notify: () => void = () => undefined;
    const apply = vi.fn();
    const unsubscribe = vi.fn();
    const source = {
      load: () => Promise.resolve({ data: [{ text: 'Save' }] }),
      changes: {
        subscribe: (listener: () => void) => {
          notify = listener;
          return { unsubscribe };
        },
      },
    };
    const stop = loadToolbarItems(source, apply);
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).toHaveBeenCalledTimes(1);

    notify();
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).toHaveBeenCalledTimes(2);

    stop();
    expect(unsubscribe).toHaveBeenCalled();
    notify();
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
