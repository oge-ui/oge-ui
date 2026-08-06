import { InjectionToken, type Signal } from '@angular/core';
import type { OgeInputsMessages } from '../config';
import type { OgeInputLabelMode, OgeInputSubscriptSizing } from './input-types';

/** Counter state rendered in the subscript end slot. */
export interface OgeInputCounterState {
  count: number;
  max: number | undefined;
  over: boolean;
}

/** Password reveal feature block (text box only). */
export interface OgeInputRevealApi {
  readonly visible: Signal<boolean>;
  readonly active: Signal<boolean>;
  toggle(): void;
}

/** Copy-to-clipboard feature block. */
export interface OgeInputCopyApi {
  readonly visible: Signal<boolean>;
  readonly copied: Signal<boolean>;
  trigger(): void;
}

/** Spin buttons feature block (number box only). */
export interface OgeInputSpinApi {
  readonly visible: Signal<boolean>;
  readonly canUp: Signal<boolean>;
  readonly canDown: Signal<boolean>;
  press(dir: 1 | -1, event: Event): void;
  release(): void;
}

/**
 * What the internal field chrome reads from its owning editor. Editors
 * provide themselves via `OGE_INPUT_HOST` (same bridge pattern as the
 * button group's context token). Feature blocks are `null` where an editor
 * doesn't support them — the chrome renders rail sections conditionally, so
 * the rail order is defined once and can never drift between editors.
 */
export interface OgeInputHost {
  readonly msg: Signal<OgeInputsMessages>;
  readonly label: Signal<string>;
  readonly labelMode: Signal<OgeInputLabelMode>;
  readonly required: Signal<boolean>;
  readonly hint: Signal<string | undefined>;
  readonly subscriptSizing: Signal<OgeInputSubscriptSizing>;
  readonly showError: Signal<boolean>;
  readonly resolvedErrorText: Signal<string | null>;
  readonly pendingVisible: Signal<boolean>;
  readonly successVisible: Signal<boolean>;
  readonly showClear: Signal<boolean>;
  readonly counter: Signal<OgeInputCounterState | null>;
  readonly inputId: string;
  readonly labelId: string;
  readonly hintId: string;
  readonly errorId: string;
  readonly counterId: string;
  readonly reveal: OgeInputRevealApi | null;
  readonly copy: OgeInputCopyApi | null;
  readonly spin: OgeInputSpinApi | null;
  clear(): void;
  focus(): void;
}

export const OGE_INPUT_HOST = new InjectionToken<OgeInputHost>(
  'OGE_INPUT_HOST',
);
