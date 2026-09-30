// @oge-ui/layout/accordion — secondary entry point. Importing a single component from
// its own entry lets a bundler split the family per component; the primary
// '@oge-ui/layout' entry re-exports every public symbol unchanged.
export { OgeAccordion } from './accordion';
export { OgeAccordionItem } from './accordion-item';
export {
  OgeAccordionActionRow,
  OgeAccordionContentTemplate,
  OgeAccordionHeaderActionsTemplate,
  OgeAccordionHeaderTemplate,
  OgeAccordionToggleIconTemplate,
} from './templates';
export {
  OGE_ACCORDION_CONFIG,
  OGE_DEFAULT_ACCORDION_CONFIG,
  OGE_DEFAULT_ACCORDION_MESSAGES,
  provideOgeAccordionConfig,
  type OgeAccordionConfig,
  type OgeAccordionConfigInput,
  type OgeAccordionMessages,
} from './config';
export type {
  OgeAccordionCollapsedEvent,
  OgeAccordionCollapsingEvent,
  OgeAccordionContentFailedEvent,
  OgeAccordionContentLoadedEvent,
  OgeAccordionContentLoader,
  OgeAccordionContentTemplateContext,
  OgeAccordionDisplayMode,
  OgeAccordionExpandGuard,
  OgeAccordionExpandedEvent,
  OgeAccordionExpandingEvent,
  OgeAccordionHeaderActionsTemplateContext,
  OgeAccordionHeaderTemplateContext,
  OgeAccordionItemClickEvent,
  OgeAccordionItemData,
  OgeAccordionSize,
  OgeAccordionStylingMode,
  OgeAccordionTogglePosition,
  OgeAccordionToggleIconTemplateContext,
} from './accordion-types';
