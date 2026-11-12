import { ogeEncodeQr, type OgeQrCode, type OgeQrErrorCorrection } from './qr';
import { ogeEncodeCode128, ogeEncodeEan13 } from './linear';

/** The symbologies the suite draws. */
export type OgeBarcodeType = 'qr' | 'code128' | 'ean13';

/** An encoded symbol: a module matrix (QR) or a row of module-wide bars. */
export type OgeBarcodeSymbol =
  | ({ readonly kind: 'matrix'; readonly type: 'qr' } & OgeQrCode)
  | {
      readonly kind: 'linear';
      readonly type: 'code128' | 'ean13';
      readonly modules: readonly boolean[];
      readonly text: string;
    };

export interface OgeBarcodeEncodeOptions {
  /** QR only (default `'M'`). */
  readonly errorCorrection?: OgeQrErrorCorrection;
}

/** Encodes `value`; throws `RangeError` when the symbology cannot hold it. */
export function ogeEncodeBarcode(
  value: string,
  type: OgeBarcodeType,
  options: OgeBarcodeEncodeOptions = {},
): OgeBarcodeSymbol {
  if (type === 'qr') {
    return {
      kind: 'matrix',
      type,
      ...ogeEncodeQr(value, {
        ...(options.errorCorrection
          ? { errorCorrection: options.errorCorrection }
          : {}),
      }),
    };
  }
  const encoded =
    type === 'ean13' ? ogeEncodeEan13(value) : ogeEncodeCode128(value);
  return { kind: 'linear', type, ...encoded };
}

/** A symbol laid out for drawing, in module units. */
export interface OgeBarcodeDrawing {
  readonly width: number;
  readonly height: number;
  /** Every dark module or bar, merged into horizontal runs. */
  readonly d: string;
  /** Where the human-readable line goes (linear symbols with `showText`). */
  readonly text?: {
    readonly x: number;
    readonly y: number;
    readonly value: string;
  };
}

export interface OgeBarcodeDrawingOptions {
  /** The light margin scanners need: 4 modules round a QR code, 10 beside bars (default `true`). */
  readonly quietZone?: boolean;
  /** Bar height of a linear symbol, in modules (default 50). */
  readonly barHeight?: number;
  /** The text line under a linear symbol (default `true`). */
  readonly showText?: boolean;
}

/** Height of the text line under bars, in modules. */
export const OGE_BARCODE_TEXT_HEIGHT = 12;

/** Lays a symbol out as one SVG path of dark runs. */
export function ogeBarcodeDrawing(
  symbol: OgeBarcodeSymbol,
  options: OgeBarcodeDrawingOptions = {},
): OgeBarcodeDrawing {
  const quiet = options.quietZone ?? true;
  const parts: string[] = [];
  if (symbol.kind === 'matrix') {
    const margin = quiet ? 4 : 0;
    symbol.modules.forEach((row, y) => {
      let x = 0;
      while (x < symbol.size) {
        if (!row[x]) {
          x++;
          continue;
        }
        const start = x;
        while (x < symbol.size && row[x]) x++;
        parts.push(
          `M${start + margin} ${y + margin}h${x - start}v1h${start - x}z`,
        );
      }
    });
    const side = symbol.size + margin * 2;
    return { width: side, height: side, d: parts.join('') };
  }
  const margin = quiet ? 10 : 0;
  const bar = Math.max(1, options.barHeight ?? 50);
  const modules = symbol.modules;
  let x = 0;
  while (x < modules.length) {
    if (!modules[x]) {
      x++;
      continue;
    }
    const start = x;
    while (x < modules.length && modules[x]) x++;
    parts.push(`M${start + margin} 0h${x - start}v${bar}h${start - x}z`);
  }
  const width = modules.length + margin * 2;
  const showText = options.showText ?? true;
  return {
    width,
    height: bar + (showText ? OGE_BARCODE_TEXT_HEIGHT : 0),
    d: parts.join(''),
    ...(showText
      ? {
          text: {
            x: width / 2,
            y: bar + OGE_BARCODE_TEXT_HEIGHT - 2,
            value: symbol.text,
          },
        }
      : {}),
  };
}

const escapeXml = (text: string): string =>
  text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A standalone SVG document of a drawing — for a download or an `<img>`. */
