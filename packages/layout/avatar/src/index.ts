// @oge-ui/layout/avatar — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeAvatar } from './avatar';
export { OgeAvatarGroup } from './avatar-group';
export {
  OGE_AVATAR_CONFIG,
  OGE_DEFAULT_AVATAR_CONFIG,
  OGE_DEFAULT_AVATAR_MESSAGES,
  provideOgeAvatarConfig,
  type OgeAvatarConfig,
  type OgeAvatarConfigInput,
  type OgeAvatarMessages,
} from './config';
export type {
  OgeAvatarImageFailedEvent,
  OgeAvatarImageLoadedEvent,
  OgeAvatarItem,
  OgeAvatarShape,
  OgeAvatarSize,
  OgeAvatarStatus,
} from './avatar-types';
