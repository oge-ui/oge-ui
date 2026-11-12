import { demoSource } from '../../shared/demo-source';

export const BARCODE_GENERATE_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeBarcode'] },
  types: { '@oge-ui/layout': ['OgeBarcodeType'] },
  template: `<!-- A crisp SVG named by its value; a value the symbology cannot hold
     shows a message instead. download() saves the symbol as an SVG file. -->
<input [value]="value()" (input)="value.set($any($event.target).value)" aria-label="Value" />
@for (t of types; track t) {
  <button type="button" [attr.aria-pressed]="type() === t" (click)="type.set(t)">{{ t }}</button>
}
<oge-barcode #code [value]="value()" [type]="type()" [scale]="3" />
<button type="button" (click)="code.download('barcode.svg')">Download SVG</button>`,
  body: `protected readonly value = signal('https://ogeui.com');
protected readonly type = signal<OgeBarcodeType>('qr');
protected readonly types: OgeBarcodeType[] = ['qr', 'code128', 'ean13'];`,
});

export const BARCODE_PRINT_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeBarcode'] },
  template: `<!-- A product label: EAN-13 adds its own check digit; the QR code uses
     the highest error correction, so a scuffed label still reads. -->
<oge-barcode type="ean13" value="400638133393" [scale]="2" />
<oge-barcode value="SKU-2041 · Lot 7" errorCorrection="H" [scale]="3" />
<oge-barcode type="code128" value="SHIP-000123" [barHeight]="30" color="#1e3a8a" />`,
});

export const BARCODE_SCAN_SNIPPET = demoSource({
  use: { '@oge-ui/layout': ['OgeBarcodeScanner'] },
  types: { '@oge-ui/layout': ['OgeBarcodeResult'] },
  template: `<!-- Start opens the camera; "Scan an image" reads a file. Reading uses the
     browser's BarcodeDetector — pass [decoder] where there is none. -->
<oge-barcode-scanner (detected)="onRead($event)" />
<p>{{ last() }}</p>`,
  body: `protected readonly last = signal('Nothing read yet');

protected onRead(result: OgeBarcodeResult): void {
  this.last.set(\`\${result.format}: \${result.value}\`);
}`,
});
