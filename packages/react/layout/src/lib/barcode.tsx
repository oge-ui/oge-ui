'use client';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';
import {
  OGE_BARCODE_FORMATS,
  OgeBarcodeScannerCore,
  ogeBarcodeDrawing,
  ogeBarcodeSvg,
  ogeEncodeBarcode,
  ogeFormatMessage,
  ogeNativeBarcodeDecoder,
  type OgeBarcodeDecoder,
  type OgeBarcodeDrawing,
  type OgeBarcodeMessages,
  type OgeBarcodeResult,
  type OgeBarcodeScannerStatus,
  type OgeBarcodeType,
  type OgeQrErrorCorrection,
} from '@oge-ui/behavior';
import { useOgeBarcodeConfig } from './layout-config';

const TYPE_NAMES: Readonly<Record<OgeBarcodeType, string>> = {
  qr: 'QR',
  code128: 'Code 128',
  ean13: 'EAN-13',
};

/** Props of {@link OgeBarcode}. */
export interface OgeBarcodeProps {
  /** What the symbol encodes. */
  value: string;
  /** `'qr'` (default), `'code128'` or `'ean13'` (12 digits — the check digit is added — or 13). */
  type?: OgeBarcodeType;
  /** QR error correction: `'L'`, `'M'` (config default), `'Q'` or `'H'`. */
  errorCorrection?: OgeQrErrorCorrection;
  /** Pixels per module (default 4). */
  scale?: number;
  /** Bar height of a linear symbol, in modules (default 50). */
  barHeight?: number;
  /** The light margin scanners need around the symbol (default `true`). */
  quietZone?: boolean;
  /** The text line under a linear symbol (default `true`). */
  showText?: boolean;
  /** Bar colour (default black — scanners need contrast). */
  color?: string;
  /** Background colour (default white). */
  background?: string;
  /** Accessible name; falls back to the `qrLabel` / `barcodeLabel` message. */
  ariaLabel?: string;
  /** Per-instance message overrides. */
  messages?: Partial<OgeBarcodeMessages>;
  className?: string;
  style?: CSSProperties;
}

/** What a `ref` on {@link OgeBarcode} reaches. */
export interface OgeBarcodeHandle {
  /** The symbol as a standalone SVG document, `null` when the value does not fit. */
  toSvg(): string | null;
  /** Saves the symbol as an SVG file (default `barcode.svg`). */
  download(fileName?: string): void;
}

/** Draws a QR code, a Code 128 or an EAN-13 barcode as crisp SVG. */
export const OgeBarcode = forwardRef<OgeBarcodeHandle, OgeBarcodeProps>(
  function OgeBarcodeRender(props, ref): ReactElement {
    const config = useOgeBarcodeConfig();
    const type = props.type ?? 'qr';
    const scale = props.scale ?? 4;
    const color = props.color ?? '#000000';
    const background = props.background ?? '#ffffff';
    const text = { ...config.messages, ...props.messages };
    const errorCorrection = props.errorCorrection ?? config.errorCorrection;
    const drawing = useMemo<OgeBarcodeDrawing | null>(() => {
      try {
        return ogeBarcodeDrawing(
          ogeEncodeBarcode(props.value, type, {
            ...(errorCorrection ? { errorCorrection } : {}),
          }),
          {
            quietZone: props.quietZone ?? true,
            showText: props.showText ?? true,
            barHeight: props.barHeight ?? 50,
          },
        );
      } catch {
        return null;
      }
    }, [
      props.value,
      type,
      errorCorrection,
      props.quietZone,
      props.showText,
      props.barHeight,
    ]);
    const label =
      props.ariaLabel ??
      ogeFormatMessage(type === 'qr' ? text.qrLabel : text.barcodeLabel, {
        value: props.value,
      });

    const toSvg = () =>
      drawing
        ? ogeBarcodeSvg(drawing, { scale, color, background, label })
        : null;
    const latest = useRef(toSvg);
    latest.current = toSvg;
    useImperativeHandle(
      ref,
      () => ({
        toSvg: () => latest.current(),
        download: (fileName = 'barcode.svg') => {
          const svg = latest.current();
          if (!svg || typeof document === 'undefined') return;
          const url = URL.createObjectURL(
            new Blob([svg], { type: 'image/svg+xml' }),
          );
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url));
        },
      }),
      [],
    );

    return (
      <span
        className={
          props.className ? `oge-barcode ${props.className}` : 'oge-barcode'
        }
        style={props.style}
      >
        {drawing ? (
          <svg
            className="oge-barcode-symbol"
            role="img"
            shapeRendering="crispEdges"
            aria-label={label}
            viewBox={`0 0 ${drawing.width} ${drawing.height}`}
            width={drawing.width * scale}
            height={drawing.height * scale}
          >
            <rect width="100%" height="100%" fill={background} />
            <path d={drawing.d} fill={color} />
            {drawing.text && (
              <text
                className="oge-barcode-text"
                textAnchor="middle"
                fontSize="10"
                x={drawing.text.x}
                y={drawing.text.y}
                fill={color}
              >
                {drawing.text.value}
              </text>
            )}
          </svg>
        ) : (
          <p className="oge-barcode-invalid">
            {ogeFormatMessage(text.invalid, { type: TYPE_NAMES[type] })}
          </p>
        )}
      </span>
    );
  },
);

