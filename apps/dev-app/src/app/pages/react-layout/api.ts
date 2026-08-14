import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_ACCORDION_API,
  OGE_REACT_ACCORDION_CONFIG_API,
  OGE_REACT_ACCORDION_ITEM_API,
} from './react-layout-api-data';

/**
 * The React half of the accordion API reference.
 *
 * Not a route of its own — it renders inside `/components/accordion/api` when
 * the reader has chosen React (ADR 0001), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular tables.
 * The block order mirrors the Angular page exactly, so the two views read as
 * one page across the switch and the parity gate can diff them block by block.
 *
 * The second block is the React face of `<oge-accordion-item>`: React has no
 * child component to project, so a panel is an `OgeAccordionItemDefinition`
 * object in the `items` prop — same fields, plus `content` and the four render
 * props. Its `open()`/`close()`/`toggle()` move to the accordion's `ref`
 * handle, which addresses a panel by index or key.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-layout`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-layout-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeAccordion&gt;" [sections]="accordionApi" />
    <app-api-reference
      title="OgeAccordionItem (OgeAccordionItemDefinition)"
      [sections]="accordionItemApi"
    />
    <app-api-reference title="Accordion configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutApiSections {
  protected readonly accordionApi = OGE_REACT_ACCORDION_API;
  protected readonly accordionItemApi = OGE_REACT_ACCORDION_ITEM_API;
  protected readonly configApi = OGE_REACT_ACCORDION_CONFIG_API;
}
