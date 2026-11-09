import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OgePresentationLoadedEvent } from '@oge-ui/spreadsheet-engine/powerpoint';
import { OgePresentation } from './presentation';

const deck = new Uint8Array(
  readFileSync(
    resolve(
      __dirname,
      '../../../spreadsheet-engine/testing/corpus/pptx/slides.pptx',
    ),
  ),
);

@Component({
  imports: [OgePresentation],
  template: `<oge-presentation
    [source]="source()"
    [thumbnails]="thumbnails()"
    [messages]="messages()"
    [(slideIndex)]="slide"
    (loaded)="loaded.push($event)"
  />`,
})
class Host {
  readonly source = signal<Uint8Array | null>(deck);
  readonly slide = signal(0);
  readonly thumbnails = signal(true);
  readonly messages = signal({});
  readonly loaded: OgePresentationLoadedEvent[] = [];
  readonly viewer = viewChild.required(OgePresentation);
}

async function open(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.componentInstance.loaded.length).toBe(1);
  });
  fixture.detectChanges();
}

describe('OgePresentation', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:picture'),
        revokeObjectURL: vi.fn(),
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  function setup() {
    const fixture = TestBed.createComponent(Host);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('draws the current slide and a thumbnail per slide', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    expect(host.loaded[0].slideCount).toBe(5);
    expect(el.querySelectorAll('.oge-presentation-thumb')).toHaveLength(5);
    const stage = el.querySelector('.oge-presentation-stage') as HTMLElement;
    expect(stage.getAttribute('aria-roledescription')).toBe('slide');
    expect(stage.getAttribute('aria-label')).toBe('Slide 1 of 5');
    expect(stage.querySelector('text')?.textContent).toBe('Quarterly results');
  });

  it('navigates with the buttons and writes the two-way index', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    const [back, forward] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-presentation-nav'),
    );
    expect(back.disabled).toBe(true);
    forward.click();
    fixture.detectChanges();
    expect(host.slide()).toBe(1);
    expect(
      el.querySelector('.oge-presentation-stage')?.getAttribute('aria-label'),
    ).toBe('Slide 2 of 5');
  });

  it('follows the index from outside and the keyboard', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    host.slide.set(3);
    fixture.detectChanges();
    expect(
      el
        .querySelector('.oge-presentation-thumb-current')
        ?.getAttribute('aria-label'),
    ).toBe('Slide 4 of 5');
    el.querySelector('.oge-presentation')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.slide()).toBe(0);
  });

  it('draws pictures from object urls', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    host.slide.set(3);
    fixture.detectChanges();
    expect(
      el.querySelector('.oge-presentation-stage image')?.getAttribute('href'),
    ).toBe('blob:picture');
  });

  it('can hide the rail and override the text', async () => {
    const { fixture, host, el } = setup();
    host.thumbnails.set(false);
    host.messages.set({ slideLabel: 'Sayfa {current}/{total}' });
    await open(fixture);
    expect(el.querySelector('.oge-presentation-rail')).toBeNull();
    expect(
      el.querySelector('.oge-presentation-position')?.textContent,
    ).toContain('Sayfa 1/5');
  });

  it('shows the empty state without a source', () => {
    const { fixture, host, el } = setup();
    host.source.set(null);
    fixture.detectChanges();
    expect(el.querySelector('.oge-presentation-status')?.textContent).toContain(
      'No presentation',
    );
  });
});
