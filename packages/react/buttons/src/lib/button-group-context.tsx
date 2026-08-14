'use client';

import { createContext, useContext } from 'react';
import type {
  OgeButtonGroupSelectionMode,
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
} from '@oge-ui/behavior';

/**
 * What a button inherits from an enclosing `<OgeButtonGroup>`. Mirrors the
 * Angular package's `OGE_BUTTON_GROUP` injection token — a group is optional,
 * so `null` is the standalone case.
 *
 * Deliberately *without* a full `tabIndexFor`: the group owns the roving
 * tabindex by writing it onto the rendered buttons after each render, because
 * only the DOM knows the real child order once `children` and `items` are
 * interleaved. `initialTabIndex` is the server-renderable approximation for
 * the first paint only — see its docs.
 */
export interface OgeButtonGroupContextValue {
  stylingMode: OgeButtonStylingMode | undefined;
  severity: OgeButtonSeverity | undefined;
  size: OgeButtonSize | undefined;
  disabled: boolean;
  selectionMode: OgeButtonGroupSelectionMode;
  isSelected(value: string | undefined): boolean;
  /**
   * `tabIndex` a button should render with *before* the group's layout effect
   * has run — server HTML and the first client paint. `undefined` means "no
   * better answer than the button's own prop": the DOM-order-aware roving
   * tabindex takes over on hydration.
   */
  initialTabIndex(value: string | undefined): number | undefined;
  notifyClick(
    value: string | undefined,
    event: MouseEvent | KeyboardEvent,
  ): void;
}

export const OgeButtonGroupContext =
  createContext<OgeButtonGroupContextValue | null>(null);

export function useOgeButtonGroup(): OgeButtonGroupContextValue | null {
  return useContext(OgeButtonGroupContext);
}
