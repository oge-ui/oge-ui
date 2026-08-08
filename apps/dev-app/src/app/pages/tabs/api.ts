import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
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

@Component({
  selector: 'app-tabs-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tabs API"
      category="Tabs"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of <code>&#64;oge-ui/tabs</code>: the
        <code>oge-tab-panel</code> strip-with-content component, the stand-alone
        <code>oge-tabs</code> strip, the declarative
        <code>&lt;oge-tab&gt;</code> child and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

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
    <app-api-reference title="OgeTab" selector="oge-tab" [sections]="tabApi" />
    <app-api-reference title="Tabs configuration" [sections]="configApi" />
  `,
})
export class TabsApiPage {
  protected readonly sections = SECTIONS;
  protected readonly tabPanelApi = OGE_TAB_PANEL_API;
  protected readonly tabsApi = OGE_TABS_API;
  protected readonly tabApi = OGE_TAB_API;
  protected readonly configApi = OGE_TABS_CONFIG_API;
}
