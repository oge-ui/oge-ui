import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import {
  normalizeSplitTracks,
  resizeSplitAt,
  splitSeparatorRange,
  type DataSource,
  type OgeSplitBounds,
  type OgeSplitTrack,
} from '@oge-ui/core';
import { OgeElementAttrs } from '../attrs';
import { OGE_SPLITTER_CONFIG, type OgeSplitterMessages } from './config';
import type { OgeSplitterDescriptor } from './splitter-descriptor';
import { OgeSplitterPane } from './splitter-pane';
import type {
  OgeSplitterGripSide,
  OgeSplitterOrientation,
  OgeSplitterPaneClickEvent,
  OgeSplitterPaneHoldEvent,
  OgeSplitterPaneCollapsedEvent,
  OgeSplitterPaneCollapsingEvent,
  OgeSplitterPaneData,
  OgeSplitterResizeEvent,
  OgeSplitterResizeStartEvent,
  OgeSplitterSize,
} from './splitter-types';
import { OgeSplitterPaneTemplate } from './templates';

declare const ngDevMode: boolean | undefined;

let nextComponentId = 0;

/** Nudge used for Home/End — clamped by the bounds, so any large number does. */
const FULL_TRAVEL = 1e9;

/**
 * Resizable pane container following the WAI-ARIA APG **window splitter**
 * pattern. Panes come from projected `<oge-splitter-pane>` children, from a
 * data-driven `panes` array, or both:
 *
 * ```html
 * <oge-splitter [(sizes)]="sizes" orientation="horizontal">
 *   <oge-splitter-pane size="240px" minSize="160px" [collapsible]="true">
 *     Navigation…
 *   </oge-splitter-pane>
 *   <oge-splitter-pane [minSize]="20">Editor…</oge-splitter-pane>
 * </oge-splitter>
 * ```
 *
 * Sizes are **ratios**, not percentages: `[30, 30]` lays out exactly like
 * `[50, 50]`, so a configuration that does not add up to 100 is not an error.
 * A `'240px'` size pins a pane instead. Layout is one CSS grid — the separators
 * are real tracks, so panes mirror automatically in RTL.
 */
@Component({
  selector: 'oge-splitter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, OgeSplitter, OgeElementAttrs],
  styleUrl: './splitter.scss',
  host: {
    class: 'oge-splitter',
    '[class.oge-disabled]': 'disabled()',
    '[class.oge-splitter-resizing]': 'resizingIndex() !== null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.aria-label]': 'ariaLabel()',
    '[style.grid-template-columns]': 'horizontal() ? gridTemplate() : null',
    '[style.grid-template-rows]': 'horizontal() ? null : gridTemplate()',
    '(click)': 'onHostClick($event)',
    '(pointerdown)': 'onHostPointerDown($event)',
    '(pointerup)': 'cancelHold()',
    '(pointerleave)': 'cancelHold()',
    '(pointercancel)': 'cancelHold()',
    '(contextmenu)': 'onHostContextMenu($event)',
  },
  template: `
    @if (descriptors().length) {
      @for (d of descriptors(); track d.id; let i = $index) {
        @if (i > 0) {
          <div
            class="oge-splitter-separator"
            role="separator"
            #separatorEl
            [id]="uid + '-sep-' + d.id"
            [tabindex]="keyboardNavigation() && !disabled() ? 0 : -1"
            [attr.aria-orientation]="orientation()"
            [attr.aria-controls]="uid + '-pane-' + descriptors()[i - 1].id"
            [attr.aria-label]="separatorLabel(i - 1)"
            [attr.aria-valuenow]="separatorRanges()[i - 1]?.now"
            [attr.aria-valuemin]="separatorRanges()[i - 1]?.min"
            [attr.aria-valuemax]="separatorRanges()[i - 1]?.max"
            [attr.aria-disabled]="canResize(i - 1) ? null : 'true'"
            [attr.aria-keyshortcuts]="keyShortcuts(i - 1)"
            [class.oge-splitter-separator-active]="resizingIndex() === i - 1"
            [class.oge-splitter-separator-locked]="!canResize(i - 1)"
            (pointerdown)="onSeparatorPointerDown(i - 1, $event)"
            (dblclick)="onSeparatorDblClick(i - 1, $event)"
            (click)="onSeparatorClick(i - 1, $event)"
            (keydown)="onSeparatorKeydown(i - 1, $event)"
          >
            <span class="oge-splitter-separator-line" aria-hidden="true"></span>
            @if (showCollapseGrips()) {
              @for (side of gripSides; track side) {
                @if (isCollapsible(i - 1, side)) {
                  <span
                    class="oge-splitter-grip"
                    aria-hidden="true"
                    [class.oge-splitter-grip-start]="side === 'start'"
                    [class.oge-splitter-grip-end]="side === 'end'"
                    [attr.data-grip]="side"
                    [attr.title]="gripTitle(i - 1, side)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      width="10"
                      height="10"
                    >
                      <path [attr.d]="gripPath(i - 1, side)" />
                    </svg>
                  </span>
                }
              }
            }
          </div>
        }
        <div
          class="oge-splitter-pane"
          #paneEl
          [id]="uid + '-pane-' + d.id"
          [class]="d.cssClass ?? ''"
          [ogeAttrs]="d.htmlAttributes"
          [class.oge-splitter-pane-collapsed]="isCollapsedId(d.id)"
          [class.oge-splitter-pane-scroll]="d.scrollable"
          [attr.inert]="isCollapsedId(d.id) ? '' : null"
        >
          @if (d.panes?.length) {
            <oge-splitter
              [panes]="d.panes ?? []"
              [orientation]="d.orientation ?? flippedOrientation()"
              [separatorSize]="separatorSize()"
              [step]="step()"
              [keyboardNavigation]="keyboardNavigation()"
              [showCollapseGrips]="showCollapseGrips()"
              [resizable]="resizable()"
              [disabled]="disabled()"
              [messages]="messages()"
            />
          } @else if (d.contentTemplate) {
            <ng-container
              *ngTemplateOutlet="
                d.contentTemplate;
                context: {
                  $implicit: d.item ?? {},
                  index: i,
                  collapsed: isCollapsedId(d.id),
                }
              "
            />
          } @else if (d.text) {
            {{ d.text }}
          }
        </div>
      }
    } @else {
      <p class="oge-splitter-empty">{{ mergedMessages().noData }}</p>
    }
  `,
})
export class OgeSplitter {
  private readonly config = inject(OGE_SPLITTER_CONFIG);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  /** Unique DOM id prefix of this component instance. */
  protected readonly uid = `oge-splitter-${nextComponentId++}`;

