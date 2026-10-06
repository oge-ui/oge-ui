// @oge-ui/layout/timeline — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeTimeline } from './timeline';
export {
  OgeTimelineContentTemplate,
  OgeTimelineMarkerTemplate,
  OgeTimelineOppositeTemplate,
  type OgeTimelineItemTemplateContext,
} from './templates';
export {
  OGE_TIMELINE_CONFIG,
  OGE_DEFAULT_TIMELINE_CONFIG,
  provideOgeTimelineConfig,
  type OgeTimelineConfig,
  type OgeTimelineConfigInput,
} from './config';
export type {
  OgeTimelineAlign,
  OgeTimelineItem,
  OgeTimelineMarkerVariant,
  OgeTimelineOrientation,
  OgeTimelineSeverity,
} from './timeline-types';
