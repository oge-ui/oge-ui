import { describe, expect, it, vi } from 'vitest';
import { messageForFieldError } from '../input/error-messages';
import { OGE_DEFAULT_INPUTS_MESSAGES } from '../input/input-config';
import {
  asyncValidationRules,
  evaluateOgeFormCondition,
  evaluateOgeValidationRules,
  isEmptyFormValue,
} from './form-validation';
import type { OgeValidationRule } from './form-types';

const run = (
  value: unknown,
  rules: readonly OgeValidationRule[],
  isRequired = false,
  data: Record<string, unknown> = {},
) => evaluateOgeValidationRules(value, data, rules, isRequired);

const kinds = (
  value: unknown,
  rules: readonly OgeValidationRule[],
  isRequired = false,
) => run(value, rules, isRequired).map((error) => error.kind);

describe('isEmptyFormValue', () => {
  it('counts nothing-typed-yet as empty', () => {
    expect(isEmptyFormValue(null)).toBe(true);
    expect(isEmptyFormValue(undefined)).toBe(true);
    expect(isEmptyFormValue('')).toBe(true);
    expect(isEmptyFormValue('   ')).toBe(true);
    expect(isEmptyFormValue([])).toBe(true);
    // an open date range is two empty ends, not a value
    expect(isEmptyFormValue([null, null])).toBe(true);
  });

  it('counts a real value as filled in, including falsy ones', () => {
    expect(isEmptyFormValue(0)).toBe(false);
    expect(isEmptyFormValue(false)).toBe(false);
    expect(isEmptyFormValue('a')).toBe(false);
    expect(isEmptyFormValue([1])).toBe(false);
  });
});

describe('required', () => {
  it('fires on an empty value and clears on a real one', () => {
    expect(kinds('', [{ type: 'required' }])).toEqual(['required']);
    expect(kinds('a', [{ type: 'required' }])).toEqual([]);
    expect(kinds(false, [{ type: 'required' }])).toEqual([]);
  });

  it('is implied by the item’s isRequired, exactly once', () => {
    expect(kinds('', [], true)).toEqual(['required']);
    // an explicit rule must not double up with the flag
    expect(kinds('', [{ type: 'required' }], true)).toEqual(['required']);
  });
});

describe('the other rules pass an empty field', () => {
  it('says nothing until something is typed', () => {
    const rules: OgeValidationRule[] = [
      { type: 'email' },
      { type: 'numeric', min: 5 },
      { type: 'stringLength', min: 3 },
      { type: 'pattern', pattern: /^x/ },
      { type: 'range', min: new Date(2024, 0, 1) },
    ];
    expect(kinds('', rules)).toEqual([]);
    expect(kinds(null, rules)).toEqual([]);
  });
});

