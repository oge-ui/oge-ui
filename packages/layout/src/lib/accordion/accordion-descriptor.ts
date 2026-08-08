import type { TemplateRef } from '@angular/core';
import type { OgeAccordionItem } from './accordion-item';
import type {
  OgeAccordionTogglePosition,
  OgeAccordionContentLoader,
  OgeAccordionContentTemplateContext,
  OgeAccordionExpandGuard,
  OgeAccordionHeaderActionsTemplateContext,
  OgeAccordionHeaderTemplateContext,
  OgeAccordionItemData,
  OgeAccordionToggleIconTemplateContext,
} from './accordion-types';

/**
 * Normalized view of one panel — declarative children and `items` entries are
 * merged into this shape before rendering. Module-internal (not exported from
 * the package barrel).
 */
export interface OgeAccordionDescriptor {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly title: string;
  /** Plain-text body used when the panel has no content template. */
  readonly text?: string;
  readonly description?: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly hint?: string;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly hideToggle?: boolean;
  readonly togglePosition?: OgeAccordionTogglePosition;
  /** Initially expanded — only read for `items` panels, which have no model. */
  readonly initiallyExpanded: boolean;
  /** The source `items` entry — `undefined` for declarative panels. */
  readonly item?: OgeAccordionItemData;
  /** The declarative child — `undefined` for `items` panels. Two-way target. */
  readonly source?: OgeAccordionItem;
  readonly expandGuard?: OgeAccordionExpandGuard;
  readonly contentLoader?: OgeAccordionContentLoader;
  readonly headerTemplate?: TemplateRef<OgeAccordionHeaderTemplateContext>;
  readonly contentTemplate?: TemplateRef<
    OgeAccordionContentTemplateContext | unknown
  >;
  readonly toggleIconTemplate?: TemplateRef<OgeAccordionToggleIconTemplateContext>;
  readonly headerActionsTemplate?: TemplateRef<OgeAccordionHeaderActionsTemplateContext>;
}
