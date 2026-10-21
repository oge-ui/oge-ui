import {
  OGE_DEFAULT_SPREADSHEET_CONFIG,
  resolveOgeSpreadsheetConfig,
} from './config';

describe('resolveOgeSpreadsheetConfig', () => {
  it('returns the base for no input and merges messages over it', () => {
    expect(resolveOgeSpreadsheetConfig(undefined)).toBe(
      OGE_DEFAULT_SPREADSHEET_CONFIG,
    );
    const config = resolveOgeSpreadsheetConfig({
      locale: 'tr-TR',
      messages: { find: 'Bul' },
    });
    expect(config.locale).toBe('tr-TR');
    expect(config.messages.find).toBe('Bul');
    expect(config.messages.close).toBe('Close');
    // an inner provider builds on an outer one
    const inner = resolveOgeSpreadsheetConfig(
      { messages: { close: 'Kapat' } },
      config,
    );
    expect(inner).toMatchObject({
      locale: 'tr-TR',
      messages: { find: 'Bul', close: 'Kapat' },
    });
  });
});