/** Props of {@link OgeBarcodeScanner}. */
export interface OgeBarcodeScannerProps {
  /** The camera is open and reading (controlled). */
  active?: boolean;
  /** Initial camera state when uncontrolled. */
  defaultActive?: boolean;
  /** The camera opened or closed (the toggle, a method, a failure). */
  onActiveChange?: (active: boolean) => void;
  /** Reads frames and images; default the browser's `BarcodeDetector`. */
  decoder?: OgeBarcodeDecoder;
  /** Symbologies the browser's reader looks for (default all three the suite draws). */
  types?: readonly OgeBarcodeType[];
  /** Milliseconds between frames read (default 250). */
  interval?: number;
  /** `'environment'` (the back camera, default) or `'user'`. */
  facingMode?: 'environment' | 'user';
  /** Per-instance message overrides. */
  messages?: Partial<OgeBarcodeMessages>;
  /** A barcode was read (once per value while it stays in view). */
  onDetected?: (result: OgeBarcodeResult) => void;
  /** The scanner's status changed. */
  onStatusChange?: (status: OgeBarcodeScannerStatus) => void;
  className?: string;
  style?: CSSProperties;
}

/** What a `ref` on {@link OgeBarcodeScanner} reaches. */
export interface OgeBarcodeScannerHandle {
  /** Opens the camera. */
  start(): void;
  /** Closes the camera. */
  stop(): void;
  /** Reads an image; resolves with what it found. */
  scanImage(image: Blob): Promise<readonly OgeBarcodeResult[]>;
}

/**
 * Reads barcodes from the camera or an image file, with the browser's own
 * `BarcodeDetector` or a `decoder` you pass.
 */
export const OgeBarcodeScanner = forwardRef<
  OgeBarcodeScannerHandle,
  OgeBarcodeScannerProps
>(function OgeBarcodeScannerRender(props, ref): ReactElement {
  const config = useOgeBarcodeConfig();
  const text = { ...config.messages, ...props.messages };
  const latest = useRef(props);
  latest.current = props;
  const [uncontrolled, setUncontrolled] = useState(
    props.defaultActive ?? false,
  );
  const active = props.active ?? uncontrolled;
  const activeRef = useRef(active);
  activeRef.current = active;
  const setActive = (next: boolean) => {
    if (activeRef.current === next) return;
    activeRef.current = next;
    if (latest.current.active === undefined) setUncontrolled(next);
    latest.current.onActiveChange?.(next);
  };
  const setActiveRef = useRef(setActive);
  setActiveRef.current = setActive;

  const [status, setStatus] = useState<OgeBarcodeScannerStatus>('idle');
  const [lastRead, setLastRead] = useState<string | null>(null);
  const [nothingFound, setNothingFound] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const coreRef = useRef<OgeBarcodeScannerCore | null>(null);
  if (coreRef.current === null) {
    coreRef.current = new OgeBarcodeScannerCore({
      decoder: () =>
        latest.current.decoder ??
        ogeNativeBarcodeDecoder(
          (latest.current.types ?? ['qr', 'code128', 'ean13']).map(
            (t) => OGE_BARCODE_FORMATS[t],
          ),
        ),
      interval: () => latest.current.interval ?? 250,
      facingMode: () => latest.current.facingMode ?? 'environment',
      onStatus: (next) => {
        setStatus(next);
        latest.current.onStatusChange?.(next);
        if (next !== 'starting' && next !== 'scanning')
          setActiveRef.current(false);
      },
      onDetect: (result) => {
        setNothingFound(false);
        setLastRead(result.value);
        latest.current.onDetected?.(result);
      },
    });
  }
  const core = coreRef.current;

  useEffect(() => {
    if (active && video.current) {
      setLastRead(null);
      setNothingFound(false);
      void core.start(video.current);
    } else {
      core.stop();
    }
  }, [active, core]);
  useEffect(() => () => core.destroy(), [core]);

  const scanImage = async (image: Blob) => {
    setLastRead(null);
    const results = await core.scanImage(image);
    setNothingFound(results.length === 0 && core.supported());
    return results;
  };
  const scanRef = useRef(scanImage);
  scanRef.current = scanImage;
  useImperativeHandle(
    ref,
    () => ({
      start: () => setActiveRef.current(true),
      stop: () => setActiveRef.current(false),
      scanImage: (image) => scanRef.current(image),
    }),
    [],
  );

  const statusText = nothingFound
    ? text.nothingFound
    : lastRead !== null
      ? ogeFormatMessage(text.detected, { value: lastRead })
      : status === 'scanning'
        ? text.scanning
        : status === 'unsupported'
          ? text.unsupported
          : status === 'permission'
            ? text.permission
            : status === 'no-camera'
              ? text.noCamera
              : status === 'failed'
                ? text.failed
                : '';

  return (
    <div
      className={[
        'oge-barcode-scanner',
        status === 'scanning' && 'oge-barcode-scanner-live',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={props.style}
      role="group"
      aria-label={text.scannerLabel}
    >
      <div className="oge-barcode-scanner-viewport">
        <video
          ref={video}
          className="oge-barcode-scanner-video"
          aria-hidden="true"
          muted
          playsInline
        />
        <span className="oge-barcode-scanner-frame" aria-hidden="true" />
      </div>
      <div className="oge-barcode-scanner-bar">
        <button
          type="button"
          className="oge-barcode-scanner-button oge-barcode-scanner-toggle"
          aria-pressed={active}
          onClick={() => setActive(!active)}
        >
          {active ? text.stop : text.start}
        </button>
        <button
          type="button"
          className="oge-barcode-scanner-button oge-barcode-scanner-image"
          onClick={() => file.current?.click()}
        >
          {text.scanImage}
        </button>
        <input
          ref={file}
          className="oge-barcode-scanner-file"
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            if (picked) void scanImage(picked);
          }}
        />
      </div>
      <p className="oge-barcode-scanner-status" role="status">
        {statusText}
      </p>
    </div>
  );
});
