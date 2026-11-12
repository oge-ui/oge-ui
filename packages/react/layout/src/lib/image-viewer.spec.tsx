import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { OgeImageViewerItem } from '@oge-ui/behavior';
import { OgeImageViewer, type OgeImageViewerHandle } from './image-viewer';
import { OgeImageViewerConfigProvider } from './layout-config';

const IMAGES: OgeImageViewerItem[] = [
  { src: 'a.jpg', alt: 'Harbour', caption: 'Kaleiçi harbour' },
  { src: 'b.jpg', alt: 'Old town', thumbnail: 'b-small.jpg' },
  { src: 'c.jpg', alt: 'Market' },
];

const q = <T extends Element = HTMLElement>(s: string) =>
  document.querySelector(s) as T;
const image = () => q<HTMLImageElement>('.oge-image-viewer-image');

function Controlled(props: { loop?: boolean; zooms?: number[] }) {
  const [index, setIndex] = useState(0);
  return (
    <>
      <output data-testid="index">{index}</output>
      <button type="button" data-testid="jump" onClick={() => setIndex(1)} />
      <OgeImageViewer
        images={IMAGES}
        index={index}
        onIndexChange={setIndex}
        loop={props.loop}
        maxZoom={4}
        onZoomChange={(z) => props.zooms?.push(z)}
      />
    </>
  );
}

describe('<OgeImageViewer>', () => {
  it('shows the image, its caption, the counter and the thumbnails', () => {
    render(
      <StrictMode>
        <OgeImageViewer images={IMAGES} />
      </StrictMode>,
    );
    expect(image().getAttribute('src')).toBe('a.jpg');
    expect(image().alt).toBe('Harbour');
    expect(q('.oge-image-viewer-caption').textContent).toBe('Kaleiçi harbour');
    expect(q('.oge-image-viewer-readout').textContent).toBe('1 of 3');
    const thumbs = document.querySelectorAll('.oge-image-viewer-thumbnail');
    expect(thumbs).toHaveLength(3);
    expect(thumbs[0].getAttribute('aria-current')).toBe('true');
    expect(thumbs[1].querySelector('img')?.getAttribute('src')).toBe(
      'b-small.jpg',
    );
    expect(q('[role="status"]').textContent).toBe('Harbour, image 1 of 3');
  });

  it('pages with the toolbar, the thumbnails and a controlled index', () => {
    const { getByTestId, rerender } = render(<Controlled />);
    const index = () => getByTestId('index').textContent;
    fireEvent.click(q('.oge-image-viewer-next'));
    expect(index()).toBe('1');
    fireEvent.click(
      document.querySelectorAll('.oge-image-viewer-thumbnail')[2],
    );
    expect(index()).toBe('2');
    expect(q<HTMLButtonElement>('.oge-image-viewer-next').disabled).toBe(true);
    rerender(<Controlled loop />);
    fireEvent.click(q('.oge-image-viewer-next'));
    expect(index()).toBe('0');
    fireEvent.click(getByTestId('jump'));
    expect(image().getAttribute('src')).toBe('b.jpg');
    fireEvent.click(q('.oge-image-viewer-prev'));
    expect(index()).toBe('0');
  });

  it('zooms, rotates and resets from the toolbar, the wheel, a double click and the handle', () => {
    const zooms: number[] = [];
    const ref = createRef<OgeImageViewerHandle>();
    render(
      <OgeImageViewer
        ref={ref}
        images={IMAGES}
        maxZoom={4}
        onZoomChange={(z) => zooms.push(z)}
      />,
    );
    fireEvent.click(q('.oge-image-viewer-zoom-in'));
    expect(q('.oge-image-viewer-zoom').textContent).toBe('150%');
    fireEvent.click(q('.oge-image-viewer-rotate-right'));
    expect(image().style.transform).toContain('rotate(90deg)');
    fireEvent.click(q('.oge-image-viewer-rotate-left'));
    fireEvent.click(q('.oge-image-viewer-zoom-out'));
    fireEvent.click(q('.oge-image-viewer-reset'));
    const stage = q('.oge-image-viewer-stage');
    act(() => {
      stage.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -400, cancelable: true }),
      );
    });
    expect(zooms.at(-1)).toBeGreaterThan(1);
    fireEvent.doubleClick(stage);
    expect(zooms.at(-1)).toBe(1);
    fireEvent.doubleClick(stage);
    expect(zooms.at(-1)).toBe(2);
    expect(stage.classList).toContain('oge-image-viewer-zoomed');
    act(() => ref.current?.resetView());
    expect(zooms.at(-1)).toBe(1);
    act(() => ref.current?.next());
    expect(image().getAttribute('src')).toBe('b.jpg');
    act(() => ref.current?.previous());
    expect(image().getAttribute('src')).toBe('a.jpg');
  });

  it('pans with a pointer drag, pinches with two pointers and maps keys', () => {
    const zooms: number[] = [];
    const { getByTestId } = render(<Controlled zooms={zooms} />);
    const viewer = q('.oge-image-viewer');
    fireEvent.keyDown(viewer, { key: '+' });
    const stage = q('.oge-image-viewer-stage');
    const pointer = (
      type: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
      pointerId: number,
      clientX: number,
    ) =>
      act(() => {
        // jsdom's PointerEvent drops pointerId, so set it on a mouse event
        stage.dispatchEvent(
          Object.assign(
            new MouseEvent(type.toLowerCase(), {
              clientX,
              clientY: 0,
              bubbles: true,
              cancelable: true,
            }),
            { pointerId },
          ),
        );
      });
    pointer('pointerDown', 1, 0);
    pointer('pointerMove', 1, 10);
    pointer('pointerUp', 1, 10);
    pointer('pointerDown', 1, 0);
    pointer('pointerDown', 2, 100);
    pointer('pointerMove', 2, 200);
    pointer('pointerCancel', 2, 200);
    pointer('pointerUp', 1, 0);
    expect(zooms.at(-1)).toBeGreaterThan(1.5);
    fireEvent.keyDown(viewer, { key: '0' });
    fireEvent.keyDown(viewer, { key: 'ArrowRight' });
    expect(getByTestId('index').textContent).toBe('1');
  });

  it('asks for full screen, follows fullscreenchange and takes provider text', async () => {
    render(
      <OgeImageViewerConfigProvider
        config={{ messages: { fullscreen: 'Tam ekran' } }}
      >
        <OgeImageViewer images={IMAGES} />
      </OgeImageViewerConfigProvider>,
    );
    const toggle = q<HTMLButtonElement>('.oge-image-viewer-fullscreen-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Tam ekran');
    const root = q('.oge-image-viewer');
    root.requestFullscreen = vi.fn(() => Promise.reject(new Error('no')));
    await act(async () => {
      fireEvent.click(toggle);
      await Promise.resolve();
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle); // not in document fullscreen: just leaves the state
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    Object.defineProperty(document, 'fullscreenElement', {
      value: root,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(root.classList).toContain('oge-image-viewer-fullscreen');
    document.exitFullscreen = vi.fn(() => Promise.resolve());
    fireEvent.click(toggle);
    expect(document.exitFullscreen).toHaveBeenCalled();
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      configurable: true,
    });
  });

  it('says so when there are no images and takes message props', () => {
    render(<OgeImageViewer images={[]} messages={{ empty: 'Resim yok' }} />);
    expect(q('.oge-image-viewer-empty').textContent).toBe('Resim yok');
    expect(document.querySelector('.oge-image-viewer-thumbnails')).toBeNull();
  });
});
