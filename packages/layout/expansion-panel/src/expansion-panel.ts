import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
// The toggle pipeline (pre-event → guard → commit) lives framework-free in
// `@oge-ui/behavior` (`expansion-panel-core`), shared with the React render
// layer and the panel bar; the vocabulary is the accordion's.
import {
  ogeExpansionShowsToggle,
  runOgeExpansionToggle,
  type OgeAccordionExpandGuard,
  type OgeAccordionSize,
  type OgeAccordionStylingMode,
  type OgeAccordionTogglePosition,
  type OgeExpansionPanelCollapsingEvent,
  type OgeExpansionPanelExpandingEvent,
  type OgeExpansionPanelToggleEvent,
} from '@oge-ui/behavior';
import { OGE_ACCORDION_CONFIG } from '@oge-ui/layout/accordion';

/**
 * Marks the panel body as lazily instantiated: the template is created on
 * first expand and kept afterwards (`deferRendering`). Plain projected
 * content is always instantiated.
 *
 * ```html
 * <oge-expansion-panel title="Report">
 *   <ng-template ogeExpansionPanelContent><app-heavy-report /></ng-template>
 * </oge-expansion-panel>
 * ```
 */
@Directive({ selector: '[ogeExpansionPanelContent]' })
export class OgeExpansionPanelContent {
  readonly templateRef = inject(TemplateRef);
}

let nextId = 0;

/**
 * One stand-alone disclosure panel — Kendo's ExpansionPanel, Material's
 * `mat-expansion-panel` outside an accordion — following the WAI-ARIA APG
 * disclosure pattern: the title is a `<button aria-expanded aria-controls>`
 * inside a heading, Enter / Space toggle it, and the collapsed body is
 * `inert`.
 *
 * ```html
 * <oge-expansion-panel title="Shipping" subtitle="2 addresses" [(expanded)]="open">
 *   <button ogeExpansionPanelActions type="button">Edit</button>
 *   Shipping details…
 * </oge-expansion-panel>
 * ```
 *
 * Header actions are real buttons projected with the `ogeExpansionPanelActions`
 * attribute — they sit beside the toggle, never inside it.
 */
@Component({
  selector: 'oge-expansion-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet],
  styleUrl: './expansion-panel.scss',
  host: {
    class: 'oge-expansion-panel',
    // `title` is an input here — never the host's native tooltip
    '[attr.title]': 'null',
    '[class.oge-expansion-panel-expanded]': 'expanded()',
    '[class.oge-expansion-panel-disabled]': 'disabled()',
    '[class.oge-expansion-panel-pending]': 'pending()',
    '[attr.data-styling-mode]': 'stylingMode()',
    '[attr.data-size]': 'size()',
  },
  template: `
    <div class="oge-expansion-panel-header">
      @switch (headingLevel()) {
        @case (1) {
          <h1 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h1>
        }
        @case (2) {
          <h2 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h2>
        }
        @case (3) {
          <h3 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h3>
        }
        @case (4) {
          <h4 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h4>
        }
        @case (5) {
          <h5 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h5>
        }
        @case (6) {
          <h6 class="oge-expansion-panel-heading">
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </h6>
        }
        @default {
          <div
            class="oge-expansion-panel-heading"
            role="heading"
            [attr.aria-level]="headingLevel()"
          >
            <ng-container *ngTemplateOutlet="toggleTpl" />
          </div>
        }
      }
      <div class="oge-expansion-panel-actions">
        <ng-content select="[ogeExpansionPanelActions]" />
      </div>
    </div>
    <div
      #regionEl
      class="oge-expansion-panel-region"
      [class.oge-expansion-panel-region-open]="expanded()"
      [class.oge-expansion-panel-region-animated]="animation() !== false"
      [style.--oge-expansion-panel-transition]="animationDuration()"
      [attr.role]="useRegionRole() ? 'region' : null"
      [id]="uid + '-panel'"
      [attr.aria-labelledby]="uid + '-header'"
      [attr.inert]="expanded() ? null : ''"
    >
      <div class="oge-expansion-panel-inner">
        <div class="oge-expansion-panel-body">
          <ng-content />
          @if (lazyContent(); as lazy) {
            @if (!deferRendering() || rendered()) {
              <ng-container *ngTemplateOutlet="lazy.templateRef" />
            }
          }
        </div>
      </div>
    </div>

    <ng-template #toggleTpl>
      <button
        #toggleEl
        type="button"
        class="oge-expansion-panel-toggle"
        [attr.data-toggle-position]="togglePosition()"
        [id]="uid + '-header'"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="uid + '-panel'"
        [attr.aria-disabled]="disabled() ? true : null"
        [attr.tabindex]="disabled() ? -1 : 0"
        [attr.title]="hint() ?? null"
        (click)="onToggleClick($event)"
      >
        @if (showsToggle()) {
          <span class="oge-expansion-panel-chevron" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        }
        @if (icon(); as path) {
          <svg
            class="oge-expansion-panel-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <path
              [attr.d]="path"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        }
        <span class="oge-expansion-panel-titles">
          <span class="oge-expansion-panel-title">{{ title() }}</span>
          @if (subtitle()) {
            <span class="oge-expansion-panel-subtitle">{{ subtitle() }}</span>
          }
        </span>
        @if (pending()) {
          <span class="oge-expansion-panel-spinner" aria-hidden="true"></span>
          <span class="oge-expansion-panel-sr">{{ pendingText() }}</span>
        }
      </button>
    </ng-template>
  `,
})
export class OgeExpansionPanel {
  private readonly config = inject(OGE_ACCORDION_CONFIG);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Unique DOM id prefix of this instance. */
  protected readonly uid = `oge-expansion-panel-${nextId++}`;

