import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_IMAGE_VIEWER_API,
  OGE_REACT_IMAGE_VIEWER_CONFIG_API,
} from './image-viewer-api-data';

/**
 * The React half of the image viewer API reference — rendered inside
 * `/components/image-viewer/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-image-viewer-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeImageViewer&gt;" [sections]="viewerApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutImageViewerApiSections {
  protected readonly viewerApi = OGE_REACT_IMAGE_VIEWER_API;
  protected readonly configApi = OGE_REACT_IMAGE_VIEWER_CONFIG_API;
}
