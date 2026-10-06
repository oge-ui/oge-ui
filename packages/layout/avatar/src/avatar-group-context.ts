import { InjectionToken, type Signal } from '@angular/core';
import type { OgeAvatarShape, OgeAvatarSize } from '@oge-ui/behavior';

/**
 * What a projected `<oge-avatar>` reads from its enclosing
 * `<oge-avatar-group>`: the group-wide size and shape defaults, and whether
 * the group's overflow window hides it. Internal to the entry — a separate
 * file so the avatar and the group never import each other.
 */
export interface OgeAvatarGroupContext {
  readonly size: Signal<OgeAvatarSize | undefined>;
  readonly shape: Signal<OgeAvatarShape | undefined>;
  isHidden(avatar: object): boolean;
}

export const OGE_AVATAR_GROUP = new InjectionToken<OgeAvatarGroupContext>(
  'OGE_AVATAR_GROUP',
);
