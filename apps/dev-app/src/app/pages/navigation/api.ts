import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_DRAWER_API, OGE_DRAWER_CONFIG_API } from './drawer-api-data';
import { OGE_STEPPER_API, OGE_STEPPER_CONFIG_API } from './stepper-api-data';
import {
  OGE_TREE_VIEW_API,
  OGE_TREE_VIEW_CONFIG_API,
} from './tree-view-api-data';

const SECTIONS = [
  'OgeTreeView',
  'Tree view configuration',
  'OgeDrawer',
  'Drawer configuration',
  'OgeStepper',
  'Stepper configuration',
] as const;

@Component({
  selector: 'app-navigation-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Tree View API"
      category="Navigation"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of <code>&#64;oge-ui/navigation</code>: the
        <code>oge-tree-view</code> component, its three template slots, the
        WAI-ARIA APG keyboard map and the config provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeTreeView"
      selector="oge-tree-view"
      [sections]="treeViewApi"
    />
    <app-api-reference title="Tree view configuration" [sections]="configApi" />
    <app-api-reference
      title="OgeDrawer"
      selector="oge-drawer"
      [sections]="drawerApi"
    />
    <app-api-reference
      title="Drawer configuration"
      [sections]="drawerConfigApi"
    />
    <app-api-reference
      title="OgeStepper"
      selector="oge-stepper"
      [sections]="stepperApi"
    />
    <app-api-reference
      title="Stepper configuration"
      [sections]="stepperConfigApi"
    />
  `,
})
export class NavigationApiPage {
  protected readonly sections = SECTIONS;
  protected readonly treeViewApi = OGE_TREE_VIEW_API;
  protected readonly configApi = OGE_TREE_VIEW_CONFIG_API;
  protected readonly drawerApi = OGE_DRAWER_API;
  protected readonly drawerConfigApi = OGE_DRAWER_CONFIG_API;
  protected readonly stepperApi = OGE_STEPPER_API;
  protected readonly stepperConfigApi = OGE_STEPPER_CONFIG_API;
}
