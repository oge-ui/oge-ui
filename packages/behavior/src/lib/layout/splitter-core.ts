/**
 * The framework-free half of the splitter (ADR 0001): the vocabulary, the
 * event payloads, the message catalog, the normalized pane descriptor, and
 * every decision the WAI-ARIA APG **window splitter** pattern needs — track
 * building, bounds, separator ranges, the keyboard map, the collapse
 * direction rule and the pointer-drag harness.
 *
 * Both render layers feed these the same inputs and get the same answers, so
 * the Angular `<oge-splitter>` and the React `<OgeSplitter>` cannot drift.
 */

// The pure size arithmetic lives in `@oge-ui/core` (`split-sizes`); re-exported
// here so the React render layer reaches it through its one behavior
// dependency, exactly like the slider family's scale math.
export {
  normalizeSplitTracks,
  resizeSplitAt,
  splitSeparatorRange,
  splitTrackPx,
  type OgeSplitBounds,
  type OgeSplitSeparatorRange,
  type OgeSplitTrack,
} from '@oge-ui/core';

import {
  normalizeSplitTracks,
  splitSeparatorRange,
  type OgeSplitBounds,
  type OgeSplitTrack,
} from '@oge-ui/core';

// --- vocabulary -------------------------------------------------------------

/** Axis the panes are laid out along. */
export type OgeSplitterOrientation = 'horizontal' | 'vertical';

/**
 * Which neighbour a separator's collapse grip acts on: `'start'` is the pane
 * before it (the APG primary pane), `'end'` the one after.
 */
export type OgeSplitterGripSide = 'start' | 'end';

/**
 * A pane size, minimum, maximum or collapsed size.
 *
 * A **number** is a share of the space the flexible panes divide between them —
 * a ratio, not a percentage, so `[30, 30]` lays out exactly like `[50, 50]`. A
 * **`'<n>%'` string** means the same thing. A **`'<n>px'` string** pins the pane
 * to that width (or height) and takes it out of the share pool. Any other
 * string is ignored with a dev-mode warning.
 */
export type OgeSplitterSize = number | string;

/** Data-driven counterpart of a declarative pane. */
export interface OgeSplitterPaneData {
  /** Stable identity used by DOM ids and the collapse API. */
  key?: string;
  /** Initial size — a share number, `'40%'` or `'240px'`. */
  size?: OgeSplitterSize;
  /** Smallest size a resize may leave this pane at. */
  minSize?: OgeSplitterSize;
  /** Largest size a resize may grow this pane to. */
  maxSize?: OgeSplitterSize;
  /** Allows the pane to be collapsed from its separator (Enter or the grip). */
  collapsible?: boolean;
  /** Initial collapsed state. */
  collapsed?: boolean;
  /** Size the pane keeps while collapsed. Defaults to `0`. */
  collapsedSize?: OgeSplitterSize;
  /** `false` pins the pane — its separators cannot be dragged. */
  resizable?: boolean;
  /** `false` clips overflowing content instead of scrolling it. */
  scrollable?: boolean;
  /** Disabled panes cannot be collapsed and their separators are inert. */
  disabled?: boolean;
  /** `false` removes the pane entirely. */
  visible?: boolean;
  /** Plain-text body, rendered when the pane has no content template. */
  text?: string;
  /** Extra class on the pane element. */
  cssClass?: string;
  /**
   * Extra attributes on the pane element (`data-*`, `title`, …). Keys removed
   * from the bag are removed from the DOM, so clearing it clears the element.
   */
  htmlAttributes?: Readonly<Record<string, string>>;
  /** Nested splitter inside this pane. */
  panes?: readonly OgeSplitterPaneData[];
  /** Axis of the nested splitter — defaults to the opposite of the parent's. */
  orientation?: OgeSplitterOrientation;
}

// --- event payloads ---------------------------------------------------------

/** Emitted when a resize gesture starts. */
export interface OgeSplitterResizeStartEvent {
  /** Index of the separator being dragged — it sits after pane `separatorIndex`. */
  readonly separatorIndex: number;
  /** Pane sizes at the moment the gesture started. */
  readonly sizes: readonly OgeSplitterSize[];
  /** The originating event, absent for a keyboard resize. */
  readonly event?: Event;
}

