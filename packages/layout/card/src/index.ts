// @oge-ui/layout/card — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeCard } from './card';
export {
  OgeCardActions,
  OgeCardAvatar,
  OgeCardFooter,
  OgeCardHeaderActions,
  OgeCardMedia,
  OgeCardSeparator,
} from './templates';
export {
  OGE_CARD_CONFIG,
  OGE_DEFAULT_CARD_CONFIG,
  provideOgeCardConfig,
  type OgeCardConfig,
  type OgeCardConfigInput,
} from './config';
export type {
  OgeCardActionsAlign,
  OgeCardOrientation,
  OgeCardSeverity,
  OgeCardSize,
  OgeCardStylingMode,
} from './card-types';
