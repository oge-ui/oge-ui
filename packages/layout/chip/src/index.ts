// @oge-ui/layout/chip — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeChip } from './chip';
export { OgeChipList } from './chip-list';
export { OgeChipTemplate, type OgeChipTemplateContext } from './templates';
export {
  OGE_CHIP_CONFIG,
  OGE_DEFAULT_CHIP_CONFIG,
  OGE_DEFAULT_CHIP_MESSAGES,
  provideOgeChipConfig,
  type OgeChipConfig,
  type OgeChipConfigInput,
  type OgeChipMessages,
} from './config';
export type {
  OgeChipAvatar,
  OgeChipItem,
  OgeChipItemClickEvent,
  OgeChipItemRemovedEvent,
  OgeChipItemRemovingEvent,
  OgeChipKey,
  OgeChipRemovedEvent,
  OgeChipSelectionChangedEvent,
  OgeChipSelectionMode,
  OgeChipSeverity,
  OgeChipSize,
  OgeChipStylingMode,
} from './chip-types';
