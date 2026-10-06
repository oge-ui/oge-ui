import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutApiSections } from '../react-layout/api';
import {
  OGE_ACCORDION_API,
  OGE_ACCORDION_CONFIG_API,
  OGE_ACCORDION_ITEM_API,
  OGE_EXPANSION_PANEL_API,
  OGE_PANEL_BAR_API,
} from './accordion-api-data';

const SECTIONS = [
  'OgeAccordion',
  'OgeAccordionItem',
  'OgePanelBar',
  'OgeExpansionPanel',
  'Accordion configuration',
] as const;

/** TOC of the React view — must mirror `ReactLayoutApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeAccordion>',
  'OgeAccordionItem (OgeAccordionItemDefinition)',
  '<OgePanelBar>',
  '<OgeExpansionPanel>',
  'Accordion configuration',
] as const;

@Component({
  selector: 'app-layout-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Accordion API"
      category="Layout"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of the accordion in
          <code>&#64;oge-ui/react-layout</code>: the
          <code>&lt;OgeAccordion&gt;</code> container, the
          <code>OgeAccordionItemDefinition</code> entries of its
          <code>items</code> prop with their four render props, the nested
          <code>&lt;OgePanelBar&gt;</code>, the stand-alone
          <code>&lt;OgeExpansionPanel&gt;</code> and the config provider. React
          has no projected child component, so a panel is an object — and its
          <code>open()</code>/<code>close()</code> move to the container's
          <code>ref</code> handle.
        </p>
      } @else {
        <p>
          Full surface of <code>&#64;oge-ui/layout</code>: the
          <code>oge-accordion</code> container, the declarative
          <code>&lt;oge-accordion-item&gt;</code> child with its four template
          slots, the nested <code>oge-panel-bar</code>, the stand-alone
          <code>oge-expansion-panel</code> and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-api />
    } @else {
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
      <app-api-reference
        title="OgePanelBar"
        selector="oge-panel-bar"
        [sections]="panelBarApi"
      />
      <app-api-reference
        title="OgeExpansionPanel"
        selector="oge-expansion-panel"
        [sections]="expansionPanelApi"
      />
      <app-api-reference
        title="Accordion configuration"
        [sections]="configApi"
      />
    }
  `,
})
export class LayoutApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly accordionApi = OGE_ACCORDION_API;
  protected readonly accordionItemApi = OGE_ACCORDION_ITEM_API;
  protected readonly panelBarApi = OGE_PANEL_BAR_API;
  protected readonly expansionPanelApi = OGE_EXPANSION_PANEL_API;
  protected readonly configApi = OGE_ACCORDION_CONFIG_API;
}
