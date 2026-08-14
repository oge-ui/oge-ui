import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutSplitterApiSections } from '../react-layout/splitter-api';
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

/** TOC of the React view — must mirror `ReactLayoutSplitterApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeSplitter>',
  'OgeSplitterPane (OgeSplitterPaneItem)',
  'Splitter configuration',
] as const;

@Component({
  selector: 'app-layout-splitter-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutSplitterApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Splitter API"
      category="Layout"
      categoryLink="/components/splitter"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeSplitter&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: the container with its
          controlled <code>sizes</code> pair and its <code>ref</code> handle,
          the <code>OgeSplitterPaneItem</code> entries of the <code>panes</code>
          prop, and the config provider.
        </p>
      } @else {
        <p>
          Full surface of the <code>oge-splitter</code> container, the
          declarative <code>&lt;oge-splitter-pane&gt;</code> child with its
          two-way <code>collapsed</code> model, and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-splitter-api />
    } @else {
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
      <app-api-reference
        title="Splitter configuration"
        [sections]="configApi"
      />
    }
  `,
})
export class LayoutSplitterApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly splitterApi = OGE_SPLITTER_API;
  protected readonly splitterPaneApi = OGE_SPLITTER_PANE_API;
  protected readonly configApi = OGE_SPLITTER_CONFIG_API;
}
