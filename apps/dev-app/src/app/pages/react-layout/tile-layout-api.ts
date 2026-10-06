import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_TILE_LAYOUT_API,
  OGE_REACT_TILE_LAYOUT_CONFIG_API,
} from './tile-layout-api-data';

/**
 * The React half of the tile layout API reference — rendered inside
 * `/components/tile-layout/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page (minus the declarative item, which
 * React expresses through `items`), so the parity gate can diff the two.
 */
@Component({
  selector: 'app-react-layout-tile-layout-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTileLayout&gt;" [sections]="layoutApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutTileLayoutApiSections {
  protected readonly layoutApi = OGE_REACT_TILE_LAYOUT_API;
  protected readonly configApi = OGE_REACT_TILE_LAYOUT_CONFIG_API;
}