export function ogeBarcodeSvg(
  drawing: OgeBarcodeDrawing,
  options: {
    /** Pixels per module (default 4). */
    readonly scale?: number;
    readonly color?: string;
    readonly background?: string;
    readonly label?: string;
  } = {},
): string {
  const scale = options.scale ?? 4;
  const color = escapeXml(options.color ?? '#000000');
  const background = escapeXml(options.background ?? '#ffffff');
  const text = drawing.text
    ? `<text x="${drawing.text.x}" y="${drawing.text.y}" text-anchor="middle" font-family="monospace" font-size="10" fill="${color}">${escapeXml(drawing.text.value)}</text>`
    : '';
  const label = options.label
    ? `<title>${escapeXml(options.label)}</title>`
    : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${drawing.width * scale}" height="${drawing.height * scale}" ` +
    `viewBox="0 0 ${drawing.width} ${drawing.height}" shape-rendering="crispEdges" role="img">` +
    `${label}<rect width="100%" height="100%" fill="${background}"/>` +
    `<path d="${drawing.d}" fill="${color}"/>${text}</svg>`
  );
}

// --- messages and config --------------------------------------------------------

export interface OgeBarcodeMessages {
  /** Accessible name of a QR code; `{value}` is what it encodes. */
  readonly qrLabel: string;
  /** Accessible name of a linear barcode. */
  readonly barcodeLabel: string;
  /** Shown instead of a symbol the value does not fit; `{type}` is the symbology. */
  readonly invalid: string;
  /** Accessible name of the scanner. */
  readonly scannerLabel: string;
  readonly start: string;
  readonly stop: string;
  readonly scanImage: string;
  readonly scanning: string;
  readonly unsupported: string;
  readonly permission: string;
  readonly noCamera: string;
  readonly failed: string;
  /** Announced on a read; `{value}`. */
  readonly detected: string;
  readonly nothingFound: string;
}

export const OGE_DEFAULT_BARCODE_MESSAGES: OgeBarcodeMessages = {
  qrLabel: 'QR code: {value}',
  barcodeLabel: 'Barcode: {value}',
  invalid: 'This value cannot be shown as a {type} code',
  scannerLabel: 'Barcode scanner',
  start: 'Start camera',
  stop: 'Stop camera',
  scanImage: 'Scan an image',
  scanning: 'Point the camera at a barcode',
  unsupported: 'This browser cannot read barcodes',
  permission: 'Camera access was denied',
  noCamera: 'No camera found',
  failed: 'The camera could not be started',
  detected: 'Read: {value}',
  nothingFound: 'No barcode found in the image',
};

export interface OgeBarcodeConfig {
  messages: OgeBarcodeMessages;
  /** Default QR error correction. */
  errorCorrection?: OgeQrErrorCorrection;
}

export type OgeBarcodeConfigInput = Partial<
  Omit<OgeBarcodeConfig, 'messages'>
> & {
  messages?: Partial<OgeBarcodeMessages>;
};

export const OGE_DEFAULT_BARCODE_CONFIG: OgeBarcodeConfig = {
  messages: OGE_DEFAULT_BARCODE_MESSAGES,
};

export function resolveOgeBarcodeConfig(
  input: OgeBarcodeConfigInput | undefined,
  base: OgeBarcodeConfig = OGE_DEFAULT_BARCODE_CONFIG,
): OgeBarcodeConfig {
  return {
    ...base,
    ...input,
    messages: { ...base.messages, ...input?.messages },
  };
}

// --- reading --------------------------------------------------------------------

/** One read barcode. */
export interface OgeBarcodeResult {
  readonly value: string;
  /** The format as the Shape Detection API names it (`qr_code`, `code_128`, `ean_13`, …). */
  readonly format: string;
}

/** Reads the barcodes in an image, a video frame or a canvas. */
export type OgeBarcodeDecoder = (
  source: ImageBitmapSource,
) => Promise<readonly OgeBarcodeResult[]>;

/** The Shape Detection API's names for the suite's symbologies. */
export const OGE_BARCODE_FORMATS: Readonly<Record<OgeBarcodeType, string>> = {
  qr: 'qr_code',
  code128: 'code_128',
  ean13: 'ean_13',
};

interface NativeDetector {
  detect(
    source: ImageBitmapSource,
  ): Promise<{ rawValue: string; format: string }[]>;
}
type NativeDetectorClass = (new (options?: {
  formats?: string[];
}) => NativeDetector) & {
  getSupportedFormats?: () => Promise<string[]>;
};

/**
 * The browser's own reader (`BarcodeDetector`, the Shape Detection API) as a
 * decoder, or `null` where there is none — then pass a decoder of your own
 * (a ZXing build, a server call).
 */
export function ogeNativeBarcodeDecoder(
  formats: readonly string[] = Object.values(OGE_BARCODE_FORMATS),
  global: { BarcodeDetector?: unknown } = globalThis as {
    BarcodeDetector?: unknown;
  },
): OgeBarcodeDecoder | null {
  const Detector = global.BarcodeDetector as NativeDetectorClass | undefined;
  if (typeof Detector !== 'function') return null;
  let detector: NativeDetector | null = null;
  return async (source) => {
    detector ??= new Detector({ formats: [...formats] });
    const found = await detector.detect(source);
    return found.map((f) => ({ value: f.rawValue, format: f.format }));
  };
}