/** Emitted continuously during a resize, and once more when it ends. */
export interface OgeSplitterResizeEvent {
  readonly separatorIndex: number;
  /** Current pane sizes. */
  readonly sizes: readonly OgeSplitterSize[];
  /** Sizes at the start of the gesture. */
  readonly previousSizes: readonly OgeSplitterSize[];
  readonly event?: Event;
}

/** Cancelable pre-event of a pane collapsing or expanding. */
export interface OgeSplitterPaneCollapsingEvent {
  readonly index: number;
  readonly key?: string;
  /** The source `panes` entry — `undefined` for a declarative pane. */
  readonly item?: OgeSplitterPaneData;
  readonly event?: Event;
  /** Set to `true` to block the change. */
  cancel: boolean;
}

/** Emitted after a pane collapsed or expanded. */
export interface OgeSplitterPaneCollapsedEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeSplitterPaneData;
  readonly event?: Event;
}

/** A pane was held (long press) or right-clicked. */
export interface OgeSplitterPaneHoldEvent {
  index: number;
  key?: string;
  item?: OgeSplitterPaneData;
  event: Event;
}

/** Emitted when a pane is clicked. */
export interface OgeSplitterPaneClickEvent {
  readonly index: number;
  readonly key?: string;
  readonly item?: OgeSplitterPaneData;
  readonly event: MouseEvent;
}

// --- config -----------------------------------------------------------------

/**
 * Every user-facing string in the splitter — override globally through the
 * layer's config provider or per component via `messages`.
 */
export interface OgeSplitterMessages {
  /**
   * Accessible name of a separator. `{{first}}` and `{{second}}` are replaced
   * with the 1-based indexes of the panes it sits between.
   */
  separator: string;
  /** Announced on a separator whose primary pane is collapsed. */
  collapsed: string;
  /** Title of the collapse grip on a collapsible pane's separator. */
  collapsePane: string;
  /** Title of the grip once the pane is collapsed. */
  expandPane: string;
  /** Shown in place of the panes when there are none to display. */
  noData: string;
}

export const OGE_DEFAULT_SPLITTER_MESSAGES: OgeSplitterMessages = {
  separator: 'Resize panes {{first}} and {{second}}',
  collapsed: 'collapsed',
  collapsePane: 'Collapse pane',
  expandPane: 'Expand pane',
  noData: 'No panes to display',
};

/** Application-wide defaults for the splitter. */
export interface OgeSplitterConfig {
  messages: OgeSplitterMessages;
  /** Default for the `separatorSize` input, in pixels. */
  separatorSize?: number;
  /** Default for the `step` input, in share points. */
  step?: number;
  /** Default for the `showCollapseGrips` input. */
  showCollapseGrips?: boolean;
}

export const OGE_DEFAULT_SPLITTER_CONFIG: OgeSplitterConfig = {
  messages: OGE_DEFAULT_SPLITTER_MESSAGES,
};

export type OgeSplitterConfigInput = Partial<
  Omit<OgeSplitterConfig, 'messages'>
> & {
  messages?: Partial<OgeSplitterMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeSplitterConfig(
  input: OgeSplitterConfigInput | undefined,
): OgeSplitterConfig {
  return {
    ...OGE_DEFAULT_SPLITTER_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_SPLITTER_MESSAGES, ...input?.messages },
  };
}

// --- descriptors ------------------------------------------------------------

/**
 * The render-layer-agnostic half of a normalized pane. Each layer extends it
 * with its own content slot (`TemplateRef` in Angular, `ReactNode` in React)
 * and its own back-reference to the declarative child.
 */
export interface OgeSplitterDescriptorCore {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly size?: OgeSplitterSize;
  readonly minSize?: OgeSplitterSize;
  readonly maxSize?: OgeSplitterSize;
  readonly collapsible: boolean;
  readonly collapsedSize?: OgeSplitterSize;
  readonly resizable: boolean;
  readonly scrollable: boolean;
  readonly disabled: boolean;
  readonly text?: string;
  readonly cssClass?: string;
  readonly htmlAttributes?: Readonly<Record<string, string>>;
  /** Nested splitter panes, rendered by a nested splitter. */
  readonly panes?: readonly OgeSplitterPaneData[];
  readonly orientation?: OgeSplitterOrientation;
  /** Initial collapsed state of a `panes`-mode pane. */
  readonly initiallyCollapsed: boolean;
  /** The source `panes` entry — `undefined` for declarative panes. */
  readonly item?: OgeSplitterPaneData;
}

