import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_TOOLBAR_API,
  OGE_REACT_TOOLBAR_CONFIG_API,
  OGE_REACT_TOOLBAR_ITEM_API,
} from './toolbar-api-data';

/**
 * The React half of the toolbar API reference.
 *
 * Not a route of its own — it renders inside `/components/toolbar/api` when the
 * reader has chosen React (ADR 0001), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of `<oge-toolbar-item>`: React has no
 * child component to project, so an item is an `OgeToolbarItemData` object in
 * the `items` prop — the same fields, with the component-level callbacks
 * carrying what the Angular child's own outputs carry.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-layout`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-layout-toolbar-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeToolbar&gt;" [sections]="toolbarApi" />
    <app-api-reference
      title="OgeToolbarItem (OgeToolbarItemData)"
      [sections]="toolbarItemApi"
    />
    <app-api-reference title="Toolbar configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutToolbarApiSections {
  protected readonly toolbarApi = OGE_REACT_TOOLBAR_API;
  protected readonly toolbarItemApi = OGE_REACT_TOOLBAR_ITEM_API;
  protected readonly configApi = OGE_REACT_TOOLBAR_CONFIG_API;
}
