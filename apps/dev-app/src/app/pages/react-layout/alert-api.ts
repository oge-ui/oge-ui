import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_ALERT_API,
  OGE_REACT_ALERT_CONFIG_API,
} from './alert-api-data';

/**
 * The React half of the alert API reference — rendered inside
 * `/components/alert/api` when the reader has chosen React (ADR 0002). The
 * block order mirrors the Angular page, so the parity gate can diff them
 * block by block.
 */
@Component({
  selector: 'app-react-layout-alert-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeAlert&gt;" [sections]="alertApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutAlertApiSections {
  protected readonly alertApi = OGE_REACT_ALERT_API;
  protected readonly configApi = OGE_REACT_ALERT_CONFIG_API;
}
