// @oge-ui/layout/tile-layout — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeTileLayout } from './tile-layout';
export { OgeTileLayoutItem } from './tile-layout-item';
export {
  OgeTileLayoutContentTemplate,
  OgeTileLayoutHeaderTemplate,
  OgeTileLayoutItemHeader,
  type OgeTileLayoutTemplateContext,
} from './templates';
export {
  OGE_TILE_LAYOUT_CONFIG,
  OGE_DEFAULT_TILE_LAYOUT_CONFIG,
  OGE_DEFAULT_TILE_LAYOUT_MESSAGES,
  provideOgeTileLayoutConfig,
  type OgeTileLayoutConfig,
  type OgeTileLayoutConfigInput,
  type OgeTileLayoutMessages,
} from './config';
// validator for persisted / imported layouts (untrusted input)
export { sanitizeOgeTileLayoutState } from '@oge-ui/behavior';
export type {
  OgeTileLayoutChangeSource,
  OgeTileLayoutChangedEvent,
  OgeTileLayoutItemData,
  OgeTileLayoutKey,
  OgeTileLayoutReorderedEvent,
  OgeTileLayoutReorderingEvent,
  OgeTileLayoutResizable,
  OgeTileLayoutResizedEvent,
  OgeTileLayoutResizingEvent,
  OgeTileLayoutSpan,
  OgeTileLayoutState,
  OgeTileLayoutTileState,
} from './tile-layout-types';
