import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_STEPPER_MESSAGES,
  isStepReachable,
  resolveOgeStepperConfig,
  resolveStepIndex,
  stepBlockReason,
  stepItemDescriptor,
  stepState,
  stepsCompleteBefore,
  stepperArrowKeys,
  stepperKeyTarget,
  type OgeStepDescriptorCore,
} from './stepper-core';

const step = (
  spec: Partial<OgeStepDescriptorCore> & { id: string },
): OgeStepDescriptorCore => ({
  label: spec.id,
  disabled: false,
  completed: false,
  optional: false,
  editable: true,
  invalid: false,
  ...spec,
});

describe('resolveOgeStepperConfig', () => {
  it('defaults, merges messages key by key and carries the defaults through', () => {
    expect(resolveOgeStepperConfig(undefined).messages).toEqual(
      OGE_DEFAULT_STEPPER_MESSAGES,
    );
    const config = resolveOgeStepperConfig({
      linear: true,
      orientation: 'vertical',
      messages: { finish: 'Bitir' },
    });
    expect(config).toMatchObject({ linear: true, orientation: 'vertical' });
    expect(config.messages.finish).toBe('Bitir');
    expect(config.messages.next).toBe(OGE_DEFAULT_STEPPER_MESSAGES.next);
  });
});

describe('stepItemDescriptor', () => {
  it('keys off the step key, falling back to a positional auto id', () => {
    expect(stepItemDescriptor({ key: 'details' }, 2).id).toBe('details');
    expect(stepItemDescriptor({}, 2).id).toBe('i2');
  });

  it('defaults a step to editable and to nothing else', () => {
    expect(stepItemDescriptor({}, 0)).toMatchObject({
      label: '',
      editable: true,
      disabled: false,
      completed: false,
      optional: false,
      invalid: false,
    });
  });

  it('keeps the source item and its guard attached', () => {
    const stepGuard = () => false;
    const item = { label: 'Details', stepGuard };
    const descriptor = stepItemDescriptor(item, 0);
    expect(descriptor.item).toBe(item);
    expect(descriptor.stepGuard).toBe(stepGuard);
  });
});

describe('resolveStepIndex', () => {
  const steps = [step({ id: 'a', key: 'a' }), step({ id: 'b', key: 'b' })];

  it('looks a key up and reports -1 for an unknown one', () => {
    expect(resolveStepIndex(steps, 'b')).toBe(1);
    expect(resolveStepIndex(steps, 'zzz')).toBe(-1);
  });

  it('passes a numeric target through for the caller to clamp', () => {
    expect(resolveStepIndex(steps, 1)).toBe(1);
  });
});

describe('stepState', () => {
  it('reads the indicator state off the step and the active index', () => {
    const steps = [
      step({ id: 'a', completed: true }),
      step({ id: 'b' }),
      step({ id: 'c' }),
    ];
    expect(stepState(steps[0], 0, 1)).toBe('done');
    expect(stepState(steps[1], 1, 1)).toBe('active');
    expect(stepState(steps[2], 2, 1)).toBe('number');
  });

  it('lets error outrank both active and done — it needs attention either way', () => {
    const invalid = step({ id: 'a', invalid: true, completed: true });
    expect(stepState(invalid, 0, 0)).toBe('error');
    expect(stepState(invalid, 0, 1)).toBe('error');
  });
});

describe('stepsCompleteBefore', () => {
  const steps = [
    step({ id: 'a', completed: true }),
    step({ id: 'b', optional: true }),
    step({ id: 'c' }),
    step({ id: 'd' }),
  ];

  it('accepts completed and optional steps as satisfied', () => {
    expect(stepsCompleteBefore(steps, 2)).toBe(true);
  });

  it('reports an unfinished required step in the way', () => {
    expect(stepsCompleteBefore(steps, 3)).toBe(false);
  });

  it('is vacuously true for the first step', () => {
    expect(stepsCompleteBefore(steps, 0)).toBe(true);
  });
});

