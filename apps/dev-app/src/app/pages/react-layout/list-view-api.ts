import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_LIST_VIEW_API,
  OGE_REACT_LIST_VIEW_CONFIG_API,
} from './list-view-api-data';

/**
 * The React half of the list view API reference — rendered inside
 * `/components/list-view/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-list-view-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeListView&gt;" [sections]="listViewApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutListViewApiSections {
  protected readonly listViewApi = OGE_REACT_LIST_VIEW_API;
  protected readonly configApi = OGE_REACT_LIST_VIEW_CONFIG_API;
}
