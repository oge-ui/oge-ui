import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_SIMPLE_TABLE_API,
  OGE_REACT_SIMPLE_TABLE_CONFIG_API,
} from './simple-table-api-data';

/**
 * The React half of the simple table API reference — rendered inside
 * `/components/simple-table/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-simple-table-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeSimpleTable&gt;" [sections]="tableApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutSimpleTableApiSections {
  protected readonly tableApi = OGE_REACT_SIMPLE_TABLE_API;
  protected readonly configApi = OGE_REACT_SIMPLE_TABLE_CONFIG_API;
}
