import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactAiApiSections } from '../react-ai/api';
import { OGE_AI_API } from './ai-api-data';

const SECTIONS = ['OgeGridAssistant'] as const;

/** TOC of the React view — must mirror `ReactAiApiSections`' titles. */
const SECTIONS_REACT = ['<OgeGridAssistant>'] as const;

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
    }
  `,
})
export class AiApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly aiApi = OGE_AI_API;
}
