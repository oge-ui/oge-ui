import { InjectionToken, type Signal } from '@angular/core';
import type {
  OgeButtonSeverity,
  OgeButtonSize,
  OgeButtonStylingMode,
} from '../button/button-types';
import type { OgeButtonGroupSelectionMode } from './button-group-types';

/**
 * What a child `OgeButton` reads from its enclosing `OgeButtonGroup`.
 * Injected through `OGE_BUTTON_GROUP` so `button.ts` never imports the
 * group class (avoids a circular import).
 */
export interface OgeButtonGroupContext {
  readonly stylingMode: Signal<OgeButtonStylingMode>;
  readonly severity: Signal<OgeButtonSeverity>;
  readonly size: Signal<OgeButtonSize>;
  readonly disabled: Signal<boolean>;
  readonly selectionMode: Signal<OgeButtonGroupSelectionMode>;
  /** Whether the given button `value` is currently selected. Reactive. */
  isSelected(value: string | undefined): boolean;
  /** Roving tabindex: `0` for exactly one enabled button, `-1` otherwise. Reactive. */
  tabIndexFor(button: object): number;
  /**
   * Child buttons forward their post-pipeline clicks here (selection + group
   * outputs); `source` identifies the clicked child for index resolution.
   */
  notifyClick(
    value: string | undefined,
    event: MouseEvent | KeyboardEvent,
    source?: object,
  ): void;
}

export const OGE_BUTTON_GROUP = new InjectionToken<OgeButtonGroupContext>(
  'OGE_BUTTON_GROUP',
);
