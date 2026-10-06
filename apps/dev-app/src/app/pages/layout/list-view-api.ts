import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutListViewApiSections } from '../react-layout/list-view-api';
import {
  OGE_LIST_VIEW_API,
  OGE_LIST_VIEW_CONFIG_API,
} from './list-view-api-data';

const SECTIONS = ['OgeListView', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutListViewApiSections`' titles. */
const SECTIONS_REACT = ['<OgeListView>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-list-view-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutListViewApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="List View API"
      category="Layout"
      categoryLink="/components/list-view"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeListView&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the ref handle, the
          callbacks, the render props that replace the Angular template slots
          and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-list-view</code>: its inputs and models,
          methods, outputs, the four structural template slots and the config
          provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-list-view-api />
    } @else {
      <app-api-reference
        title="OgeListView"
        selector="oge-list-view"
        [sections]="listViewApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutListViewApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly listViewApi = OGE_LIST_VIEW_API;
  protected readonly configApi = OGE_LIST_VIEW_CONFIG_API;
}