  // --- inputs ---------------------------------------------------------------

  /** Axis the panes are laid out along. */
  readonly orientation = input<OgeSplitterOrientation>('horizontal');
  /** Data-driven panes, rendered after the projected `<oge-splitter-pane>` children. */
  readonly panes = input<readonly OgeSplitterPaneData[] | undefined>(undefined);
  /**
   * Remote pane list. Loaded through `@oge-ui/core`'s `DataSource` contract
   * and merged after `panes`; a source that publishes `changes` re-loads.
   */
  readonly dataSource = input<DataSource<OgeSplitterPaneData> | undefined>(
    undefined,
  );
  /** Milliseconds a pointer must rest on a pane before `paneHold` fires. */
  readonly itemHoldTimeout = input(750);

  /** Panes loaded from `dataSource`, merged after `panes`. */
  private readonly loadedPanes = signal<readonly OgeSplitterPaneData[]>([]);
  /**
   * Pane sizes — two-way, and the channel to persist. Numbers are shares,
   * `'240px'` pins a pane. Setting it overrides the per-pane `size` inputs.
   */
  readonly sizes = model<readonly OgeSplitterSize[] | undefined>(undefined);
  /** Thickness of each separator in pixels. */
  readonly separatorSize = input(this.config.separatorSize ?? 6);
  /** Share points one arrow-key press moves a separator. */
  readonly step = input(this.config.step ?? 5);
  /** Enables arrow / Home / End / Enter on the separators. */
  readonly keyboardNavigation = input(true);
  /** Renders a collapse chevron on the separators of collapsible panes. */
  readonly showCollapseGrips = input(this.config.showCollapseGrips ?? true);
  /** `false` pins every separator. */
  readonly resizable = input(true);
  /** Disables the whole splitter — no dragging, no keyboard, no collapsing. */
  readonly disabled = input(false);
  /** Accessible name of the splitter container. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Per-instance overrides of the config `messages`. */
  readonly messages = input<Partial<OgeSplitterMessages>>({});

  // --- outputs --------------------------------------------------------------

  /** Emitted once when a drag or keyboard resize begins. */
  readonly resizeStarted = output<OgeSplitterResizeStartEvent>();
  /** Emitted every time the sizes change during a resize. */
  readonly resized = output<OgeSplitterResizeEvent>();
  /** Emitted once when the resize gesture finishes. */
  readonly resizeEnded = output<OgeSplitterResizeEvent>();
  /** Cancelable pre-event of a pane collapsing — set `cancel = true` to block it. */
  readonly paneCollapsing = output<OgeSplitterPaneCollapsingEvent>();
  /** Cancelable pre-event of a pane expanding. */
  readonly paneExpanding = output<OgeSplitterPaneCollapsingEvent>();
  /** Emitted after a pane collapsed. */
  readonly paneCollapsed = output<OgeSplitterPaneCollapsedEvent>();
  /** Emitted after a pane expanded. */
  readonly paneExpanded = output<OgeSplitterPaneCollapsedEvent>();
  /** Emitted when a pane is clicked. */
  readonly paneClick = output<OgeSplitterPaneClickEvent>();
  /** A pane was held for `itemHoldTimeout` (touch long-press or mouse hold). */
  readonly paneHold = output<OgeSplitterPaneHoldEvent>();
  /** A pane was right-clicked / long-pressed for a context menu. */
  readonly paneContextMenu = output<OgeSplitterPaneHoldEvent>();

  // --- queries --------------------------------------------------------------

  private readonly declaredPanes = contentChildren(OgeSplitterPane);
  // descendants: false — a template inside a nested splitter belongs to it
  protected readonly panesTemplate = contentChild(OgeSplitterPaneTemplate, {
    descendants: false,
  });
  private readonly separatorElements =
    viewChildren<ElementRef<HTMLElement>>('separatorEl');
  private readonly paneElements =
    viewChildren<ElementRef<HTMLElement>>('paneEl');

