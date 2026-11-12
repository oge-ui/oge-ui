import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeBarcodeResult,
  OgeBarcodeScannerStatus,
} from '@oge-ui/behavior';
import {
  OgeBarcode,
  OgeBarcodeScanner,
  type OgeBarcodeHandle,
  type OgeBarcodeScannerHandle,
} from './barcode';
import { OgeBarcodeConfigProvider } from './layout-config';

const q = <T extends Element = HTMLElement>(s: string) =>
  document.querySelector(s) as T;
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe('<OgeBarcode>', () => {
  it('draws a QR code as a named image, and bars with their text', () => {
    const { rerender } = render(
      <StrictMode>
        <OgeBarcodeConfigProvider
          config={{ messages: { qrLabel: 'Kare kod: {value}' } }}
        >
          <OgeBarcode value="HELLO" scale={2} className="mine" />
        </OgeBarcodeConfigProvider>
      </StrictMode>,
    );
    const svg = q<SVGSVGElement>('svg.oge-barcode-symbol');
    expect(svg.getAttribute('aria-label')).toBe('Kare kod: HELLO');
    expect(svg.getAttribute('viewBox')).toBe('0 0 29 29');
    expect(svg.getAttribute('width')).toBe('58');
    expect(q('.oge-barcode').classList).toContain('mine');
    rerender(
      <OgeBarcode value="400638133393" type="ean13" ariaLabel="Product" />,
    );
    expect(q('text').textContent).toBe('4006381333931');
    expect(q('svg').getAttribute('aria-label')).toBe('Product');
    rerender(<OgeBarcode value="12AB" type="ean13" />);
    expect(q('svg')).toBeNull();
    expect(q('.oge-barcode-invalid').textContent).toBe(
      'This value cannot be shown as a EAN-13 code',
    );
  });

  it('hands the symbol out as SVG and downloads it', () => {
    const ref = createRef<OgeBarcodeHandle>();
    const { rerender } = render(
      <OgeBarcode ref={ref} value="X-1" type="code128" errorCorrection="H" />,
    );
    expect(ref.current!.toSvg()).toContain('<title>Barcode: X-1</title>');
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.useFakeTimers();
    ref.current!.download();
    vi.runAllTimers();
    vi.useRealTimers();
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:svg');
    rerender(<OgeBarcode ref={ref} value="" type="code128" />);
    expect(ref.current!.toSvg()).toBeNull();
    ref.current!.download();
    expect(click).toHaveBeenCalledTimes(1);
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });
});

describe('<OgeBarcodeScanner>', () => {
  afterEach(() => Reflect.deleteProperty(navigator, 'mediaDevices'));

  it('says it cannot read without a reader and stays off', async () => {
    const statuses: OgeBarcodeScannerStatus[] = [];
    render(<OgeBarcodeScanner onStatusChange={(s) => statuses.push(s)} />);
    expect(q('.oge-barcode-scanner').getAttribute('aria-label')).toBe(
      'Barcode scanner',
    );
    fireEvent.click(q('.oge-barcode-scanner-toggle'));
    await flush();
    expect(statuses).toContain('unsupported');
    expect(q('.oge-barcode-scanner-toggle').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(q('[role="status"]').textContent).toBe(
      'This browser cannot read barcodes',
    );
  });

  it('reads an image file, and says when it finds nothing', async () => {
    let results: OgeBarcodeResult[] = [{ value: 'QR!', format: 'qr_code' }];
    const reads: string[] = [];
    const ref = createRef<OgeBarcodeScannerHandle>();
    render(
      <OgeBarcodeScanner
        ref={ref}
        decoder={async () => results}
        onDetected={(r) => reads.push(r.value)}
      />,
    );
    const input = q<HTMLInputElement>('.oge-barcode-scanner-file');
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    fireEvent.click(q('.oge-barcode-scanner-image'));
    expect(click).toHaveBeenCalled();
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] },
    });
    await flush();
    expect(reads).toEqual(['QR!']);
    expect(q('[role="status"]').textContent).toBe('Read: QR!');
    results = [];
    await act(async () => {
      await ref.current!.scanImage(new Blob(['y']));
    });
    expect(q('[role="status"]').textContent).toBe(
      'No barcode found in the image',
    );
    fireEvent.change(input, { target: { files: [] } });
  });

  it('opens the camera when controlled, reads frames and closes it', async () => {
    const track = { stop: vi.fn() };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })),
      },
      configurable: true,
    });
    const reads: string[] = [];
    const statuses: OgeBarcodeScannerStatus[] = [];
    const ref = createRef<OgeBarcodeScannerHandle>();
    function Host() {
      const [active, setActive] = useState(false);
      return (
        <>
          <output data-testid="on">{String(active)}</output>
          <OgeBarcodeScanner
            ref={ref}
            active={active}
            onActiveChange={setActive}
            decoder={async () => [{ value: 'EAN', format: 'ean_13' }]}
            interval={30}
            facingMode="user"
            onDetected={(r) => reads.push(r.value)}
            onStatusChange={(s) => statuses.push(s)}
          />
        </>
      );
    }
    const { getByTestId } = render(<Host />);
    const video = q<HTMLVideoElement>('video');
    Object.defineProperty(video, 'readyState', { value: 4 });
    video.play = vi.fn(() => Promise.resolve());
    act(() => ref.current!.start());
    await flush();
    expect(getByTestId('on').textContent).toBe('true');
    expect(q('.oge-barcode-scanner').classList).toContain(
      'oge-barcode-scanner-live',
    );
    expect(q('.oge-barcode-scanner-toggle').textContent).toBe('Stop camera');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 70));
    });
    expect(reads).toEqual(['EAN']);
    act(() => ref.current!.stop());
    expect(track.stop).toHaveBeenCalled();
    expect(statuses).toEqual(['starting', 'scanning', 'idle']);
  });

  it('starts uncontrolled from defaultActive', async () => {
    render(
      <OgeBarcodeScanner
        defaultActive
        types={['qr']}
        messages={{ unsupported: 'Yok' }}
      />,
    );
    await flush();
    expect(q('[role="status"]').textContent).toBe('Yok');
  });
});
