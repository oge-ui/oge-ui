import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_LOAD_INDICATOR_API,
  OGE_PROGRESS_BAR_API,
  OGE_PROGRESS_CONFIG_API,
  OGE_SKELETON_API,
} from './progress-api-data';

const SECTIONS = [
  'OgeProgressBar',
  'OgeLoadIndicator',
  'OgeSkeleton',
  'Configuration',
] as const;

@Component({
  selector: 'app-layout-progress-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Progress & Loading API"
      category="Layout"
      categoryLink="/components/progress"
      [chips]="['Properties', 'Events', 'Types']"
    >
      <p>
        Full surface of the loading trio: the linear
        <code>oge-progress-bar</code>, the ring <code>oge-load-indicator</code>,
        the <code>oge-skeleton</code>
        placeholder and their config providers.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeProgressBar"
      selector="oge-progress-bar"
      [sections]="progressBarApi"
    />
    <app-api-reference
      title="OgeLoadIndicator"
      selector="oge-load-indicator"
      [sections]="loadIndicatorApi"
    />
    <app-api-reference
      title="OgeSkeleton"
      selector="oge-skeleton"
      [sections]="skeletonApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class LayoutProgressApiPage {
  protected readonly sections = SECTIONS;
  protected readonly progressBarApi = OGE_PROGRESS_BAR_API;
  protected readonly loadIndicatorApi = OGE_LOAD_INDICATOR_API;
  protected readonly skeletonApi = OGE_SKELETON_API;
  protected readonly configApi = OGE_PROGRESS_CONFIG_API;
}
