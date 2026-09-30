// @oge-ui/layout/splitter — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeSplitter } from './splitter';
export { OgeSplitterPane } from './splitter-pane';
export { OgeSplitterPaneTemplate } from './templates';
export {
  OGE_DEFAULT_SPLITTER_CONFIG,
  OGE_DEFAULT_SPLITTER_MESSAGES,
  OGE_SPLITTER_CONFIG,
  provideOgeSplitterConfig,
  type OgeSplitterConfig,
  type OgeSplitterConfigInput,
  type OgeSplitterMessages,
} from './config';
export type {
  OgeSplitterGripSide,
  OgeSplitterOrientation,
  OgeSplitterPaneClickEvent,
  OgeSplitterPaneCollapsedEvent,
  OgeSplitterPaneCollapsingEvent,
  OgeSplitterPaneData,
  OgeSplitterPaneHoldEvent,
  OgeSplitterPaneTemplateContext,
  OgeSplitterResizeEvent,
  OgeSplitterResizeStartEvent,
  OgeSplitterSize,
} from './splitter-types';
