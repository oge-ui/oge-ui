import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_LOAD_INDICATOR_API,
  OGE_REACT_PROGRESS_BAR_API,
  OGE_REACT_PROGRESS_CONFIG_API,
  OGE_REACT_SKELETON_API,
} from './progress-api-data';

/**
 * The React half of the progress & loading API reference.
 *
 * Not a route of its own — it renders inside `/components/progress/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The block order mirrors the Angular page exactly, so the two views
 * read as one page across the switch and the parity gate can diff them block
 * by block.
 */
@Component({
  selector: 'app-react-layout-progress-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference
      title="&lt;OgeProgressBar&gt;"
      [sections]="progressBarApi"
    />
    <app-api-reference
      title="&lt;OgeLoadIndicator&gt;"
      [sections]="loadIndicatorApi"
    />
    <app-api-reference title="&lt;OgeSkeleton&gt;" [sections]="skeletonApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutProgressApiSections {
  protected readonly progressBarApi = OGE_REACT_PROGRESS_BAR_API;
  protected readonly loadIndicatorApi = OGE_REACT_LOAD_INDICATOR_API;
  protected readonly skeletonApi = OGE_REACT_SKELETON_API;
  protected readonly configApi = OGE_REACT_PROGRESS_CONFIG_API;
}
