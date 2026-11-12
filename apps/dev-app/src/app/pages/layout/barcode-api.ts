import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutBarcodeApiSections } from '../react-layout/barcode-api';
import { OGE_BARCODE_API, OGE_BARCODE_CONFIG_API } from './barcode-api-data';

const SECTIONS = ['OgeBarcode & OgeBarcodeScanner', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutBarcodeApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeBarcode> & <OgeBarcodeScanner>',
  'Configuration',
] as const;

@Component({
  selector: 'app-layout-barcode-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutBarcodeApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Barcode API"
      category="Layout"
      categoryLink="/components/barcode"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeBarcode&gt;</code> and
          <code>&lt;OgeBarcodeScanner&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: their props, the ref handles,
          the callbacks and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-barcode</code> and
          <code>oge-barcode-scanner</code>: their inputs, methods and outputs,
          the encoders and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-barcode-api />
    } @else {
      <app-api-reference
        title="OgeBarcode &amp; OgeBarcodeScanner"
        selector="oge-barcode, oge-barcode-scanner"
        [sections]="barcodeApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutBarcodeApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly barcodeApi = OGE_BARCODE_API;
  protected readonly configApi = OGE_BARCODE_CONFIG_API;
}
