// @oge-ui/layout/expansion-panel — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeExpansionPanel, OgeExpansionPanelContent } from './expansion-panel';
export type {
  OgeExpansionPanelCollapsingEvent,
  OgeExpansionPanelExpandingEvent,
  OgeExpansionPanelToggleEvent,
} from '@oge-ui/behavior';
