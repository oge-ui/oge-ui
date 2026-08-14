import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_TREE_VIEW_API,
  OGE_REACT_TREE_VIEW_CONFIG_API,
} from './tree-view-api-data';

/**
 * The React half of the tree view API reference.
 *
 * Not a route of its own — it renders inside `/components/tree-view/api` when
 * the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The block order mirrors the Angular page exactly, so the two views
 * read as one page across the switch and the parity gate can diff them block
 * by block.
 */
@Component({
  selector: 'app-react-navigation-tree-view-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTreeView&gt;" [sections]="treeViewApi" />
    <app-api-reference title="Tree view configuration" [sections]="configApi" />
  `,
})
export class ReactNavigationTreeViewApiSections {
  protected readonly treeViewApi = OGE_REACT_TREE_VIEW_API;
  protected readonly configApi = OGE_REACT_TREE_VIEW_CONFIG_API;
}
