import { measureChartElement, observeChartSize } from './chart-size';

function sized(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
    }) as DOMRect;
  return element;
}

describe('chart size observer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('measures rounded sizes and ignores zero-size elements', () => {
    expect(measureChartElement(sized(100.4, 50.6))).toEqual({
      width: 100,
      height: 51,
    });
    expect(measureChartElement(sized(0, 50))).toBeNull();
  });

  it('measures immediately and works without ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const sizes: unknown[] = [];
    const stop = observeChartSize(sized(10, 20), (size) => sizes.push(size));
    expect(sizes).toEqual([{ width: 10, height: 20 }]);
    stop();
  });

  it('coalesces resizes into one frame and disconnects on dispose', () => {
    let callback: () => void = () => undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          callback = cb;
        }
        observe(): void {
          /* recorded through the constructor */
        }
        disconnect = disconnect;
      },
    );
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    const sizes: unknown[] = [];
    const stop = observeChartSize(sized(10, 20), (size) => sizes.push(size));
    callback();
    callback();
    expect(frames).toHaveLength(1);
    frames[0](0);
    expect(sizes).toHaveLength(2);
    stop();
    expect(disconnect).toHaveBeenCalled();
  });
});
