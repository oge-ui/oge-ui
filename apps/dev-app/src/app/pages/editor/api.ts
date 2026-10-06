import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactEditorApiSections } from '../react-editor/api';
import { OGE_EDITOR_API } from './editor-api-data';

const SECTIONS = ['OgeEditor'] as const;

/** TOC of the React view — must mirror `ReactEditorApiSections`' titles. */
const SECTIONS_REACT = ['<OgeEditor>'] as const;

@Component({
  selector: 'app-editor-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    RouterLink,
    ReactEditorApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Rich Text Editor API"
      category="Editor"
      categoryLink="/components/editor"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Every public member of <code>&lt;OgeEditor&gt;</code>, its config
          provider and the shared command vocabulary.
          <a routerLink="/components/editor">Back to the demos →</a>
        </p>
      } @else {
        <p>
          Every public member of <code>&lt;oge-editor&gt;</code>, its config
          provider, the reactive-forms validator and the shared command
          vocabulary.
          <a routerLink="/components/editor">Back to the demos →</a>
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-editor-api />
    } @else {
      <app-api-reference
        title="OgeEditor"
        selector="oge-editor"
        [sections]="editorApi"
      />
    }
  `,
})
export class EditorApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly editorApi = OGE_EDITOR_API;
}
