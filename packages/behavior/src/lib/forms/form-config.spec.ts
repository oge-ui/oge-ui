import { describe, expect, it } from 'vitest';
import {
  OGE_DEFAULT_FORMS_CONFIG,
  OGE_DEFAULT_FORMS_MESSAGES,
  resolveOgeFormsConfig,
  validationSummaryTitle,
} from './form-config';

describe('resolveOgeFormsConfig', () => {
  it('defaults everything', () => {
    expect(resolveOgeFormsConfig(undefined)).toEqual(OGE_DEFAULT_FORMS_CONFIG);
  });

  it('merges messages key by key rather than replacing the table', () => {
    const config = resolveOgeFormsConfig({
      messages: { submitButton: 'Kaydet' },
    });
    expect(config.messages.submitButton).toBe('Kaydet');
    expect(config.messages.resetButton).toBe(
      OGE_DEFAULT_FORMS_MESSAGES.resetButton,
    );
  });

  it('carries the layout defaults through', () => {
    expect(
      resolveOgeFormsConfig({
        labelLocation: 'start',
        minColWidth: 320,
        showOptionalMark: true,
      }),
    ).toMatchObject({
      labelLocation: 'start',
      minColWidth: 320,
      showOptionalMark: true,
    });
  });

  it('does not mutate the shared defaults', () => {
    resolveOgeFormsConfig({ messages: { submitButton: 'changed' } });
    expect(OGE_DEFAULT_FORMS_MESSAGES.submitButton).toBe('Submit');
  });
});

describe('validationSummaryTitle', () => {
  it('uses the singular heading for exactly one error', () => {
    expect(validationSummaryTitle(1, OGE_DEFAULT_FORMS_MESSAGES)).toBe(
      '1 field needs your attention',
    );
  });

  it('interpolates the count otherwise', () => {
    expect(validationSummaryTitle(3, OGE_DEFAULT_FORMS_MESSAGES)).toBe(
      '3 fields need your attention',
    );
    expect(validationSummaryTitle(0, OGE_DEFAULT_FORMS_MESSAGES)).toBe(
      '0 fields need your attention',
    );
  });

  it('follows an overridden plain pattern', () => {
    const messages = {
      ...OGE_DEFAULT_FORMS_MESSAGES,
      validationSummaryTitle: '{count} alan düzeltilmeli',
    };
    expect(validationSummaryTitle(2, messages, 'tr')).toBe(
      '2 alan düzeltilmeli',
    );
    expect(validationSummaryTitle(1, messages, 'tr')).toBe(
      '1 alan düzeltilmeli',
    );
  });

  it('picks the locale plural form of an ICU heading', () => {
    const messages = {
      ...OGE_DEFAULT_FORMS_MESSAGES,
      validationSummaryTitle:
        '{count, plural, one {# pole wymaga uwagi} few {# pola wymagają uwagi} many {# pól wymaga uwagi} other {# pola wymaga uwagi}}',
    };
    expect(validationSummaryTitle(1, messages, 'pl')).toBe(
      '1 pole wymaga uwagi',
    );
    expect(validationSummaryTitle(3, messages, 'pl')).toBe(
      '3 pola wymagają uwagi',
    );
    expect(validationSummaryTitle(5, messages, 'pl')).toBe(
      '5 pól wymaga uwagi',
    );
  });

  it('still honours the deprecated singular key, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const messages = {
      ...OGE_DEFAULT_FORMS_MESSAGES,
      validationSummaryTitle: '{count} alan düzeltilmeli',
      validationSummaryTitleOne: 'Bir alan düzeltilmeli',
    };
    expect(validationSummaryTitle(2, messages)).toBe('2 alan düzeltilmeli');
    expect(validationSummaryTitle(1, messages)).toBe('Bir alan düzeltilmeli');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('validationSummaryTitleOne'),
    );
    warn.mockRestore();
  });
});
