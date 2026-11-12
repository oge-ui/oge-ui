import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  OgeBarcode,
  OgeBarcodeScanner,
  type OgeBarcodeResult,
  type OgeBarcodeType,
} from '@oge-ui/layout/barcode';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_LAYOUT_BARCODE_SECTIONS,
  ReactLayoutBarcodeDemos,
} from '../react-layout/barcode';
import {
  BARCODE_GENERATE_SNIPPET,
  BARCODE_PRINT_SNIPPET,
  BARCODE_SCAN_SNIPPET,
} from './barcode-snippets';

const SECTIONS = ['Generate', 'Labels', 'Scan'] as const;

const BUTTON =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700';

@Component({
  selector: 'app-layout-barcode',
  imports: [
    OgeBarcode,
    OgeBarcodeScanner,
    DemoCard,
    DocHeader,
    PageToc,
    ReactLayoutBarcodeDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Barcode"
      category="Layout"
      categoryLink="/components/barcode"
      [chips]="['QR', 'Code 128', 'EAN-13', 'SVG', 'camera']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeBarcode&gt;</code> and
          <code>&lt;OgeBarcodeScanner&gt;</code> from
          <code>&#64;oge-ui/react-layout</code> draw and read barcodes with the
          same encoders and markup as the Angular components.
        </p>
      } @else {
        <p>
          <code>oge-barcode</code> draws QR codes, Code 128 and EAN-13 barcodes;
          <code>oge-barcode-scanner</code> reads them from the camera or an
          image file.
        </p>
      }
      <p>
        The encoders are the suite's own — no dependency, no canvas: a QR code
        picks its mode, the smallest version and the lowest-penalty mask, and
        was checked against an independent reader across modes, levels, masks
        and sizes up to version 40. Symbols are crisp SVG named by their value.
        Reading uses the browser's <code>BarcodeDetector</code> where it exists;
        elsewhere you pass a decoder.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-layout-barcode-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'type', 'scale', 'download()']"
        heading="Generate"
        description="Type a value and pick a symbology. A value the symbology cannot hold — letters in an EAN-13, a character outside printable ASCII in Code 128 — shows a message instead of a symbol."
        [code]="generateSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-2">
          <input
            class="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-transparent"
            aria-label="Value"
            data-testid="barcode-value"
            [value]="value()"
            (input)="value.set($any($event.target).value)"
          />
          @for (t of types; track t) {
            <button
              type="button"
              [class]="button"
              [attr.aria-pressed]="type() === t"
              (click)="type.set(t)"
            >
              {{ t }}
            </button>
          }
        </div>
        <div class="mt-3 flex flex-wrap items-end gap-3">
          <oge-barcode #code [value]="value()" [type]="type()" [scale]="3" />
          <button
            type="button"
            [class]="button"
            (click)="code.download('barcode.svg')"
          >
            Download SVG
          </button>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['ean13', 'errorCorrection', 'barHeight', 'color']"
        heading="Labels"
        description="EAN-13 adds its own check digit; a QR code at level H still reads with 30 % of it scuffed; bars take a height and a colour (keep them dark on light)."
        [code]="printSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-end gap-6">
          <oge-barcode type="ean13" value="400638133393" [scale]="2" />
          <oge-barcode
            value="SKU-2041 · Lot 7"
            errorCorrection="H"
            [scale]="3"
          />
          <oge-barcode
            type="code128"
            value="SHIP-000123"
            [barHeight]="30"
            color="#1e3a8a"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['oge-barcode-scanner', 'detected', 'decoder']"
        heading="Scan"
        description="Start opens the camera and reads a frame every 250 ms — a value read again within a moment counts once; “Scan an image” reads a file. A polite status line announces each read, and says so when the browser has no reader or the camera is refused."
        [code]="scanSnippet"
        language="ts"
      >
        <oge-barcode-scanner (detected)="onRead($event)" />
        <p class="mt-2 text-sm" data-testid="barcode-last">{{ last() }}</p>
      </app-demo-card>
    }
  `,
})
export class LayoutBarcodePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_LAYOUT_BARCODE_SECTIONS;
  protected readonly generateSnippet = BARCODE_GENERATE_SNIPPET;
  protected readonly printSnippet = BARCODE_PRINT_SNIPPET;
  protected readonly scanSnippet = BARCODE_SCAN_SNIPPET;
  protected readonly button = BUTTON;
  protected readonly value = signal('https://ogeui.com');
  protected readonly type = signal<OgeBarcodeType>('qr');
  protected readonly types: OgeBarcodeType[] = ['qr', 'code128', 'ean13'];
  protected readonly last = signal('Nothing read yet');

  protected onRead(result: OgeBarcodeResult): void {
    this.last.set(`${result.format}: ${result.value}`);
  }
}
