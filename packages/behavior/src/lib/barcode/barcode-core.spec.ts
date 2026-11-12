import {
  OGE_BARCODE_TEXT_HEIGHT,
  OGE_DEFAULT_BARCODE_CONFIG,
  OgeBarcodeScannerCore,
  ogeBarcodeDrawing,
  ogeBarcodeSvg,
  ogeEncodeBarcode,
  ogeNativeBarcodeDecoder,
  resolveOgeBarcodeConfig,
  type OgeBarcodeScannerStatus,
} from './barcode-core';
import {
  OGE_CODE128_PATTERNS,
  ogeEan13CheckDigit,
  ogeEncodeCode128,
  ogeEncodeEan13,
} from './linear';
import {
  ogeEncodeQr,
  ogeQrAlignmentPositions,
  ogeQrDataBytes,
  ogeQrDataCodewords,
  ogeQrFormatBits,
  ogeQrPenalty,
  ogeQrReedSolomon,
} from './qr';

describe('QR encoder', () => {
  it('matches the reference codewords of "HELLO WORLD" at 1-M', () => {
    // the worked example of the QR code tutorials (thonky.com)
    const data = ogeQrDataBytes('HELLO WORLD', 1, 'M')!;
    expect(data).toEqual([
      32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17,
    ]);
    expect(ogeQrReedSolomon(data, 10)).toEqual([
      196, 35, 39, 119, 235, 215, 231, 226, 93, 23,
    ]);
  });

  it('knows the capacities, alignment positions and format bits of the standard', () => {
    expect(ogeQrDataCodewords(1, 'L')).toBe(19);
    expect(ogeQrDataCodewords(40, 'H')).toBe(1276);
    expect(ogeQrAlignmentPositions(1)).toEqual([]);
    expect(ogeQrAlignmentPositions(7)).toEqual([6, 22, 38]);
    expect(ogeQrAlignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138]);
    // level M, mask 5 → 100000011001110 (ISO 18004 table C.1)
    expect(ogeQrFormatBits('M', 5).toString(2).padStart(15, '0')).toBe(
      '100000011001110',
    );
    expect(ogeQrDataBytes('x'.repeat(30), 1, 'H')).toBeNull();
  });

  it('picks the mode, the smallest version and the lowest-penalty mask', () => {
    expect(ogeEncodeQr('0123456789').mode).toBe('numeric');
    expect(ogeEncodeQr('HELLO WORLD').mode).toBe('alphanumeric');
    const bytes = ogeEncodeQr('Merhaba dünya', { errorCorrection: 'H' });
    expect(bytes).toMatchObject({
      mode: 'byte',
      version: 2,
      size: 25,
      errorCorrection: 'H',
    });
    const forced = ogeEncodeQr('MASK', { mask: 3, minVersion: 5 });
    expect(forced).toMatchObject({ mask: 3, version: 5, size: 37 });
    // version 7 and up carry version information next to two finders
    expect(ogeEncodeQr('A'.repeat(200), { errorCorrection: 'L' }).version).toBe(
      7,
    );
    const best = ogeEncodeQr('PENALTY');
    expect(ogeQrPenalty(best.modules)).toBeLessThanOrEqual(
      ogeQrPenalty(
        ogeEncodeQr('PENALTY', { mask: (best.mask + 1) % 8 }).modules,
      ),
    );
    expect(() => ogeEncodeQr('9'.repeat(8000))).toThrow(RangeError);
  });

  it('draws finder patterns in three corners and the dark module', () => {
    const { modules, size } = ogeEncodeQr('FINDERS');
    const finder = (x: number, y: number) =>
      [0, 1, 2, 3, 4, 5, 6].every(
        (i) => modules[y][x + i] && modules[y + 6][x + i],
      );
    expect(finder(0, 0)).toBe(true);
    expect(finder(size - 7, 0)).toBe(true);
    expect(finder(0, size - 7)).toBe(true);
    expect(modules[size - 8][8]).toBe(true);
  });
});

