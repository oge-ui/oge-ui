import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_DRAWER_API,
  OGE_REACT_DRAWER_CONFIG_API,
} from './drawer-api-data';

/**
 * The React half of the drawer API reference.
 *
 * Not a route of its own — it renders inside the navigation API page when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 */
@Component({
  selector: 'app-react-navigation-drawer-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeDrawer&gt;" [sections]="drawerApi" />
    <app-api-reference
      title="Drawer configuration"
      [sections]="drawerConfigApi"
    />
  `,
})
export class ReactNavigationDrawerApiSections {
  protected readonly drawerApi = OGE_REACT_DRAWER_API;
  protected readonly drawerConfigApi = OGE_REACT_DRAWER_CONFIG_API;
}
