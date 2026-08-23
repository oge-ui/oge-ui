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

  it('follows an overridden table', () => {
    const messages = {
      ...OGE_DEFAULT_FORMS_MESSAGES,
      validationSummaryTitle: '{count} alan düzeltilmeli',
      validationSummaryTitleOne: '1 alan düzeltilmeli',
    };
    expect(validationSummaryTitle(2, messages)).toBe('2 alan düzeltilmeli');
    expect(validationSummaryTitle(1, messages)).toBe('1 alan düzeltilmeli');
  });
});
