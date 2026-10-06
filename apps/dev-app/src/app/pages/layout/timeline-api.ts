import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutTimelineApiSections } from '../react-layout/timeline-api';
import { OGE_TIMELINE_API, OGE_TIMELINE_CONFIG_API } from './timeline-api-data';

const SECTIONS = ['OgeTimeline', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutTimelineApiSections`' titles. */
const SECTIONS_REACT = ['<OgeTimeline>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-timeline-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutTimelineApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Timeline API"
      category="Layout"
      categoryLink="/components/timeline"
      [chips]="['Properties', 'Slots', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeTimeline&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the render props
          that replace the Angular template slots, and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-timeline</code>: its inputs, the three
          structural template slots and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-timeline-api />
    } @else {
      <app-api-reference
        title="OgeTimeline"
        selector="oge-timeline"
        [sections]="timelineApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutTimelineApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly timelineApi = OGE_TIMELINE_API;
  protected readonly configApi = OGE_TIMELINE_CONFIG_API;
}