  // --- state ----------------------------------------------------------------

  private readonly _collapsedIds = signal<ReadonlySet<string>>(new Set());
  private readonly childCollapsed = new Map<string, boolean>();
  private readonly restoreSizes = new Map<string, OgeSplitterSize>();
  /** Index of the separator being dragged, `null` when idle. */
  protected readonly resizingIndex = signal<number | null>(null);
  /** Last measured flexible space, feeding the separators' ARIA values. */
  private readonly measuredFlexible = signal(0);
  private activeGestureCleanup: (() => void) | null = null;

  /** Effective messages: config defaults overlaid with `[messages]`. */
  protected readonly mergedMessages = computed<OgeSplitterMessages>(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly horizontal = computed(
    () => this.orientation() === 'horizontal',
  );

  /** Axis a nested splitter uses unless it names its own. */
  protected readonly flippedOrientation = computed<OgeSplitterOrientation>(
    () => (this.horizontal() ? 'vertical' : 'horizontal'),
  );

  /** Normalized panes: projected children first, then `panes`. */
  protected readonly descriptors = computed<readonly OgeSplitterDescriptor[]>(
    () => {
      const paneTpl = this.panesTemplate()?.templateRef;
      const fromChildren = this.declaredPanes()
        .filter((pane) => pane.visible())
        .map((pane) => ({
          id: pane.key() ?? pane.autoId,
          key: pane.key(),
          size: pane.size(),
          minSize: pane.minSize(),
          maxSize: pane.maxSize(),
          collapsible: pane.collapsible(),
          collapsedSize: pane.collapsedSize(),
          resizable: pane.resizable(),
          scrollable: pane.scrollable(),
          disabled: pane.disabled(),
          text: pane.text(),
          cssClass: pane.cssClass(),
          htmlAttributes: pane.htmlAttributes(),
          panes: undefined,
          orientation: undefined,
          // declarative panes sync through their two-way `collapsed` model
          initiallyCollapsed: false,
          item: undefined,
          source: pane,
          contentTemplate: pane.contentTemplateRef(),
        }));
      const fromItems = [...(this.panes() ?? []), ...this.loadedPanes()]
        .filter((item) => item.visible !== false)
        .map((item, index) => ({
          id: item.key ?? `i${index}`,
          key: item.key,
          size: item.size,
          minSize: item.minSize,
          maxSize: item.maxSize,
          collapsible: item.collapsible ?? false,
          collapsedSize: item.collapsedSize,
          resizable: item.resizable ?? true,
          scrollable: item.scrollable ?? true,
          disabled: false,
          text: item.text,
          cssClass: item.cssClass,
          htmlAttributes: item.htmlAttributes,
          panes: item.panes,
          orientation: item.orientation,
          initiallyCollapsed: item.collapsed ?? false,
          item,
          source: undefined,
          contentTemplate: paneTpl,
        }));
      return [...fromChildren, ...fromItems];
    },
  );

  /** JSON of the sizes this component last published to the `sizes` model. */
  private lastCommitted: string | null = null;

  /**
   * Identity of the *declared* sizing, so the working sizes below reset when
   * the pane set, a declared `size`, or an externally supplied `sizes` array
   * really changes.
   *
   * Two things it must not react to. A parent template handing us an
   * equal-but-new `panes` array — that would throw away the size the user just
   * dragged to on every change-detection pass. And our own writes to the
   * `sizes` model: echoing them back as an "external" override would pin the
   * component to its own last commit and make a later `size` change a no-op.
   */
  private readonly sizingKey = computed(() => {
    const explicit = this.sizes();
    const json = explicit ? JSON.stringify(explicit) : null;
    return JSON.stringify([
      this.descriptors().map((d) => [d.id, d.size ?? null]),
      json === this.lastCommitted ? null : json,
    ]);
  });

  /**
   * Current sizes. Resets to `[sizes]` (or the per-pane `size` inputs) whenever
   * those change, and holds the gesture's result in between.
   */
  private readonly currentSizes = linkedSignal<
    string,
    readonly (OgeSplitterSize | undefined)[]
  >({
    source: this.sizingKey,
    computation: () => {
      const explicit = untracked(this.sizes);
      const ds = untracked(this.descriptors);
      // Same echo rule as `sizingKey`: a value we published ourselves is the
      // component's own state, not an override, so the declared sizes win.
      const echo =
        !!explicit && JSON.stringify(explicit) === this.lastCommitted;
      if (explicit && !echo && explicit.length === ds.length) {
        return [...explicit];
      }
      return ds.map((d) => d.size);
    },
  });

  /** Resolved grid tracks, one per pane, shares normalized to 100. */
  protected readonly tracks = computed<OgeSplitTrack[]>(() => {
    const ds = this.descriptors();
    const sizes = this.currentSizes();
    const collapsed = this._collapsedIds();
    return normalizeSplitTracks(
      ds.map((d, index) => {
        if (collapsed.has(d.id)) {
          return (
            parseSplitterSize(d.collapsedSize) ?? {
              kind: 'fixed' as const,
              value: 0,
            }
          );
        }
        return (
          parseSplitterSize(sizes[index] ?? d.size, (message) =>
            this.warn(message),
          ) ?? { kind: 'share' as const, value: 0 }
        );
      }),
    );
  });

  /** `grid-template-columns` / `-rows` value: pane, separator, pane, … */
  protected readonly gridTemplate = computed(() => {
    const tracks = this.tracks();
    if (!tracks.length) return null;
    const separator = `${this.separatorSize()}px`;
    const parts: string[] = [];
    tracks.forEach((track, index) => {
      if (index > 0) parts.push(separator);
      parts.push(this.trackCss(track, index));
    });
    return parts.join(' ');
  });

  constructor() {
    // Remote pane list. `load({})` is enough — a splitter has no paging,
    // sorting or filtering to push down — and a source that publishes
    // `changes` re-loads.
    effect((onCleanup) => {
      const source = this.dataSource();
      if (!source) {
        this.loadedPanes.set([]);
        return;
      }
      let stale = false;
      const reload = () => {
        void source.load({}).then((result) => {
          // a splitter never groups, so the flat arm of LoadResult is the
          // only one that can come back here
          if (!stale) {
            this.loadedPanes.set(result.data as readonly OgeSplitterPaneData[]);
          }
        });
      };
      reload();
      const subscription = source.changes?.subscribe(() => reload());
      onCleanup(() => {
        stale = true;
        subscription?.unsubscribe();
      });
    });
    // Seeds the collapsed set and follows external writes to a declarative
    // pane's `[(collapsed)]` model. Reads stay reactive; the pipeline runs
    // untracked so emitting outputs cannot re-enter this effect.
    effect(() => {
      const ds = this.descriptors();
      const desired = ds.map((d) =>
        d.source ? d.source.collapsed() : d.initiallyCollapsed,
      );
      untracked(() => {
        const seeded = new Set(this._collapsedIds());
        let changed = false;
        ds.forEach((d, index) => {
          const known = this.childCollapsed.get(d.id);
          if (known === undefined) {
            this.childCollapsed.set(d.id, desired[index]);
            if (desired[index]) {
              seeded.add(d.id);
              changed = true;
            }
          } else if (known !== desired[index]) {
            this.childCollapsed.set(d.id, desired[index]);
            this.requestCollapse(index, desired[index]);
          }
        });
        if (changed) this._collapsedIds.set(seeded);
      });
    });

    // A ResizeObserver keeps the separators' ARIA values honest when the
    // container resizes without any input changing — a window resize, a parent
    // splitter being dragged, a drawer opening.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.syncMeasurement());
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Covers what the observer cannot: a track change that moves the
    // fixed/flexible split without resizing the host, and environments with no
    // ResizeObserver. Deliberately skipped mid-gesture — reading layout on
    // every pointermove is exactly the thrash this indirection exists to avoid.
    afterRenderEffect(() => {
      this.tracks();
      this.separatorSize();
      this.orientation();
      if (untracked(this.resizingIndex) !== null) return;
      untracked(() => this.syncMeasurement());
    });

    this.destroyRef.onDestroy(() => {
      this.cancelHold();
      this.activeGestureCleanup?.();
    });
  }

  // --- template helpers -----------------------------------------------------

  protected isCollapsedId(id: string): boolean {
    return this._collapsedIds().has(id);
  }

  /**
   * A separator carries one grip per collapsible neighbour: `'start'` for the
   * pane before it (the APG primary pane, also driven by Enter) and `'end'`
   * for the one after — the two-arrow splitbar the references all render.
   */
  protected readonly gripSides = ['start', 'end'] as const;

  protected isCollapsible(
    separatorIndex: number,
    side: OgeSplitterGripSide = 'start',
  ): boolean {
    const d = this.descriptors()[this.paneOf(separatorIndex, side)];
    return !!d && d.collapsible && !d.disabled && !this.disabled();
  }

  /** Index of the pane a separator's grip acts on. */
  private paneOf(separatorIndex: number, side: OgeSplitterGripSide): number {
    return side === 'start' ? separatorIndex : separatorIndex + 1;
  }

  protected keyShortcuts(separatorIndex: number): string | null {
    const keys: string[] = [];
    if (this.isCollapsible(separatorIndex, 'start')) keys.push('Enter');
    if (
      this.isCollapsible(separatorIndex, 'start') ||
      this.isCollapsible(separatorIndex, 'end')
    ) {
      keys.push(
        this.horizontal()
          ? 'Control+ArrowLeft Control+ArrowRight'
          : 'Control+ArrowUp Control+ArrowDown',
      );
    }
    return keys.length ? keys.join(' ') : null;
  }

  /** A separator may be dragged only when both of its neighbours allow it. */
  protected canResize(separatorIndex: number): boolean {
    if (this.disabled() || !this.resizable()) return false;
    const ds = this.descriptors();
    const a = ds[separatorIndex];
    const b = ds[separatorIndex + 1];
    if (!a || !b) return false;
    if (this.isCollapsedId(a.id) || this.isCollapsedId(b.id)) return false;
    return a.resizable && b.resizable && !a.disabled && !b.disabled;
  }

  protected separatorLabel(separatorIndex: number): string {
    const messages = this.mergedMessages();
    const base = messages.separator
      .replace('{{first}}', String(separatorIndex + 1))
      .replace('{{second}}', String(separatorIndex + 2));
    return this.isCollapsedId(this.descriptors()[separatorIndex]?.id ?? '')
      ? `${base} (${messages.collapsed})`
      : base;
  }

  protected gripTitle(
    separatorIndex: number,
    side: OgeSplitterGripSide,
  ): string {
    const messages = this.mergedMessages();
    return this.isPaneCollapsed(separatorIndex, side)
      ? messages.expandPane
      : messages.collapsePane;
  }

  /** Chevron pointing the way the grip's pane would move. */
  protected gripPath(
    separatorIndex: number,
    side: OgeSplitterGripSide,
  ): string {
    const collapsed = this.isPaneCollapsed(separatorIndex, side);
    // A 'start' grip normally points towards the start (its pane shrinks that
    // way); once that pane is collapsed it points back the other way.
    const towardsStart = side === 'start' ? !collapsed : collapsed;
    if (this.horizontal()) {
      return towardsStart ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6';
    }
    return towardsStart ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';
  }

  private isPaneCollapsed(
    separatorIndex: number,
    side: OgeSplitterGripSide,
  ): boolean {
    const d = this.descriptors()[this.paneOf(separatorIndex, side)];
    return !!d && this.isCollapsedId(d.id);
  }

  /**
   * The APG value triple of every separator, rounded for the DOM.
   *
   * Derived from a signal rather than measured per binding on purpose — reading
   * `getBoundingClientRect()` from a template expression would force a layout
   * on every change-detection pass.
   */
  protected readonly separatorRanges = computed(() => {
    const tracks = this.tracks();
    // Before the first measurement lands the host size is unknown. A splitter
    // of share panes is unit-free, so the same fallback the gestures use gives
    // the correct values on the very first paint instead of announcing 0.
    const flexiblePx =
      this.measuredFlexible() ||
      (tracks.length && tracks.every((track) => track.kind === 'share')
        ? 100
        : 0);
    const bounds = this.boundsAt(flexiblePx);
    return tracks.slice(0, -1).map((_, index) => {
      const range = splitSeparatorRange(tracks, index, flexiblePx, bounds);
      return {
        now: Math.round(range.now),
        min: Math.round(range.min),
        max: Math.round(range.max),
      };
    });
  });

  // --- pointer resize -------------------------------------------------------

  protected onSeparatorPointerDown(
    separatorIndex: number,
    event: PointerEvent,
  ): void {
    if (event.button !== 0) return;
    if (this.isGripTarget(event.target)) return;
    if (!this.canResize(separatorIndex)) return;
    const flexiblePx = this.measureFlexible();
    if (flexiblePx <= 0) return;

    event.preventDefault();
    const startTracks = this.tracks();
    const startSizes = this.snapshotSizes();
    const bounds = this.boundsAt(flexiblePx);
    const vertical = !this.horizontal();
    const invert = !vertical && this.isRtl();
    const startPos = vertical ? event.clientY : event.clientX;

    this.resizingIndex.set(separatorIndex);
    this.resizeStarted.emit({ separatorIndex, sizes: startSizes, event });

    const target = event.target as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // jsdom / detached elements — capture is a progressive enhancement
      }
    }

