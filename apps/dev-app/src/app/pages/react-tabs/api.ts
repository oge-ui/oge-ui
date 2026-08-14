import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_TABS_API,
  OGE_REACT_TABS_CONFIG_API,
  OGE_REACT_TAB_API,
  OGE_REACT_TAB_PANEL_API,
} from './react-tabs-api-data';

/**
 * The React half of the tabs API reference.
 *
 * Not a route of its own — it renders inside `/components/tabs/api` when the
 * reader has chosen React (ADR 0001), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 * The third block is the React face of `<oge-tab>`: React has no child
 * component to project, so a tab is an `OgeTabDefinition` object in the `tabs`
 * prop — same fields, plus `content` and `renderHeader`.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach `@oge-ui/react-tabs`'s
 * machine-readable docs.
 */
@Component({
  selector: 'app-react-tabs-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTabPanel&gt;" [sections]="tabPanelApi" />
    <app-api-reference title="&lt;OgeTabs&gt;" [sections]="tabsApi" />
    <app-api-reference title="OgeTab (OgeTabDefinition)" [sections]="tabApi" />
    <app-api-reference title="Tabs configuration" [sections]="configApi" />
  `,
})
export class ReactTabsApiSections {
  protected readonly tabPanelApi = OGE_REACT_TAB_PANEL_API;
  protected readonly tabsApi = OGE_REACT_TABS_API;
  protected readonly tabApi = OGE_REACT_TAB_API;
  protected readonly configApi = OGE_REACT_TABS_CONFIG_API;
}
