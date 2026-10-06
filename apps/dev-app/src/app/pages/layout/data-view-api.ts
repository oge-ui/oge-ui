import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutDataViewApiSections } from '../react-layout/data-view-api';
import {
  OGE_DATA_VIEW_API,
  OGE_DATA_VIEW_CONFIG_API,
} from './data-view-api-data';

const SECTIONS = ['OgeDataView', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutDataViewApiSections`' titles. */
const SECTIONS_REACT = ['<OgeDataView>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-data-view-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutDataViewApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Data View API"
      category="Layout"
      categoryLink="/components/data-view"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeDataView&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the controlled /
          uncontrolled pairs, the render props that replace the Angular template
          slots, the ref handle and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-data-view</code>: its inputs and models,
          methods, outputs, the three structural template slots plus the toolbar
          attribute slot, and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-data-view-api />
    } @else {
      <app-api-reference
        title="OgeDataView"
        selector="oge-data-view"
        [sections]="dataViewApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutDataViewApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly dataViewApi = OGE_DATA_VIEW_API;
  protected readonly configApi = OGE_DATA_VIEW_CONFIG_API;
}