describe('isStepReachable', () => {
  const steps = [
    step({ id: 'a', completed: true }),
    step({ id: 'b' }),
    step({ id: 'c' }),
    step({ id: 'd', disabled: true }),
  ];
  const reach = (
    overrides: Partial<Parameters<typeof isStepReachable>[0]> = {},
  ) =>
    isStepReachable({
      descriptors: steps,
      index: 2,
      activeIndex: 1,
      linear: true,
      disabled: false,
      ...overrides,
    });

  it('always allows the step the user is already on', () => {
    expect(reach({ index: 1 })).toBe(true);
  });

  it('refuses a disabled step, and every step while the stepper is disabled', () => {
    expect(reach({ index: 3 })).toBe(false);
    expect(reach({ disabled: true })).toBe(false);
  });

  it('refuses to walk forward past an unfinished step in linear mode', () => {
    expect(reach()).toBe(false); // step 1 is neither completed nor optional
  });

  it('walks freely forward in non-linear mode', () => {
    expect(reach({ linear: false })).toBe(true);
  });

  it('lets the user back into an editable earlier step, but not a locked one', () => {
    expect(reach({ index: 0, activeIndex: 2 })).toBe(true);
    const locked = [step({ id: 'a', editable: false }), ...steps.slice(1)];
    expect(reach({ descriptors: locked, index: 0, activeIndex: 2 })).toBe(
      false,
    );
  });

  it('refuses an index that does not exist', () => {
    expect(reach({ index: 9 })).toBe(false);
  });
});

describe('stepBlockReason', () => {
  const steps = [
    step({ id: 'a' }),
    step({ id: 'b', editable: false }),
    step({ id: 'c', disabled: true }),
    step({ id: 'd' }),
  ];
  const reason = (
    overrides: Partial<Parameters<typeof stepBlockReason>[0]> = {},
  ) =>
    stepBlockReason({
      descriptors: steps,
      index: 3,
      activeIndex: 0,
      linear: true,
      disabled: false,
      ...overrides,
    });

  it('names the rule that refused the move', () => {
    expect(reason({ index: 2 })).toBe('disabled');
    expect(reason({ index: 1, activeIndex: 3 })).toBe('editable');
    expect(reason()).toBe('linear');
  });

  it('reports nothing when the move is allowed', () => {
    expect(reason({ linear: false })).toBe(null);
    expect(reason({ index: 9 })).toBe(null); // nothing to refuse
  });
});

describe('stepperArrowKeys', () => {
  it('follows the orientation, mirroring only the inline axis in RTL', () => {
    expect(stepperArrowKeys('horizontal', false)).toEqual({
      next: 'ArrowRight',
      previous: 'ArrowLeft',
    });
    expect(stepperArrowKeys('horizontal', true)).toEqual({
      next: 'ArrowLeft',
      previous: 'ArrowRight',
    });
    expect(stepperArrowKeys('vertical', true)).toEqual({
      next: 'ArrowDown',
      previous: 'ArrowUp',
    });
  });
});

describe('stepperKeyTarget', () => {
  const target = (
    key: string,
    current: number,
    isDisabled: (index: number) => boolean = () => false,
  ) =>
    stepperKeyTarget({
      key,
      orientation: 'horizontal',
      rtl: false,
      count: 4,
      current,
      isDisabled,
    });

  it('moves along the axis', () => {
    expect(target('ArrowRight', 1)).toBe(2);
    expect(target('ArrowLeft', 1)).toBe(0);
  });

  it('does not wrap — a process has a first and a last step', () => {
    expect(target('ArrowRight', 3)).toBe(null);
    expect(target('ArrowLeft', 0)).toBe(null);
  });

  it('skips disabled steps', () => {
    expect(target('ArrowRight', 0, (index) => index === 1)).toBe(2);
  });

  it('jumps to the enabled ends on Home and End', () => {
    expect(target('Home', 2)).toBe(0);
    expect(target('End', 1)).toBe(3);
    expect(target('Home', 2, (index) => index === 0)).toBe(1);
  });

  it('returns undefined — not null — for a key outside the map', () => {
    // the distinction is the contract: undefined means "leave the event alone"
    expect(target('Enter', 1)).toBeUndefined();
    expect(target('ArrowDown', 1)).toBeUndefined();
  });
});
