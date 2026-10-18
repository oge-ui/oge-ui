import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_AI_API } from './react-ai-api-data';

/**
 * The React half of the AI API reference.
 *
 * Not a route of its own — it renders inside `/components/ai/api` when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular table, so the parity gate
 * can diff them member by member.
 */
@Component({
  selector: 'app-react-ai-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeGridAssistant&gt;" [sections]="aiApi" />
  `,
})
export class ReactAiApiSections {
  protected readonly aiApi = OGE_REACT_AI_API;
}
