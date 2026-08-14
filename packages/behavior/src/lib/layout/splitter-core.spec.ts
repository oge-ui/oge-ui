import { describe, expect, it, vi } from 'vitest';
import {
  OGE_DEFAULT_SPLITTER_MESSAGES,
  OGE_SPLITTER_FULL_TRAVEL,
  canResizeSplitterAt,
  isSplitterPaneCollapsed,
  isSplitterPaneCollapsible,
  loadSplitterPanes,
  parseSplitterSize,
  resolveOgeSplitterConfig,
  resolveSplitterIndex,
  roundSplitterValue,
  sameSplitterSizes,
  splitterBoundInTrackUnit,
  splitterBounds,
  splitterCollapseSideInDirection,
  splitterDragDelta,
  splitterFlexiblePx,
  splitterGridTemplate,
  splitterGripPath,
  splitterGripTitle,
  splitterKeyAction,
  splitterKeyShortcuts,
  splitterPaneDescriptor,
  splitterPaneOf,
  splitterSeparatorLabel,
  splitterSizesWithRestored,
  splitterTrackCss,
  splitterTracks,
  splitterTracksToSizes,
  startSplitterDrag,
  type OgeSplitterDescriptorCore,
  type OgeSplitterView,
} from './splitter-core';

const pane = (
  spec: Partial<OgeSplitterDescriptorCore> & { id: string },
): OgeSplitterDescriptorCore => ({
  collapsible: false,
  resizable: true,
  scrollable: true,
  disabled: false,
  initiallyCollapsed: false,
  ...spec,
});

const view = (overrides: Partial<OgeSplitterView> = {}): OgeSplitterView => ({
  descriptors: [pane({ id: 'a' }), pane({ id: 'b' })],
  collapsed: new Set<string>(),
  disabled: false,
  resizable: true,
  horizontal: true,
  ...overrides,
});

describe('resolveOgeSplitterConfig', () => {
  it('defaults, and merges messages key by key', () => {
    expect(resolveOgeSplitterConfig(undefined).messages).toEqual(
      OGE_DEFAULT_SPLITTER_MESSAGES,
    );
    const config = resolveOgeSplitterConfig({
      step: 5,
      messages: { collapsed: 'kapalı' },
    });
    expect(config.step).toBe(5);
    expect(config.messages.collapsed).toBe('kapalı');
    expect(config.messages.noData).toBe(OGE_DEFAULT_SPLITTER_MESSAGES.noData);
  });
});

describe('splitterPaneDescriptor', () => {
  it('keys off the pane key, falling back to a positional auto id', () => {
    expect(splitterPaneDescriptor({ key: 'left' }, 1).id).toBe('left');
    expect(splitterPaneDescriptor({}, 1).id).toBe('i1');
  });

  it('defaults a pane to resizable and scrollable, not collapsible', () => {
    expect(splitterPaneDescriptor({}, 0)).toMatchObject({
      resizable: true,
      scrollable: true,
      collapsible: false,
      disabled: false,
      initiallyCollapsed: false,
    });
  });
});

describe('resolveSplitterIndex', () => {
  const descriptors = [pane({ id: 'a', key: 'a' }), pane({ id: 'i1' })];

  it('resolves an index, a key and an auto id', () => {
    expect(resolveSplitterIndex(descriptors, 1)).toBe(1);
    expect(resolveSplitterIndex(descriptors, 'a')).toBe(0);
    // unlike the tabs family, panes are addressable by their auto id too
    expect(resolveSplitterIndex(descriptors, 'i1')).toBe(1);
  });

  it('reports -1 for anything out of range or unknown', () => {
    expect(resolveSplitterIndex(descriptors, 9)).toBe(-1);
    expect(resolveSplitterIndex(descriptors, 'zzz')).toBe(-1);
  });
});

