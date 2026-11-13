import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_DIFF_VIEWER_API,
  OGE_REACT_DIFF_VIEWER_CONFIG_API,
} from './diff-viewer-api-data';

/**
 * The React half of the image viewer API reference — rendered inside
 * `/components/diff-viewer/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-diff-viewer-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgeDiffViewer&gt;"
      [sections]="diffViewerApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutDiffViewerApiSections {
  protected readonly diffViewerApi = OGE_REACT_DIFF_VIEWER_API;
  protected readonly configApi = OGE_REACT_DIFF_VIEWER_CONFIG_API;
}