/** Normalizes one `panes` entry into a descriptor core. */
export function splitterPaneDescriptor(
  item: OgeSplitterPaneData,
  index: number,
): OgeSplitterDescriptorCore {
  return {
    id: item.key ?? `i${index}`,
    key: item.key,
    size: item.size,
    minSize: item.minSize,
    maxSize: item.maxSize,
    collapsible: item.collapsible ?? false,
    collapsedSize: item.collapsedSize,
    resizable: item.resizable ?? true,
    scrollable: item.scrollable ?? true,
    disabled: item.disabled ?? false,
    text: item.text,
    cssClass: item.cssClass,
    htmlAttributes: item.htmlAttributes,
    panes: item.panes,
    orientation: item.orientation,
    initiallyCollapsed: item.collapsed ?? false,
    item,
  };
}

/** Resolves an index-or-key target against the rendered descriptors. */
export function resolveSplitterIndex(
  descriptors: readonly OgeSplitterDescriptorCore[],
  target: number | string,
): number {
  if (typeof target === 'number') {
    return target >= 0 && target < descriptors.length ? target : -1;
  }
  return descriptors.findIndex((d) => d.key === target || d.id === target);
}

// --- size parsing -----------------------------------------------------------

/** Parses a `size` input into a grid track. */
export function parseSplitterSize(
  value: OgeSplitterSize | undefined,
  warn?: (message: string) => void,
): OgeSplitTrack | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { kind: 'share', value } : undefined;
  }
  const text = value.trim();
  const percent = /^(-?\d*\.?\d+)%$/.exec(text);
  if (percent) return { kind: 'share', value: Number(percent[1]) };
  const pixels = /^(-?\d*\.?\d+)px$/.exec(text);
  if (pixels) return { kind: 'fixed', value: Number(pixels[1]) };
  warn?.(
    `size "${text}" is not a share number, a "<n>%" or a "<n>px" value — ignoring it.`,
  );
  return undefined;
}

