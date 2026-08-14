import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutToolbarApiSections } from '../react-layout/toolbar-api';
import {
  OGE_TOOLBAR_API,
  OGE_TOOLBAR_CONFIG_API,
  OGE_TOOLBAR_ITEM_API,
} from './toolbar-api-data';

const SECTIONS = [
  'OgeToolbar',
  'OgeToolbarItem',
  'Toolbar configuration',
] as const;

/** TOC of the React view — must mirror `ReactLayoutToolbarApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeToolbar>',
  'OgeToolbarItem (OgeToolbarItemData)',
  'Toolbar configuration',
] as const;

@Component({
  selector: 'app-layout-toolbar-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutToolbarApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Toolbar API"
      category="Layout"
      categoryLink="/components/toolbar"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&#64;oge-ui/react-layout</code>'s
          <code>&lt;OgeToolbar&gt;</code>: the props, the
          <code>before</code>/<code>center</code>/<code>after</code> node slots,
          the <code>renderItem</code> render props, the <code>ref</code> handle,
          the callbacks, the <code>OgeToolbarItemData</code> entries of the
          <code>items</code> prop and the config provider.
        </p>
      } @else {
        <p>
          Full surface of the <code>oge-toolbar</code> container, the
          declarative <code>&lt;oge-toolbar-item&gt;</code> child, the three
          projection slots and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-toolbar-api />
    } @else {
      <app-api-reference
        title="OgeToolbar"
        selector="oge-toolbar"
        [sections]="toolbarApi"
      />
      <app-api-reference
        title="OgeToolbarItem"
        selector="oge-toolbar-item"
        [sections]="toolbarItemApi"
      />
      <app-api-reference title="Toolbar configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutToolbarApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly toolbarApi = OGE_TOOLBAR_API;
  protected readonly toolbarItemApi = OGE_TOOLBAR_ITEM_API;
  protected readonly configApi = OGE_TOOLBAR_CONFIG_API;
}
