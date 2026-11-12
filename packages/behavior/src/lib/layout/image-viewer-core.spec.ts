import type { OgeReactivityAdapter } from '../reactivity';
import {
  OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
  OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
  OgeImageViewerCore,
  resolveOgeImageViewerConfig,
} from './image-viewer-core';

const plain: OgeReactivityAdapter = {
  cell<T>(initial: T) {
    let value = initial;
    const cell = (() => value) as (() => T) & { set(v: T): void };
    cell.set = (v) => (value = v);
    return cell;
  },
  derived: (compute) => compute,
};

const IMAGES = [
  { src: 'a.jpg', alt: 'Harbour at dawn' },
  { src: 'b.jpg', alt: 'Old town', caption: 'Kaleiçi' },
  { src: 'c.jpg', alt: 'Market' },
];

function setup() {
  const events = {
    index: [] as number[],
    zoom: [] as number[],
    full: [] as boolean[],
  };
  const core = new OgeImageViewerCore({
    reactivity: plain,
    messages: OGE_DEFAULT_IMAGE_VIEWER_MESSAGES,
    onIndexChange: (i) => events.index.push(i),
    onZoomChange: (z) => events.zoom.push(z),
    requestFullscreen: (on) => events.full.push(on),
  });
  core.setItems(IMAGES);
  core.setStage(800, 600);
  return { core, events };
}

const key = (k: string) => ({ key: k, preventDefault: vi.fn() });

describe('OgeImageViewerCore', () => {
  it('pages through the gallery, with and without looping', () => {
    const { core, events } = setup();
    expect(core.counterText()).toBe('1 of 3');
    expect(core.announcement()).toBe('Harbour at dawn, image 1 of 3');
    expect(core.canGoBack()).toBe(false);
    core.previous();
    expect(core.index()).toBe(0);
    core.next();
    core.next();
    core.next();
    expect(core.index()).toBe(2);
    expect(core.canGoForward()).toBe(false);
    core.setConfig(resolveOgeImageViewerConfig({ loop: true }));
    core.next();
    expect(core.index()).toBe(0);
    core.previous();
    expect(core.index()).toBe(2);
    expect(events.index).toEqual([1, 2, 0, 2]);
    core.setItems(IMAGES.slice(0, 1));
    expect(core.index()).toBe(0);
    core.setItems([]);
    expect(core.announcement()).toBe('No images');
    core.go(3); // nothing to show
  });

  it('zooms by steps, around a point, by wheel and by pinch, within limits', () => {
    const { core, events } = setup();
    core.zoomIn();
    expect(core.zoom()).toBe(1.5);
    expect(core.zoomText()).toBe('150%');
    core.zoomIn({ x: 100, y: 0 });
    expect(core.zoom()).toBe(2);
    // the point under the pointer stays put: 100 → pan grows towards it
    expect(core.pan().x).toBeLessThan(0);
    core.zoomOut();
    expect(core.zoom()).toBe(1.5);
    core.wheel(-500, { x: 0, y: 0 });
    expect(core.zoom()).toBeGreaterThan(1.5);
    core.pinch(10, { x: 0, y: 0 });
    expect(core.zoom()).toBe(8);
    expect(core.canZoomIn()).toBe(false);
    core.zoomIn();
    core.setConfig(resolveOgeImageViewerConfig({ maxZoom: 4 }));
    expect(core.zoom()).toBe(4);
    core.toggleZoom({ x: 0, y: 0 });
    expect(core.zoom()).toBe(1);
    expect(core.pan()).toEqual({ x: 0, y: 0 });
    core.toggleZoom({ x: 50, y: 50 });
    expect(core.zoom()).toBe(2);
    core.zoomOut();
    core.zoomOut();
    expect(core.canZoomOut()).toBe(false);
    expect(events.zoom.at(-1)).toBe(1);
  });

  it('pans by dragging and keys while zoomed, clamped to the image', () => {
    const { core } = setup();
    expect(core.pointerDown(0, 0)).toBe(false); // nothing to pan at fit
    core.setZoom(2);
    expect(core.pointerDown(100, 100)).toBe(true);
    core.pointerMove(5000, 120);
    // at 2× an 800 px stage can shift ±400 px
    expect(core.pan()).toEqual({ x: 400, y: 20 });
    core.pointerUp();
    core.pointerMove(0, 0); // no drag: ignored
    core.keydown(key('ArrowRight'));
    core.keydown(key('ArrowDown'));
    expect(core.pan()).toEqual({ x: 340, y: -40 });
    core.keydown(key('ArrowUp'));
    core.keydown(key('ArrowLeft'));
    expect(core.pan()).toEqual({ x: 400, y: 20 });
    expect(core.transform()).toBe(
      'translate(400px, 20px) rotate(0deg) scale(2)',
    );
    core.setStage(400, 300); // a smaller stage tightens the clamp
    expect(core.pan()).toEqual({ x: 200, y: 20 });
    core.setStage(400, 300);
  });

  it('rotates, goes full screen and maps the keyboard', () => {
    const { core, events } = setup();
    core.keydown(key('r'));
    core.keydown(key('r'));
    expect(core.rotation()).toBe(180);
    core.keydown(key('R'));
    core.rotate(-1);
    expect(core.rotation()).toBe(0);
    core.keydown(key('f'));
    expect(events.full).toEqual([true]);
    core.setFullscreen(true);
    core.setFullscreen(true);
    core.toggleFullscreen();
    expect(events.full).toEqual([true, false]);
    expect(core.fullscreen()).toBe(true);
    core.keydown(key('ArrowRight'));
    expect(core.index()).toBe(1);
    core.keydown(key('ArrowLeft'));
    core.keydown(key('End'));
    expect(core.index()).toBe(2);
    core.keydown(key('Home'));
    core.keydown(key('PageDown'));
    core.keydown(key('PageUp'));
    expect(core.index()).toBe(0);
    core.keydown(key('+'));
    core.keydown(key('='));
    expect(core.zoom()).toBe(2);
    core.keydown(key('-'));
    core.keydown(key('0'));
    expect(core.zoom()).toBe(1);
    const up = key('ArrowUp');
    core.keydown(up); // not zoomed: the page keeps it
    expect(up.preventDefault).not.toHaveBeenCalled();
    const down = key('ArrowDown');
    core.keydown(down);
    expect(down.preventDefault).not.toHaveBeenCalled();
    const other = key('x');
    core.keydown(other);
    expect(other.preventDefault).not.toHaveBeenCalled();
  });

  it('merges a config over the defaults', () => {
    expect(resolveOgeImageViewerConfig(undefined)).toEqual(
      OGE_DEFAULT_IMAGE_VIEWER_CONFIG,
    );
    const config = resolveOgeImageViewerConfig({
      messages: { next: 'Sonraki' },
    });
    expect(config.messages.next).toBe('Sonraki');
    expect(config.messages.previous).toBe('Previous image');
  });
});
