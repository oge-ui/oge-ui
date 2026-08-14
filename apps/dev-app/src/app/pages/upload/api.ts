import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_FILE_UPLOADER_API } from './upload-api-data';

const SECTIONS = ['OgeFileUploader'] as const;

@Component({
  selector: 'app-upload-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Upload API"
      category="Upload"
      categoryLink="/components/upload"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Every public member of <code>&lt;oge-file-uploader&gt;</code>, its two
        companion directives and the transport contract.
        <a routerLink="/components/upload">Back to the demos →</a>
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeFileUploader"
      selector="oge-file-uploader"
      [sections]="uploaderApi"
    />
  `,
})
export class UploadApiPage {
  protected readonly sections = SECTIONS;
  protected readonly uploaderApi = OGE_FILE_UPLOADER_API;
}
