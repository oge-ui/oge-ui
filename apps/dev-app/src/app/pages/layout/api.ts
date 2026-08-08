import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_ACCORDION_API,
  OGE_ACCORDION_CONFIG_API,
  OGE_ACCORDION_ITEM_API,
} from './accordion-api-data';

const SECTIONS = [
  'OgeAccordion',
  'OgeAccordionItem',
  'Accordion configuration',
] as const;

@Component({
  selector: 'app-layout-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Accordion API"
      category="Layout"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of <code>&#64;oge-ui/layout</code>: the
        <code>oge-accordion</code> container, the declarative
        <code>&lt;oge-accordion-item&gt;</code> child with its four template
        slots, and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeAccordion"
      selector="oge-accordion"
      [sections]="accordionApi"
    />
    <app-api-reference
      title="OgeAccordionItem"
      selector="oge-accordion-item"
      [sections]="accordionItemApi"
    />
    <app-api-reference title="Accordion configuration" [sections]="configApi" />
  `,
})
export class LayoutApiPage {
  protected readonly sections = SECTIONS;
  protected readonly accordionApi = OGE_ACCORDION_API;
  protected readonly accordionItemApi = OGE_ACCORDION_ITEM_API;
  protected readonly configApi = OGE_ACCORDION_CONFIG_API;
}
