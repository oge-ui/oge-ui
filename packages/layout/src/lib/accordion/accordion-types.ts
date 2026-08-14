import type { OgeAccordionItemData } from '@oge-ui/behavior';

// The accordion vocabulary, its event payloads and the `items` shape live
// framework-free in `@oge-ui/behavior` (`accordion-core`), shared with the
// React render layer; re-exported here so existing imports keep working. Only
// the Angular template-slot contexts stay local — `$implicit` has no meaning
// elsewhere.
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
} from '@oge-ui/behavior';

/** Context of `[ogeAccordionHeaderTemplate]`. */
export interface OgeAccordionHeaderTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  expanded: boolean;
  title: string;
  description?: string;
}

/** Context of `[ogeAccordionContentTemplate]`. */
export interface OgeAccordionContentTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  /** Value resolved by the panel's `contentLoader`, `undefined` without one. */
  data: unknown;
}

/** Context of `[ogeAccordionToggleIconTemplate]`. */
export interface OgeAccordionToggleIconTemplateContext {
  $implicit: boolean;
  index: number;
}

/** Context of `[ogeAccordionHeaderActionsTemplate]`. */
export interface OgeAccordionHeaderActionsTemplateContext {
  $implicit: OgeAccordionItemData | undefined;
  index: number;
  expanded: boolean;
}
