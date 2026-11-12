import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_BARCODE_API,
  OGE_REACT_BARCODE_CONFIG_API,
} from './barcode-api-data';

/**
 * The React half of the image viewer API reference — rendered inside
 * `/components/barcode/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-barcode-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgeBarcode&gt; &amp; &lt;OgeBarcodeScanner&gt;"
      [sections]="barcodeApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutBarcodeApiSections {
  protected readonly barcodeApi = OGE_REACT_BARCODE_API;
  protected readonly configApi = OGE_REACT_BARCODE_CONFIG_API;
}