describe('parseSplitterSize', () => {
  it('reads a bare number as a share', () => {
    expect(parseSplitterSize(30)).toEqual({ kind: 'share', value: 30 });
  });

  it('reads a percentage as a share and px as a pinned track', () => {
    expect(parseSplitterSize('30%')).toEqual({ kind: 'share', value: 30 });
    expect(parseSplitterSize('240px')).toEqual({ kind: 'fixed', value: 240 });
    expect(parseSplitterSize(' 12.5% ')).toEqual({
      kind: 'share',
      value: 12.5,
    });
  });

  it('ignores an absent size', () => {
    expect(parseSplitterSize(undefined)).toBeUndefined();
  });

  it('warns and ignores a unit the splitter cannot lay out', () => {
    const warn = vi.fn();
    expect(parseSplitterSize('20rem', warn)).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    expect(parseSplitterSize(Number.NaN)).toBeUndefined();
  });
});

describe('size helpers', () => {
  it('rounds to the two decimals both layers render', () => {
    expect(roundSplitterValue(33.33333)).toBe(33.33);
    expect(roundSplitterValue(50)).toBe(50);
  });

  it('publishes pinned tracks with their px unit and shares bare', () => {
    expect(
      splitterTracksToSizes([
        { kind: 'fixed', value: 240.005 },
        { kind: 'share', value: 66.666 },
      ]),
    ).toEqual(['240.01px', 66.67]);
  });

  it('compares size arrays element by element', () => {
    expect(sameSplitterSizes([30, '240px'], [30, '240px'])).toBe(true);
    expect(sameSplitterSizes([30], [30, 70])).toBe(false);
    expect(sameSplitterSizes([30, 70], [70, 30])).toBe(false);
  });

  it('converts a bound into the unit of its own track', () => {
    const share = { kind: 'share' as const, value: 50 };
    const fixed = { kind: 'fixed' as const, value: 200 };
    // same unit — passed through
    expect(splitterBoundInTrackUnit('20%', share, 400)).toBe(20);
    expect(splitterBoundInTrackUnit('100px', fixed, 400)).toBe(100);
    // px bound on a share track → share points of the flexible space
    expect(splitterBoundInTrackUnit('100px', share, 400)).toBe(25);
    // share bound on a pinned track → pixels
    expect(splitterBoundInTrackUnit('25%', fixed, 400)).toBe(100);
  });

  it('gives up on a conversion with no measured layout to convert against', () => {
    expect(
      splitterBoundInTrackUnit('100px', { kind: 'share', value: 50 }, 0),
    ).toBeUndefined();
    expect(
      splitterBoundInTrackUnit(undefined, { kind: 'share', value: 50 }, 400),
    ).toBeUndefined();
  });
});

describe('splitterTracks', () => {
  const descriptors = [
    pane({ id: 'a', size: 25 }),
    pane({ id: 'b', size: 75 }),
  ];

  it('normalizes the declared shares to 100', () => {
    expect(splitterTracks(descriptors, [], new Set())).toEqual([
      { kind: 'share', value: 25 },
      { kind: 'share', value: 75 },
    ]);
    expect(
      splitterTracks(
        [pane({ id: 'a', size: 1 }), pane({ id: 'b', size: 1 })],
        [],
        new Set(),
      ),
    ).toEqual([
      { kind: 'share', value: 50 },
      { kind: 'share', value: 50 },
    ]);
  });

  it('prefers the working sizes over the declared ones', () => {
    expect(splitterTracks(descriptors, [40, 60], new Set())).toEqual([
      { kind: 'share', value: 40 },
      { kind: 'share', value: 60 },
    ]);
  });

  it('pins a collapsed pane to its collapsed size, defaulting to zero', () => {
    const collapsible = [
      pane({ id: 'a', size: 25, collapsedSize: '8px' }),
      pane({ id: 'b', size: 75 }),
    ];
    expect(splitterTracks(collapsible, [], new Set(['a']))[0]).toEqual({
      kind: 'fixed',
      value: 8,
    });
    expect(splitterTracks(descriptors, [], new Set(['a']))[0]).toEqual({
      kind: 'fixed',
      value: 0,
    });
  });
});

