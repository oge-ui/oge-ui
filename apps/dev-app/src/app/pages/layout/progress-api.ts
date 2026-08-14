import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutProgressApiSections } from '../react-layout/progress-api';
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

/**
 * TOC of the React view — must mirror `ReactLayoutProgressApiSections`'
 * titles.
 */
const SECTIONS_REACT = [
  '<OgeProgressBar>',
  '<OgeLoadIndicator>',
  '<OgeSkeleton>',
  'Configuration',
] as const;

@Component({
  selector: 'app-layout-progress-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutProgressApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Progress & Loading API"
      category="Layout"
      categoryLink="/components/progress"
      [chips]="['Properties', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of the React loading trio from
          <code>&#64;oge-ui/react-layout</code>: the linear
          <code>&lt;OgeProgressBar&gt;</code>, the ring
          <code>&lt;OgeLoadIndicator&gt;</code>, the
          <code>&lt;OgeSkeleton&gt;</code> placeholder and their context
          providers.
        </p>
      } @else {
        <p>
          Full surface of the loading trio: the linear
          <code>oge-progress-bar</code>, the ring
          <code>oge-load-indicator</code>, the <code>oge-skeleton</code>
          placeholder and their config providers.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-progress-api />
    } @else {
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
    }
  `,
})
export class LayoutProgressApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly progressBarApi = OGE_PROGRESS_BAR_API;
  protected readonly loadIndicatorApi = OGE_LOAD_INDICATOR_API;
  protected readonly skeletonApi = OGE_SKELETON_API;
  protected readonly configApi = OGE_PROGRESS_CONFIG_API;
}