describe('linear encoders', () => {
  it('has a consistent Code 128 table', () => {
    expect(OGE_CODE128_PATTERNS).toHaveLength(107);
    const sum = (p: string) => [...p].reduce((s, d) => s + Number(d), 0);
    expect(OGE_CODE128_PATTERNS.slice(0, 106).every((p) => sum(p) === 11)).toBe(
      true,
    );
    expect(sum(OGE_CODE128_PATTERNS[106])).toBe(13);
    expect(new Set(OGE_CODE128_PATTERNS).size).toBe(107);
  });

  it('encodes Code 128 in set B, switching to set C for runs of digits', () => {
    const modules = (text: string) => ogeEncodeCode128(text).modules.length;
    // start + one symbol per character (or digit pair) + check + stop (13)
    expect(modules('Ab')).toBe(11 * 4 + 13);
    expect(modules('123456')).toBe(11 * 5 + 13);
    expect(modules('A123456')).toBe(11 * 7 + 13); // B: A, Code C, three pairs
    expect(modules('A12345')).toBe(11 * 7 + 13); // odd run: "1" in B, then C
    expect(modules('1234AB')).toBe(11 * 7 + 13); // C, then back to B
    expect(modules('12345')).toBe(11 * 6 + 13); // C: two pairs, then B for the last digit
    expect(ogeEncodeCode128('Ab').modules.slice(0, 11)).toEqual(
      [...'11010010000'].map((b) => b === '1'), // Start B
    );
    expect(() => ogeEncodeCode128('')).toThrow(RangeError);
    expect(() => ogeEncodeCode128('ğ')).toThrow(/cannot encode/);
  });

  it('encodes EAN-13 with its check digit, from consistent digit tables', () => {
    expect(ogeEan13CheckDigit('400638133393')).toBe(1);
    const symbol = ogeEncodeEan13('400638133393');
    expect(symbol.text).toBe('4006381333931');
    expect(symbol.modules).toHaveLength(95);
    // guards: 101 … 01010 … 101
    const bits = symbol.modules.map((b) => (b ? '1' : '0')).join('');
    expect(bits.slice(0, 3)).toBe('101');
    expect(bits.slice(45, 50)).toBe('01010');
    expect(bits.slice(92)).toBe('101');
    // first digit 4 → LGLLGG; the second digit 0 in L is 0001101
    expect(bits.slice(3, 10)).toBe('0001101');
    expect(ogeEncodeEan13('4006381333931').text).toBe('4006381333931');
    expect(() => ogeEncodeEan13('4006381333932')).toThrow(/should be 1/);
    expect(() => ogeEncodeEan13('12AB')).toThrow(RangeError);
  });
});

describe('drawing', () => {
  it('lays a QR code out with its quiet zone, as merged runs', () => {
    const symbol = ogeEncodeBarcode('HI', 'qr');
    const drawing = ogeBarcodeDrawing(symbol);
    expect(drawing.width).toBe(21 + 8);
    expect(drawing.d.startsWith('M4 4h7v1h-7z')).toBe(true);
    expect(drawing.text).toBeUndefined();
    expect(ogeBarcodeDrawing(symbol, { quietZone: false }).width).toBe(21);
  });

  it('lays bars out with their text line', () => {
    const symbol = ogeEncodeBarcode('4006381333931', 'ean13');
    const drawing = ogeBarcodeDrawing(symbol, { barHeight: 40 });
    expect(drawing).toMatchObject({
      width: 115,
      height: 40 + OGE_BARCODE_TEXT_HEIGHT,
      text: { x: 57.5, value: '4006381333931' },
    });
    expect(drawing.d.startsWith('M10 0h1v40h-1z')).toBe(true);
    expect(
      ogeBarcodeDrawing(symbol, { showText: false, quietZone: false }),
    ).toMatchObject({
      width: 95,
      height: 50,
    });
    expect(
      ogeEncodeBarcode('X1', 'code128', { errorCorrection: 'H' }).kind,
    ).toBe('linear');
  });

  it('writes a standalone SVG with escaped text', () => {
    const drawing = ogeBarcodeDrawing(ogeEncodeBarcode('a<b', 'code128'));
    const svg = ogeBarcodeSvg(drawing, {
      scale: 2,
      label: 'A & B',
      color: '#123',
    });
    expect(svg).toContain(`width="${drawing.width * 2}"`);
    expect(svg).toContain('<title>A &#38; B</title>');
    expect(svg).toContain('>a&#60;b</text>');
    expect(svg).toContain('fill="#123"');
    expect(
      ogeBarcodeSvg(ogeBarcodeDrawing(ogeEncodeBarcode('Q', 'qr'))),
    ).not.toContain('<title>');
  });

  it('merges a config over the defaults', () => {
    expect(resolveOgeBarcodeConfig(undefined)).toEqual(
      OGE_DEFAULT_BARCODE_CONFIG,
    );
    const config = resolveOgeBarcodeConfig({
      errorCorrection: 'Q',
      messages: { start: 'Başlat' },
    });
    expect(config.messages.start).toBe('Başlat');
    expect(config.messages.stop).toBe('Stop camera');
    expect(config.errorCorrection).toBe('Q');
  });
});

