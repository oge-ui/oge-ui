import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_TIMELINE_API,
  OGE_REACT_TIMELINE_CONFIG_API,
} from './timeline-api-data';

/**
 * The React half of the timeline API reference — rendered inside
 * `/components/timeline/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-timeline-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTimeline&gt;" [sections]="timelineApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutTimelineApiSections {
  protected readonly timelineApi = OGE_REACT_TIMELINE_API;
  protected readonly configApi = OGE_REACT_TIMELINE_CONFIG_API;
}
