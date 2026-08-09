import type { OgeAsyncGuard } from '@oge-ui/core';

/** Main axis of the step list — drives the layout and the arrow keys. */
export type OgeStepperOrientation = 'horizontal' | 'vertical';

/** How much of a step header is rendered. */
export type OgeStepperDisplay = 'full' | 'label' | 'indicator';

/**
 * What a step's indicator shows right now, derived from the step's own flags:
 * `'active'` for the current step, `'error'` for an invalid one the user has
 * already left, `'done'` for a completed one, `'number'` otherwise.
 */
export type OgeStepState = 'number' | 'active' | 'done' | 'error';

/**
 * Veto hook run before leaving a step. Returning `false`, throwing, or
 * rejecting all keep the user where they are; a promise reports pending.
 */
export type OgeStepGuard = OgeAsyncGuard;

/** One data-driven step. */
export interface OgeStepData {
  /** Stable identity used by `activeKey` and DOM ids. */
  key?: string;
  /** Header label. */
  label?: string;
  /** Secondary line under the label. */
  description?: string;
  /** SVG path data (`d`) for an indicator icon, replacing the number. */
  icon?: string;
  /** Class(es) for an indicator icon element — the icon-font hook. */
  iconClass?: string;
  /** Disabled steps cannot be activated and are skipped by the arrow keys. */
  disabled?: boolean;
  /** `false` removes the step entirely. */
  visible?: boolean;
  /** Marks the step finished; a linear stepper may then move past it. */
  completed?: boolean;
  /** A linear stepper may be advanced past an optional step regardless. */
  optional?: boolean;
  /** `false` blocks going *back* into this step once it has been left. */
  editable?: boolean;
  /** Renders the error indicator and blocks a linear advance. */
  invalid?: boolean;
  /** Shown under the label while `invalid`, in place of `description`. */
  errorMessage?: string;
  /** Extra class on the step header. */
  cssClass?: string;
  /** Veto hook run before leaving this step. */
  stepGuard?: OgeStepGuard;
}

/** Cancelable pre-event of a step change, emitted before the guard runs. */
export interface OgeStepChangingEvent {
  fromIndex: number;
  toIndex: number;
  fromKey?: string;
  toKey?: string;
  /** The source `steps` entry — `undefined` for declarative children. */
  item?: OgeStepData;
  event?: Event;
  cancel: boolean;
}

/** The active step changed. */
export interface OgeStepChangedEvent {
  index: number;
  key?: string;
  previousIndex: number;
  previousKey?: string;
  item?: OgeStepData;
  event?: Event;
}

/** A step change was refused, and by what. */
export interface OgeStepBlockedEvent {
  fromIndex: number;
  toIndex: number;
  /**
   * `'linear'` — an earlier step is not complete; `'editable'` — the target
   * refuses to be revisited; `'guard'` — the step's own `stepGuard` vetoed;
   * `'disabled'` — the target step is disabled.
   */
  reason: 'linear' | 'editable' | 'guard' | 'disabled';
}

/** The last step was activated and confirmed. */
export interface OgeStepperFinishEvent {
  index: number;
  key?: string;
}

/** Context of `[ogeStepHeaderTemplate]` and `[ogeStepIndicatorTemplate]`. */
export interface OgeStepTemplateContext {
  /** The source `steps` entry — `undefined` for declarative children. */
  $implicit: OgeStepData | undefined;
  index: number;
  state: OgeStepState;
}
