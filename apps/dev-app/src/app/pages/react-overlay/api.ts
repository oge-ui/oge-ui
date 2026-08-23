import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_ANCHORED_PANEL_API,
  OGE_REACT_CONTEXT_MENU_API,
  OGE_REACT_MENU_LIST_API,
  OGE_REACT_MODAL_API,
  OGE_REACT_MODAL_SERVICE_API,
  OGE_REACT_OVERLAY_CONFIG_API,
  OGE_REACT_OVERLAY_PRIMITIVES_API,
  OGE_REACT_POPUP_API,
  OGE_REACT_RESOLVE_POPUP_POSITION_API,
  OGE_REACT_TOAST_API,
  OGE_REACT_TOOLTIP_API,
} from './react-overlay-api-data';

/**
 * The React half of the overlay API reference.
 *
 * Not a route of its own — it renders inside `/components/overlay/api` when
 * the reader has chosen React (ADR 0001), through the same
 * `<app-api-reference>` and the same `ApiSections` shape as the Angular
 * tables. The block order mirrors the Angular page exactly, so the two views
 * read as one page across the switch and the parity gate can diff them block
 * by block.
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings,
 * so adding a component here is all it takes for it to reach
 * `@oge-ui/react-overlay`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-overlay-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeModal&gt;" [sections]="modalApi" />
    <app-api-reference
      title="OgeModalService (useOgeModals)"
      [sections]="modalServiceApi"
    />
    <app-api-reference
      title="OgeToastService (useOgeToasts)"
      [sections]="toastApi"
    />
    <app-api-reference title="&lt;OgeTooltip&gt;" [sections]="tooltipApi" />
    <app-api-reference
      title="&lt;OgeContextMenu&gt;"
      [sections]="contextMenuApi"
    />
    <app-api-reference title="&lt;OgeMenuList&gt;" [sections]="menuListApi" />
    <app-api-reference
      title="OgeAnchoredPanel (useAnchoredPanel)"
      [sections]="anchoredPanelApi"
    />
    <app-api-reference title="&lt;OgePopup&gt;" [sections]="popupApi" />
    <app-api-reference title="resolvePopupPosition" [sections]="positionApi" />
    <app-api-reference title="Overlay configuration" [sections]="configApi" />
    <app-api-reference title="Overlay primitives" [sections]="primitivesApi" />
  `,
})
export class ReactOverlayApiSections {
  protected readonly modalApi = OGE_REACT_MODAL_API;
  protected readonly modalServiceApi = OGE_REACT_MODAL_SERVICE_API;
  protected readonly toastApi = OGE_REACT_TOAST_API;
  protected readonly tooltipApi = OGE_REACT_TOOLTIP_API;
  protected readonly contextMenuApi = OGE_REACT_CONTEXT_MENU_API;
  protected readonly menuListApi = OGE_REACT_MENU_LIST_API;
  protected readonly anchoredPanelApi = OGE_REACT_ANCHORED_PANEL_API;
  protected readonly popupApi = OGE_REACT_POPUP_API;
  protected readonly positionApi = OGE_REACT_RESOLVE_POPUP_POSITION_API;
  protected readonly configApi = OGE_REACT_OVERLAY_CONFIG_API;
  protected readonly primitivesApi = OGE_REACT_OVERLAY_PRIMITIVES_API;
}
