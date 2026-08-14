import {
  edgeEnabledIndex,
  stepEnabledIndex,
  type OgeAsyncGuard,
} from '@oge-ui/core';

/**
 * The framework-free half of the stepper (ADR 0001): its vocabulary, the event
 * payloads, the message catalog and the config merge rule, the normalized step
 * descriptor, and the pure decisions both render layers make — step state,
 * reachability, the linear-mode rules and the keyboard arithmetic.
 *
 * Nothing here touches the DOM or a framework; each render layer extends
 * {@link OgeStepDescriptorCore} with its own content slots (`TemplateRef` in
 * Angular, `ReactNode` / render props in React).
 */

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

/** Why a step change was refused. */
export type OgeStepBlockReason = 'linear' | 'editable' | 'guard' | 'disabled';

/** A step change was refused, and by what. */
export interface OgeStepBlockedEvent {
  fromIndex: number;
  toIndex: number;
  /**
   * `'linear'` — an earlier step is not complete; `'editable'` — the target
   * refuses to be revisited; `'guard'` — the step's own `stepGuard` vetoed;
   * `'disabled'` — the target step is disabled.
   */
  reason: OgeStepBlockReason;
}

/** The last step was activated and confirmed. */
export interface OgeStepperFinishEvent {
  index: number;
  key?: string;
}

// --- config ----------------------------------------------------------------

/** Every user-facing string the stepper renders, including aria labels. */
export interface OgeStepperMessages {
  /** Accessible name of the step list when the application supplies none. */
  stepper: string;
  /** Sub-label on an optional step. */
  optional: string;
  /** Visually hidden suffix announcing a completed step. */
  completed: string;
  /** Visually hidden suffix announcing a step with errors. */
  invalid: string;
  /** Label of the built-in "back" button. */
  previous: string;
  /** Label of the built-in "next" button. */
  next: string;
  /** Label of the built-in button on the last step. */
  finish: string;
}

export const OGE_DEFAULT_STEPPER_MESSAGES: OgeStepperMessages = {
  stepper: 'Steps',
  optional: 'Optional',
  completed: 'Completed',
  invalid: 'Has errors',
  previous: 'Back',
  next: 'Next',
  finish: 'Finish',
};

export interface OgeStepperConfig {
  messages: OgeStepperMessages;
  /** Default for the `orientation` input. */
  orientation?: OgeStepperOrientation;
  /** Default for the `display` input. */
  display?: OgeStepperDisplay;
  /** Default for the `linear` input. */
  linear?: boolean;
}

export const OGE_DEFAULT_STEPPER_CONFIG: OgeStepperConfig = {
  messages: OGE_DEFAULT_STEPPER_MESSAGES,
};

export type OgeStepperConfigInput = Partial<
  Omit<OgeStepperConfig, 'messages'>
> & {
  messages?: Partial<OgeStepperMessages>;
};

/** Merges a partial config over the defaults (messages merge key by key). */
export function resolveOgeStepperConfig(
  input: OgeStepperConfigInput | undefined,
): OgeStepperConfig {
  return {
    ...OGE_DEFAULT_STEPPER_CONFIG,
    ...input,
    messages: { ...OGE_DEFAULT_STEPPER_MESSAGES, ...input?.messages },
  };
}

// --- descriptor ------------------------------------------------------------

/**
 * The render-layer-agnostic half of a normalized step. Declarative children
 * and `steps` entries are merged into this shape before rendering, so nothing
 * downstream branches on which source an entry came from.
 */
export interface OgeStepDescriptorCore {
  /** Stable id: `key` when present, else a per-source auto id. */
  readonly id: string;
  readonly key?: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: string;
  readonly iconClass?: string;
  readonly disabled: boolean;
  readonly completed: boolean;
  readonly optional: boolean;
  readonly editable: boolean;
  readonly invalid: boolean;
  readonly errorMessage?: string;
  readonly cssClass?: string;
  readonly stepGuard?: OgeStepGuard;
  /** The source `steps` entry — `undefined` for declarative children. */
  readonly item?: OgeStepData;
}

/** Normalizes one `steps` entry into a descriptor core. */
export function stepItemDescriptor(
  item: OgeStepData,
  index: number,
): OgeStepDescriptorCore {
  return {
    id: item.key ?? `i${index}`,
    key: item.key,
    label: item.label ?? '',
    description: item.description,
    icon: item.icon,
    iconClass: item.iconClass,
    disabled: item.disabled ?? false,
    completed: item.completed ?? false,
    optional: item.optional ?? false,
    editable: item.editable ?? true,
    invalid: item.invalid ?? false,
    errorMessage: item.errorMessage,
    cssClass: item.cssClass,
    stepGuard: item.stepGuard,
    item,
  };
}

