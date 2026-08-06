import { OGE_DEFAULT_INPUTS_MESSAGES } from '../config';
import { formatPattern, resolveErrorMessage } from './error-messages';

const MSG = OGE_DEFAULT_INPUTS_MESSAGES;

describe('formatPattern', () => {
  it('interpolates known tokens and leaves unknown ones intact', () => {
    expect(formatPattern('{count}/{max}', { count: '3', max: '10' })).toBe(
      '3/10',
    );
    expect(formatPattern('{count}/{unknown}', { count: '3' })).toBe(
      '3/{unknown}',
    );
  });
});

describe('resolveErrorMessage', () => {
  it('returns null with no errors', () => {
    expect(resolveErrorMessage([], null, MSG)).toBeNull();
    expect(resolveErrorMessage([], {}, MSG)).toBeNull();
  });

  it('maps signal-forms kinds with interpolation', () => {
    expect(resolveErrorMessage([{ kind: 'required' }], null, MSG)).toBe(
      'This field is required',
    );
    expect(
      resolveErrorMessage([{ kind: 'minLength', minLength: 3 }], null, MSG),
    ).toBe('Enter at least 3 characters');
    expect(resolveErrorMessage([{ kind: 'min', min: 5 }], null, MSG)).toBe(
      'Value must be at least 5',
    );
  });

  it('an explicit message on a signal-forms error wins over the map', () => {
    expect(
      resolveErrorMessage(
        [{ kind: 'required', message: 'Custom!' }],
        null,
        MSG,
      ),
    ).toBe('Custom!');
  });

  it('unknown signal-forms kind falls back to message, then invalidError', () => {
    expect(
      resolveErrorMessage(
        [{ kind: 'zodIssue', message: 'From schema' }],
        null,
        MSG,
      ),
    ).toBe('From schema');
    expect(resolveErrorMessage([{ kind: 'mystery' }], null, MSG)).toBe(
      'Invalid value',
    );
  });

  it('signal-forms errors win over reactive-forms errors', () => {
    expect(
      resolveErrorMessage([{ kind: 'email' }], { required: true }, MSG),
    ).toBe('Enter a valid email address');
  });

  it('maps reactive-forms keys with priority order and interpolation', () => {
    expect(resolveErrorMessage([], { required: true }, MSG)).toBe(
      'This field is required',
    );
    expect(
      resolveErrorMessage(
        [],
        { minlength: { requiredLength: 4, actualLength: 1 } },
        MSG,
      ),
    ).toBe('Enter at least 4 characters');
    expect(
      resolveErrorMessage(
        [],
        // required has display priority over maxlength
        { maxlength: { requiredLength: 2 }, required: true },
        MSG,
      ),
    ).toBe('This field is required');
    expect(resolveErrorMessage([], { max: { max: 10 } }, MSG)).toBe(
      'Value must be at most 10',
    );
  });

  it('unknown reactive key uses its string value, else invalidError', () => {
    expect(resolveErrorMessage([], { custom: 'Server said no' }, MSG)).toBe(
      'Server said no',
    );
    expect(resolveErrorMessage([], { custom: { code: 1 } }, MSG)).toBe(
      'Invalid value',
    );
  });
});
