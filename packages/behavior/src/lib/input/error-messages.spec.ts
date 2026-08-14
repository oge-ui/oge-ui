import { describe, expect, it } from 'vitest';
import { formatPattern, messageForFieldError } from './error-messages';
import { OGE_DEFAULT_INPUTS_MESSAGES } from './input-config';

const messages = OGE_DEFAULT_INPUTS_MESSAGES;

describe('formatPattern', () => {
  it('replaces every occurrence of a token', () => {
    expect(formatPattern('{a}-{b}-{a}', { a: '1', b: '2' })).toBe('1-2-1');
  });

  it('leaves unknown tokens untouched rather than emitting "undefined"', () => {
    expect(formatPattern('{count}/{max}', { count: '3' })).toBe('3/{max}');
  });

  it('passes through a pattern with no tokens', () => {
    expect(formatPattern('plain', { a: '1' })).toBe('plain');
  });
});

describe('messageForFieldError', () => {
  it('maps the parameterless kinds', () => {
    expect(messageForFieldError({ kind: 'required' }, messages)).toBe(
      messages.requiredError,
    );
    expect(messageForFieldError({ kind: 'email' }, messages)).toBe(
      messages.emailError,
    );
    expect(messageForFieldError({ kind: 'pattern' }, messages)).toBe(
      messages.patternError,
    );
  });

  it('interpolates the bound of a min/max error', () => {
    expect(
      messageForFieldError({ kind: 'min', min: 5 } as never, messages),
    ).toBe('Value must be at least 5');
    expect(
      messageForFieldError({ kind: 'max', max: 9 } as never, messages),
    ).toBe('Value must be at most 9');
  });

  it('interpolates length errors as {requiredLength}', () => {
    expect(
      messageForFieldError(
        { kind: 'minLength', minLength: 3 } as never,
        messages,
      ),
    ).toBe('Enter at least 3 characters');
    expect(
      messageForFieldError(
        { kind: 'maxLength', maxLength: 8 } as never,
        messages,
      ),
    ).toBe('Enter no more than 8 characters');
  });

  it('renders a missing bound as empty text instead of "undefined"', () => {
    expect(messageForFieldError({ kind: 'min' }, messages)).toBe(
      'Value must be at least ',
    );
  });

  it('prefers an explicit message on an unknown kind, else the fallback', () => {
    expect(
      messageForFieldError(
        { kind: 'serverRejected', message: 'Taken' },
        messages,
      ),
    ).toBe('Taken');
    expect(messageForFieldError({ kind: 'serverRejected' }, messages)).toBe(
      messages.invalidError,
    );
  });

  it('follows an overridden message table — the localization contract', () => {
    const localized = { ...messages, requiredError: 'Zorunlu alan' };
    expect(messageForFieldError({ kind: 'required' }, localized)).toBe(
      'Zorunlu alan',
    );
  });
});