/** Rounds a size to two decimals — the precision both layers render. */
export function roundSplitterValue(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Converts a bound into the unit its own track uses. */
export function splitterBoundInTrackUnit(
  value: OgeSplitterSize | undefined,
  track: OgeSplitTrack | undefined,
  flexiblePx: number,
): number | undefined {
  const parsed = parseSplitterSize(value);
  if (!parsed || !track) return undefined;
  if (parsed.kind === track.kind) return parsed.value;
  if (flexiblePx <= 0) return undefined;
  return parsed.kind === 'fixed'
    ? (parsed.value / flexiblePx) * 100
    : (parsed.value / 100) * flexiblePx;
}

/** The `sizes` array a track list publishes — `'<n>px'` for pinned panes. */
export function splitterTracksToSizes(
  tracks: readonly OgeSplitTrack[],
): OgeSplitterSize[] {
  return tracks.map((track) =>
    track.kind === 'fixed'
      ? `${roundSplitterValue(track.value)}px`
      : roundSplitterValue(track.value),
  );
}

/** Element-wise equality of two size arrays. */
export function sameSplitterSizes(
  a: readonly (OgeSplitterSize | undefined)[],
  b: readonly (OgeSplitterSize | undefined)[],
): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// --- layout -----------------------------------------------------------------

/**
 * Resolved grid tracks, one per pane: the working `sizes` (falling back to the
 * declared per-pane `size`), with collapsed panes pinned to their
 * `collapsedSize`, shares normalized to 100.
 */
export function splitterTracks(
  descriptors: readonly OgeSplitterDescriptorCore[],
  sizes: readonly (OgeSplitterSize | undefined)[],
  collapsed: ReadonlySet<string>,
  warn?: (message: string) => void,
): OgeSplitTrack[] {
  return normalizeSplitTracks(
    descriptors.map((d, index) => {
      if (collapsed.has(d.id)) {
        return (
          parseSplitterSize(d.collapsedSize) ?? {
            kind: 'fixed' as const,
            value: 0,
          }
        );
      }
      return (
        parseSplitterSize(sizes[index] ?? d.size, warn) ?? {
          kind: 'share' as const,
          value: 0,
        }
      );
    }),
  );
}

/** CSS of one track: pinned panes get pixels, share panes a floored `minmax()`. */
export function splitterTrackCss(
  track: OgeSplitTrack,
  descriptor: OgeSplitterDescriptorCore | undefined,
): string {
  if (track.kind === 'fixed') return `${roundSplitterValue(track.value)}px`;
  const min = parseSplitterSize(descriptor?.minSize);
  const floor =
    min?.kind === 'fixed' ? `${roundSplitterValue(min.value)}px` : '0';
  return `minmax(${floor}, ${roundSplitterValue(track.value)}fr)`;
}

/** `grid-template-columns` / `-rows` value: pane, separator, pane, … */
export function splitterGridTemplate(
  tracks: readonly OgeSplitTrack[],
  descriptors: readonly OgeSplitterDescriptorCore[],
  separatorSize: number,
): string | null {
  if (!tracks.length) return null;
  const separator = `${separatorSize}px`;
  const parts: string[] = [];
  tracks.forEach((track, index) => {
    if (index > 0) parts.push(separator);
    parts.push(splitterTrackCss(track, descriptors[index]));
  });
  return parts.join(' ');
}

/**
 * Pixels the share panes divide between them: `totalPx` (the measured host
 * size along the axis) minus the fixed panes and the separators.
 *
 * With no layout to measure — SSR, `display: none`, jsdom — a splitter made
 * only of share panes falls back to a unit-free scale of 100, which yields
 * exactly the same shares. A splitter mixing in fixed panes genuinely needs
 * real pixels, and reports 0 so the caller does nothing.
 */
export function splitterFlexiblePx(
  totalPx: number,
  tracks: readonly OgeSplitTrack[],
  separatorSize: number,
): number {
  if (totalPx > 0) {
    const fixed = tracks.reduce(
      (sum, track) => (track.kind === 'fixed' ? sum + track.value : sum),
      0,
    );
    const separators = Math.max(0, tracks.length - 1) * separatorSize;
    const flexible = totalPx - fixed - separators;
    if (flexible > 0) return flexible;
  }
  return tracks.length && tracks.every((track) => track.kind === 'share')
    ? 100
    : 0;
}

/** Resize bounds of every pane, in that pane's own unit. */
export function splitterBounds(
  descriptors: readonly OgeSplitterDescriptorCore[],
  tracks: readonly OgeSplitTrack[],
  flexiblePx: number,
  collapsed: ReadonlySet<string>,
): OgeSplitBounds[] {
  return descriptors.map((d, index) => ({
    min: splitterBoundInTrackUnit(d.minSize, tracks[index], flexiblePx),
    max: splitterBoundInTrackUnit(d.maxSize, tracks[index], flexiblePx),
    resizable: d.resizable && !d.disabled && !collapsed.has(d.id),
  }));
}

/** The APG value triple of every separator, rounded for the DOM. */
export function splitterSeparatorRanges(
  tracks: readonly OgeSplitTrack[],
  flexiblePx: number,
  bounds: readonly OgeSplitBounds[],
): { now: number; min: number; max: number }[] {
  return tracks.slice(0, -1).map((_, index) => {
    const range = splitSeparatorRange(tracks, index, flexiblePx, bounds);
    return {
      now: Math.round(range.now),
      min: Math.round(range.min),
      max: Math.round(range.max),
    };
  });
}

/**
 * Sizes with pane `index` put back at the share it had before it collapsed.
 *
 * The other panes grew to fill the gap while it was collapsed, so restoring
 * the remembered share alone would leave the shares summing to more than 100
 * and the pane would come back smaller than it left. They are scaled back
 * down proportionally, which also keeps any resizing done in the meantime.
 */
export function splitterSizesWithRestored(
  current: readonly OgeSplitterSize[],
  index: number,
  remembered: OgeSplitterSize,
): OgeSplitterSize[] {
  const sizes = [...current];
  sizes[index] = remembered;
  const restored = parseSplitterSize(remembered);
  if (restored?.kind !== 'share') return sizes;

  const otherSum = sizes.reduce<number>((sum, size, i) => {
    if (i === index) return sum;
    const track = parseSplitterSize(size);
    return track?.kind === 'share' ? sum + track.value : sum;
  }, 0);
  const target = 100 - restored.value;
  if (otherSum <= 0 || target <= 0) return sizes;

  const factor = target / otherSum;
  return sizes.map((size, i) => {
    if (i === index) return size;
    const track = parseSplitterSize(size);
    return track?.kind === 'share'
      ? roundSplitterValue(track.value * factor)
      : size;
  });
}

// --- remote panes -----------------------------------------------------------

/**
 * The structural half of `@oge-ui/core`'s `DataSource` a splitter uses — kept
 * local so the React render layer needs no dependency on the Angular-side
 * core package.
 */
export interface OgeSplitterDataSourceLike {
  load(options: object): Promise<{ readonly data: readonly unknown[] }>;
  readonly changes?: {
    subscribe(listener: () => void): { unsubscribe(): void };
  };
}

/**
 * Loads a remote pane list and keeps it in sync. `load({})` is enough — a
 * splitter has no paging, sorting or filtering to push down — and a source
 * that publishes `changes` re-loads. Returns the teardown: it stops applying
 * a late-arriving load and drops the subscription.
 */
export function loadSplitterPanes(
  source: OgeSplitterDataSourceLike,
  apply: (panes: readonly OgeSplitterPaneData[]) => void,
): () => void {
  let stale = false;
  const reload = (): void => {
    void source.load({}).then((result) => {
      // a splitter never groups, so the flat arm of the load result is the
      // only one that can come back here
      if (!stale) apply(result.data as readonly OgeSplitterPaneData[]);
    });
  };
  reload();
  const subscription = source.changes?.subscribe(() => reload());
  return () => {
    stale = true;
    subscription?.unsubscribe();
  };
}

// --- separator decisions ----------------------------------------------------

/**
 * Everything the separator decisions need to know about the splitter, in the
 * shape both render layers can produce from their own state.
 */
export interface OgeSplitterView {
  readonly descriptors: readonly OgeSplitterDescriptorCore[];
  readonly collapsed: ReadonlySet<string>;
  /** The whole splitter is disabled. */
  readonly disabled: boolean;
  /** `false` pins every separator. */
  readonly resizable: boolean;
  /** `true` for the `'horizontal'` orientation. */
  readonly horizontal: boolean;
}

/** The two grips a separator can carry, in DOM order. */
export const OGE_SPLITTER_GRIP_SIDES: readonly OgeSplitterGripSide[] = [
  'start',
  'end',
];

/** Index of the pane a separator's grip acts on. */
export function splitterPaneOf(
  separatorIndex: number,
  side: OgeSplitterGripSide,
): number {
  return side === 'start' ? separatorIndex : separatorIndex + 1;
}

/** Whether the pane on `side` of a separator may be collapsed from it. */
export function isSplitterPaneCollapsible(
  view: OgeSplitterView,
  separatorIndex: number,
  side: OgeSplitterGripSide = 'start',
): boolean {
  const d = view.descriptors[splitterPaneOf(separatorIndex, side)];
  return !!d && d.collapsible && !d.disabled && !view.disabled;
}

/** Whether the pane on `side` of a separator is currently collapsed. */
export function isSplitterPaneCollapsed(
  view: OgeSplitterView,
  separatorIndex: number,
  side: OgeSplitterGripSide,
): boolean {
  const d = view.descriptors[splitterPaneOf(separatorIndex, side)];
  return !!d && view.collapsed.has(d.id);
}

/** A separator may be dragged only when both of its neighbours allow it. */
export function canResizeSplitterAt(
  view: OgeSplitterView,
  separatorIndex: number,
): boolean {
  if (view.disabled || !view.resizable) return false;
  const a = view.descriptors[separatorIndex];
  const b = view.descriptors[separatorIndex + 1];
  if (!a || !b) return false;
  if (view.collapsed.has(a.id) || view.collapsed.has(b.id)) return false;
  return a.resizable && b.resizable && !a.disabled && !b.disabled;
}

/** `aria-keyshortcuts` of a separator — `null` when it has no collapse keys. */
export function splitterKeyShortcuts(
  view: OgeSplitterView,
  separatorIndex: number,
): string | null {
  const keys: string[] = [];
  if (isSplitterPaneCollapsible(view, separatorIndex, 'start')) {
    keys.push('Enter');
  }
  if (
    isSplitterPaneCollapsible(view, separatorIndex, 'start') ||
    isSplitterPaneCollapsible(view, separatorIndex, 'end')
  ) {
    keys.push(
      view.horizontal
        ? 'Control+ArrowLeft Control+ArrowRight'
        : 'Control+ArrowUp Control+ArrowDown',
    );
  }
  return keys.length ? keys.join(' ') : null;
}

/** `aria-label` of a separator, with the collapsed suffix when it applies. */
export function splitterSeparatorLabel(
  view: OgeSplitterView,
  separatorIndex: number,
  messages: OgeSplitterMessages,
): string {
  const base = messages.separator
    .replace('{{first}}', String(separatorIndex + 1))
    .replace('{{second}}', String(separatorIndex + 2));
  const primary = view.descriptors[separatorIndex];
  return primary && view.collapsed.has(primary.id)
    ? `${base} (${messages.collapsed})`
    : base;
}

/** `title` of a collapse grip — collapse or expand, depending on the pane. */
export function splitterGripTitle(
  view: OgeSplitterView,
  separatorIndex: number,
  side: OgeSplitterGripSide,
  messages: OgeSplitterMessages,
): string {
  return isSplitterPaneCollapsed(view, separatorIndex, side)
    ? messages.expandPane
    : messages.collapsePane;
}

/** Chevron path pointing the way the grip's pane would move. */
export function splitterGripPath(
  view: OgeSplitterView,
  separatorIndex: number,
  side: OgeSplitterGripSide,
): string {
  const collapsed = isSplitterPaneCollapsed(view, separatorIndex, side);
  // A 'start' grip normally points towards the start (its pane shrinks that
  // way); once that pane is collapsed it points back the other way.
  const towardsStart = side === 'start' ? !collapsed : collapsed;
  if (view.horizontal) {
    return towardsStart ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6';
  }
  return towardsStart ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';
}

/**
 * Ctrl+Arrow: pushes the separator to one end. Moving towards the start
 * expands a collapsed following pane if there is one, otherwise collapses the
 * preceding pane — and mirrored for the other direction. `null` when neither
 * neighbour can move.
 */
export function splitterCollapseSideInDirection(
  view: OgeSplitterView,
  separatorIndex: number,
  direction: number,
): OgeSplitterGripSide | null {
  const towardsEnd = direction > 0;
  const near: OgeSplitterGripSide = towardsEnd ? 'end' : 'start';
  const far: OgeSplitterGripSide = towardsEnd ? 'start' : 'end';

  // first undo a collapse the arrow points away from…
  if (
    isSplitterPaneCollapsible(view, separatorIndex, far) &&
    isSplitterPaneCollapsed(view, separatorIndex, far)
  ) {
    return far;
  }
  // …otherwise collapse the pane the arrow points at
  if (
    isSplitterPaneCollapsible(view, separatorIndex, near) &&
    !isSplitterPaneCollapsed(view, separatorIndex, near)
  ) {
    return near;
  }
  return null;
}

// --- keyboard ---------------------------------------------------------------

/** Share points a Home/End press asks for — clamped by the bounds anyway. */
export const OGE_SPLITTER_FULL_TRAVEL = 1e9;

/** What a keydown on a separator resolves to. */
export type OgeSplitterKeyAction =
  /** Toggle the pane on `side` (Enter, or Ctrl+Arrow). */
  | { readonly kind: 'toggle'; readonly side: OgeSplitterGripSide }
  /** Move the separator by `deltaShare` share points. */
  | { readonly kind: 'nudge'; readonly deltaShare: number };

/** The keyboard event shape the map needs — a subset of `KeyboardEvent`. */
export interface OgeSplitterKeyInput {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * The APG window-splitter keyboard map, RTL-aware on the horizontal axis:
 * Enter toggles the primary pane, Home/End drive the separator to its stops,
 * the axis arrows nudge by `step` share points and Ctrl/Cmd+Arrow collapses
 * or expands a neighbour. Returns `null` when the key is not part of the
 * pattern or the separator cannot honour it — the caller then leaves the
 * event alone (no `preventDefault`).
 */
export function splitterKeyAction(
  view: OgeSplitterView,
  separatorIndex: number,
  event: OgeSplitterKeyInput,
  step: number,
  rtl = false,
): OgeSplitterKeyAction | null {
  const key = event.key;

  if (key === 'Enter') {
    return isSplitterPaneCollapsible(view, separatorIndex, 'start')
      ? { kind: 'toggle', side: 'start' }
      : null;
  }

  if (key === 'Home' || key === 'End') {
    if (!canResizeSplitterAt(view, separatorIndex)) return null;
    return {
      kind: 'nudge',
      deltaShare:
        key === 'End' ? OGE_SPLITTER_FULL_TRAVEL : -OGE_SPLITTER_FULL_TRAVEL,
    };
  }

  const vertical = !view.horizontal;
  let direction = 0;
  if (!vertical && (key === 'ArrowLeft' || key === 'ArrowRight')) {
    direction = key === 'ArrowRight' ? 1 : -1;
    if (rtl) direction = -direction;
  } else if (vertical && (key === 'ArrowUp' || key === 'ArrowDown')) {
    direction = key === 'ArrowDown' ? 1 : -1;
  }
  if (direction === 0) return null;

  if (event.ctrlKey || event.metaKey) {
    const side = splitterCollapseSideInDirection(
      view,
      separatorIndex,
      direction,
    );
    return side ? { kind: 'toggle', side } : null;
  }

  if (!canResizeSplitterAt(view, separatorIndex)) return null;
  return { kind: 'nudge', deltaShare: direction * step };
}

// --- pointer drag -----------------------------------------------------------

/** What a running splitter drag gesture calls back into. */
export interface OgeSplitterDragHandlers {
  /** Per pointer move, with the event that produced it. */
  move(event: PointerEvent): void;
  /**
   * The gesture ended and its listeners are already detached. `cancelled`
   * (Escape, `pointercancel`, window blur) means the caller restores the
   * tracks captured at gesture start.
   */
  finish(event: Event | undefined, cancelled: boolean): void;
}

/**
 * Runs a separator drag: pointer capture, then document-level move/up/cancel
 * listeners (capture is not guaranteed, and alt-tab or a release outside the
 * document never delivers a `pointerup`), Escape-to-cancel and
 * window-blur-to-cancel. Returns a detach function for teardown mid-drag
 * (component destroy); guards, `preventDefault` and the resizing-state
 * bookkeeping stay with the caller.
 */
export function startSplitterDrag(
  event: PointerEvent,
  handlers: OgeSplitterDragHandlers,
): () => void {
  const target = event.target as HTMLElement | null;
  if (target && typeof target.setPointerCapture === 'function') {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom / detached elements — capture is a progressive enhancement */
    }
  }

  const finish = (e: Event | undefined, cancelled: boolean): void => {
    cleanup();
    handlers.finish(e, cancelled);
  };
  const onMove = (e: PointerEvent): void => handlers.move(e);
  const onUp = (e: PointerEvent): void => finish(e, false);
  const onCancel = (e: PointerEvent): void => finish(e, true);
  // Releasing the button outside the document (or an alt-tab) never delivers
  // a pointerup, which would otherwise leave the splitter dragging forever.
  const onBlur = (): void => finish(undefined, true);
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    finish(e, true);
  };
  const cleanup = (): void => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('keydown', onKeydown, true);
    window.removeEventListener('blur', onBlur);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('blur', onBlur);
  return cleanup;
}

/**
 * Signed pixel delta of a drag along the splitter's axis, measured from the
 * position captured at gesture start. Horizontal splitters mirror under RTL.
 */
export function splitterDragDelta(
  point: { clientX: number; clientY: number },
  startPos: number,
  axis: { vertical: boolean; rtl: boolean },
): number {
  const current = axis.vertical ? point.clientY : point.clientX;
  const invert = !axis.vertical && axis.rtl;
  return (current - startPos) * (invert ? -1 : 1);
}