describe('grid template', () => {
  it('floors a share track at its pixel minSize', () => {
    expect(
      splitterTrackCss(
        { kind: 'share', value: 40 },
        pane({ id: 'a', minSize: '120px' }),
      ),
    ).toBe('minmax(120px, 40fr)');
    expect(splitterTrackCss({ kind: 'share', value: 40 }, undefined)).toBe(
      'minmax(0, 40fr)',
    );
    expect(splitterTrackCss({ kind: 'fixed', value: 240 }, undefined)).toBe(
      '240px',
    );
  });

  it('interleaves the separators between the pane tracks', () => {
    expect(
      splitterGridTemplate(
        [
          { kind: 'share', value: 30 },
          { kind: 'fixed', value: 240 },
        ],
        [pane({ id: 'a' }), pane({ id: 'b' })],
        6,
      ),
    ).toBe('minmax(0, 30fr) 6px 240px');
  });

  it('renders nothing without panes', () => {
    expect(splitterGridTemplate([], [], 6)).toBe(null);
  });
});

describe('splitterFlexiblePx', () => {
  const tracks = [
    { kind: 'share' as const, value: 50 },
    { kind: 'fixed' as const, value: 200 },
  ];

  it('subtracts the pinned panes and the separators from the measured size', () => {
    expect(splitterFlexiblePx(1000, tracks, 6)).toBe(794);
  });

  it('falls back to a unit-free 100 for an all-share splitter with no layout', () => {
    // SSR / display:none / jsdom — the shares are the same either way
    expect(
      splitterFlexiblePx(
        0,
        [
          { kind: 'share', value: 50 },
          { kind: 'share', value: 50 },
        ],
        6,
      ),
    ).toBe(100);
  });

  it('reports 0 when a mixed splitter has no real pixels to divide', () => {
    expect(splitterFlexiblePx(0, tracks, 6)).toBe(0);
    expect(splitterFlexiblePx(100, tracks, 6)).toBe(0); // fixed pane overflows
  });
});

describe('splitterBounds', () => {
  it('reports each pane’s bounds in its own unit and whether it may resize', () => {
    const descriptors = [
      pane({ id: 'a', minSize: '100px', maxSize: '300px' }),
      pane({ id: 'b', resizable: false }),
      pane({ id: 'c', collapsible: true }),
    ];
    const tracks = [
      { kind: 'share' as const, value: 40 },
      { kind: 'share' as const, value: 30 },
      { kind: 'share' as const, value: 30 },
    ];
    const bounds = splitterBounds(descriptors, tracks, 400, new Set(['c']));
    expect(bounds[0]).toEqual({ min: 25, max: 75, resizable: true });
    expect(bounds[1].resizable).toBe(false); // resizable: false
    expect(bounds[2].resizable).toBe(false); // collapsed
  });
});

describe('splitterSizesWithRestored', () => {
  it('scales the other panes back down so the shares still sum to 100', () => {
    // 'a' collapsed at 25 and the others grew to 40/60
    const restored = splitterSizesWithRestored([0, 40, 60], 0, 25);
    expect(restored[0]).toBe(25);
    expect((restored[1] as number) + (restored[2] as number)).toBeCloseTo(
      75,
      5,
    );
    expect(restored[1]).toBeCloseTo(30, 5);
  });

  it('leaves pinned panes alone while rescaling the shares', () => {
    const restored = splitterSizesWithRestored(['240px', 100], 1, 40);
    expect(restored[0]).toBe('240px');
    expect(restored[1]).toBe(40);
  });

  it('restores a pinned pane verbatim — there is nothing to rescale', () => {
    expect(splitterSizesWithRestored([0, 100], 0, '240px')).toEqual([
      '240px',
      100,
    ]);
  });
});

