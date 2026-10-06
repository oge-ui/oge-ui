import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_DATA_VIEW_API,
  OGE_REACT_DATA_VIEW_CONFIG_API,
} from './data-view-api-data';

/**
 * The React half of the data view API reference — rendered inside
 * `/components/data-view/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-data-view-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeDataView&gt;" [sections]="dataViewApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutDataViewApiSections {
  protected readonly dataViewApi = OGE_REACT_DATA_VIEW_API;
  protected readonly configApi = OGE_REACT_DATA_VIEW_CONFIG_API;
}
