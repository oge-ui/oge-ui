import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_AI_CELL_API } from '../ai/ai-column-api-data';
import { OGE_REACT_CHAT_API } from '../ai/chat-api-data';
import { OGE_REACT_SMART_PASTE_API } from '../ai/smart-paste-api-data';
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
    <app-api-reference
      title="&lt;OgeSmartPaste&gt;"
      [sections]="smartPasteApi"
    />
    <app-api-reference title="&lt;OgeAiCell&gt;" [sections]="aiCellApi" />
    <app-api-reference title="&lt;OgeChat&gt;" [sections]="chatApi" />
  `,
})
export class ReactAiApiSections {
  protected readonly aiApi = OGE_REACT_AI_API;
  protected readonly smartPasteApi = OGE_REACT_SMART_PASTE_API;
  protected readonly aiCellApi = OGE_REACT_AI_CELL_API;
  protected readonly chatApi = OGE_REACT_CHAT_API;
}
