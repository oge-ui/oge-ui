// @oge-ui/layout/panel-bar — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export {
  OgePanelBar,
  OgePanelBarContentTemplate,
  OgePanelBarHeaderTemplate,
  type OgePanelBarContentTemplateContext,
  type OgePanelBarHeaderTemplateContext,
} from './panel-bar';
export type {
  OgePanelBarExpandMode,
  OgePanelBarItem,
  OgePanelBarItemClickEvent,
  OgePanelBarItemCollapsingEvent,
  OgePanelBarItemExpandingEvent,
  OgePanelBarItemToggleEvent,
  OgePanelBarSelectionChangedEvent,
} from '@oge-ui/behavior';
