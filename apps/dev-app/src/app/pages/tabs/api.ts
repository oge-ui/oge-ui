import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactTabsApiSections } from '../react-tabs/api';
import {
  OGE_TAB_API,
  OGE_TAB_PANEL_API,
  OGE_TABS_API,
  OGE_TABS_CONFIG_API,
} from './tabs-api-data';

const SECTIONS = [
  'OgeTabPanel',
  'OgeTabs',
  'OgeTab',
  'Tabs configuration',
] as const;

/** TOC of the React view — must mirror `ReactTabsApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeTabPanel>',
  '<OgeTabs>',
  'OgeTab (OgeTabDefinition)',
  'Tabs configuration',
] as const;

@Component({
  selector: 'app-tabs-api',
  imports: [ApiReference, DocHeader, PageToc, ReactTabsApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tabs API"
      category="Tabs"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&#64;oge-ui/react-tabs</code>: the
          <code>&lt;OgeTabPanel&gt;</code> strip-with-content component, the
          stand-alone <code>&lt;OgeTabs&gt;</code> strip, the
          <code>OgeTabDefinition</code> entries of the <code>tabs</code> prop
          and the config provider. Both components share one
          <code>OgeTabsSharedProps</code> interface, so the shared members are
          listed once per component as "Common" groups.
        </p>
      } @else {
        <p>
          Full surface of <code>&#64;oge-ui/tabs</code>: the
          <code>oge-tab-panel</code> strip-with-content component, the
          stand-alone <code>oge-tabs</code> strip, the declarative
          <code>&lt;oge-tab&gt;</code> child and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-tabs-api />
    } @else {
      <app-api-reference
        title="OgeTabPanel"
        selector="oge-tab-panel"
        [sections]="tabPanelApi"
      />
      <app-api-reference
        title="OgeTabs"
        selector="oge-tabs"
        [sections]="tabsApi"
      />
      <app-api-reference
        title="OgeTab"
        selector="oge-tab"
        [sections]="tabApi"
      />
      <app-api-reference title="Tabs configuration" [sections]="configApi" />
    }
  `,
})
export class TabsApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly tabPanelApi = OGE_TAB_PANEL_API;
  protected readonly tabsApi = OGE_TABS_API;
  protected readonly tabApi = OGE_TAB_API;
  protected readonly configApi = OGE_TABS_CONFIG_API;
}