/** Resolves an index-or-key target against the rendered descriptors. */
export function resolveStepIndex(
  descriptors: readonly OgeStepDescriptorCore[],
  target: number | string,
): number {
  if (typeof target === 'number') return target;
  return descriptors.findIndex((d) => d.key === target);
}

// --- decisions -------------------------------------------------------------

/**
 * The indicator's state. `error` outranks `done` so an invalid step the user
 * has already completed still reads as needing attention.
 */
export function stepState(
  descriptor: OgeStepDescriptorCore,
  index: number,
  activeIndex: number,
): OgeStepState {
  if (descriptor.invalid) return 'error';
  if (index === activeIndex) return 'active';
  if (descriptor.completed) return 'done';
  return 'number';
}

/** Every step before `index` is complete, optional, or was skipped legally. */
export function stepsCompleteBefore(
  descriptors: readonly OgeStepDescriptorCore[],
  index: number,
): boolean {
  return descriptors.slice(0, index).every((d) => d.completed || d.optional);
}

/** Inputs of the two linear-mode decisions. */
export interface OgeStepReachRequest {
  readonly descriptors: readonly OgeStepDescriptorCore[];
  readonly index: number;
  readonly activeIndex: number;
  readonly linear: boolean;
  /** Whether the whole stepper is disabled. */
  readonly disabled: boolean;
}

/** Whether a header may be activated at all — drives `aria-disabled`. */
export function isStepReachable(request: OgeStepReachRequest): boolean {
  const { descriptors, index, activeIndex, linear, disabled } = request;
  const d = descriptors[index];
  if (!d || d.disabled || disabled) return false;
  if (index === activeIndex) return true;
  if (index < activeIndex) return d.editable;
  return !linear || stepsCompleteBefore(descriptors, index);
}

/**
 * Why a step change is refused, or `null` when the navigation rules allow it.
 * The step's own `stepGuard` is a separate stage and reports `'guard'` itself.
 */
export function stepBlockReason(
  request: OgeStepReachRequest,
): OgeStepBlockReason | null {
  const { descriptors, index, activeIndex, linear } = request;
  const target = descriptors[index];
  if (!target) return null;
  if (target.disabled) return 'disabled';
  if (index < activeIndex && !target.editable) return 'editable';
  if (index > activeIndex && linear && !stepsCompleteBefore(descriptors, index))
    return 'linear';
  return null;
}

/** Keys that move the focused header along the list's main axis. */
export interface OgeStepperArrowKeys {
  readonly next: string;
  readonly previous: string;
}

/** The arrow keys of an orientation, mirrored in RTL on the inline axis. */
export function stepperArrowKeys(
  orientation: OgeStepperOrientation,
  rtl: boolean,
): OgeStepperArrowKeys {
  if (orientation === 'vertical') {
    return { next: 'ArrowDown', previous: 'ArrowUp' };
  }
  return rtl
    ? { next: 'ArrowLeft', previous: 'ArrowRight' }
    : { next: 'ArrowRight', previous: 'ArrowLeft' };
}

/** Inputs of {@link stepperKeyTarget}. */
export interface OgeStepperKeyRequest {
  readonly key: string;
  readonly orientation: OgeStepperOrientation;
  readonly rtl: boolean;
  readonly count: number;
  /** Index the focus currently sits on. */
  readonly current: number;
  readonly isDisabled: (index: number) => boolean;
}

/**
 * Index the arrow / Home / End keys move focus to, `null` when the key is one
 * of the map's but has nowhere to go, and `undefined` when the key is not part
 * of the map at all (the caller must then leave the event alone).
 *
 * The steps deliberately **do not wrap**: stepping from the last step back to
 * the first is not a thing a process does.
 */
export function stepperKeyTarget(
  request: OgeStepperKeyRequest,
): number | null | undefined {
  const { key, orientation, rtl, count, current, isDisabled } = request;
  const arrows = stepperArrowKeys(orientation, rtl);
  if (key === arrows.next) {
    return stepEnabledIndex(count, current, 1, isDisabled, false);
  }
  if (key === arrows.previous) {
    return stepEnabledIndex(count, current, -1, isDisabled, false);
  }
  if (key === 'Home') return edgeEnabledIndex(count, 1, isDisabled);
  if (key === 'End') return edgeEnabledIndex(count, -1, isDisabled);
  return undefined;
}
