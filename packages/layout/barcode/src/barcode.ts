import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  ogeBarcodeDrawing,
  ogeBarcodeSvg,
  ogeEncodeBarcode,
  ogeFormatMessage,
  type OgeBarcodeDrawing,
  type OgeBarcodeMessages,
  type OgeBarcodeType,
  type OgeQrErrorCorrection,
} from '@oge-ui/behavior';
import { OGE_BARCODE_CONFIG } from './config';

const TYPE_NAMES: Readonly<Record<OgeBarcodeType, string>> = {
  qr: 'QR',
  code128: 'Code 128',
  ean13: 'EAN-13',
};

/**
 * Draws a QR code, a Code 128 or an EAN-13 barcode as crisp SVG — no
 * dependency, no canvas:
 *
 * ```html
 * <oge-barcode value="https://ogeui.com" />
 * <oge-barcode type="ean13" value="400638133393" />
 * ```
 *
 * The symbol is an `img` named by its value; a value the symbology cannot
 * hold shows a message instead. `toSvg()` and `download()` hand the symbol
 * out as a standalone SVG file.
 */
@Component({
  selector: 'oge-barcode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'oge-barcode' },
  styleUrl: './barcode.scss',
  template: `
    @if (drawing(); as d) {
      <svg
        class="oge-barcode-symbol"
        role="img"
        shape-rendering="crispEdges"
        [attr.aria-label]="label()"
        [attr.viewBox]="'0 0 ' + d.width + ' ' + d.height"
        [attr.width]="d.width * scale()"
        [attr.height]="d.height * scale()"
      >
        <rect width="100%" height="100%" [attr.fill]="background()" />
        <path [attr.d]="d.d" [attr.fill]="color()" />
        @if (d.text; as t) {
          <text
            class="oge-barcode-text"
            text-anchor="middle"
            font-size="10"
            [attr.x]="t.x"
            [attr.y]="t.y"
            [attr.fill]="color()"
            [textContent]="t.value"
          ></text>
        }
      </svg>
    } @else {
      <p class="oge-barcode-invalid">{{ invalidText() }}</p>
    }
  `,
})
export class OgeBarcode {
  private readonly config = inject(OGE_BARCODE_CONFIG);

  /** What the symbol encodes. */
  readonly value = input.required<string>();
  /** `'qr'` (default), `'code128'` or `'ean13'` (12 digits — the check digit is added — or 13). */
  readonly type = input<OgeBarcodeType>('qr');
  /** QR error correction: `'L'`, `'M'` (config default), `'Q'` or `'H'`. */
  readonly errorCorrection = input<OgeQrErrorCorrection | undefined>(undefined);
  /** Pixels per module (default 4). */
  readonly scale = input(4);
  /** Bar height of a linear symbol, in modules (default 50). */
  readonly barHeight = input(50);
  /** The light margin scanners need around the symbol (default `true`). */
  readonly quietZone = input(true);
  /** The text line under a linear symbol (default `true`). */
  readonly showText = input(true);
  /** Bar colour (default black — scanners need contrast). */
  readonly color = input('#000000');
  /** Background colour (default white). */
  readonly background = input('#ffffff');
  /** Accessible name; falls back to the `qrLabel` / `barcodeLabel` message. */
  readonly ariaLabel = input<string | undefined>(undefined);
  /** Per-instance message overrides. */
  readonly messages = input<Partial<OgeBarcodeMessages>>({});

  private readonly text = computed(() => ({
    ...this.config.messages,
    ...this.messages(),
  }));

  /** The laid-out symbol, or `null` when the value does not fit the symbology. */
  protected readonly drawing = computed<OgeBarcodeDrawing | null>(() => {
    try {
      const errorCorrection =
        this.errorCorrection() ?? this.config.errorCorrection;
      return ogeBarcodeDrawing(
        ogeEncodeBarcode(this.value(), this.type(), {
          ...(errorCorrection ? { errorCorrection } : {}),
        }),
        {
          quietZone: this.quietZone(),
          showText: this.showText(),
          barHeight: this.barHeight(),
        },
      );
    } catch {
      return null;
    }
  });

  protected readonly label = computed(
    () =>
      this.ariaLabel() ??
      ogeFormatMessage(
        this.type() === 'qr' ? this.text().qrLabel : this.text().barcodeLabel,
        { value: this.value() },
      ),
  );

  protected readonly invalidText = computed(() =>
    ogeFormatMessage(this.text().invalid, { type: TYPE_NAMES[this.type()] }),
  );

  /** The symbol as a standalone SVG document, `null` when the value does not fit. */
  toSvg(): string | null {
    const drawing = this.drawing();
    return drawing
      ? ogeBarcodeSvg(drawing, {
          scale: this.scale(),
          color: this.color(),
          background: this.background(),
          label: this.label(),
        })
      : null;
  }

  /** Saves the symbol as an SVG file (default `barcode.svg`). */
  download(fileName = 'barcode.svg'): void {
    const svg = this.toSvg();
    if (!svg || typeof document === 'undefined') return;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