describe('email', () => {
  it('accepts an address and rejects anything else', () => {
    expect(kinds('a@b.co', [{ type: 'email' }])).toEqual([]);
    expect(kinds('nope', [{ type: 'email' }])).toEqual(['email']);
    expect(kinds('a@b', [{ type: 'email' }])).toEqual(['email']);
    expect(kinds('a b@c.co', [{ type: 'email' }])).toEqual(['email']);
    expect(kinds('a@.b.co', [{ type: 'email' }])).toEqual([]);
    expect(kinds('a@b.', [{ type: 'email' }])).toEqual(['email']);
    expect(kinds('a@b@c.co', [{ type: 'email' }])).toEqual(['email']);
  });

  it('stays linear on long dotted input', () => {
    const started = performance.now();
    expect(kinds(`!@!.${'!.'.repeat(50_000)}`, [{ type: 'email' }])).toEqual(
      [],
    );
    expect(kinds(`a@${'.'.repeat(50_000)}@`, [{ type: 'email' }])).toEqual([
      'email',
    ]);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('numeric', () => {
  it('bounds the value at both ends', () => {
    expect(kinds(4, [{ type: 'numeric', min: 5 }])).toEqual(['min']);
    expect(kinds(5, [{ type: 'numeric', min: 5 }])).toEqual([]);
    expect(kinds(11, [{ type: 'numeric', max: 10 }])).toEqual(['max']);
    expect(kinds(10, [{ type: 'numeric', max: 10 }])).toEqual([]);
  });

  it('carries the bound, so the message can name it', () => {
    const [error] = run(99, [{ type: 'numeric', max: 10 }]);
    expect(messageForFieldError(error, OGE_DEFAULT_INPUTS_MESSAGES)).toContain(
      '10',
    );
  });

  it('reads a numeric string, and reports one that is not a number', () => {
    expect(kinds('7', [{ type: 'numeric', max: 10 }])).toEqual([]);
    expect(kinds('abc', [{ type: 'numeric', max: 10 }])).toEqual([
      'invalidNumber',
    ]);
  });
});

describe('stringLength', () => {
  it('bounds text length at both ends', () => {
    expect(kinds('AB', [{ type: 'stringLength', min: 3 }])).toEqual([
      'minLength',
    ]);
    expect(kinds('ABC', [{ type: 'stringLength', min: 3 }])).toEqual([]);
    expect(kinds('ABCD', [{ type: 'stringLength', max: 3 }])).toEqual([
      'maxLength',
    ]);
  });

  it('counts the entries of a multi-value editor', () => {
    expect(kinds(['a', 'b'], [{ type: 'stringLength', min: 3 }])).toEqual([
      'minLength',
    ]);
  });

  it('carries the required length into the message', () => {
    const [error] = run('AB', [{ type: 'stringLength', min: 3 }]);
    expect(messageForFieldError(error, OGE_DEFAULT_INPUTS_MESSAGES)).toBe(
      'Enter at least 3 characters',
    );
  });
});

describe('pattern', () => {
  it('tests the value against the expression', () => {
    expect(
      kinds('AB-1', [{ type: 'pattern', pattern: /^[A-Z]{2}-\d$/ }]),
    ).toEqual([]);
    expect(
      kinds('nope', [{ type: 'pattern', pattern: /^[A-Z]{2}-\d$/ }]),
    ).toEqual(['pattern']);
  });

  it('does not let a global expression alternate between calls', () => {
    // a `g` matcher keeps `lastIndex`, so the same value would pass, then fail
    const rule: OgeValidationRule = { type: 'pattern', pattern: /ab/g };
    expect(kinds('ab', [rule])).toEqual([]);
    expect(kinds('ab', [rule])).toEqual([]);
  });
});

describe('range', () => {
  const min = new Date(2024, 0, 10);
  const max = new Date(2024, 0, 20);

  it('bounds a date at both ends, inclusively', () => {
    expect(kinds(new Date(2024, 0, 5), [{ type: 'range', min }])).toEqual([
      'min',
    ]);
    expect(kinds(new Date(2024, 0, 10), [{ type: 'range', min }])).toEqual([]);
    expect(kinds(new Date(2024, 0, 25), [{ type: 'range', max }])).toEqual([
      'max',
    ]);
  });

  it('reads a date string, and reports one it cannot parse', () => {
    expect(kinds('2024-01-15T00:00:00', [{ type: 'range', min, max }])).toEqual(
      [],
    );
    expect(kinds('not a date', [{ type: 'range', min }])).toEqual([
      'invalidDate',
    ]);
  });
});

describe('custom', () => {
  it('surfaces the message the application returned', () => {
    const [error] = run('plain', [
      {
        type: 'custom',
        validate: ({ value }) =>
          String(value).includes('!') ? null : 'Needs a bang',
      },
    ]);
    expect(error).toMatchObject({ kind: 'custom', message: 'Needs a bang' });
  });

  it('sees the whole model, which is how cross-field rules work', () => {
    const validate = vi.fn(({ value, data }) =>
      value === data['confirm'] ? null : 'Does not match',
    );
    expect(
      run('a', [{ type: 'custom', validate }], false, { confirm: 'b' }),
    ).toHaveLength(1);
    expect(
      run('a', [{ type: 'custom', validate }], false, { confirm: 'a' }),
    ).toEqual([]);
    expect(validate).toHaveBeenCalledWith({
      value: 'a',
      data: { confirm: 'b' },
    });
  });

  it('runs even on an empty value — a custom rule may demand one', () => {
    expect(kinds('', [{ type: 'custom', validate: () => 'always' }])).toEqual([
      'custom',
    ]);
  });
});

describe('async rules', () => {
  const rule: OgeValidationRule = {
    type: 'async',
    validate: async () => 'taken',
  };

  it('are not evaluated here — the render layer schedules them', () => {
    expect(kinds('AB', [rule])).toEqual([]);
  });

  it('are reported so the layer can schedule exactly those', () => {
    expect(asyncValidationRules([{ type: 'email' }, rule])).toEqual([rule]);
  });
});

describe('rule order', () => {
  it('reports failures in declaration order', () => {
    expect(
      kinds('nope', [{ type: 'email' }, { type: 'stringLength', min: 10 }]),
    ).toEqual(['email', 'minLength']);
  });

  it('lets an explicit message override the table', () => {
    const [error] = run('nope', [{ type: 'email', message: 'Böyle olmaz' }]);
    expect(error.message).toBe('Böyle olmaz');
  });
});

describe('compare rule', () => {
  const confirm: OgeValidationRule = {
    type: 'compare',
    comparisonTarget: 'password',
  };

  it('fails a confirm field that does not match its target', () => {
    expect(run('secret', [confirm], false, { password: 'secret' })).toEqual([]);
    const [error] = run('secreT', [confirm], false, { password: 'secret' });
    expect(error.kind).toBe('compare');
    expect(messageForFieldError(error, OGE_DEFAULT_INPUTS_MESSAGES)).toBe(
      OGE_DEFAULT_INPUTS_MESSAGES.compareError,
    );
  });

  it('checks an empty field unless ignoreEmptyValue is set', () => {
    expect(run('', [confirm], false, { password: 'x' })).toHaveLength(1);
    expect(
      run('', [{ ...confirm, ignoreEmptyValue: true }], false, {
        password: 'x',
      }),
    ).toEqual([]);
  });

  it('supports ordering comparisons, dates and a function target', () => {
    const end: OgeValidationRule = {
      type: 'compare',
      comparisonTarget: (data) => data['start'],
      comparisonType: '>',
      message: 'End after start',
    };
    const start = new Date(2026, 0, 10);
    expect(run(new Date(2026, 0, 11), [end], false, { start })).toEqual([]);
    const [error] = run(new Date(2026, 0, 9), [end], false, { start });
    expect(error.message).toBe('End after start');
    expect(
      run(
        5,
        [{ type: 'compare', comparisonTarget: 'max', comparisonType: '<=' }],
        false,
        {
          max: 5,
        },
      ),
    ).toEqual([]);
    expect(
      run(
        1,
        [{ type: 'compare', comparisonTarget: 'other', comparisonType: '!==' }],
        false,
        {
          other: 1,
        },
      ),
    ).toHaveLength(1);
  });
});

describe('evaluateOgeFormCondition', () => {
  const data = { kind: 'company', vat: '', tags: ['a'], nested: { on: true } };

  it('reads the fallback without a condition', () => {
    expect(evaluateOgeFormCondition(undefined, data)).toBe(true);
    expect(evaluateOgeFormCondition(undefined, data, false)).toBe(false);
  });

  it('tests equals / notEquals / in / truthiness on a field', () => {
    expect(
      evaluateOgeFormCondition({ field: 'kind', equals: 'company' }, data),
    ).toBe(true);
    expect(
      evaluateOgeFormCondition({ field: 'kind', notEquals: 'company' }, data),
    ).toBe(false);
    expect(
      evaluateOgeFormCondition(
        { field: 'kind', in: ['person', 'company'] },
        data,
      ),
    ).toBe(true);
    expect(evaluateOgeFormCondition({ field: 'vat' }, data)).toBe(false);
    expect(evaluateOgeFormCondition({ field: 'tags' }, data)).toBe(true);
    expect(evaluateOgeFormCondition({ field: 'nested.on' }, data)).toBe(true);
  });

  it('runs a predicate over the whole model', () => {
    expect(
      evaluateOgeFormCondition((model) => model['kind'] === 'company', data),
    ).toBe(true);
    expect(evaluateOgeFormCondition(() => false, null)).toBe(false);
  });
});
