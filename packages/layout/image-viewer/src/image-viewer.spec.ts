import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeImageViewerItem } from '@oge-ui/behavior';
import { provideOgeImageViewerConfig } from './config';
import { OgeImageViewer } from './image-viewer';

const IMAGES: OgeImageViewerItem[] = [
  { src: 'a.jpg', alt: 'Harbour', caption: 'Kaleiçi harbour' },
  { src: 'b.jpg', alt: 'Old town', thumbnail: 'b-small.jpg' },
  { src: 'c.jpg', alt: 'Market' },
];

@Component({
  imports: [OgeImageViewer],
  template: `<oge-image-viewer
    [images]="images()"
    [(index)]="index"
    [loop]="loop()"
    [maxZoom]="4"
    (zoomChange)="zooms.push($event)"
  />`,
})
class Host {
  readonly images = signal(IMAGES);
  readonly index = signal(0);
  readonly loop = signal<boolean | undefined>(undefined);
  readonly zooms: number[] = [];
}

function setup(messages = {}) {
  TestBed.configureTestingModule({
    providers: [provideOgeImageViewerConfig({ messages })],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, host: fixture.componentInstance };
}

const q = <T extends Element = HTMLElement>(el: HTMLElement, s: string) =>
  el.querySelector(s) as T;
const click = (fixture: ComponentFixture<Host>, el: HTMLElement, s: string) => {
  q<HTMLButtonElement>(el, s).click();
  fixture.detectChanges();
};

describe('OgeImageViewer', () => {
  it('shows the image, its caption, the counter and the thumbnails', () => {
    const { el } = setup();
    expect(
      q<HTMLImageElement>(el, '.oge-image-viewer-image').getAttribute('src'),
    ).toBe('a.jpg');
    expect(q<HTMLImageElement>(el, '.oge-image-viewer-image').alt).toBe(
      'Harbour',
    );
    expect(q(el, '.oge-image-viewer-caption').textContent).toContain(
      'Kaleiçi harbour',
    );
    expect(q(el, '.oge-image-viewer-readout').textContent).toContain('1 of 3');
    const thumbs = el.querySelectorAll('.oge-image-viewer-thumbnail');
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].getAttribute('aria-current')).toBe('true');
    expect(thumbs[1].querySelector('img')?.getAttribute('src')).toBe(
      'b-small.jpg',
    );
    expect(q(el, '[role="status"]').textContent).toContain(
      'Harbour, image 1 of 3',
    );
  });

  it('pages with the toolbar, the thumbnails and the two-way index', () => {
    const { fixture, el, host } = setup();
    click(fixture, el, '.oge-image-viewer-next');
    expect(host.index()).toBe(1);
    (
      el.querySelectorAll('.oge-image-viewer-thumbnail')[2] as HTMLElement
    ).click();
    fixture.detectChanges();
    expect(host.index()).toBe(2);
    expect(q<HTMLButtonElement>(el, '.oge-image-viewer-next').disabled).toBe(
      true,
    );
    host.loop.set(true);
    fixture.detectChanges();
    click(fixture, el, '.oge-image-viewer-next');
    expect(host.index()).toBe(0);
    host.index.set(1);
    fixture.detectChanges();
    expect(
      q<HTMLImageElement>(el, '.oge-image-viewer-image').getAttribute('src'),
    ).toBe('b.jpg');
    click(fixture, el, '.oge-image-viewer-prev');
    expect(host.index()).toBe(0);
  });

  it('zooms, rotates and resets from the toolbar, the wheel and a double click', () => {
    const { fixture, el, host } = setup();
    const image = () =>
      q<HTMLImageElement>(el, '.oge-image-viewer-image').style.transform;
    click(fixture, el, '.oge-image-viewer-zoom-in');
    expect(q(el, '.oge-image-viewer-zoom').textContent).toContain('150%');
    click(fixture, el, '.oge-image-viewer-rotate-right');
    expect(image()).toContain('rotate(90deg)');
    click(fixture, el, '.oge-image-viewer-rotate-left');
    click(fixture, el, '.oge-image-viewer-zoom-out');
    click(fixture, el, '.oge-image-viewer-reset');
    const stage = q(el, '.oge-image-viewer-stage');
    stage.dispatchEvent(
      new WheelEvent('wheel', {
        deltaY: -400,
        clientX: 0,
        clientY: 0,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    expect(host.zooms.at(-1)).toBeGreaterThan(1);
    stage.dispatchEvent(new MouseEvent('dblclick', { clientX: 0, clientY: 0 }));
    fixture.detectChanges();
    expect(host.zooms.at(-1)).toBe(1);
    stage.dispatchEvent(new MouseEvent('dblclick', { clientX: 0, clientY: 0 }));
    fixture.detectChanges();
    expect(host.zooms.at(-1)).toBe(2);
    expect(stage.classList).toContain('oge-image-viewer-zoomed');
  });

  it('pans with a pointer drag, pinches with two pointers and maps keys', () => {
    const { fixture, el, host } = setup();
    const viewer = q(el, '.oge-image-viewer');
    viewer.dispatchEvent(
      new KeyboardEvent('keydown', { key: '+', bubbles: true }),
    );
    fixture.detectChanges();
    const stage = q(el, '.oge-image-viewer-stage');
    const pointer = (type: string, id: number, x: number, y: number) =>
      stage.dispatchEvent(
        Object.assign(
          new MouseEvent(type, {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
          }),
          { pointerId: id },
        ),
      );
    pointer('pointerdown', 1, 0, 0);
    pointer('pointermove', 1, 10, 0);
    pointer('pointerup', 1, 10, 0);
    pointer('pointerdown', 1, 0, 0);
    pointer('pointerdown', 2, 100, 0);
    pointer('pointermove', 2, 200, 0);
    pointer('pointercancel', 2, 200, 0);
    pointer('pointerup', 1, 0, 0);
    fixture.detectChanges();
    expect(host.zooms.at(-1)).toBeGreaterThan(1.5);
    viewer.dispatchEvent(
      new KeyboardEvent('keydown', { key: '0', bubbles: true }),
    );
    viewer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.index()).toBe(1);
  });

  it('asks for full screen, follows fullscreenchange and takes config text', async () => {
    const { fixture, el } = setup({ fullscreen: 'Tam ekran' });
    const toggle = q<HTMLButtonElement>(
      el,
      '.oge-image-viewer-fullscreen-toggle',
    );
    expect(toggle.getAttribute('aria-label')).toBe('Tam ekran');
    const host = el.querySelector('oge-image-viewer') as HTMLElement;
    host.requestFullscreen = vi.fn(() => Promise.reject(new Error('no')));
    toggle.click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click(); // not in document fullscreen: just leaves the state
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    Object.defineProperty(document, 'fullscreenElement', {
      value: host,
      configurable: true,
    });
    document.dispatchEvent(new Event('fullscreenchange'));
    fixture.detectChanges();
    expect(q(el, '.oge-image-viewer').classList).toContain(
      'oge-image-viewer-fullscreen',
    );
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    toggle.click();
    expect(document.exitFullscreen).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
  });

  it('pages and resets through the public methods', () => {
    const { fixture, host } = setup();
    const viewer = fixture.debugElement.children[0]
      .componentInstance as OgeImageViewer;
    viewer.next();
    fixture.detectChanges();
    expect(host.index()).toBe(1);
    viewer.previous();
    fixture.detectChanges();
    expect(host.index()).toBe(0);
    q<HTMLButtonElement>(
      fixture.nativeElement,
      '.oge-image-viewer-zoom-in',
    ).click();
    viewer.resetView();
    fixture.detectChanges();
    expect(host.zooms.at(-1)).toBe(1);
  });

  it('says so when there are no images', () => {
    const { fixture, el, host } = setup();
    host.images.set([]);
    fixture.detectChanges();
    expect(q(el, '.oge-image-viewer-empty').textContent).toContain('No images');
    expect(el.querySelector('.oge-image-viewer-thumbnails')).toBeNull();
  });
});
