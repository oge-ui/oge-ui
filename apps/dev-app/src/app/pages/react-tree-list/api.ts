import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_TREE_LIST_API } from './react-tree-list-api-data';

/**
 * The React half of the tree-list API reference.
 *
 * Not a route of its own — it renders inside `/components/tree-list/api`
 * when the reader has chosen React (ADR 0002), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * table. The `llms.txt` generator reads this file's `<app-api-reference>`
 * binding, so this is all it takes for the component to reach
 * `@oge-ui/react-tree-list`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-tree-list-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTreeList&gt;" [sections]="treeApi" />
  `,
})
export class ReactTreeListApiSections {
  protected readonly treeApi = OGE_REACT_TREE_LIST_API;
}
