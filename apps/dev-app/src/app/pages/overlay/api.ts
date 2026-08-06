import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_ANCHORED_PANEL_API,
  OGE_MENU_LIST_API,
  OGE_OVERLAY_CONFIG_API,
  OGE_POPUP_API,
  RESOLVE_POPUP_POSITION_API,
} from './overlay-api-data';

const SECTIONS = [
  'OgeMenuList',
  'OgeAnchoredPanel',
  'OgePopup',
  'resolvePopupPosition',
  'Overlay configuration',
] as const;

@Component({
  selector: 'app-overlay-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Overlay API"
      category="Overlay"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/overlay</code>. Note that
        <code>OgeAnchoredPanel</code> is a plain DI-free class (not a component)
        and <code>resolvePopupPosition</code> is a pure function — see the
        <a
          routerLink="/components/overlay"
          class="text-indigo-600 dark:text-indigo-400"
          >demos</a
        >
        for the wiring pattern.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeMenuList"
      selector="oge-menu-list"
      [sections]="menuListApi"
    />
    <app-api-reference title="OgeAnchoredPanel" [sections]="anchoredPanelApi" />
    <app-api-reference
      title="OgePopup"
      selector="oge-popup"
      [sections]="popupApi"
    />
    <app-api-reference title="resolvePopupPosition" [sections]="positionApi" />
    <app-api-reference title="Overlay configuration" [sections]="configApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        Uniquely among OGE packages the overlay config has no
        <code>messages</code> block — the package renders no user-facing
        strings; consumer components own their i18n.
      </li>
      <li>
        Panels reposition (never detach) on capture-phase scroll and resize; a
        <code>ResizeObserver</code> on the panel handles async content growth.
      </li>
    </ul>
  `,
})
export class OverlayApiPage {
  protected readonly sections = SECTIONS;
  protected readonly menuListApi = OGE_MENU_LIST_API;
  protected readonly anchoredPanelApi = OGE_ANCHORED_PANEL_API;
  protected readonly popupApi = OGE_POPUP_API;
  protected readonly positionApi = RESOLVE_POPUP_POSITION_API;
  protected readonly configApi = OGE_OVERLAY_CONFIG_API;
}