describe('reading', () => {
  const track = () => ({ stop: vi.fn() });
  const stream = (tracks = [track()]) =>
    ({ getTracks: () => tracks }) as unknown as MediaStream;
  const video = () => {
    const el = document.createElement('video');
    Object.defineProperty(el, 'readyState', { value: 4 });
    el.play = vi.fn(() => Promise.resolve());
    return el;
  };

  afterEach(() => vi.useRealTimers());

  it('wraps the browser BarcodeDetector, or says there is none', async () => {
    expect(ogeNativeBarcodeDecoder(undefined, {})).toBeNull();
    const detect = vi.fn(async () => [{ rawValue: 'X', format: 'qr_code' }]);
    const Detector = vi.fn(function (this: { detect: typeof detect }) {
      this.detect = detect;
    });
    const decoder = ogeNativeBarcodeDecoder(['qr_code'], {
      BarcodeDetector: Detector,
    })!;
    expect(await decoder({} as ImageBitmapSource)).toEqual([
      { value: 'X', format: 'qr_code' },
    ]);
    await decoder({} as ImageBitmapSource);
    expect(Detector).toHaveBeenCalledTimes(1);
    expect(Detector).toHaveBeenCalledWith({ formats: ['qr_code'] });
  });

  it('opens the camera, reads frames, drops repeats and stops', async () => {
    vi.useFakeTimers();
    const statuses: OgeBarcodeScannerStatus[] = [];
    const detected: string[] = [];
    let frame = 0;
    const tracks = [track()];
    const decoder = vi.fn(async () =>
      ++frame <= 2
        ? [{ value: 'A', format: 'qr_code' }]
        : [{ value: 'B', format: 'qr_code' }],
    );
    const core = new OgeBarcodeScannerCore({
      decoder: () => decoder,
      interval: () => 100,
      facingMode: () => 'user',
      onStatus: (s) => statuses.push(s),
      onDetect: (r) => detected.push(r.value),
      getUserMedia: vi.fn(async (c: MediaStreamConstraints) => {
        expect(c.video).toEqual({ facingMode: 'user' });
        return stream(tracks);
      }),
    });
    expect(core.supported()).toBe(true);
    const el = video();
    await core.start(el);
    expect(statuses).toEqual(['starting', 'scanning']);
    expect(el.srcObject).not.toBeNull();
    await vi.advanceTimersByTimeAsync(350);
    // A, A again (a repeat), then B
    expect(detected).toEqual(['A', 'B']);
    core.stop();
    expect(statuses.at(-1)).toBe('idle');
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(el.srcObject).toBeNull();
    await vi.advanceTimersByTimeAsync(500);
    expect(decoder).toHaveBeenCalledTimes(3);
    core.destroy();
    expect(statuses.filter((s) => s === 'idle')).toHaveLength(1);
  });

  it('reports a missing reader, a missing camera, a refusal and a failure', async () => {
    const statuses: OgeBarcodeScannerStatus[] = [];
    const make = (getUserMedia?: () => Promise<MediaStream>, decoder = true) =>
      new OgeBarcodeScannerCore({
        decoder: () => (decoder ? async () => [] : null),
        onStatus: (s) => statuses.push(s),
        onDetect: () => undefined,
        ...(getUserMedia ? { getUserMedia } : {}),
      });
    const none = new OgeBarcodeScannerCore({
      onStatus: (s) => statuses.push(s),
      onDetect: () => undefined,
    });
    expect(none.supported()).toBe(false);
    await none.start(video());
    expect(await none.scanImage(new Blob())).toEqual([]);
    const reject = (name: string) => () =>
      Promise.reject(Object.assign(new Error(name), { name }));
    await make(reject('NotAllowedError')).start(video());
    await make(reject('NotFoundError')).start(video());
    await make(reject('AbortError')).start(video());
    expect(statuses).toEqual([
      'unsupported',
      'unsupported',
      'starting',
      'permission',
      'starting',
      'no-camera',
      'starting',
      'failed',
    ]);
    statuses.length = 0;
    // no getUserMedia at all (jsdom has no mediaDevices)
    await make().start(video());
    expect(statuses).toEqual(['no-camera']);
  });

  it('drops a stream granted after the scanner was stopped', async () => {
    let grant!: (s: MediaStream) => void;
    const tracks = [track()];
    const statuses: OgeBarcodeScannerStatus[] = [];
    const core = new OgeBarcodeScannerCore({
      decoder: () => async () => [],
      onStatus: (s) => statuses.push(s),
      onDetect: () => undefined,
      getUserMedia: () => new Promise((resolve) => (grant = resolve)),
    });
    const pending = core.start(video());
    core.stop();
    grant(stream(tracks));
    await pending;
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(statuses).toEqual(['starting']);
  });

  it('reads an image file and reports every barcode in it', async () => {
    const detected: string[] = [];
    const core = new OgeBarcodeScannerCore({
      decoder: () => async () => [
        { value: '1', format: 'ean_13' },
        { value: '2', format: 'qr_code' },
      ],
      onStatus: () => undefined,
      onDetect: (r) => detected.push(r.value),
    });
    expect((await core.scanImage(new Blob(['x']))).map((r) => r.value)).toEqual(
      ['1', '2'],
    );
    expect(detected).toEqual(['1', '2']);
    // the same file again is a new read, not a repeat
    await core.scanImage(new Blob(['x']));
    expect(detected).toHaveLength(4);
  });
});
