import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactAiApiSections } from '../react-ai/api';
import { OGE_AI_API } from './ai-api-data';
import { OGE_AI_CELL_API } from './ai-column-api-data';
import { OGE_CHAT_API } from './chat-api-data';
import { OGE_SMART_PASTE_API } from './smart-paste-api-data';

const SECTIONS = [
  'OgeGridAssistant',
  'OgeSmartPaste',
  'OgeAiCell',
  'OgeChat',
] as const;

/** TOC of the React view — must mirror `ReactAiApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeGridAssistant>',
  '<OgeSmartPaste>',
  '<OgeAiCell>',
  '<OgeChat>',
] as const;

@Component({
  selector: 'app-ai-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink, ReactAiApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="AI API"
      category="AI"
      categoryLink="/components/ai"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Every public member of <code>&lt;OgeGridAssistant&gt;</code>, its
          config provider, the transports and the shared types.
          <a routerLink="/components/ai">Back to the demos →</a>
        </p>
      } @else {
        <p>
          Every public member of <code>&lt;oge-grid-assistant&gt;</code>, its
          config provider, the transports and the shared types.
          <a routerLink="/components/ai">Back to the demos →</a>
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-ai-api />
    } @else {
      <app-api-reference
        title="OgeGridAssistant"
        selector="oge-grid-assistant"
        [sections]="aiApi"
      />
      <app-api-reference
        title="OgeSmartPaste"
        selector="oge-smart-paste"
        [sections]="smartPasteApi"
      />
      <app-api-reference
        title="OgeAiCell"
        selector="oge-ai-cell"
        [sections]="aiCellApi"
      />
      <app-api-reference
        title="OgeChat"
        selector="oge-chat"
        [sections]="chatApi"
      />
    }
  `,
})
export class AiApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly aiApi = OGE_AI_API;
  protected readonly smartPasteApi = OGE_SMART_PASTE_API;
  protected readonly aiCellApi = OGE_AI_CELL_API;
  protected readonly chatApi = OGE_CHAT_API;
}
