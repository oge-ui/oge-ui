import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactUploadApiSections } from '../react-upload/api';
import { OGE_FILE_UPLOADER_API } from './upload-api-data';

const SECTIONS = ['OgeFileUploader'] as const;

/** TOC of the React view — must mirror `ReactUploadApiSections`' titles. */
const SECTIONS_REACT = ['<OgeFileUploader>'] as const;

@Component({
  selector: 'app-upload-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    RouterLink,
    ReactUploadApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Upload API"
      category="Upload"
      categoryLink="/components/upload"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Every public member of <code>&lt;OgeFileUploader&gt;</code>, its two
          companion components, the providers and the transport contract.
          <a routerLink="/components/upload">Back to the demos →</a>
        </p>
      } @else {
        <p>
          Every public member of <code>&lt;oge-file-uploader&gt;</code>, its two
          companion directives and the transport contract.
          <a routerLink="/components/upload">Back to the demos →</a>
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-upload-api />
    } @else {
      <app-api-reference
        title="OgeFileUploader"
        selector="oge-file-uploader"
        [sections]="uploaderApi"
      />
    }
  `,
})
export class UploadApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly uploaderApi = OGE_FILE_UPLOADER_API;
}
