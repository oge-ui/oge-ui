import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_BPMN_API,
  OGE_REACT_BPMN_CONFIG_API,
} from './react-bpmn-api-data';

/**
 * The React half of the BPMN API reference.
 *
 * Not a route of its own — it renders inside `/components/bpmn/api` when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The two blocks
 * mirror the Angular page exactly, so the views read as one page across the
 * switch and the parity gate can diff them member by member.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so this is all it takes for the editor to reach `@oge-ui/react-bpmn`'s
 * machine-readable docs.
 */
@Component({
  selector: 'app-react-bpmn-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeBpmnEditor&gt;" [sections]="editorApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactBpmnApiSections {
  protected readonly editorApi = OGE_REACT_BPMN_API;
  protected readonly configApi = OGE_REACT_BPMN_CONFIG_API;
}
