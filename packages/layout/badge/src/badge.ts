import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  afterEveryRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  ogeBadgeDescription,
  ogeBadgeText,
  ogeBadgeVisible,
  syncOgeBadgeHostAria,
} from '@oge-ui/behavior';
import { OGE_BADGE_CONFIG } from './config';
import type {
  OgeBadgeOverlap,
  OgeBadgePosition,
  OgeBadgeSeverity,
  OgeBadgeSize,
  OgeBadgeValue,
} from './badge-types';

let nextBadgeId = 0;

/**
 * A count, a short text or a dot — standalone, or overlaid on the content
 * it wraps:
 *
 * ```html
 * <oge-badge [value]="unread()">
 *   <button type="button">Inbox</button>
 * </oge-badge>
 *
 * <oge-badge value="Beta" severity="accent" />
 * <oge-badge [dot]="true" description="New messages" />
 * ```
 *
 * The glyph is always `aria-hidden` decoration — a bare "5" says nothing to a
 * screen reader. What is read is the description ("5 new items", or your
 * `description`): an overlay badge points the wrapped control's
 * `aria-describedby` at it, so it is heard together with the control's name;
 * a standalone badge renders it as visually hidden text. Counts above `max`
 * show "99+". `announce` speaks later changes through a polite live region
 * (the initial value is never announced).
 */
@Component({
  selector: 'oge-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-badge',
    '[class]': 'hostClasses()',
    '[class.oge-badge-overlay]': 'overlay()',
    '[class.oge-badge-dot]': 'dot()',
    '[class.oge-badge-circle]': "overlap() === 'circle'",
    '[class.oge-badge-hidden]': '!visible()',
  },
  styleUrl: './badge.scss',
  template: `
    <span class="oge-badge-anchor" #anchor><ng-content /></span>
    @if (visible()) {
      <span class="oge-badge-indicator" aria-hidden="true">{{ text() }}</span>
      @if (overlay()) {
        <span [id]="descriptionId" hidden>{{ descriptionText() }}</span>
      } @else {
        <span class="oge-badge-sr">{{ descriptionText() }}</span>
      }
    }
    @if (announce()) {
      <span class="oge-badge-sr" aria-live="polite" aria-atomic="true">{{
        announcement()
      }}</span>
    }
  `,
})
export class OgeBadge {
  private readonly config = inject(OGE_BADGE_CONFIG);
  private readonly localeId = inject(LOCALE_ID);

  /** A number, a short text, or `null` (no badge). */
  readonly value = input<OgeBadgeValue>(null);
  /** Counts above it show the `overflow` pattern ("99+"); `undefined` = config → 99. */
  readonly max = input<number | undefined>(undefined);
  /** A small dot instead of a value. */
  readonly dot = input(false);
  /** Show a `0` count (hidden by default). */
  readonly showZero = input(false);
  /** Force-hide the badge, e.g. while a count loads. */
  readonly invisible = input(false);
  /** Colour; `undefined` = config → `danger`. */
  readonly severity = input<OgeBadgeSeverity | undefined>(undefined);
  /** Size preset of the count badge. */
  readonly size = input<OgeBadgeSize>('md');
  /** Corner of the wrapped content (logical); `undefined` = config → `top-end`. */
  readonly position = input<OgeBadgePosition | undefined>(undefined);
  /** `circle` pulls the badge onto the outline of a round host (an avatar). */
  readonly overlap = input<OgeBadgeOverlap>('rectangle');
  /** Accessible text override — the default reads the catalog's `count` / `dot`. */
  readonly description = input<string | undefined>(undefined);
  /** Announce later changes through a polite live region. */
  readonly announce = input(false);
  /** BCP 47 locale of the digits and the plural; `undefined` = config → `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);

  protected readonly descriptionId = `oge-badge-${nextBadgeId++}`;
  private readonly anchor =
    viewChild.required<ElementRef<HTMLElement>>('anchor');

  /** Whether the badge wraps content (decided after render, from the DOM). */
  protected readonly overlay = signal(false);
  protected readonly announcement = signal('');

  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );
  private readonly resolvedMax = computed(() => this.max() ?? this.config.max);

  protected readonly visible = computed(() =>
    ogeBadgeVisible({
      value: this.value(),
      dot: this.dot(),
      showZero: this.showZero(),
      invisible: this.invisible(),
    }),
  );
  protected readonly text = computed(() =>
    ogeBadgeText({
      value: this.value(),
      dot: this.dot(),
      max: this.resolvedMax(),
      messages: this.config.messages,
      locale: this.resolvedLocale(),
    }),
  );
  protected readonly descriptionText = computed(() =>
    this.visible()
      ? ogeBadgeDescription({
          value: this.value(),
          dot: this.dot(),
          max: this.resolvedMax(),
          description: this.description(),
          messages: this.config.messages,
          locale: this.resolvedLocale(),
        })
      : '',
  );
  protected readonly hostClasses = computed(
    () =>
      `oge-badge oge-badge-${this.severity() ?? this.config.severity ?? 'danger'} oge-badge-${this.position() ?? this.config.position ?? 'top-end'} oge-badge-size-${this.size()}`,
  );

  private aria: { target: Element; id: string } | null = null;

  constructor() {
    afterEveryRender(() => {
      const anchor = this.anchor().nativeElement;
      // comments (control-flow anchors) and blank text are not content
      const hasContent = Array.from(anchor.childNodes).some(
        (node) =>
          node.nodeType === 1 ||
          (node.nodeType === 3 && !!node.textContent?.trim()),
      );
      if (hasContent !== untracked(this.overlay)) this.overlay.set(hasContent);
      this.aria = syncOgeBadgeHostAria(
        anchor,
        hasContent && untracked(this.visible) ? this.descriptionId : null,
        this.aria,
      );
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.aria) syncOgeBadgeHostAria(null, null, this.aria);
      this.aria = null;
    });

    // later changes only — the initial value is part of the page, not news
    let previous: string | null = null;
    effect(() => {
      const next = this.descriptionText();
      const announce = this.announce();
      untracked(() => {
        if (announce && previous !== null && next !== previous)
          this.announcement.set(next);
        previous = next;
      });
    });
  }
}
