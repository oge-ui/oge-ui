// @oge-ui/buttons/fab — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/buttons' entry re-exports every public symbol unchanged.
export { OgeFab } from './fab';
export { OgeSpeedDial } from './speed-dial';
export {
  OGE_FAB_CONFIG,
  OGE_DEFAULT_FAB_CONFIG,
  OGE_DEFAULT_FAB_MESSAGES,
  provideOgeFabConfig,
  type OgeFabConfig,
  type OgeFabConfigInput,
  type OgeFabMessages,
} from './config';
export type {
  OgeFabClickEvent,
  OgeFabPosition,
  OgeFabPositionMode,
  OgeFabSeverity,
  OgeFabSize,
  OgeSpeedDialDirection,
  OgeSpeedDialItem,
  OgeSpeedDialItemClickEvent,
  OgeSpeedDialLabelMode,
  OgeSpeedDialOpenMode,
} from './fab-types';
