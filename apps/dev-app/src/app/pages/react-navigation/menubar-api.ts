import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_MENUBAR_API,
  OGE_REACT_MENUBAR_CONFIG_API,
  OGE_REACT_MENUBAR_ITEM_API,
} from './menubar-api-data';

/**
 * The React half of the menubar API reference.
 *
 * Not a route of its own — it renders inside the navigation API page when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of `<oge-menubar-item>`: React reserves
 * the `key` prop, so an item is an `OgeMenubarItemData` object in the `items`
 * tree — the same fields, at every depth.
 */
@Component({
  selector: 'app-react-navigation-menubar-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeMenubar&gt;" [sections]="menubarApi" />
    <app-api-reference
      title="OgeMenubarItem (OgeMenubarItemData)"
      [sections]="menubarItemApi"
    />
    <app-api-reference
      title="Menubar configuration"
      [sections]="menubarConfigApi"
    />
  `,
})
export class ReactNavigationMenubarApiSections {
  protected readonly menubarApi = OGE_REACT_MENUBAR_API;
  protected readonly menubarItemApi = OGE_REACT_MENUBAR_ITEM_API;
  protected readonly menubarConfigApi = OGE_REACT_MENUBAR_CONFIG_API;
}
