import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_ANCHORED_PANEL_API,
  OGE_CONTEXT_MENU_API,
  OGE_MENU_LIST_API,
  OGE_MODAL_API,
  OGE_MODAL_SERVICE_API,
  OGE_TOAST_API,
  OGE_OVERLAY_CONFIG_API,
  OVERLAY_PRIMITIVES_API,
  OGE_POPUP_API,
  OGE_TOOLTIP_API,
  RESOLVE_POPUP_POSITION_API,
} from './overlay-api-data';

const SECTIONS = [
  'OgeModal',
  'OgeModalService',
  'OgeToastService',
  'OgeTooltip',
  'OgeContextMenu',
  'OgeMenuList',
  'OgeAnchoredPanel',
  'OgePopup',
  'resolvePopupPosition',
  'Overlay configuration',
  'Overlay primitives',
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
      title="OgeModal"
      selector="oge-modal"
      [sections]="modalApi"
    />
    <app-api-reference title="OgeModalService" [sections]="modalServiceApi" />
    <app-api-reference title="OgeToastService" [sections]="toastApi" />
    <app-api-reference
      title="OgeTooltip"
      selector="[ogeTooltip]"
      [sections]="tooltipApi"
    />
    <app-api-reference
      title="OgeContextMenu"
      selector="[ogeContextMenu]"
      [sections]="contextMenuApi"
    />
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
    <app-api-reference title="Overlay primitives" [sections]="primitivesApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        The overlay config's <code>messages</code> block is minimal — the
        anchored primitives render no user-facing strings (consumer components
        own their i18n); only the modal's ✕ button label lives there.
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
  protected readonly modalApi = OGE_MODAL_API;
  protected readonly modalServiceApi = OGE_MODAL_SERVICE_API;
  protected readonly toastApi = OGE_TOAST_API;
  protected readonly tooltipApi = OGE_TOOLTIP_API;
  protected readonly contextMenuApi = OGE_CONTEXT_MENU_API;
  protected readonly menuListApi = OGE_MENU_LIST_API;
  protected readonly anchoredPanelApi = OGE_ANCHORED_PANEL_API;
  protected readonly popupApi = OGE_POPUP_API;
  protected readonly positionApi = RESOLVE_POPUP_POSITION_API;
  protected readonly configApi = OGE_OVERLAY_CONFIG_API;
  protected readonly primitivesApi = OVERLAY_PRIMITIVES_API;
}
