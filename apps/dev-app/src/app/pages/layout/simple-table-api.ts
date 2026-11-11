import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutSimpleTableApiSections } from '../react-layout/simple-table-api';
import {
  OGE_SIMPLE_TABLE_API,
  OGE_SIMPLE_TABLE_CONFIG_API,
} from './simple-table-api-data';

const SECTIONS = ['OgeSimpleTable', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutSimpleTableApiSections`' titles. */
const SECTIONS_REACT = ['<OgeSimpleTable>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-simple-table-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactLayoutSimpleTableApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Simple Table API"
      category="Layout"
      categoryLink="/components/simple-table"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeSimpleTable&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the render props
          that replace the Angular template slots, the ref handle and the config
          provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-simple-table</code>: its inputs and model,
          the page method, the four structural template slots with their typed
          contexts, and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-simple-table-api />
    } @else {
      <app-api-reference
        title="OgeSimpleTable"
        selector="oge-simple-table"
        [sections]="tableApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutSimpleTableApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly tableApi = OGE_SIMPLE_TABLE_API;
  protected readonly configApi = OGE_SIMPLE_TABLE_CONFIG_API;
}