describe('loadSplitterPanes', () => {
  it('loads once, re-loads on change and stops applying after teardown', async () => {
    let notify: () => void = () => undefined;
    const applied: unknown[][] = [];
    let batch = 1;
    const source = {
      load: () => Promise.resolve({ data: [{ key: `p${batch++}` }] }),
      changes: {
        subscribe: (listener: () => void) => {
          notify = listener;
          return { unsubscribe: vi.fn() };
        },
      },
    };
    const stop = loadSplitterPanes(source, (panes) => applied.push([...panes]));
    await Promise.resolve();
    await Promise.resolve();
    expect(applied).toHaveLength(1);

    notify();
    await Promise.resolve();
    await Promise.resolve();
    expect(applied).toHaveLength(2);

    stop();
    notify();
    await Promise.resolve();
    await Promise.resolve();
    expect(applied).toHaveLength(2); // a late load never lands after teardown
  });

  it('works without a changes stream', async () => {
    const apply = vi.fn();
    const stop = loadSplitterPanes(
      { load: () => Promise.resolve({ data: [] }) },
      apply,
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(apply).toHaveBeenCalledOnce();
    expect(() => stop()).not.toThrow();
  });
});

describe('separator decisions', () => {
  it('maps a grip side to the pane it acts on', () => {
    expect(splitterPaneOf(0, 'start')).toBe(0);
    expect(splitterPaneOf(0, 'end')).toBe(1);
  });

  it('reports collapsibility per side, honouring both disabled flags', () => {
    const v = view({
      descriptors: [
        pane({ id: 'a', collapsible: true }),
        pane({ id: 'b', collapsible: true, disabled: true }),
      ],
    });
    expect(isSplitterPaneCollapsible(v, 0, 'start')).toBe(true);
    expect(isSplitterPaneCollapsible(v, 0, 'end')).toBe(false);
    expect(
      isSplitterPaneCollapsible({ ...v, disabled: true }, 0, 'start'),
    ).toBe(false);
  });

  it('reports the collapsed state per side', () => {
    const v = view({ collapsed: new Set(['b']) });
    expect(isSplitterPaneCollapsed(v, 0, 'start')).toBe(false);
    expect(isSplitterPaneCollapsed(v, 0, 'end')).toBe(true);
  });

  it('allows a drag only when both neighbours allow it', () => {
    expect(canResizeSplitterAt(view(), 0)).toBe(true);
    expect(canResizeSplitterAt(view({ resizable: false }), 0)).toBe(false);
    expect(canResizeSplitterAt(view({ disabled: true }), 0)).toBe(false);
    expect(canResizeSplitterAt(view({ collapsed: new Set(['b']) }), 0)).toBe(
      false,
    );
    expect(
      canResizeSplitterAt(
        view({
          descriptors: [pane({ id: 'a' }), pane({ id: 'b', disabled: true })],
        }),
        0,
      ),
    ).toBe(false);
    expect(canResizeSplitterAt(view(), 1)).toBe(false); // no pane after it
  });

  it('advertises only the shortcuts the separator actually has', () => {
    expect(splitterKeyShortcuts(view(), 0)).toBe(null);
    const collapsible = view({
      descriptors: [pane({ id: 'a', collapsible: true }), pane({ id: 'b' })],
    });
    expect(splitterKeyShortcuts(collapsible, 0)).toBe(
      'Enter Control+ArrowLeft Control+ArrowRight',
    );
    // only the following pane collapses → no Enter, but the arrows still work
    const endOnly = view({
      descriptors: [pane({ id: 'a' }), pane({ id: 'b', collapsible: true })],
      horizontal: false,
    });
    expect(splitterKeyShortcuts(endOnly, 0)).toBe(
      'Control+ArrowUp Control+ArrowDown',
    );
  });

  it('names the separator by the panes it sits between', () => {
    expect(
      splitterSeparatorLabel(view(), 0, OGE_DEFAULT_SPLITTER_MESSAGES),
    ).toBe('Resize panes 1 and 2');
  });

  it('announces a collapsed primary pane in the separator name', () => {
    expect(
      splitterSeparatorLabel(
        view({ collapsed: new Set(['a']) }),
        0,
        OGE_DEFAULT_SPLITTER_MESSAGES,
      ),
    ).toBe('Resize panes 1 and 2 (collapsed)');
  });

  it('flips the grip title once its pane is collapsed', () => {
    expect(
      splitterGripTitle(view(), 0, 'start', OGE_DEFAULT_SPLITTER_MESSAGES),
    ).toBe('Collapse pane');
    expect(
      splitterGripTitle(
        view({ collapsed: new Set(['a']) }),
        0,
        'start',
        OGE_DEFAULT_SPLITTER_MESSAGES,
      ),
    ).toBe('Expand pane');
  });

  it('points the chevron the way its pane would move', () => {
    const collapsed = view({ collapsed: new Set(['a']) });
    expect(splitterGripPath(view(), 0, 'start')).toBe('M15 6l-6 6 6 6');
    expect(splitterGripPath(collapsed, 0, 'start')).toBe('M9 6l6 6-6 6');
    expect(splitterGripPath(view(), 0, 'end')).toBe('M9 6l6 6-6 6');
    // the vertical axis uses the up/down chevrons
    expect(splitterGripPath(view({ horizontal: false }), 0, 'start')).toBe(
      'M6 15l6-6 6 6',
    );
  });

  it('collapses the pane the arrow points at, or undoes the opposite collapse', () => {
    const both = view({
      descriptors: [
        pane({ id: 'a', collapsible: true }),
        pane({ id: 'b', collapsible: true }),
      ],
    });
    expect(splitterCollapseSideInDirection(both, 0, 1)).toBe('end');
    expect(splitterCollapseSideInDirection(both, 0, -1)).toBe('start');
    // an already-collapsed pane on the far side is expanded first
    const startCollapsed = { ...both, collapsed: new Set(['a']) };
    expect(splitterCollapseSideInDirection(startCollapsed, 0, 1)).toBe('start');
    expect(splitterCollapseSideInDirection(view(), 0, 1)).toBe(null);
  });
});

describe('splitterKeyAction', () => {
  const collapsible = view({
    descriptors: [pane({ id: 'a', collapsible: true }), pane({ id: 'b' })],
  });

  it('toggles the primary pane on Enter, when it can collapse at all', () => {
    expect(splitterKeyAction(collapsible, 0, { key: 'Enter' }, 10)).toEqual({
      kind: 'toggle',
      side: 'start',
    });
    expect(splitterKeyAction(view(), 0, { key: 'Enter' }, 10)).toBe(null);
  });

  it('drives the separator to its stops on Home and End', () => {
    expect(splitterKeyAction(view(), 0, { key: 'End' }, 10)).toEqual({
      kind: 'nudge',
      deltaShare: OGE_SPLITTER_FULL_TRAVEL,
    });
    expect(splitterKeyAction(view(), 0, { key: 'Home' }, 10)).toEqual({
      kind: 'nudge',
      deltaShare: -OGE_SPLITTER_FULL_TRAVEL,
    });
  });

  it('nudges by the step along the splitter’s own axis only', () => {
    expect(splitterKeyAction(view(), 0, { key: 'ArrowRight' }, 10)).toEqual({
      kind: 'nudge',
      deltaShare: 10,
    });
    expect(splitterKeyAction(view(), 0, { key: 'ArrowLeft' }, 10)).toEqual({
      kind: 'nudge',
      deltaShare: -10,
    });
    // the cross-axis arrows are not part of the pattern
    expect(splitterKeyAction(view(), 0, { key: 'ArrowDown' }, 10)).toBe(null);
    const vertical = view({ horizontal: false });
    expect(splitterKeyAction(vertical, 0, { key: 'ArrowDown' }, 10)).toEqual({
      kind: 'nudge',
      deltaShare: 10,
    });
    expect(splitterKeyAction(vertical, 0, { key: 'ArrowRight' }, 10)).toBe(
      null,
    );
  });

  it('mirrors the horizontal arrows under RTL, but not the vertical ones', () => {
    expect(
      splitterKeyAction(view(), 0, { key: 'ArrowRight' }, 10, true),
    ).toEqual({ kind: 'nudge', deltaShare: -10 });
    expect(
      splitterKeyAction(
        view({ horizontal: false }),
        0,
        { key: 'ArrowDown' },
        10,
        true,
      ),
    ).toEqual({ kind: 'nudge', deltaShare: 10 });
  });

  it('turns Ctrl/Cmd+Arrow into a collapse toggle', () => {
    expect(
      splitterKeyAction(
        collapsible,
        0,
        { key: 'ArrowLeft', ctrlKey: true },
        10,
      ),
    ).toEqual({ kind: 'toggle', side: 'start' });
    expect(
      splitterKeyAction(
        collapsible,
        0,
        { key: 'ArrowLeft', metaKey: true },
        10,
      ),
    ).toEqual({ kind: 'toggle', side: 'start' });
    // nothing to collapse on that side → the event is left alone
    expect(
      splitterKeyAction(
        collapsible,
        0,
        { key: 'ArrowRight', ctrlKey: true },
        10,
      ),
    ).toBe(null);
  });

  it('refuses to nudge a separator that cannot resize', () => {
    const pinned = view({ resizable: false });
    expect(splitterKeyAction(pinned, 0, { key: 'ArrowRight' }, 10)).toBe(null);
    expect(splitterKeyAction(pinned, 0, { key: 'End' }, 10)).toBe(null);
  });

  it('ignores keys outside the pattern', () => {
    expect(splitterKeyAction(view(), 0, { key: 'a' }, 10)).toBe(null);
    expect(splitterKeyAction(view(), 0, { key: 'Escape' }, 10)).toBe(null);
  });
});

describe('splitterDragDelta', () => {
  it('measures along the axis, mirrored under horizontal RTL', () => {
    const point = { clientX: 150, clientY: 220 };
    expect(splitterDragDelta(point, 100, { vertical: false, rtl: false })).toBe(
      50,
    );
    expect(splitterDragDelta(point, 100, { vertical: false, rtl: true })).toBe(
      -50,
    );
    expect(splitterDragDelta(point, 200, { vertical: true, rtl: true })).toBe(
      20,
    );
  });
});

describe('startSplitterDrag', () => {
  /** jsdom has no PointerEvent; the gesture only reads target/pointerId. */
  const pointer = (type: string): PointerEvent => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
    }) as unknown as PointerEvent;
    Object.defineProperty(event, 'pointerId', { value: 1 });
    return event;
  };

  function gesture() {
    const move = vi.fn();
    const finish = vi.fn();
    const detach = startSplitterDrag(pointer('pointerdown'), { move, finish });
    return { move, finish, detach };
  }

  it('does not apply anything before the first move', () => {
    const g = gesture();
    expect(g.move).not.toHaveBeenCalled();
    g.detach();
  });

  it('tracks moves on the document', () => {
    const g = gesture();
    document.dispatchEvent(pointer('pointermove'));
    document.dispatchEvent(pointer('pointermove'));
    expect(g.move).toHaveBeenCalledTimes(2);
    g.detach();
  });

  it('finishes uncancelled on pointerup and detaches', () => {
    const g = gesture();
    document.dispatchEvent(pointer('pointerup'));
    expect(g.finish).toHaveBeenCalledWith(expect.anything(), false);
    document.dispatchEvent(pointer('pointermove'));
    expect(g.move).not.toHaveBeenCalled();
  });

  it('cancels on pointercancel and on Escape, carrying the event through', () => {
    for (const cancel of [
      () => document.dispatchEvent(pointer('pointercancel')),
      () =>
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
        ),
    ]) {
      const g = gesture();
      cancel();
      expect(g.finish).toHaveBeenCalledWith(expect.anything(), true);
    }
  });

  it('cancels when the window loses focus, with no event to report', () => {
    // alt-tab or a release outside the document never delivers a pointerup
    const g = gesture();
    window.dispatchEvent(new Event('blur'));
    expect(g.finish).toHaveBeenCalledWith(undefined, true);
  });

  it('swallows the cancelling Escape so no overlay above also closes', () => {
    const g = gesture();
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    g.detach();
  });

  it('detaches on teardown without reporting a finish', () => {
    const g = gesture();
    g.detach();
    document.dispatchEvent(pointer('pointermove'));
    document.dispatchEvent(pointer('pointerup'));
    expect(g.move).not.toHaveBeenCalled();
    expect(g.finish).not.toHaveBeenCalled();
  });
});
