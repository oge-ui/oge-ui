import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  contentChildren,
  inject,
  input,
} from '@angular/core';
import {
  ogeAvatarGroupWindow,
  ogeAvatarOverflowLabel,
  ogeAvatarOverflowText,
} from '@oge-ui/behavior';
import { OgeAvatar } from './avatar';
import {
  OGE_AVATAR_GROUP,
  type OgeAvatarGroupContext,
} from './avatar-group-context';
import { OGE_AVATAR_CONFIG } from './config';
import type {
  OgeAvatarItem,
  OgeAvatarShape,
  OgeAvatarSize,
} from './avatar-types';

/**
 * A row of avatars that overlap and collapse their surplus into a "+N"
 * avatar. Feed it data (`items`) or project `<oge-avatar>` children — or
 * both; `items` render first. `max` counts the rendered circles including
 * the surplus one, so the row never grows past it:
 *
 * ```html
 * <oge-avatar-group [items]="team()" [max]="4" ariaLabel="Project team" />
 *
 * <oge-avatar-group [max]="3" size="sm">
 *   <oge-avatar name="Ada Lovelace" />
 *   <oge-avatar name="Grace Hopper" />
 *   <oge-avatar name="Alan Turing" />
 *   <oge-avatar name="Edsger Dijkstra" />
 * </oge-avatar-group>
 * ```
 *
 * `total` is the full population of a partially loaded list (24 members,
 * three fetched). The host is `role="group"` once it has an `ariaLabel`; the
 * surplus avatar is a `role="img"` named "N more".
 */
@Component({
  selector: 'oge-avatar-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeAvatar],
  providers: [{ provide: OGE_AVATAR_GROUP, useExisting: OgeAvatarGroup }],
  host: {
    class: 'oge-avatar-group',
    '[class.oge-avatar-group-overlap]': 'overlap()',
    '[class]': "'oge-avatar-group-' + resolvedSize()",
    '[attr.role]': "ariaLabel() ? 'group' : null",
    '[attr.aria-label]': 'ariaLabel() || null',
  },
  styleUrl: './avatar.scss',
  template: `
    @for (item of visibleItems(); track item.key ?? $index) {
      <oge-avatar
        [name]="item.name"
        [src]="item.src"
        [initials]="item.initials"
        [status]="item.status"
        [icon]="item.icon"
        [locale]="locale()"
      />
    }
    <ng-content />
    @if (window().overflow > 0) {
      <span
        [class]="
          'oge-avatar oge-avatar-overflow oge-avatar-' +
          resolvedSize() +
          ' oge-avatar-' +
          resolvedShape()
        "
        role="img"
        [attr.aria-label]="overflowLabel()"
        ><span class="oge-avatar-initials" aria-hidden="true">{{
          overflowText()
        }}</span></span
      >
    }
  `,
})
export class OgeAvatarGroup implements OgeAvatarGroupContext {
  private readonly config = inject(OGE_AVATAR_CONFIG);
  private readonly localeId = inject(LOCALE_ID);

  /** Data-driven avatars, rendered before any projected `<oge-avatar>`. */
  readonly items = input<readonly OgeAvatarItem[]>([]);
  /** Rendered circles including the "+N" one (min 2); `undefined` = all. */
  readonly max = input<number | undefined>(undefined);
  /** Full population when the list is partial — the rest count into "+N". */
  readonly total = input<number | undefined>(undefined);
  /** Size of every avatar in the group (a child's own `size` wins). */
  readonly size = input<OgeAvatarSize | undefined>(undefined);
  /** Shape of every avatar in the group (a child's own `shape` wins). */
  readonly shape = input<OgeAvatarShape | undefined>(undefined);
  /** Overlap the avatars (stacked) instead of spacing them. */
  readonly overlap = input(true);
  /** Accessible name; the host becomes `role="group"` once it has one. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** BCP 47 locale of the "+N" digits; `undefined` = config → `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);

  private readonly children = contentChildren(OgeAvatar);

  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.localeId,
  );
  protected readonly resolvedSize = computed<OgeAvatarSize>(
    () => this.size() ?? this.config.size ?? 'md',
  );
  protected readonly resolvedShape = computed<OgeAvatarShape>(
    () => this.shape() ?? this.config.shape ?? 'circle',
  );

  protected readonly window = computed(() =>
    ogeAvatarGroupWindow(
      this.items().length + this.children().length,
      this.max(),
      this.total(),
    ),
  );
  protected readonly visibleItems = computed(() =>
    this.items().slice(0, this.window().visible),
  );
  protected readonly overflowText = computed(() =>
    ogeAvatarOverflowText(this.window().overflow, this.resolvedLocale()),
  );
  protected readonly overflowLabel = computed(() =>
    ogeAvatarOverflowLabel(
      this.window().overflow,
      this.config.messages,
      this.resolvedLocale(),
    ),
  );

  /** @internal Whether a projected child falls outside the overflow window. */
  isHidden(avatar: object): boolean {
    const index = this.children().indexOf(avatar as OgeAvatar);
    if (index < 0) return false;
    return this.items().length + index >= this.window().visible;
  }
}
