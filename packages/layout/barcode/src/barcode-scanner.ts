import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  OGE_BARCODE_FORMATS,
  OgeBarcodeScannerCore,
  ogeFormatMessage,
  ogeNativeBarcodeDecoder,
  type OgeBarcodeDecoder,
  type OgeBarcodeMessages,
  type OgeBarcodeResult,
  type OgeBarcodeScannerStatus,
  type OgeBarcodeType,
} from '@oge-ui/behavior';
import { OGE_BARCODE_CONFIG } from './config';

/**
 * Reads barcodes from the camera or from an image file:
 *
 * ```html
 * <oge-barcode-scanner (detected)="onRead($event.value)" />
 * ```
 *
 * The camera opens on Start (or `[(active)]`) and a frame is read every
 * `interval` ms; a value read again within a moment counts once. Reading
 * uses the browser's own `BarcodeDetector` where it exists (Chrome and Edge on
 * Android, macOS and ChromeOS, Safari 17+); elsewhere pass a `decoder` — a
 * ZXing build, a server call — or the scanner says it cannot read. A polite
 * status line announces each read and every failure (no camera, refused
 * permission).
 */
@Component({
  selector: 'oge-barcode-scanner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-barcode-scanner-host' },
  styleUrl: './barcode.scss',
  template: `
    <div
      class="oge-barcode-scanner"
      role="group"
      [attr.aria-label]="text().scannerLabel"
      [class.oge-barcode-scanner-live]="status() === 'scanning'"
    >
      <div class="oge-barcode-scanner-viewport">
        <video
          #video
          class="oge-barcode-scanner-video"
          aria-hidden="true"
          muted
          playsinline
        ></video>
        <span class="oge-barcode-scanner-frame" aria-hidden="true"></span>
      </div>
      <div class="oge-barcode-scanner-bar">
        <button
          type="button"
          class="oge-barcode-scanner-button oge-barcode-scanner-toggle"
          [attr.aria-pressed]="active()"
          (click)="active.set(!active())"
        >
          {{ active() ? text().stop : text().start }}
        </button>
        <button
          type="button"
          class="oge-barcode-scanner-button oge-barcode-scanner-image"
          (click)="file.click()"
        >
          {{ text().scanImage }}
        </button>
        <input
          #file
          class="oge-barcode-scanner-file"
          type="file"
          accept="image/*"
          tabindex="-1"
          aria-hidden="true"
          (change)="onFile($event)"
        />
      </div>
      <p class="oge-barcode-scanner-status" role="status">{{ statusText() }}</p>
    </div>
  `,
})
export class OgeBarcodeScanner {
  private readonly config = inject(OGE_BARCODE_CONFIG);

  /** Two-way: the camera is open and reading. */
  readonly active = model(false);
  /** Reads frames and images; default the browser's `BarcodeDetector`. */
  readonly decoder = input<OgeBarcodeDecoder | undefined>(undefined);
  /** Symbologies the browser's reader looks for (default all three the suite draws). */
  readonly types = input<readonly OgeBarcodeType[]>(['qr', 'code128', 'ean13']);
  /** Milliseconds between frames read (default 250). */
  readonly interval = input(250);
  /** `'environment'` (the back camera, default) or `'user'`. */
  readonly facingMode = input<'environment' | 'user'>('environment');
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeBarcodeMessages>>({});

  /** A barcode was read (once per value while it stays in view). */
  readonly detected = output<OgeBarcodeResult>();
  /** The scanner's status changed. */
  readonly statusChange = output<OgeBarcodeScannerStatus>();

  private readonly videoEl =
    viewChild.required<ElementRef<HTMLVideoElement>>('video');
  protected readonly status = signal<OgeBarcodeScannerStatus>('idle');
  private readonly lastRead = signal<string | null>(null);
  private readonly nothingFound = signal(false);

  protected readonly text = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  protected readonly statusText = computed(() => {
    const t = this.text();
    if (this.nothingFound()) return t.nothingFound;
    const read = this.lastRead();
    if (read !== null) return ogeFormatMessage(t.detected, { value: read });
    switch (this.status()) {
      case 'scanning':
        return t.scanning;
      case 'unsupported':
        return t.unsupported;
      case 'permission':
        return t.permission;
      case 'no-camera':
        return t.noCamera;
      case 'failed':
        return t.failed;
      default:
        return '';
    }
  });

  private readonly core = new OgeBarcodeScannerCore({
    decoder: () =>
      this.decoder() ??
      ogeNativeBarcodeDecoder(this.types().map((t) => OGE_BARCODE_FORMATS[t])),
    interval: () => this.interval(),
    facingMode: () => this.facingMode(),
    onStatus: (status) => {
      this.status.set(status);
      this.statusChange.emit(status);
      // a camera that could not open is not active
      if (status !== 'starting' && status !== 'scanning' && this.active())
        this.active.set(false);
    },
    onDetect: (result) => {
      this.nothingFound.set(false);
      this.lastRead.set(result.value);
      this.detected.emit(result);
    },
  });

  constructor() {
    effect(() => {
      const on = this.active();
      untracked(() => {
        if (on) {
          this.lastRead.set(null);
          this.nothingFound.set(false);
          void this.core.start(this.videoEl().nativeElement);
        } else {
          this.core.stop();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }

  /** Opens the camera. */
  start(): void {
    this.active.set(true);
  }

  /** Closes the camera. */
  stop(): void {
    this.active.set(false);
  }

  /** Reads an image (a file the user picked, a pasted blob); resolves with what it found. */
  async scanImage(image: Blob): Promise<readonly OgeBarcodeResult[]> {
    this.lastRead.set(null);
    const results = await this.core.scanImage(image);
    this.nothingFound.set(
      results.length === 0 && this.status() !== 'unsupported',
    );
    return results;
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.scanImage(file);
  }
}
