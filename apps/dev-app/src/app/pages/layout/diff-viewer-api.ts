import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutDiffViewerApiSections } from '../react-layout/diff-viewer-api';
import {
  OGE_DIFF_VIEWER_API,
  OGE_DIFF_VIEWER_CONFIG_API,
} from './diff-viewer-api-data';

const SECTIONS = ['OgeDiffViewer', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutDiffViewerApiSections`' titles. */
const SECTIONS_REACT = ['<OgeDiffViewer>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-diff-viewer-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutDiffViewerApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Diff Viewer API"
      category="Layout"
      categoryLink="/components/diff-viewer"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeDiffViewer&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the ref handle, the
          callback and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-diff-viewer</code>: its inputs, methods and
          output, the comparison model and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-diff-viewer-api />
    } @else {
      <app-api-reference
        title="OgeDiffViewer"
        selector="oge-diff-viewer"
        [sections]="diffViewerApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutDiffViewerApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly diffViewerApi = OGE_DIFF_VIEWER_API;
  protected readonly configApi = OGE_DIFF_VIEWER_CONFIG_API;
}
