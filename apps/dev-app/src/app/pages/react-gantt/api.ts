import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_GANTT_API,
  OGE_REACT_GANTT_CONFIG_API,
} from './react-gantt-api-data';

/**
 * The React half of the Gantt API reference.
 *
 * Not a route of its own — it renders inside `/components/gantt/api` when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular table. The two blocks
 * mirror the Angular page's, so the views read as one page across the switch
 * and the parity gate can diff them member by member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the component to reach
 * `@oge-ui/react-gantt`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-gantt-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeGantt&gt;" [sections]="ganttApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactGanttApiSections {
  protected readonly ganttApi = OGE_REACT_GANTT_API;
  protected readonly configApi = OGE_REACT_GANTT_CONFIG_API;
}