    const move = (e: PointerEvent): void => {
      const delta =
        ((vertical ? e.clientY : e.clientX) - startPos) * (invert ? -1 : 1);
      const moved = this.applyTracks(
        resizeSplitAt(startTracks, separatorIndex, delta, flexiblePx, bounds),
      );
      if (!moved) return;
      this.resized.emit({
        separatorIndex,
        sizes: this.snapshotSizes(),
        previousSizes: startSizes,
        event: e,
      });
    };

    this.trackGesture(move, (e, cancelled) => {
      if (cancelled) this.applyTracks(startTracks);
      this.resizingIndex.set(null);
      this.commitSizes();
      this.resizeEnded.emit({
        separatorIndex,
        sizes: this.snapshotSizes(),
        previousSizes: startSizes,
        event: e,
      });
    });
  }

  /** Document-level move/up tracking with Escape-to-cancel and safe teardown. */
  private trackGesture(
    onMove: (e: PointerEvent) => void,
    onEnd: (e: Event | undefined, cancelled: boolean) => void,
  ): void {
    this.activeGestureCleanup?.();
    const finish = (e: Event | undefined, cancelled: boolean): void => {
      cleanup();
      onEnd(e, cancelled);
    };
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
      this.activeGestureCleanup = null;
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('blur', onBlur);
    this.activeGestureCleanup = cleanup;
  }

  // --- pointer clicks -------------------------------------------------------

  protected onSeparatorClick(separatorIndex: number, event: MouseEvent): void {
    const side = this.gripSideOf(event.target);
    if (!side) return;
    event.preventDefault();
    event.stopPropagation();
    this.toggleAt(separatorIndex, side, event);
  }

  protected onSeparatorDblClick(
    separatorIndex: number,
    event: MouseEvent,
  ): void {
    // The reference convention: a double click on the bar toggles the primary pane,
    // falling back to the following one when only that is collapsible.
    const side: OgeSplitterGripSide = this.isCollapsible(
      separatorIndex,
      'start',
    )
      ? 'start'
      : 'end';
    if (!this.isCollapsible(separatorIndex, side)) return;
    event.preventDefault();
    this.toggleAt(separatorIndex, side, event);
  }

  /**
   * Resolves `paneClick` from the host rather than from a handler on each pane.
   * A pane is a container, not a control — a `(click)` on it would be an
   * `interactive-supports-focus` violation, and the `closest()` form also keeps
   * a nested splitter's clicks from firing on its parent.
   */
  protected onHostClick(event: MouseEvent): void {
    const pane = (event.target as HTMLElement | null)?.closest?.(
      '.oge-splitter-pane',
    );
    if (!pane || pane.parentElement !== this.host.nativeElement) return;
    const index = this.paneElements().findIndex(
      (ref) => ref.nativeElement === pane,
    );
    const d = this.descriptors()[index];
    if (!d) return;
    this.paneClick.emit({ index, key: d.key, item: d.item, event });
  }

  private holdTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resolves the own (not nested) pane a pointer event landed in. */
  private ownPaneAt(target: EventTarget | null): number {
    const pane = (target as HTMLElement | null)?.closest?.(
      '.oge-splitter-pane',
    );
    if (!pane || pane.parentElement !== this.host.nativeElement) return -1;
    return this.paneElements().findIndex((ref) => ref.nativeElement === pane);
  }

  protected onHostPointerDown(event: Event): void {
    this.cancelHold();
    if (this.disabled() || this.isGripTarget(event.target)) return;
    const index = this.ownPaneAt(event.target);
    if (index === -1) return;
    this.holdTimer = setTimeout(() => {
      this.holdTimer = null;
      const d = this.descriptors()[index];
      if (d) {
        this.paneHold.emit({ index, key: d.key, item: d.item, event });
      }
    }, this.itemHoldTimeout());
  }

  protected cancelHold(): void {
    if (this.holdTimer === null) return;
    clearTimeout(this.holdTimer);
    this.holdTimer = null;
  }

  protected onHostContextMenu(event: Event): void {
    this.cancelHold();
    if (this.disabled()) return;
    const index = this.ownPaneAt(event.target);
    if (index === -1) return;
    const d = this.descriptors()[index];
    if (!d) return;
    this.paneContextMenu.emit({ index, key: d.key, item: d.item, event });
  }

  private isGripTarget(target: EventTarget | null): boolean {
    return this.gripSideOf(target) !== null;
  }

  private gripSideOf(target: EventTarget | null): OgeSplitterGripSide | null {
    const grip = (target as HTMLElement | null)?.closest?.(
      '.oge-splitter-grip',
    );
    const side = grip?.getAttribute('data-grip');
    return side === 'start' || side === 'end' ? side : null;
  }

  // --- keyboard -------------------------------------------------------------

  protected onSeparatorKeydown(
    separatorIndex: number,
    event: KeyboardEvent,
  ): void {
    if (!this.keyboardNavigation() || this.disabled()) return;
    const vertical = !this.horizontal();
    const key = event.key;

    if (key === 'Enter') {
      if (!this.isCollapsible(separatorIndex, 'start')) return;
      event.preventDefault();
      this.toggleAt(separatorIndex, 'start', event);
      return;
    }

    if (key === 'Home' || key === 'End') {
      if (!this.canResize(separatorIndex)) return;
      event.preventDefault();
      this.nudge(
        separatorIndex,
        key === 'End' ? FULL_TRAVEL : -FULL_TRAVEL,
        event,
      );
      return;
    }

    let direction = 0;
    if (!vertical && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      direction = key === 'ArrowRight' ? 1 : -1;
      if (this.isRtl()) direction = -direction;
    } else if (vertical && (key === 'ArrowUp' || key === 'ArrowDown')) {
      direction = key === 'ArrowDown' ? 1 : -1;
    }
    if (direction === 0) return;

    // Ctrl+Arrow drives the separator all the way: it collapses the pane the
    // arrow points away from, or expands the collapsed pane it points towards
    // (a reference binding, and the keyboard path to the second grip).
    if (event.ctrlKey || event.metaKey) {
      if (this.collapseInDirection(separatorIndex, direction, event)) {
        event.preventDefault();
      }
      return;
    }

    if (!this.canResize(separatorIndex)) return;
    event.preventDefault();
    const flexiblePx = this.measureFlexible();
    this.nudge(
      separatorIndex,
      direction * (this.step() / 100) * flexiblePx,
      event,
    );
  }

  /** One discrete resize: start, apply, end — the keyboard counterpart of a drag. */
  private nudge(
    separatorIndex: number,
    deltaPx: number,
    event?: Event,
  ): boolean {
    const flexiblePx = this.measureFlexible();
    if (flexiblePx <= 0) return false;
    const startTracks = this.tracks();
    const startSizes = this.snapshotSizes();
    const next = resizeSplitAt(
      startTracks,
      separatorIndex,
      deltaPx,
      flexiblePx,
      this.boundsAt(flexiblePx),
    );
    // Already against the stop — report nothing rather than a resize that did
    // not happen (holding End down must not spray events).
    if (sameSizes(tracksToSizes(next), startSizes)) return false;

    this.resizeStarted.emit({ separatorIndex, sizes: startSizes, event });
    this.applyTracks(next);
    this.commitSizes();
    const sizes = this.snapshotSizes();
    this.resized.emit({
      separatorIndex,
      sizes,
      previousSizes: startSizes,
      event,
    });
    this.resizeEnded.emit({
      separatorIndex,
      sizes,
      previousSizes: startSizes,
      event,
    });
    return true;
  }

  // --- collapse pipeline ----------------------------------------------------

  private toggleAt(
    separatorIndex: number,
    side: OgeSplitterGripSide,
    event?: Event,
  ): void {
    const index = this.paneOf(separatorIndex, side);
    const d = this.descriptors()[index];
    if (!d) return;
    this.requestCollapse(index, !this.isCollapsedId(d.id), event);
  }

  /**
   * Ctrl+Arrow: pushes the separator to one end. Moving towards the start
   * expands a collapsed following pane if there is one, otherwise collapses
   * the preceding pane — and mirrored for the other direction.
   */
  private collapseInDirection(
    separatorIndex: number,
    direction: 1 | -1 | number,
    event: Event,
  ): boolean {
    const towardsEnd = direction > 0;
    const near: OgeSplitterGripSide = towardsEnd ? 'end' : 'start';
    const far: OgeSplitterGripSide = towardsEnd ? 'start' : 'end';

    // first undo a collapse the arrow points away from…
    if (
      this.isCollapsible(separatorIndex, far) &&
      this.isPaneCollapsed(separatorIndex, far)
    ) {
      this.toggleAt(separatorIndex, far, event);
      return true;
    }
    // …otherwise collapse the pane the arrow points at
    if (
      this.isCollapsible(separatorIndex, near) &&
      !this.isPaneCollapsed(separatorIndex, near)
    ) {
      this.toggleAt(separatorIndex, near, event);
      return true;
    }
    return false;
  }

  /**
   * `paneCollapsing` / `paneExpanding` → commit → `paneCollapsed` /
   * `paneExpanded`. Returns `false` when the change was vetoed or impossible.
   */
  private requestCollapse(
    index: number,
    collapse: boolean,
    event?: Event,
  ): boolean {
    const d = this.descriptors()[index];
    if (!d || !d.collapsible || d.disabled || this.disabled()) {
      this.revertChild(d, !collapse);
      return false;
    }
    if (this.isCollapsedId(d.id) === collapse) return true;

    const pre: OgeSplitterPaneCollapsingEvent = {
      index,
      key: d.key,
      item: d.item,
      event,
      cancel: false,
    };
    (collapse ? this.paneCollapsing : this.paneExpanding).emit(pre);
    if (pre.cancel) {
      this.revertChild(d, !collapse);
      return false;
    }

    if (collapse) {
      this.restoreSizes.set(d.id, this.snapshotSizes()[index]);
      this.blurInside(index);
    }
    const next = new Set(this._collapsedIds());
    if (collapse) next.add(d.id);
    else next.delete(d.id);
    this._collapsedIds.set(next);

    if (!collapse) {
      const remembered = this.restoreSizes.get(d.id);
      this.restoreSizes.delete(d.id);
      if (remembered !== undefined) {
        this.currentSizes.set(this.sizesWithRestored(index, remembered));
      }
    }
    this.commitSizes();

    if (d.source) {
      this.childCollapsed.set(d.id, collapse);
      d.source.collapsed.set(collapse);
    }
    (collapse ? this.paneCollapsed : this.paneExpanded).emit({
      index,
      key: d.key,
      item: d.item,
      event,
    });
    return true;
  }

  /** Puts a declarative pane's rejected `[(collapsed)]` write back. */
  private revertChild(
    d: OgeSplitterDescriptor | undefined,
    value: boolean,
  ): void {
    if (!d?.source) return;
    this.childCollapsed.set(d.id, value);
    if (d.source.collapsed() !== value) d.source.collapsed.set(value);
  }

  /**
   * A collapsed pane becomes `inert`, which would drop focus to `<body>` if it
   * still held it — hand focus to the separator that controls it first.
   */
  private blurInside(index: number): void {
    const pane = this.paneElements()[index]?.nativeElement;
    const active = document.activeElement;
    if (!pane || !active || !pane.contains(active)) return;
    this.focus(Math.max(0, index - 1));
  }

  // --- size plumbing --------------------------------------------------------

  /** Writes the working sizes; `false` when the layout did not actually move. */
  private applyTracks(tracks: readonly OgeSplitTrack[]): boolean {
    const next = tracksToSizes(tracks);
    // Dragging past a stop keeps producing the same clamped result. Writing it
    // again would re-run change detection for every pointermove that follows,
    // and reporting it would emit a `resized` that resized nothing.
    if (sameSizes(next, this.currentSizes())) return false;
    this.currentSizes.set(next);
    return true;
  }

  /**
   * Publishes the working sizes to the two-way `sizes` model, once per change.
   *
   * Only ever called from a user-driven change — a drag, a keyboard nudge, a
   * collapse. A component that also wrote this model on its own would diverge
   * permanently from a one-way `[sizes]` binding, because Angular only pushes
   * an input again when the parent's expression itself changes.
   */
  private commitSizes(): void {
    const next = this.snapshotSizes();
    const json = JSON.stringify(next);
    if (json === this.lastCommitted) return;
    // recorded before the write, so `sizingKey` recognises the echo
    this.lastCommitted = json;
    this.sizes.set(next);
  }

  private snapshotSizes(): OgeSplitterSize[] {
    return tracksToSizes(this.tracks());
  }

  /**
   * Sizes with pane `index` put back at the share it had before it collapsed.
   *
   * The other panes grew to fill the gap while it was collapsed, so restoring
   * the remembered share alone would leave the shares summing to more than 100
   * and the pane would come back smaller than it left. They are scaled back
   * down proportionally, which also keeps any resizing done in the meantime.
   */
  private sizesWithRestored(
    index: number,
    remembered: OgeSplitterSize,
  ): OgeSplitterSize[] {
    const sizes = this.snapshotSizes();
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
      return track?.kind === 'share' ? round(track.value * factor) : size;
    });
  }

  private trackCss(track: OgeSplitTrack, index: number): string {
    if (track.kind === 'fixed') return `${round(track.value)}px`;
    const d = this.descriptors()[index];
    const min = parseSplitterSize(d?.minSize);
    const floor = min?.kind === 'fixed' ? `${round(min.value)}px` : '0';
    return `minmax(${floor}, ${round(track.value)}fr)`;
  }

  /**
   * Pixels the share panes divide between them: the host minus the fixed panes
   * and the separators.
   *
   * With no layout to measure — SSR, `display: none`, jsdom — a splitter made
   * only of share panes falls back to a unit-free scale of 100, which yields
   * exactly the same shares. A splitter mixing in fixed panes genuinely needs
   * real pixels, and reports 0 so the caller does nothing.
   */
  private measureFlexible(): number {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const total = this.horizontal() ? rect.width : rect.height;
    const tracks = this.tracks();
    if (total > 0) {
      const fixed = tracks.reduce(
        (sum, track) => (track.kind === 'fixed' ? sum + track.value : sum),
        0,
      );
      const separators = Math.max(0, tracks.length - 1) * this.separatorSize();
      const flexible = total - fixed - separators;
      if (flexible > 0) return flexible;
    }
    return tracks.length && tracks.every((track) => track.kind === 'share')
      ? 100
      : 0;
  }

  /** Re-reads the host size into `measuredFlexible`, ignoring sub-pixel noise. */
  private syncMeasurement(): void {
    const next = this.measureFlexible();
    if (Math.abs(next - untracked(this.measuredFlexible)) > 0.5) {
      this.measuredFlexible.set(next);
    }
  }

  private boundsAt(flexiblePx: number): OgeSplitBounds[] {
    const tracks = this.tracks();
    return this.descriptors().map((d, index) => ({
      min: toTrackUnit(d.minSize, tracks[index], flexiblePx),
      max: toTrackUnit(d.maxSize, tracks[index], flexiblePx),
      resizable: d.resizable && !d.disabled && !this.isCollapsedId(d.id),
    }));
  }

  private isRtl(): boolean {
    return getComputedStyle(this.host.nativeElement).direction === 'rtl';
  }

  private resolveIndex(target: number | string): number {
    if (typeof target === 'number') {
      return target >= 0 && target < this.descriptors().length ? target : -1;
    }
    return this.descriptors().findIndex(
      (d) => d.key === target || d.id === target,
    );
  }

  private warn(message: string): void {
    if (typeof ngDevMode === 'undefined' || ngDevMode) {
      console.warn(`[oge-splitter] ${message}`);
    }
  }

  // --- public API -----------------------------------------------------------

  /**
   * Collapses a pane by index or key. Resolves to `false` when the pane is not
   * collapsible or `paneCollapsing` vetoed it.
   */
  collapse(target: number | string): boolean {
    const index = this.resolveIndex(target);
    return index === -1 ? false : this.requestCollapse(index, true);
  }

  /** Expands a collapsed pane by index or key, restoring its previous size. */
  expand(target: number | string): boolean {
    const index = this.resolveIndex(target);
    return index === -1 ? false : this.requestCollapse(index, false);
  }

  /** Collapses the pane if expanded, expands it otherwise. */
  toggle(target: number | string): boolean {
    const index = this.resolveIndex(target);
    if (index === -1) return false;
    const d = this.descriptors()[index];
    return this.requestCollapse(index, !this.isCollapsedId(d.id));
  }

  /** Whether a pane is currently collapsed. */
  isCollapsed(target: number | string): boolean {
    const index = this.resolveIndex(target);
    return index === -1
      ? false
      : this.isCollapsedId(this.descriptors()[index].id);
  }

  /**
   * Moves a separator by `delta` share points — the programmatic equivalent of
   * an arrow key. Returns `false` when the separator cannot move.
   */
  resize(separatorIndex: number, delta: number): boolean {
    if (!this.canResize(separatorIndex)) return false;
    const flexiblePx = this.measureFlexible();
    return this.nudge(separatorIndex, (delta / 100) * flexiblePx);
  }

  /** Focuses a separator, the first one by default. */
  focus(separatorIndex = 0): void {
    this.separatorElements()[separatorIndex]?.nativeElement.focus();
  }
}

/** Parses a `size` input into a grid track. */
function parseSplitterSize(
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

/** Converts a bound into the unit its own track uses. */
function toTrackUnit(
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

function tracksToSizes(tracks: readonly OgeSplitTrack[]): OgeSplitterSize[] {
  return tracks.map((track) =>
    track.kind === 'fixed' ? `${round(track.value)}px` : round(track.value),
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sameSizes(
  a: readonly (OgeSplitterSize | undefined)[],
  b: readonly (OgeSplitterSize | undefined)[],
): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
