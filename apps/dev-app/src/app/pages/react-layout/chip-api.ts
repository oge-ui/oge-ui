import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_CHIP_API,
  OGE_REACT_CHIP_CONFIG_API,
  OGE_REACT_CHIP_LIST_API,
} from './chip-api-data';

/**
 * The React half of the chip API reference — rendered inside
 * `/components/chip/api` when the reader has chosen React (ADR 0002). The
 * block order mirrors the Angular page, so the parity gate can diff them
 * block by block.
 */
@Component({
  selector: 'app-react-layout-chip-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeChip&gt;" [sections]="chipApi" />
    <app-api-reference title="&lt;OgeChipList&gt;" [sections]="chipListApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutChipApiSections {
  protected readonly chipApi = OGE_REACT_CHIP_API;
  protected readonly chipListApi = OGE_REACT_CHIP_LIST_API;
  protected readonly configApi = OGE_REACT_CHIP_CONFIG_API;
}
