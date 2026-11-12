import { StrictMode, createRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { OgePdfJs } from '@oge-ui/spreadsheet-engine/pdf';
import {
  OgePdfViewer,
  type OgePdfViewerHandle,
  type OgePdfViewerProps,
} from './pdf-viewer';
import { OgePdfViewerConfigProvider } from './pdf-viewer-config';

const run = (str: string) => ({
  str,
  transform: [10, 0, 0, 10, 50, 750],
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

const file = new Uint8Array([1]);

describe('<OgePdfViewer>', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => ({}),
    ) as unknown as HTMLCanvasElement['getContext'];
  });

  async function open(
    extra: Partial<OgePdfViewerProps> = {},
    pdfjs = fakePdfJs(),
    messages = {},
  ) {
    const onLoaded = vi.fn();
    const view = render(
      <OgePdfViewerConfigProvider
        config={{ pdfjs: async () => pdfjs, messages }}
      >
        <OgePdfViewer source={file} onLoaded={onLoaded} {...extra} />
      </OgePdfViewerConfigProvider>,
    );
    if (!extra.onLoadError) {
      await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    }
    return { ...view, onLoaded, pdfjs };
  }

  it('lays out every page and draws the ones near the viewport', async () => {
    const { container, pdfjs } = await open();
    const pages = container.querySelectorAll('.oge-pdf-page');
    expect(pages.length).toBe(3);
    expect(pages[0].getAttribute('aria-label')).toBe('Page 1 of 3');
    await waitFor(() => expect(pdfjs.renders).toBeGreaterThan(0));
  });

  it('pages with the toolbar and follows a controlled index', async () => {
    const onPageIndexChange = vi.fn();
    const { container, rerender } = await open({ onPageIndexChange });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageIndexChange).toHaveBeenLastCalledWith(1);
    const config = { pdfjs: async () => fakePdfJs() };
    rerender(
      <OgePdfViewerConfigProvider config={config}>
        <OgePdfViewer source={file} pageIndex={2} />
      </OgePdfViewerConfigProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector('.oge-pdf-page-label')?.textContent).toBe(
        'Page 3 of 3',
      ),
    );
    rerender(
      <OgePdfViewerConfigProvider config={config}>
        <OgePdfViewer source={null} />
      </OgePdfViewerConfigProvider>,
    );
    await waitFor(() =>
      expect(container.querySelector('.oge-pdf-status')?.textContent).toBe(
        'No document to show',
      ),
    );
  });

  it('zooms by steps and to the fits', async () => {
    const onZoomChange = vi.fn();
    const { container } = await open({ zoom: 1, onZoomChange });
    expect(container.querySelector('.oge-pdf-zoom-label')?.textContent).toBe(
      '100%',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(onZoomChange).toHaveBeenLastCalledWith(1.25);
    expect(
      (container.querySelector('.oge-pdf-page') as HTMLElement).style.width,
    ).toBe('1000px');
    fireEvent.click(screen.getByRole('button', { name: 'Fit page' }));
    expect(onZoomChange).toHaveBeenLastCalledWith('fit-page');
    fireEvent.keyDown(container.querySelector('.oge-pdf')!, {
      key: '0',
      ctrlKey: true,
    });
    expect(onZoomChange).toHaveBeenLastCalledWith('fit-width');
  });

  it('finds text and steps through the highlights', async () => {
    const { container } = await open();
    const input = screen.getByRole('searchbox', { name: 'Find in document' });
    fireEvent.change(input, { target: { value: 'report' } });
    await waitFor(() =>
      expect(container.querySelector('.oge-pdf-match-label')?.textContent).toBe(
        '1 of 2',
      ),
    );
    expect(container.querySelectorAll('.oge-pdf-highlight').length).toBe(2);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(container.querySelector('.oge-pdf-match-label')?.textContent).toBe(
      '2 of 2',
    );
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(container.querySelector('.oge-pdf-match-label')?.textContent).toBe(
      '1 of 2',
    );
    fireEvent.keyDown(input, { key: 'a' });
    fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous match' }));
    expect(container.querySelector('.oge-pdf-match-label')?.textContent).toBe(
      '1 of 2',
    );
  });

  it('shows page thumbnails that move to their page', async () => {
    const onShowThumbnailsChange = vi.fn();
    const onPageIndexChange = vi.fn();
    const { container } = await open({
      onShowThumbnailsChange,
      onPageIndexChange,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Page thumbnails' }));
    expect(onShowThumbnailsChange).toHaveBeenLastCalledWith(true);
    const thumbs = container.querySelectorAll('.oge-pdf-thumbnail');
    expect(thumbs.length).toBe(3);
    expect(thumbs[0].getAttribute('aria-current')).toBe('page');
    fireEvent.click(thumbs[2]);
    expect(onPageIndexChange).toHaveBeenLastCalledWith(2);
  });

  it('reports a password-protected file in the provider text', async () => {
    const onLoadError = vi.fn();
    const { container } = await open(
      { onLoadError, toolbar: false },
      fakePdfJs('PasswordException'),
      { passwordProtected: 'Parola korumalı' },
    );
    await waitFor(() => expect(onLoadError).toHaveBeenCalled());
    expect(onLoadError.mock.calls[0][0].code).toBe('password');
    expect(container.querySelector('.oge-pdf-status')?.textContent).toBe(
      'Parola korumalı',
    );
  });

  it('survives StrictMode', async () => {
    const onLoaded = vi.fn();
    const { container } = render(
      <StrictMode>
        <OgePdfViewerConfigProvider config={{ pdfjs: async () => fakePdfJs() }}>
          <OgePdfViewer source={new Uint8Array([1])} onLoaded={onLoaded} />
        </OgePdfViewerConfigProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    expect(container.querySelectorAll('.oge-pdf-page').length).toBe(3);
  });

  it('searches through its ref', async () => {
    const ref = createRef<OgePdfViewerHandle>();
    const { container } = await open({ ref } as Partial<OgePdfViewerProps>);
    await ref.current!.search('revenue');
    await waitFor(() =>
      expect(container.querySelector('.oge-pdf-match-label')?.textContent).toBe(
        '1 of 1',
      ),
    );
    expect(typeof ref.current!.print).toBe('function');
  });

  it('steps back, zooms out, fits the width and prints', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe;
        disconnect = disconnect;
      },
    );
    const onZoomChange = vi.fn();
    const ref = createRef<OgePdfViewerHandle>();
    const { container, unmount } = await open({
      zoom: 1,
      onZoomChange,
      pageIndex: 1,
      ref,
    } as Partial<OgePdfViewerProps>);
    expect(observe).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(onZoomChange).toHaveBeenLastCalledWith(0.75);
    fireEvent.click(screen.getByRole('button', { name: 'Fit to width' }));
    expect(onZoomChange).toHaveBeenLastCalledWith('fit-width');
    const print = vi.fn();
    const frame = container.ownerDocument.createElement.bind(
      container.ownerDocument,
    );
    const create = vi
      .spyOn(container.ownerDocument, 'createElement')
      .mockImplementation((tag: string, options?: ElementCreationOptions) => {
        const el = frame(tag, options);
        if (tag === 'iframe') {
          // jsdom has no print dialog
          Object.defineProperty(el, 'contentWindow', {
            value: {
              addEventListener: vi.fn(),
              focus: vi.fn(),
              print,
              // jsdom closes every frame it still holds when the test ends
              close: vi.fn(),
            },
          });
        }
        if (tag === 'canvas') {
          (el as HTMLCanvasElement).toDataURL = () => 'data:image/png;base64,';
        }
        return el;
      });
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    await ref.current!.print();
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
    create.mockRestore();
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
