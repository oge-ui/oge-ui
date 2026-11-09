import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OgeWordDocumentLoadedEvent } from '@oge-ui/spreadsheet-engine/word';
import { provideOgeWordDocumentConfig } from './config';
import { OgeWordDocument } from './word-document';

const file = new Uint8Array(
  readFileSync(
    resolve(
      __dirname,
      '../../../spreadsheet-engine/testing/corpus/docx/document.docx',
    ),
  ),
);

@Component({
  imports: [OgeWordDocument],
  template: `<oge-word-document
    [source]="source()"
    [(pageIndex)]="page"
    (loaded)="loaded.push($event)"
  />`,
})
class Host {
  readonly source = signal<Uint8Array | null>(file);
  readonly page = signal(0);
  readonly loaded: OgeWordDocumentLoadedEvent[] = [];
}

async function open(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.componentInstance.loaded.length).toBe(1);
  });
  fixture.detectChanges();
}

describe('OgeWordDocument', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:picture');
    URL.revokeObjectURL = vi.fn();
  });

  function setup() {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('lays out the pages and draws the first ones', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    const pages = el.querySelectorAll('.oge-word-page');
    expect(pages.length).toBe(host.loaded[0].pageCount);
    expect(pages[0].getAttribute('aria-roledescription')).toBe('page');
    expect(pages[0].querySelector('text')).not.toBeNull();
  });

  it('moves between pages and writes the two-way index', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    el.querySelectorAll<HTMLButtonElement>('.oge-presentation-nav')[1].click();
    fixture.detectChanges();
    expect(host.page()).toBe(1);
    expect(el.querySelector('[aria-live]')?.textContent).toContain('Page 2 of');
  });

  it('follows the index from outside', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    host.page.set(2);
    fixture.detectChanges();
    expect(el.querySelector('[aria-live]')?.textContent).toContain('Page 3 of');
  });

  it('takes its text from the config', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeWordDocumentConfig({
          messages: { pageLabel: 'Sayfa {current}/{total}' },
        }),
      ],
    });
    const { fixture, host, el } = setup();
    await open(fixture);
    expect(el.querySelector('[aria-live]')?.textContent).toContain(
      `Sayfa 1/${host.loaded[0].pageCount}`,
    );
  });

  it('shows the empty state without a source', () => {
    const { fixture, host, el } = setup();
    host.source.set(null);
    fixture.detectChanges();
    expect(el.querySelector('.oge-presentation-status')?.textContent).toContain(
      'No document',
    );
  });
});
