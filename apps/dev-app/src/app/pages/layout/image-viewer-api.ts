import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutImageViewerApiSections } from '../react-layout/image-viewer-api';
import {
  OGE_IMAGE_VIEWER_API,
  OGE_IMAGE_VIEWER_CONFIG_API,
} from './image-viewer-api-data';

const SECTIONS = ['OgeImageViewer', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutImageViewerApiSections`' titles. */
const SECTIONS_REACT = ['<OgeImageViewer>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-image-viewer-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactLayoutImageViewerApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Image Viewer API"
      category="Layout"
      categoryLink="/components/image-viewer"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeImageViewer&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the ref handle, the
          callbacks and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-image-viewer</code>: its inputs, methods and
          outputs, the interaction model and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-image-viewer-api />
    } @else {
      <app-api-reference
        title="OgeImageViewer"
        selector="oge-image-viewer"
        [sections]="viewerApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutImageViewerApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly viewerApi = OGE_IMAGE_VIEWER_API;
  protected readonly configApi = OGE_IMAGE_VIEWER_CONFIG_API;
}
