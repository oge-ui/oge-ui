import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OGE_DEFAULT_PDF_VIEWER_CONFIG } from '@oge-ui/spreadsheet-engine/pdf';
import { OGE_PDF_VIEWER_CONFIG, provideOgePdfViewerConfig } from './config';

describe('provideOgePdfViewerConfig', () => {
  it('falls back to the defaults without a provider', () => {
    expect(TestBed.inject(OGE_PDF_VIEWER_CONFIG)).toBe(
      OGE_DEFAULT_PDF_VIEWER_CONFIG,
    );
  });

  it('follows a live config', () => {
    const text = signal('Yazdır');
    TestBed.configureTestingModule({
      providers: [
        provideOgePdfViewerConfig(() => ({ messages: { print: text() } })),
      ],
    });
    const config = TestBed.inject(OGE_PDF_VIEWER_CONFIG);
    expect(config.messages.print).toBe('Yazdır');
    text.set('x');
    expect(config.messages.print).toBe('x');
  });
});
