import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_TREE_VIEW_API,
  OGE_TREE_VIEW_CONFIG_API,
} from './tree-view-api-data';

const SECTIONS = ['OgeTreeView', 'Tree view configuration'] as const;

@Component({
  selector: 'app-navigation-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree View API"
      category="Navigation"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of <code>&#64;oge-ui/navigation</code>: the
        <code>oge-tree-view</code> component, its three template slots, the
        WAI-ARIA APG keyboard map and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeTreeView"
      selector="oge-tree-view"
      [sections]="treeViewApi"
    />
    <app-api-reference title="Tree view configuration" [sections]="configApi" />
  `,
})
export class NavigationApiPage {
  protected readonly sections = SECTIONS;
  protected readonly treeViewApi = OGE_TREE_VIEW_API;
  protected readonly configApi = OGE_TREE_VIEW_CONFIG_API;
}
