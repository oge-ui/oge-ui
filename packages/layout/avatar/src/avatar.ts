import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  OGE_AVATAR_ICON_PATH,
  ogeAvatarInitials,
  ogeAvatarLabel,
  ogeResolveAvatarContent,
  type OgeAvatarContentType,
} from '@oge-ui/behavior';
import { OGE_AVATAR_GROUP } from './avatar-group-context';
import { OGE_AVATAR_CONFIG } from './config';
import type {
  OgeAvatarImageFailedEvent,
  OgeAvatarImageLoadedEvent,
  OgeAvatarShape,
  OgeAvatarSize,
  OgeAvatarStatus,
} from './avatar-types';

/**
 * A person or entity as an image, initials or an icon — the fallback chain
 * runs on its own: while `src` loads it shows the image, a failed load falls
 * back to the initials (explicit, or derived from `name`), and without either
 * it draws the icon.
 *
 * ```html
 * <oge-avatar name="Ada Lovelace" src="/people/ada.jpg" status="online" />
 * <oge-avatar name="Grace Hopper" size="lg" shape="rounded" />
 * ```
 *
 * The host is `role="img"` named by `ariaLabel` → `name` → the catalog's
 * `avatar`, with the presence appended ("Ada Lovelace (Online)") because the
 * status dot is `aria-hidden` decoration. Next to visible name text, set
 * `decorative` so a screen reader does not hear the name twice.
 */
@Component({
  selector: 'oge-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-avatar',
    '[class]': 'hostClasses()',
    '[attr.role]': "decorative() ? null : 'img'",
    '[attr.aria-label]': 'decorative() ? null : label()',
    '[attr.aria-hidden]': "decorative() ? 'true' : null",
    '[attr.hidden]': 'hiddenInGroup() ? "" : null',
  },
  styleUrl: './avatar.scss',
  template: `
    @switch (content()) {
      @case ('image') {
        <img
          class="oge-avatar-image"
          alt=""
          aria-hidden="true"
          [src]="src()"
          [attr.loading]="imageLoading()"
          (load)="onLoad($event)"
          (error)="onError($event)"
        />
      }
      @case ('initials') {
        <span class="oge-avatar-initials" aria-hidden="true">{{
          initialsText()
        }}</span>
      }
      @default {
        <svg
          class="oge-avatar-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path [attr.d]="iconPath()" />
        </svg>
      }
    }
    @if (status(); as s) {
      <span
        [class]="'oge-avatar-status oge-avatar-status-' + s"
        aria-hidden="true"
      ></span>
    }
  `,
})
export class OgeAvatar {
  private readonly config = inject(OGE_AVATAR_CONFIG);
  private readonly group = inject(OGE_AVATAR_GROUP, { optional: true });
  private readonly localeId = inject(LOCALE_ID);

  /** Person or entity name — the accessible name and the initials source. */
  readonly name = input<string | undefined>(undefined);
  /** Image URL; a failed load falls back to the initials, then the icon. */
  readonly src = input<string | undefined>(undefined);
  /** Explicit initials, overriding the ones derived from `name`. */
  readonly initials = input<string | undefined>(undefined);
  /** SVG path data (`d`, 24×24 viewBox) of the fallback icon; a person by default. */
  readonly icon = input<string | undefined>(undefined);
  /** Size preset — `xs` 24 / `sm` 32 / `md` 40 / `lg` 48 / `xl` 64 px. */
  readonly size = input<OgeAvatarSize | undefined>(undefined);
  /** Outline: `circle` (default), `rounded` or `square`. */
  readonly shape = input<OgeAvatarShape | undefined>(undefined);
  /** Presence dot, announced as part of the accessible name. */
  readonly status = input<OgeAvatarStatus | undefined>(undefined);
  /**
   * Pure decoration (the name is already visible beside it): the host becomes
   * `aria-hidden` with no role.
   */
  readonly decorative = input(false);
  /** Accessible name override. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Native `loading` of the image. */
  readonly imageLoading = input<'lazy' | 'eager'>('lazy');
  /** BCP 47 locale of the initials casing; `undefined` = config → `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);

  /** The image at `src` loaded. */
  readonly imageLoaded = output<OgeAvatarImageLoadedEvent>();
  /** The image at `src` failed; the avatar now shows its initials or icon. */
  readonly imageFailed = output<OgeAvatarImageFailedEvent>();

  /** Reset whenever `src` changes — a new URL gets a fresh attempt. */
  private readonly failed = linkedSignal({
    source: this.src,
    computation: () => false,
  });

  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );

  protected readonly resolvedSize = computed<OgeAvatarSize>(
    () => this.size() ?? this.group?.size() ?? this.config.size ?? 'md',
  );
  protected readonly resolvedShape = computed<OgeAvatarShape>(
    () => this.shape() ?? this.group?.shape() ?? this.config.shape ?? 'circle',
  );

  protected readonly initialsText = computed(
    () =>
      this.initials()?.trim() ||
      ogeAvatarInitials(this.name(), this.resolvedLocale()),
  );

  protected readonly content = computed<OgeAvatarContentType>(() =>
    ogeResolveAvatarContent({
      src: this.src(),
      imageFailed: this.failed(),
      initials: this.initials(),
      name: this.name(),
    }),
  );

  protected readonly label = computed(() =>
    ogeAvatarLabel({
      ariaLabel: this.ariaLabel(),
      name: this.name(),
      status: this.status(),
      messages: this.config.messages,
    }),
  );

  protected readonly iconPath = computed(
    () => this.icon() ?? OGE_AVATAR_ICON_PATH,
  );

  protected readonly hiddenInGroup = computed(
    () => this.group?.isHidden(this) ?? false,
  );

  protected readonly hostClasses = computed(
    () =>
      `oge-avatar oge-avatar-${this.resolvedSize()} oge-avatar-${this.resolvedShape()} oge-avatar-type-${this.content()}`,
  );

  protected onLoad(event: Event): void {
    this.imageLoaded.emit({ src: this.src() ?? '', event });
  }

  protected onError(event: Event): void {
    this.failed.set(true);
    this.imageFailed.emit({ src: this.src() ?? '', event });
  }
}
