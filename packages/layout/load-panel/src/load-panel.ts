import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
// The timing machine (showDelay / minDisplayTime), the target rule and the
// aria-busy bookkeeping live framework-free in `@oge-ui/behavior`
// (`load-panel-core`), shared with the React render layer.
import {
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OgeLoadPanelCore,
  ogeAcquireLoadPanelTarget,
  ogeLoadPanelBusyTarget,
  ogeLoadPanelNeedsPositioning,
  ogeResolveLoadPanelTarget,
  type OgeLoadPanelPosition,
} from '@oge-ui/behavior';
import {
  OGE_LOAD_INDICATOR_CONFIG,
  OgeLoadIndicator,
} from '@oge-ui/layout/load-indicator';
import { OgeLiveAnnouncer } from '@oge-ui/overlay';

/**
 * A loading overlay over a container — DevExtreme's LoadPanel: a shade that
 * blocks the pointer, the suite's load indicator and a message, shown while
 * `visible` is `true`:
 *
 * ```html
 * <section class="orders">
 *   <oge-load-panel [visible]="loading()" [showDelay]="200" [minDisplayTime]="400" />
 *   …
 * </section>
 * ```
 *
 * It covers its own parent by default, any element or selector given as
 * `target`, or the viewport with `fullScreen`. While shown the covered
 * container is `aria-busy="true"` (its previous value is restored after) and
 * the message is announced once through the shared live announcer. The
 * panel never takes or traps focus and does not make the container `inert`
 * (that would blur a focused field and drop focus to `<body>`): pointer input
 * is blocked by the shade, keyboard users are told by `aria-busy`.
 */
@Component({
  selector: 'oge-load-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeLoadIndicator],
  styleUrl: './load-panel.scss',
  host: {
    class: 'oge-load-panel',
    '[class.oge-load-panel-shown]': 'painted()',
    '[class.oge-load-panel-full-screen]': 'fullScreen()',
    '[class.oge-load-panel-shading]': 'shading()',
    '[attr.data-position]': 'position()',
    // the shade swallows pointer input meant for the covered container
    '(click)': 'swallow($event)',
    '(dblclick)': 'swallow($event)',
    '(mousedown)': 'swallow($event, true)',
    '(pointerdown)': 'swallow($event)',
    '(contextmenu)': 'swallow($event, true)',
  },
  template: `
    @if (painted()) {
      <div
        class="oge-load-panel-pane"
        [class.oge-load-panel-pane-plain]="!showPane()"
      >
        @if (showIndicator()) {
          <oge-load-indicator size="lg" [ariaLabel]="indicatorLabel()" />
        }
        @if (resolvedMessage()) {
          <!-- the indicator's name already carries the message -->
          <span
            class="oge-load-panel-message"
            [attr.aria-hidden]="showIndicator() ? 'true' : null"
            >{{ resolvedMessage() }}</span
          >
        }
      </div>
    }
  `,
})
export class OgeLoadPanel {
  private readonly config = inject(OGE_LOAD_INDICATOR_CONFIG);
  private readonly announcer = inject(OgeLiveAnnouncer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Shows the panel — two-way, so a consumer can bind `[(visible)]`. */
  readonly visible = model(false);
  /**
   * The container to cover: an element or a CSS selector. `undefined` (the
   * default) covers the panel's own parent element. A target that is not the
   * parent receives the panel as its last child while shown.
   */
  readonly target = input<Element | string | undefined>(undefined);
  /**
   * Covers the viewport instead of a container (`position: fixed`). Without
   * an explicit `target` nothing is marked `aria-busy` — on `<body>` it would
   * also mute the document's live regions.
   */
  readonly fullScreen = input(false);
  /** Text under the indicator; the localized `loadPanelMessage` is the fallback. */
  readonly message = input<string | undefined>(undefined);
  /** Renders the load indicator. */
  readonly showIndicator = input(true);
  /** Draws the raised pane behind the indicator and message. */
  readonly showPane = input(true);
  /** Dims the covered area behind the pane. */
  readonly shading = input(true);
  /** Where the pane sits inside the covered area. */
  readonly position = input<OgeLoadPanelPosition>('center');
  /**
   * Milliseconds `visible` must stay `true` before the panel appears — a load
   * that finishes sooner never flashes a panel.
   */
  readonly showDelay = input(0);
  /** Once shown, the panel stays at least this many milliseconds. */
  readonly minDisplayTime = input(0);
  /** Accessible name of the indicator; defaults to the message. */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** The panel appeared (after `showDelay`). */
  readonly shown = output<void>();
  /** The panel disappeared (after `minDisplayTime`). */
  readonly hidden = output<void>();

  /** Whether the panel is painted — the machine's output, not `visible`. */
  protected readonly painted = signal(false);

  protected readonly resolvedMessage = computed(
    () =>
      this.message() ??
      this.config.messages.loadPanelMessage ??
      OGE_DEFAULT_LOAD_INDICATOR_MESSAGES.loadPanelMessage ??
      '',
  );
  protected readonly indicatorLabel = computed(
    () =>
      this.ariaLabel() ||
      this.resolvedMessage() ||
      this.config.messages.loading,
  );

  private readonly core = new OgeLoadPanelCore({
    show: () => this.onShow(),
    hide: () => this.onHide(),
  });
  private release: (() => void) | null = null;

  constructor() {
    effect(() => {
      const visible = this.visible();
      const timings = {
        showDelay: this.showDelay(),
        minDisplayTime: this.minDisplayTime(),
      };
      if (!this.browser) return;
      untracked(() => this.core.update(visible, timings));
    });
    // a target / full-screen change while shown moves the busy mark
    effect(() => {
      this.target();
      this.fullScreen();
      untracked(() => {
        if (this.painted()) this.bindTarget();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.core.destroy();
      this.release?.();
      this.release = null;
    });
  }

  /** Whether the panel is currently painted. */
  isShown(): boolean {
    return this.painted();
  }

  protected swallow(event: Event, preventDefault = false): void {
    if (!this.painted()) return;
    event.stopPropagation();
    // keeps the focused element focused when the shade is pressed
    if (preventDefault) event.preventDefault();
  }

  private onShow(): void {
    this.painted.set(true);
    this.bindTarget();
    const message = this.resolvedMessage() || this.config.messages.loading;
    if (message) this.announcer.announce(message);
    this.shown.emit();
  }

  private onHide(): void {
    this.painted.set(false);
    this.release?.();
    this.release = null;
    this.hidden.emit();
  }

  /** Resolves the target, moves the host into it and marks it busy. */
  private bindTarget(): void {
    this.release?.();
    this.release = null;
    const hostEl = this.host.nativeElement;
    const explicit = this.target();
    const resolved = ogeResolveLoadPanelTarget(explicit, hostEl);
    const fullScreen = this.fullScreen();
    if (resolved && !fullScreen && hostEl.parentElement !== resolved) {
      resolved.appendChild(hostEl);
    }
    const busy = ogeLoadPanelBusyTarget({
      fullScreen,
      explicitTarget: explicit !== undefined,
      resolved,
    });
    if (!busy) return;
    this.release = ogeAcquireLoadPanelTarget(busy, {
      positioned: !fullScreen && ogeLoadPanelNeedsPositioning(busy),
    });
  }
}