/** Where a scanner stands. */
export type OgeBarcodeScannerStatus =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'unsupported'
  | 'permission'
  | 'no-camera'
  | 'failed';

export interface OgeBarcodeScannerCoreOptions {
  /** Reads frames; without one the browser's `BarcodeDetector` is used (status `unsupported` when absent). */
  readonly decoder?: () => OgeBarcodeDecoder | null | undefined;
  /** Milliseconds between frames read (default 250). */
  readonly interval?: () => number;
  /** `'environment'` (the back camera, default) or `'user'`. */
  readonly facingMode?: () => 'environment' | 'user';
  readonly onStatus: (status: OgeBarcodeScannerStatus) => void;
  readonly onDetect: (result: OgeBarcodeResult) => void;
  /** Camera access, for tests (default `navigator.mediaDevices.getUserMedia`). */
  readonly getUserMedia?: (
    constraints: MediaStreamConstraints,
  ) => Promise<MediaStream>;
}

/** A value read again within this long is the same read, not a new one. */
const REPEAT_MS = 1500;

/**
 * The scanner's framework-free half: the camera stream, the frame loop, the
 * decoder and the repeat filter. `start(video)` asks for the camera and reads
 * a frame every `interval` ms until `stop()`; `scanImage(blob)` reads a file.
 */
export class OgeBarcodeScannerCore {
  private stream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private video: HTMLVideoElement | null = null;
  private last: { value: string; at: number } | null = null;
  private run = 0;

  constructor(private readonly options: OgeBarcodeScannerCoreOptions) {}

  private decoder(): OgeBarcodeDecoder | null {
    return this.options.decoder?.() ?? ogeNativeBarcodeDecoder();
  }

  /** Whether anything can read barcodes here. */
  supported(): boolean {
    return this.decoder() !== null;
  }

  /** Opens the camera into `video` and starts reading frames. */
  async start(video: HTMLVideoElement): Promise<void> {
    this.stop();
    const decoder = this.decoder();
    if (!decoder) {
      this.options.onStatus('unsupported');
      return;
    }
    const getUserMedia =
      this.options.getUserMedia ??
      (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
        ? (c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c)
        : null);
    if (!getUserMedia) {
      this.options.onStatus('no-camera');
      return;
    }
    const run = ++this.run;
    this.options.onStatus('starting');
    try {
      const stream = await getUserMedia({
        video: { facingMode: this.options.facingMode?.() ?? 'environment' },
        audio: false,
      });
      if (run !== this.run) {
        // stopped while the browser asked for permission
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.video = video;
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute('playsinline', '');
      await video.play?.();
    } catch (error) {
      if (run !== this.run) return;
      const name = (error as { name?: string } | null)?.name;
      this.options.onStatus(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'permission'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'no-camera'
            : 'failed',
      );
      this.release();
      return;
    }
    this.options.onStatus('scanning');
    this.tick(decoder, run);
  }

  private tick(decoder: OgeBarcodeDecoder, run: number): void {
    this.timer = setTimeout(async () => {
      if (run !== this.run || !this.video) return;
      try {
        if (this.video.readyState >= 2) this.report(await decoder(this.video));
      } catch {
        // a frame that cannot be read is skipped
      }
      if (run === this.run) this.tick(decoder, run);
    }, this.options.interval?.() ?? 250);
  }

  private report(results: readonly OgeBarcodeResult[], now = Date.now()): void {
    for (const result of results) {
      if (
        this.last &&
        this.last.value === result.value &&
        now - this.last.at < REPEAT_MS
      ) {
        this.last = { value: result.value, at: now };
        continue;
      }
      this.last = { value: result.value, at: now };
      this.options.onDetect(result);
    }
  }

  /** Reads an image file; every barcode found is reported and returned. */
  async scanImage(image: Blob): Promise<readonly OgeBarcodeResult[]> {
    const decoder = this.decoder();
    if (!decoder) {
      this.options.onStatus('unsupported');
      return [];
    }
    const source: ImageBitmapSource =
      typeof createImageBitmap === 'function'
        ? await createImageBitmap(image)
        : image;
    const results = await decoder(source);
    this.last = null;
    this.report(results);
    return results;
  }

  private release(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }

  /** Closes the camera. */
  stop(): void {
    const wasRunning = this.stream !== null || this.timer !== null;
    this.run++;
    this.release();
    this.last = null;
    if (wasRunning) this.options.onStatus('idle');
  }

  /** Alias of `stop()` for teardown hooks. */
  destroy(): void {
    this.stop();
  }
}
