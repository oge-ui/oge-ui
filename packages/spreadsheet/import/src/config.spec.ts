import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OGE_DEFAULT_IMPORT_WIZARD_CONFIG } from '@oge-ui/spreadsheet-engine/import';
import {
  OGE_IMPORT_WIZARD_CONFIG,
  provideOgeImportWizardConfig,
} from './config';

describe('provideOgeImportWizardConfig', () => {
  it('falls back to the defaults without a provider', () => {
    expect(TestBed.inject(OGE_IMPORT_WIZARD_CONFIG)).toBe(
      OGE_DEFAULT_IMPORT_WIZARD_CONFIG,
    );
  });

  it('follows a live config', () => {
    const text = signal('İleri');
    TestBed.configureTestingModule({
      providers: [
        provideOgeImportWizardConfig(() => ({ messages: { next: text() } })),
      ],
    });
    const config = TestBed.inject(OGE_IMPORT_WIZARD_CONFIG);
    expect(config.messages.next).toBe('İleri');
    text.set('x');
    expect(config.messages.next).toBe('x');
  });
});
