import { InjectionToken, type Provider } from '@angular/core';

/** Every user-facing string of the pivot grid. */
export interface OgePivotMessages {
  grandTotal: string;
  /** Subtotal label pattern; `{0}` is the group's text. */
  totalPattern: string;
  blankValue: string;
  rowArea: string;
  columnArea: string;
  dataArea: string;
  filterArea: string;
  fieldPanelHint: string;
  collapseFieldPanel: string;
  expandFieldPanel: string;
}

export const OGE_DEFAULT_PIVOT_MESSAGES: OgePivotMessages = {
  grandTotal: 'Grand Total',
  totalPattern: '{0} Total',
  blankValue: '(Blank)',
  rowArea: 'Rows',
  columnArea: 'Columns',
  dataArea: 'Values',
  filterArea: 'Filters',
  fieldPanelHint: 'Drag fields between the areas',
  collapseFieldPanel: 'Collapse field panel',
  expandFieldPanel: 'Expand field panel',
};

export const OGE_PIVOT_MESSAGES = new InjectionToken<OgePivotMessages>('OGE_PIVOT_MESSAGES', {
  factory: () => OGE_DEFAULT_PIVOT_MESSAGES,
});

/** Application- or component-scoped pivot message overrides (i18n). */
export function provideOgePivotMessages(messages: Partial<OgePivotMessages>): Provider {
  return {
    provide: OGE_PIVOT_MESSAGES,
    useValue: { ...OGE_DEFAULT_PIVOT_MESSAGES, ...messages },
  };
}
