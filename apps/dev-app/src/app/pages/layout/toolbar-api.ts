import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
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

@Component({
  selector: 'app-layout-toolbar-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Toolbar API"
      category="Layout"
      categoryLink="/components/toolbar"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of the <code>oge-toolbar</code> container, the declarative
        <code>&lt;oge-toolbar-item&gt;</code> child, the three projection slots
        and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

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
  `,
})
export class LayoutToolbarApiPage {
  protected readonly sections = SECTIONS;
  protected readonly toolbarApi = OGE_TOOLBAR_API;
  protected readonly toolbarItemApi = OGE_TOOLBAR_ITEM_API;
  protected readonly configApi = OGE_TOOLBAR_CONFIG_API;
}
