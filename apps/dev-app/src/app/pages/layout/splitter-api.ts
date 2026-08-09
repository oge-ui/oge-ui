import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_SPLITTER_API,
  OGE_SPLITTER_CONFIG_API,
  OGE_SPLITTER_PANE_API,
} from './splitter-api-data';

const SECTIONS = [
  'OgeSplitter',
  'OgeSplitterPane',
  'Splitter configuration',
] as const;

@Component({
  selector: 'app-layout-splitter-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Splitter API"
      category="Layout"
      categoryLink="/components/splitter"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of the <code>oge-splitter</code> container, the declarative
        <code>&lt;oge-splitter-pane&gt;</code> child with its two-way
        <code>collapsed</code> model, and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeSplitter"
      selector="oge-splitter"
      [sections]="splitterApi"
    />
    <app-api-reference
      title="OgeSplitterPane"
      selector="oge-splitter-pane"
      [sections]="splitterPaneApi"
    />
    <app-api-reference title="Splitter configuration" [sections]="configApi" />
  `,
})
export class LayoutSplitterApiPage {
  protected readonly sections = SECTIONS;
  protected readonly splitterApi = OGE_SPLITTER_API;
  protected readonly splitterPaneApi = OGE_SPLITTER_PANE_API;
  protected readonly configApi = OGE_SPLITTER_CONFIG_API;
}
