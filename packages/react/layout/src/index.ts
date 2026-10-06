export { OgeCard, type OgeCardProps } from './lib/card';
export { OgeProgressBar, type OgeProgressBarProps } from './lib/progress-bar';
export {
  OgeLoadIndicator,
  type OgeLoadIndicatorProps,
  type OgeLoadIndicatorSeverity,
} from './lib/load-indicator';
export { OgeSkeleton, type OgeSkeletonProps } from './lib/skeleton';
export {
  OgeCardConfigProvider,
  useOgeCardConfig,
  OgeProgressBarConfigProvider,
  useOgeProgressBarConfig,
  OgeLoadIndicatorConfigProvider,
  useOgeLoadIndicatorConfig,
  OgeSkeletonConfigProvider,
  useOgeSkeletonConfig,
} from './lib/layout-config';
// The shared vocabulary and config shapes come from `@oge-ui/behavior` —
// re-exported so consumers import one package.
export {
  OGE_DEFAULT_CARD_CONFIG,
  OGE_DEFAULT_PROGRESS_BAR_CONFIG,
  OGE_DEFAULT_PROGRESS_BAR_MESSAGES,
  OGE_DEFAULT_LOAD_INDICATOR_CONFIG,
  OGE_DEFAULT_LOAD_INDICATOR_MESSAGES,
  OGE_DEFAULT_SKELETON_CONFIG,
} from '@oge-ui/behavior';
export type {
  OgeCardStylingMode,
  OgeCardOrientation,
  OgeCardSize,
  OgeCardSeverity,
  OgeCardActionsAlign,
  OgeCardConfig,
  OgeCardConfigInput,
  OgeProgressBarSeverity,
  OgeProgressBarType,
  OgeProgressBarCompletedEvent,
  OgeProgressBarMessages,
  OgeProgressBarConfig,
  OgeProgressBarConfigInput,
  OgeLoadIndicatorMessages,
  OgeLoadIndicatorConfig,
  OgeLoadIndicatorConfigInput,
  OgeSkeletonShape,
  OgeSkeletonAnimation,
  OgeSkeletonConfig,
  OgeSkeletonConfigInput,
} from '@oge-ui/behavior';
export {
  OgeToolbar,
  type OgeToolbarProps,
  type OgeToolbarHandle,
  type OgeToolbarItemRenderContext,
} from './lib/toolbar';
export {
  OgeToolbarConfigProvider,
  useOgeToolbarConfig,
} from './lib/layout-config';
export {
  OGE_DEFAULT_TOOLBAR_MESSAGES,
  OGE_DEFAULT_TOOLBAR_CONFIG,
} from '@oge-ui/behavior';
export type {
  OgeToolbarItemLocation,
  OgeToolbarLocateInMenu,
  OgeToolbarDisplayMode,
  OgeToolbarItemType,
  OgeToolbarOverflow,
  OgeToolbarOrientation,
  OgeToolbarSize,
  OgeToolbarStylingMode,
  OgeToolbarItemSeverity,
  OgeToolbarMenuCloseReason,
  OgeToolbarItemData,
  OgeToolbarItemClickEvent,
  OgeToolbarItemHoldEvent,
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarOverflowChangedEvent,
  OgeToolbarMenuOpeningEvent,
  OgeToolbarMenuClosingEvent,
  OgeToolbarMenuClosedEvent,
  OgeToolbarMessages,
  OgeToolbarConfig,
  OgeToolbarConfigInput,
  OgeToolbarDataSourceLike,
} from '@oge-ui/behavior';
export { OgeAccordion, type OgeAccordionProps } from './lib/accordion';
export {
  useOgeAccordion,
  type OgeAccordionBehaviorProps,
  type OgeAccordionHandle,
  type OgeAccordionItemDefinition,
  type OgeReactAccordionDescriptor,
  type OgeAccordionHeaderContext,
  type OgeAccordionContentContext,
  type OgeAccordionToggleIconContext,
  type OgeAccordionHeaderActionsContext,
} from './lib/use-accordion';
export {
  OgeAccordionConfigProvider,
  useOgeAccordionConfig,
} from './lib/layout-config';
export {
  OGE_DEFAULT_ACCORDION_MESSAGES,
  OGE_DEFAULT_ACCORDION_CONFIG,
} from '@oge-ui/behavior';
export type {
  OgeAccordionTogglePosition,
  OgeAccordionDisplayMode,
  OgeAccordionStylingMode,
  OgeAccordionSize,
  OgeAccordionExpandGuard,
  OgeAccordionContentLoader,
  OgeAccordionItemData,
  OgeAccordionExpandingEvent,
  OgeAccordionCollapsingEvent,
  OgeAccordionExpandedEvent,
  OgeAccordionCollapsedEvent,
  OgeAccordionItemClickEvent,
  OgeAccordionContentLoadedEvent,
  OgeAccordionContentFailedEvent,
  OgeAccordionMessages,
  OgeAccordionConfig,
  OgeAccordionConfigInput,
} from '@oge-ui/behavior';
export {
  OgeSplitter,
  type OgeSplitterProps,
  type OgeSplitterHandle,
  type OgeSplitterPaneItem,
} from './lib/splitter';
export {
  OgeSplitterConfigProvider,
  useOgeSplitterConfig,
} from './lib/layout-config';
export {
  OGE_DEFAULT_SPLITTER_MESSAGES,
  OGE_DEFAULT_SPLITTER_CONFIG,
} from '@oge-ui/behavior';
export type {
  OgeSplitterOrientation,
  OgeSplitterGripSide,
  OgeSplitterSize,
  OgeSplitterPaneData,
  OgeSplitterResizeStartEvent,
  OgeSplitterResizeEvent,
  OgeSplitterPaneCollapsingEvent,
  OgeSplitterPaneCollapsedEvent,
  OgeSplitterPaneClickEvent,
  OgeSplitterPaneHoldEvent,
  OgeSplitterMessages,
  OgeSplitterConfig,
  OgeSplitterConfigInput,
  OgeSplitterDataSourceLike,
} from '@oge-ui/behavior';
export {
  OgeLoadPanel,
  type OgeLoadPanelProps,
  type OgeLoadPanelTarget,
} from './lib/load-panel';
export type { OgeLoadPanelPosition } from '@oge-ui/behavior';
export {
  OgeExpansionPanel,
  type OgeExpansionPanelProps,
  type OgeExpansionPanelHandle,
} from './lib/expansion-panel';
export type {
  OgeExpansionPanelExpandingEvent,
  OgeExpansionPanelCollapsingEvent,
  OgeExpansionPanelToggleEvent,
} from '@oge-ui/behavior';
export {
  OgePanelBar,
  type OgePanelBarProps,
  type OgePanelBarHandle,
  type OgePanelBarItemDefinition,
  type OgePanelBarHeaderContext,
  type OgePanelBarContentContext,
} from './lib/panel-bar';
export type {
  OgePanelBarExpandMode,
  OgePanelBarItem,
  OgePanelBarItemClickEvent,
  OgePanelBarItemExpandingEvent,
  OgePanelBarItemCollapsingEvent,
  OgePanelBarItemToggleEvent,
  OgePanelBarSelectionChangedEvent,
} from '@oge-ui/behavior';
// --- layout and feedback components (W8a) -----------------------------------
export {
  OgeAvatar,
  OgeAvatarGroup,
  type OgeAvatarProps,
  type OgeAvatarGroupProps,
} from './lib/avatar';
export { OgeBadge, type OgeBadgeProps } from './lib/badge';
export { OgeChip, type OgeChipProps, type OgeChipHandle } from './lib/chip';
export {
  OgeChipList,
  type OgeChipListProps,
  type OgeChipListHandle,
  type OgeChipRenderContext,
} from './lib/chip-list';
export { OgeAlert, type OgeAlertProps, type OgeAlertHandle } from './lib/alert';
export {
  OgeTimeline,
  type OgeTimelineProps,
  type OgeTimelineItemRenderContext,
} from './lib/timeline';
export { OgeAppBar, type OgeAppBarProps } from './lib/app-bar';
export {
  OgeAvatarConfigProvider,
  useOgeAvatarConfig,
  OgeBadgeConfigProvider,
  useOgeBadgeConfig,
  OgeChipConfigProvider,
  useOgeChipConfig,
  OgeAlertConfigProvider,
  useOgeAlertConfig,
  OgeTimelineConfigProvider,
  useOgeTimelineConfig,
  OgeAppBarConfigProvider,
  useOgeAppBarConfig,
} from './lib/layout-config';
export {
  OGE_DEFAULT_AVATAR_CONFIG,
  OGE_DEFAULT_AVATAR_MESSAGES,
  OGE_DEFAULT_BADGE_CONFIG,
  OGE_DEFAULT_BADGE_MESSAGES,
  OGE_DEFAULT_CHIP_CONFIG,
  OGE_DEFAULT_CHIP_MESSAGES,
  OGE_DEFAULT_ALERT_CONFIG,
  OGE_DEFAULT_ALERT_MESSAGES,
  OGE_DEFAULT_TIMELINE_CONFIG,
  OGE_DEFAULT_APP_BAR_CONFIG,
} from '@oge-ui/behavior';
export type {
  OgeAvatarConfig,
  OgeAvatarConfigInput,
  OgeAvatarImageFailedEvent,
  OgeAvatarImageLoadedEvent,
  OgeAvatarItem,
  OgeAvatarMessages,
  OgeAvatarShape,
  OgeAvatarSize,
  OgeAvatarStatus,
  OgeBadgeConfig,
  OgeBadgeConfigInput,
  OgeBadgeMessages,
  OgeBadgeOverlap,
  OgeBadgePosition,
  OgeBadgeSeverity,
  OgeBadgeSize,
  OgeBadgeValue,
  OgeChipAvatar,
  OgeChipConfig,
  OgeChipConfigInput,
  OgeChipItem,
  OgeChipItemClickEvent,
  OgeChipItemRemovedEvent,
  OgeChipItemRemovingEvent,
  OgeChipKey,
  OgeChipMessages,
  OgeChipRemovedEvent,
  OgeChipSelectionChangedEvent,
  OgeChipSelectionMode,
  OgeChipSeverity,
  OgeChipSize,
  OgeChipStylingMode,
  OgeAlertClosedEvent,
  OgeAlertClosingEvent,
  OgeAlertConfig,
  OgeAlertConfigInput,
  OgeAlertLive,
  OgeAlertMessages,
  OgeAlertSeverity,
  OgeAlertStylingMode,
  OgeTimelineAlign,
  OgeTimelineConfig,
  OgeTimelineConfigInput,
  OgeTimelineItem,
  OgeTimelineMarkerVariant,
  OgeTimelineOrientation,
  OgeTimelineSeverity,
  OgeAppBarCenterAlign,
  OgeAppBarColor,
  OgeAppBarConfig,
  OgeAppBarConfigInput,
  OgeAppBarLandmark,
  OgeAppBarPosition,
  OgeAppBarPositionMode,
  OgeAppBarSize,
} from '@oge-ui/behavior';