  /** Header title. */
  readonly title = input('');
  /** Secondary line under the title. */
  readonly subtitle = input<string | undefined>(undefined);
  /** SVG path data (`d`) rendered as a 24×24 aria-hidden icon before the title. */
  readonly icon = input<string | undefined>(undefined);
  /** Native `title` tooltip of the header button. */
  readonly hint = input<string | undefined>(undefined);
  /**
   * Whether the body is shown — two-way. A consumer write applies directly;
   * user and method toggles run `expanding` / `collapsing` and the guard first.
   */
  readonly expanded = model(false);
  /** Blocks toggling; the header stays visible but leaves the Tab sequence. */
  readonly disabled = input(false);
  /** Veto run before every toggle — the accordion's `expandGuard`. */
  readonly expandGuard = input<OgeAccordionExpandGuard | undefined>(undefined);
  /** Side of the header the chevron sits on — logical, so RTL mirrors it. */
  readonly togglePosition = input<OgeAccordionTogglePosition>('end');
  /** Hides the chevron; falls back to the accordion config's `hideToggle`. */
  readonly hideToggle = input<boolean | undefined>(undefined);
  /** `aria-level` of the heading wrapping the header button. */
  readonly headingLevel = input(3);
  /** Gives the body `role="region"` (APG-optional). */
  readonly useRegionRole = input(true);
  /**
   * Height animation: `true` uses the default duration, a number overrides it
   * in milliseconds, `false` disables it. Suppressed under reduced motion.
   */
  readonly animation = input<boolean | number>(true);
  /**
   * Instantiate an `ogeExpansionPanelContent` template only on first expand
   * (kept afterwards). Plain projected content is always instantiated.
   */
  readonly deferRendering = input(true);
  /** Visual variant — the accordion's. */
  readonly stylingMode = input<OgeAccordionStylingMode>('outlined');
  /** Density of the header row — the accordion's. */
  readonly size = input<OgeAccordionSize>('md');

  /** Cancelable pre-event of an expand. */
  readonly expanding = output<OgeExpansionPanelExpandingEvent>();
  /** Cancelable pre-event of a collapse. */
  readonly collapsing = output<OgeExpansionPanelCollapsingEvent>();
  /**
   * The panel expanded through a user or method toggle (Material's
   * `opened`) — named so it cannot clash with the `expanded` model.
   */
  readonly opened = output<OgeExpansionPanelToggleEvent>();
  /** The panel collapsed through a user or method toggle (Material's `closed`). */
  readonly closed = output<OgeExpansionPanelToggleEvent>();

  protected readonly lazyContent = contentChild(OgeExpansionPanelContent);
  private readonly toggleEl =
    viewChild<ElementRef<HTMLButtonElement>>('toggleEl');
  private readonly regionEl = viewChild<ElementRef<HTMLElement>>('regionEl');

  /** An async guard is in flight. */
  protected readonly pending = signal(false);
  /** The lazy template rendered once. */
  protected readonly rendered = signal(false);

  protected readonly showsToggle = computed(() =>
    ogeExpansionShowsToggle(this.hideToggle(), this.config.hideToggle ?? false),
  );
  protected readonly pendingText = computed(() => this.config.messages.pending);
  protected readonly animationDuration = computed(() => {
    const value = this.animation();
    return typeof value === 'number' ? `${value}ms` : null;
  });

  constructor() {
    effect(() => {
      if (this.expanded()) untracked(() => this.rendered.set(true));
    });
  }

  /** Whether the panel is expanded — the `expanded` model's current value. */
  isExpanded(): boolean {
    return this.expanded();
  }

  /** Runs the expand pipeline; resolves whether the panel ended up expanded. */
  expand(event?: Event): Promise<boolean> {
    return this.request(true, event);
  }

  /** Runs the collapse pipeline; resolves whether the panel ended up collapsed. */
  collapse(event?: Event): Promise<boolean> {
    return this.request(false, event);
  }

  /** Expands a collapsed panel, collapses an expanded one. */
  toggle(event?: Event): Promise<boolean> {
    return this.request(!this.expanded(), event);
  }

  /** Focuses the header button. */
  focus(): void {
    this.toggleEl()?.nativeElement.focus();
  }

  protected onToggleClick(event: Event): void {
    if (this.disabled()) return;
    void this.toggle(event);
  }

  private request(next: boolean, event?: Event): Promise<boolean> {
    return runOgeExpansionToggle<
      OgeExpansionPanelExpandingEvent | OgeExpansionPanelCollapsingEvent
    >({
      next,
      current: this.expanded(),
      disabled: this.disabled(),
      pending: this.pending(),
      guard: this.expandGuard(),
      preEvent: () => ({ event, cancel: false }),
      emitPre: (pre) =>
        next ? this.expanding.emit(pre) : this.collapsing.emit(pre),
      setPending: (active) => this.pending.set(active),
      label: 'oge-expansion-panel expandGuard',
      commit: () => {
        if (!next) this.restoreFocusFromBody();
        this.expanded.set(next);
        if (next) this.opened.emit({ event });
        else this.closed.emit({ event });
      },
    });
  }

  /**
   * The collapsed body becomes `inert`, which would drop focus to `<body>`
   * if it still held it — hand focus back to the header first.
   */
  private restoreFocusFromBody(): void {
    const region = this.regionEl()?.nativeElement;
    const active = this.host.nativeElement.ownerDocument?.activeElement;
    if (region && active && region.contains(active)) this.focus();
  }
}
