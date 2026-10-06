import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  OGE_AVATAR_ICON_PATH,
  ogeAvatarInitials,
  ogeResolveAvatarContent,
  type OgeChipAvatar,
} from '@oge-ui/behavior';

/**
 * Internal: the leading decoration of a chip — a small avatar (image, then
 * initials) or an icon. Always `aria-hidden`: the chip's label is its name.
 * Shared by `oge-chip` and `oge-chip-list`; not part of the public API.
 */
@Component({
  // an attribute component on a <span>, so the decoration adds no wrapper
  // element inside the chip's flex row (the bpmn-svg precedent)
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span[ogeChipLead]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chip-lead',
    'aria-hidden': 'true',
    '[class.oge-chip-lead-empty]': '!avatar() && !icon()',
  },
  template: `
    @if (avatar(); as a) {
      <span class="oge-chip-avatar">
        @if (content() === 'image') {
          <img
            class="oge-chip-avatar-img"
            [src]="a.src"
            alt=""
            loading="lazy"
            (error)="failedSrc.set(a.src ?? null)"
          />
        } @else if (content() === 'initials') {
          {{ initials() }}
        } @else {
          <svg viewBox="0 0 24 24" width="14" height="14" focusable="false">
            <path [attr.d]="personPath" fill="currentColor" />
          </svg>
        }
      </span>
    } @else if (icon(); as d) {
      <svg
        class="oge-chip-icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        focusable="false"
      >
        <path [attr.d]="d" />
      </svg>
    }
  `,
})
export class OgeChipLead {
  private readonly locale = inject(LOCALE_ID);

  /** Avatar data; wins over `icon`. */
  readonly avatar = input<OgeChipAvatar | undefined>(undefined);
  /** SVG path data of the icon. */
  readonly icon = input<string | undefined>(undefined);

  protected readonly personPath = OGE_AVATAR_ICON_PATH;
  /** The source whose load failed — a new `src` gets a fresh attempt. */
  protected readonly failedSrc = signal<string | null>(null);

  protected readonly content = computed(() => {
    const a = this.avatar();
    return ogeResolveAvatarContent({
      src: a?.src,
      imageFailed: !!a?.src && this.failedSrc() === a.src,
      initials: a?.initials,
      name: a?.name,
    });
  });

  protected readonly initials = computed(() => {
    const a = this.avatar();
    return a?.initials?.trim() || ogeAvatarInitials(a?.name, this.locale);
  });
}
