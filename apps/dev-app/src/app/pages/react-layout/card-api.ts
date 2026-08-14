import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_CARD_API,
  OGE_REACT_CARD_CONFIG_API,
  OGE_REACT_CARD_SLOTS_API,
} from './card-api-data';

/**
 * The React half of the card API reference.
 *
 * Not a route of its own — it renders inside `/components/card/api` when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of the attribute slot directives: React
 * has nothing to project onto, so each section is a `ReactNode` prop carrying
 * the class the directive would have added.
 */
@Component({
  selector: 'app-react-layout-card-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeCard&gt;" [sections]="cardApi" />
    <app-api-reference title="Slot props" [sections]="slotsApi" />
    <app-api-reference title="Card configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutCardApiSections {
  protected readonly cardApi = OGE_REACT_CARD_API;
  protected readonly slotsApi = OGE_REACT_CARD_SLOTS_API;
  protected readonly configApi = OGE_REACT_CARD_CONFIG_API;
}
