import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_SCHEDULER_API,
  OGE_REACT_SCHEDULER_CONFIG_API,
  OGE_REACT_SCHEDULER_DRAGGABLE_API,
} from './react-scheduler-api-data';

/**
 * The React half of the scheduler API reference.
 *
 * Not a route of its own — it renders inside `/components/scheduler/api`
 * when the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The block order mirrors the Angular page exactly, so the two views
 * read as one page across the switch and the parity gate can diff them
 * member by member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-scheduler`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-scheduler-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeScheduler&gt;" [sections]="schedulerApi" />
    <app-api-reference
      title="useOgeSchedulerDraggable"
      [sections]="draggableApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactSchedulerApiSections {
  protected readonly schedulerApi = OGE_REACT_SCHEDULER_API;
  protected readonly draggableApi = OGE_REACT_SCHEDULER_DRAGGABLE_API;
  protected readonly configApi = OGE_REACT_SCHEDULER_CONFIG_API;
}
