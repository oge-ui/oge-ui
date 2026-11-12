import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OgeBarcodeDecoder,
  OgeBarcodeResult,
  OgeBarcodeScannerStatus,
  OgeBarcodeType,
} from '@oge-ui/behavior';
import { OgeBarcode } from './barcode';
import { OgeBarcodeScanner } from './barcode-scanner';
import { provideOgeBarcodeConfig } from './config';

@Component({
  imports: [OgeBarcode],
  template: `<oge-barcode
    #code
    [value]="value()"
    [type]="type()"
    [scale]="2"
    [errorCorrection]="ecl()"
  />`,
})
class CodeHost {
  readonly value = signal('HELLO');
  readonly type = signal<OgeBarcodeType>('qr');
  readonly ecl = signal<'L' | 'H' | undefined>(undefined);
  readonly code = viewChild.required(OgeBarcode);
}

@Component({
  imports: [OgeBarcodeScanner],
  template: `<oge-barcode-scanner
    #scanner
    [(active)]="active"
    [decoder]="decoder()"
    [interval]="50"
    (detected)="reads.push($event)"
    (statusChange)="statuses.push($event)"
  />`,
})
class ScannerHost {
  readonly active = signal(false);
  readonly decoder = signal<OgeBarcodeDecoder | undefined>(undefined);
  readonly scanner = viewChild.required(OgeBarcodeScanner);
  readonly reads: OgeBarcodeResult[] = [];
  readonly statuses: OgeBarcodeScannerStatus[] = [];
}

const q = <T extends Element = HTMLElement>(el: HTMLElement, s: string) =>
  el.querySelector(s) as T;

describe('OgeBarcode', () => {
  let fixture: ComponentFixture<CodeHost>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeBarcodeConfig({ messages: { qrLabel: 'Kare kod: {value}' } }),
      ],
    });
    fixture = TestBed.createComponent(CodeHost);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('draws a QR code as a named image with its quiet zone', () => {
    const svg = q<SVGSVGElement>(el, 'svg.oge-barcode-symbol');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Kare kod: HELLO');
    // version 1: 21 modules + 8 of quiet zone, 2 px each
    expect(svg.getAttribute('viewBox')).toBe('0 0 29 29');
    expect(svg.getAttribute('width')).toBe('58');
    expect(q(el, 'path').getAttribute('d')).toMatch(/^M4 4h7v1h-7z/);
    expect(q(el, 'text')).toBeNull();
    fixture.componentInstance.ecl.set('H');
    fixture.componentInstance.value.set('https://ogeui.com/components/barcode');
    fixture.detectChanges();
    expect(svg.getAttribute('viewBox')).toBe('0 0 45 45');
  });

  it('draws EAN-13 and Code 128 bars with their text, and explains a value that does not fit', () => {
    fixture.componentInstance.type.set('ean13');
    fixture.componentInstance.value.set('400638133393');
    fixture.detectChanges();
    expect(q(el, 'text').textContent).toBe('4006381333931');
    expect(q(el, 'svg').getAttribute('aria-label')).toBe(
      'Barcode: 400638133393',
    );
    fixture.componentInstance.value.set('12AB');
    fixture.detectChanges();
    expect(q(el, 'svg')).toBeNull();
    expect(q(el, '.oge-barcode-invalid').textContent).toContain(
      'This value cannot be shown as a EAN-13 code',
    );
    expect(fixture.componentInstance.code().toSvg()).toBeNull();
    fixture.componentInstance.type.set('code128');
    fixture.componentInstance.value.set('OGE-128');
    fixture.detectChanges();
    expect(q(el, 'text').textContent).toBe('OGE-128');
  });

  it('hands the symbol out as a standalone SVG and downloads it', () => {
    const svg = fixture.componentInstance.code().toSvg()!;
    expect(svg).toContain('<title>Kare kod: HELLO</title>');
    expect(svg).toContain('width="58"');
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    vi.useFakeTimers();
    fixture.componentInstance.code().download('kod.svg');
    vi.runAllTimers();
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:svg');
    vi.useRealTimers();
    create.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
    fixture.componentInstance.value.set('');
    fixture.componentInstance.type.set('ean13');
    fixture.detectChanges();
    fixture.componentInstance.code().download();
  });
});

describe('OgeBarcodeScanner', () => {
  let fixture: ComponentFixture<ScannerHost>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ScannerHost);
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  const settle = async () => {
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
  };

  it('says it cannot read without a decoder or the browser reader, and stays off', async () => {
    const group = q(el, '.oge-barcode-scanner');
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Barcode scanner');
    q<HTMLButtonElement>(el, '.oge-barcode-scanner-toggle').click();
    fixture.detectChanges();
    await settle();
    expect(fixture.componentInstance.statuses).toContain('unsupported');
    expect(fixture.componentInstance.active()).toBe(false);
    expect(q(el, '[role="status"]').textContent).toBe(
      'This browser cannot read barcodes',
    );
  });

  it('reads an image file with a decoder, and says when it finds nothing', async () => {
    let results: OgeBarcodeResult[] = [
      { value: '4006381333931', format: 'ean_13' },
    ];
    fixture.componentInstance.decoder.set(async () => results);
    fixture.detectChanges();
    const input = q<HTMLInputElement>(el, '.oge-barcode-scanner-file');
    const file = new File(['x'], 'code.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });
    input.dispatchEvent(new Event('change'));
    await settle();
    expect(fixture.componentInstance.reads.map((r) => r.value)).toEqual([
      '4006381333931',
    ]);
    expect(q(el, '[role="status"]').textContent).toBe('Read: 4006381333931');
    results = [];
    await fixture.componentInstance.scanner().scanImage(new Blob(['y']));
    fixture.detectChanges();
    expect(q(el, '[role="status"]').textContent).toBe(
      'No barcode found in the image',
    );
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    input.dispatchEvent(new Event('change'));
  });

  it('opens the camera, reads frames and closes it again', async () => {
    const track = { stop: vi.fn() };
    const getUserMedia = vi.fn(
      async () => ({ getTracks: () => [track] }) as unknown as MediaStream,
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    const video = q<HTMLVideoElement>(el, 'video');
    Object.defineProperty(video, 'readyState', { value: 4 });
    video.play = vi.fn(() => Promise.resolve());
    fixture.componentInstance.decoder.set(async () => [
      { value: 'QR!', format: 'qr_code' },
    ]);
    fixture.detectChanges();
    fixture.componentInstance.scanner().start();
    fixture.detectChanges();
    await settle();
    expect(
      q(el, '.oge-barcode-scanner-toggle').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(q(el, '.oge-barcode-scanner-toggle').textContent?.trim()).toBe(
      'Stop camera',
    );
    expect(q(el, '.oge-barcode-scanner').classList).toContain(
      'oge-barcode-scanner-live',
    );
    await new Promise((r) => setTimeout(r, 80));
    fixture.detectChanges();
    expect(fixture.componentInstance.reads.map((r) => r.value)).toEqual([
      'QR!',
    ]);
    fixture.componentInstance.scanner().stop();
    fixture.detectChanges();
    expect(track.stop).toHaveBeenCalled();
    expect(fixture.componentInstance.statuses).toEqual([
      'starting',
      'scanning',
      'idle',
    ]);
    Reflect.deleteProperty(navigator, 'mediaDevices');
  });
});
