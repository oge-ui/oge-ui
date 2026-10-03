'use client';

import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from 'react';
import {
  OGE_SHEET_FOCUS_ATTR,
  type OgeAdaptiveMode,
  type OgeAdaptivePresentation,
} from '@oge-ui/behavior';
import { useOgeAdaptivePresentation } from '@oge-ui/react-overlay';
import { useOgeInputsConfig } from './inputs-config';

/** The adaptive props every popup editor accepts. */
export interface OgeAdaptiveProps {
  /**
   * `'auto'` presents the popup as a modal bottom sheet / full-screen dialog
   * on viewports narrower than `adaptiveBreakpoint`; `'none'` always anchors
   * it. `undefined` = the provider default (`'none'`).
   */
  adaptiveMode?: OgeAdaptiveMode;
  /** Viewport width (px) below which `adaptiveMode: 'auto'` applies; `undefined` = provider (600). */
  adaptiveBreakpoint?: number;
}

/**
 * Resolves an editor's adaptive presentation from its props and the inputs
 * provider — the React twin of the Angular editors' `presentation` computed.
 */
export function useAdaptivePopup(
  props: OgeAdaptiveProps,
  kind: Exclude<OgeAdaptivePresentation, 'popup'>,
): { presentation: OgeAdaptivePresentation; active: boolean } {
  const config = useOgeInputsConfig();
  const presentation = useOgeAdaptivePresentation(
    props.adaptiveMode ?? config.adaptiveMode,
    props.adaptiveBreakpoint ?? config.adaptiveBreakpoint,
    kind,
  );
  return { presentation, active: presentation !== 'popup' };
}

/** Attribute map marking the element that takes focus when a sheet opens. */
export const sheetFocusAttr = { [OGE_SHEET_FOCUS_ATTR]: '' } as Record<
  string,
  string
>;

/** The search field at the top of an adaptive list sheet. */
export function SheetSearch(props: {
  listboxId: string;
  activeDescendant: string | null | undefined;
  value: string;
  label: string;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
}): ReactNode {
  return (
    <div className="oge-popup-sheet-search">
      <input
        className="oge-sheet-search-input"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        autoComplete="off"
        {...sheetFocusAttr}
        aria-controls={props.listboxId}
        aria-activedescendant={props.activeDescendant ?? undefined}
        aria-label={props.label}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        onKeyDown={props.onKeyDown}
      />
    </div>
  );
}

/** The pinned Done action of an adaptive sheet / dialog. */
export function SheetDone(props: {
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}): ReactNode {
  return (
    <div className="oge-popup-sheet-footer">
      <button type="button" className="oge-sheet-done" onClick={props.onClick}>
        {props.label}
      </button>
    </div>
  );
}
