import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_BUTTON_API,
  OGE_REACT_BUTTON_GROUP_API,
  OGE_REACT_DROP_DOWN_BUTTON_API,
} from './react-buttons-api-data';

/**
 * The React half of the buttons API reference.
 *
 * Not a route of its own — it renders inside `/components/buttons/api` when the
 * reader has chosen React (ADR 0001). It uses the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables, which is both what
 * keeps the page visually identical across the switch and what will let the
 * parity gate diff the two member lists (Faz 4).
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-buttons`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-buttons-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeButton&gt;" [sections]="buttonApi" />
    <app-api-reference
      title="&lt;OgeButtonGroup&gt;"
      [sections]="buttonGroupApi"
    />
    <app-api-reference
      title="&lt;OgeDropDownButton&gt;"
      [sections]="dropDownButtonApi"
    />
  `,
})
export class ReactButtonsApiSections {
  protected readonly buttonApi = OGE_REACT_BUTTON_API;
  protected readonly buttonGroupApi = OGE_REACT_BUTTON_GROUP_API;
  protected readonly dropDownButtonApi = OGE_REACT_DROP_DOWN_BUTTON_API;
}
