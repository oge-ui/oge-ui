import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_APP_BAR_API,
  OGE_REACT_APP_BAR_CONFIG_API,
} from './app-bar-api-data';

/**
 * The React half of the app bar API reference — rendered inside
 * `/components/app-bar/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-app-bar-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeAppBar&gt;" [sections]="appBarApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutAppBarApiSections {
  protected readonly appBarApi = OGE_REACT_APP_BAR_API;
  protected readonly configApi = OGE_REACT_APP_BAR_CONFIG_API;
}
