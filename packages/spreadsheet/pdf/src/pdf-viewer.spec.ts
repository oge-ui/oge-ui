import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgePdfJs,
  OgePdfLoadErrorEvent,
  OgePdfLoadedEvent,
  OgePdfZoom,
} from '@oge-ui/spreadsheet-engine/pdf';
import { provideOgePdfViewerConfig } from './config';
import { OgePdfViewer } from './pdf-viewer';

const run = (str: string, y = 750) => ({
  str,
  transform: [10, 0, 0, 10, 50, y],
  width: str.length * 5,
  height: 10,
});

/** A pdf.js stand-in: three 600 × 800 pt pages. */
function fakePdfJs(fail?: string): OgePdfJs & { renders: number } {
  const texts = [
    [run('Quarterly report')],
    [run('Revenue grew')],
    [run('Report appendix')],
  ];
  const fake = {
    renders: 0,
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: () => ({
      promise: fail
        ? Promise.reject(Object.assign(new Error('no'), { name: fail }))
        : Promise.resolve({
            numPages: texts.length,
            getPage: async (n: number) => ({
              getViewport: ({ scale }: { scale: number }) => ({
                width: 600 * scale,
                height: 800 * scale,
                scale,
                rotation: 0,
              }),
              render: () => {
                fake.renders++;
                return { promise: Promise.resolve(), cancel: () => undefined };
              },
              getTextContent: async () => ({ items: texts[n - 1] }),
            }),
            destroy: async () => undefined,
          }),
      destroy: async () => undefined,
    }),
  };
  return fake as unknown as OgePdfJs & { renders: number };
}

@Component({
  imports: [OgePdfViewer],
  template: `<oge-pdf-viewer
    [source]="source()"
    [(pageIndex)]="page"
    [(zoom)]="zoom"
    [(showThumbnails)]="thumbs"
    (loaded)="loaded.push($event)"
    (loadError)="errors.push($event)"
  />`,
})
class Host {
  readonly source = signal<Uint8Array | null>(new Uint8Array([1]));
  readonly page = signal(0);
  readonly zoom = signal<OgePdfZoom>('fit-width');
  readonly thumbs = signal(false);
  readonly loaded: OgePdfLoadedEvent[] = [];
  readonly errors: OgePdfLoadErrorEvent[] = [];
}

function setup(pdfjs = fakePdfJs(), messages = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideOgePdfViewerConfig({ pdfjs: async () => pdfjs, messages }),
    ],
  });
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ({}),
  ) as unknown as HTMLCanvasElement['getContext'];
  const fixture = TestBed.createComponent(Host);
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, el, pdfjs };
}

async function open(fixture: ComponentFixture<Host>): Promise<void> {
  fixture.detectChanges();
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(fixture.componentInstance.loaded.length).toBe(1);
  });
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const button = (el: HTMLElement, cls: string) =>
  el.querySelector<HTMLButtonElement>(`.${cls}`)!;

describe('OgePdfViewer', () => {
  it('lays out every page and draws the ones near the viewport', async () => {
    const { fixture, el, pdfjs } = setup();
    await open(fixture);
    const pages = el.querySelectorAll('.oge-pdf-page');
    expect(pages.length).toBe(3);
    expect(pages[0].getAttribute('aria-label')).toBe('Page 1 of 3');
    expect(pages[0].querySelector('canvas')).not.toBeNull();
    await vi.waitFor(() => expect(pdfjs.renders).toBeGreaterThan(0));
  });

  it('pages with the toolbar and writes the two-way index', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    expect(button(el, 'oge-pdf-prev').disabled).toBe(true);
    button(el, 'oge-pdf-next').click();
    fixture.detectChanges();
    expect(host.page()).toBe(1);
    expect(el.querySelector('.oge-pdf-page-label')?.textContent).toContain(
      'Page 2 of 3',
    );
    host.page.set(2);
    fixture.detectChanges();
    expect(el.querySelector('.oge-pdf-page-label')?.textContent).toContain(
      'Page 3 of 3',
    );
  });

  it('zooms by steps and to the fits, both ways', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    host.zoom.set(1);
    fixture.detectChanges();
    expect(el.querySelector('.oge-pdf-zoom-label')?.textContent).toContain(
      '100%',
    );
    button(el, 'oge-pdf-zoom-in').click();
    fixture.detectChanges();
    expect(host.zoom()).toBe(1.25);
    expect((el.querySelector('.oge-pdf-page') as HTMLElement).style.width).toBe(
      '1000px',
    );
    button(el, 'oge-pdf-fit-page').click();
    fixture.detectChanges();
    expect(host.zoom()).toBe('fit-page');
    expect(button(el, 'oge-pdf-fit-page').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('finds text and highlights the matches', async () => {
    const { fixture, el } = setup();
    await open(fixture);
    const input = el.querySelector<HTMLInputElement>('.oge-pdf-search')!;
    input.value = 'report';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(el.querySelector('.oge-pdf-match-label')?.textContent).toContain(
        '1 of 2',
      );
    });
    expect(el.querySelectorAll('.oge-pdf-highlight').length).toBe(2);
    expect(el.querySelectorAll('.oge-pdf-highlight-current').length).toBe(1);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(el.querySelector('.oge-pdf-match-label')?.textContent).toContain(
      '2 of 2',
    );
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }),
    );
    fixture.detectChanges();
    expect(el.querySelector('.oge-pdf-match-label')?.textContent).toContain(
      '1 of 2',
    );
  });

  it('shows page thumbnails that move to their page', async () => {
    const { fixture, host, el } = setup();
    await open(fixture);
    button(el, 'oge-pdf-thumbs-toggle').click();
    fixture.detectChanges();
    expect(host.thumbs()).toBe(true);
    const thumbs = el.querySelectorAll<HTMLButtonElement>('.oge-pdf-thumbnail');
    expect(thumbs.length).toBe(3);
    expect(thumbs[0].getAttribute('aria-current')).toBe('page');
    thumbs[2].click();
    fixture.detectChanges();
    expect(host.page()).toBe(2);
  });

  it('reports a password-protected file and takes its text from the config', async () => {
    const { fixture, host, el } = setup(fakePdfJs('PasswordException'), {
      passwordProtected: 'Parola korumalı',
    });
    fixture.detectChanges();
    await vi.waitFor(() => expect(host.errors.length).toBe(1));
    fixture.detectChanges();
    expect(host.errors[0].code).toBe('password');
    expect(el.querySelector('.oge-pdf-status')?.textContent).toContain(
      'Parola korumalı',
    );
    host.source.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.oge-pdf-status')?.textContent).toContain(
      'No document to show',
    );
  });
});
