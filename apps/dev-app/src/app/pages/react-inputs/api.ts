import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_AUTOCOMPLETE_API,
  OGE_REACT_CALENDAR_API,
  OGE_REACT_CHECK_BOX_API,
  OGE_REACT_COLOR_BOX_API,
  OGE_REACT_DATE_BOX_API,
  OGE_REACT_INPUTS_CONFIG_API,
  OGE_REACT_INPUTS_TYPES_API,
  OGE_REACT_NUMBER_BOX_API,
  OGE_REACT_RADIO_GROUP_API,
  OGE_REACT_RANGE_SLIDER_API,
  OGE_REACT_SELECT_BOX_API,
  OGE_REACT_SLIDER_API,
  OGE_REACT_SWITCH_API,
  OGE_REACT_TAG_BOX_API,
  OGE_REACT_TEXT_AREA_API,
  OGE_REACT_TEXT_BOX_API,
  OGE_REACT_TREE_SELECT_API,
} from './react-inputs-api-data';

/**
 * The React half of the inputs API reference.
 *
 * Not a route of its own — it renders inside `/components/inputs/api` when the
 * reader has chosen React (ADR 0001), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 *
 *
 * The `llms.txt` generator reads this file's `<app-api-reference>` bindings, so
 * adding a component here is all it takes for it to reach
 * `@oge-ui/react-inputs`'s machine-readable docs.
 */
@Component({
  selector: 'app-react-inputs-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeTextBox&gt;" [sections]="textBoxApi" />
    <app-api-reference title="&lt;OgeTextArea&gt;" [sections]="textAreaApi" />
    <app-api-reference title="&lt;OgeNumberBox&gt;" [sections]="numberBoxApi" />
    <app-api-reference title="&lt;OgeSelectBox&gt;" [sections]="selectBoxApi" />
    <app-api-reference
      title="&lt;OgeTreeSelect&gt;"
      [sections]="treeSelectApi"
    />
    <app-api-reference title="&lt;OgeTagBox&gt;" [sections]="tagBoxApi" />
    <app-api-reference
      title="&lt;OgeAutocomplete&gt;"
      [sections]="autocompleteApi"
    />
    <app-api-reference title="&lt;OgeCheckBox&gt;" [sections]="checkBoxApi" />
    <app-api-reference title="&lt;OgeSlider&gt;" [sections]="sliderApi" />
    <app-api-reference
      title="&lt;OgeRangeSlider&gt;"
      [sections]="rangeSliderApi"
    />
    <app-api-reference title="&lt;OgeSwitch&gt;" [sections]="switchApi" />
    <app-api-reference
      title="&lt;OgeRadioGroup&gt;"
      [sections]="radioGroupApi"
    />
    <app-api-reference title="&lt;OgeCalendar&gt;" [sections]="calendarApi" />
    <app-api-reference title="&lt;OgeDateBox&gt;" [sections]="dateBoxApi" />
    <app-api-reference title="&lt;OgeColorBox&gt;" [sections]="colorBoxApi" />
    <app-api-reference title="Shared input types" [sections]="typesApi" />
    <app-api-reference title="Inputs configuration" [sections]="configApi" />
  `,
})
export class ReactInputsApiSections {
  protected readonly textBoxApi = OGE_REACT_TEXT_BOX_API;
  protected readonly textAreaApi = OGE_REACT_TEXT_AREA_API;
  protected readonly numberBoxApi = OGE_REACT_NUMBER_BOX_API;
  protected readonly selectBoxApi = OGE_REACT_SELECT_BOX_API;
  protected readonly treeSelectApi = OGE_REACT_TREE_SELECT_API;
  protected readonly tagBoxApi = OGE_REACT_TAG_BOX_API;
  protected readonly autocompleteApi = OGE_REACT_AUTOCOMPLETE_API;
  protected readonly checkBoxApi = OGE_REACT_CHECK_BOX_API;
  protected readonly sliderApi = OGE_REACT_SLIDER_API;
  protected readonly rangeSliderApi = OGE_REACT_RANGE_SLIDER_API;
  protected readonly switchApi = OGE_REACT_SWITCH_API;
  protected readonly radioGroupApi = OGE_REACT_RADIO_GROUP_API;
  protected readonly calendarApi = OGE_REACT_CALENDAR_API;
  protected readonly dateBoxApi = OGE_REACT_DATE_BOX_API;
  protected readonly colorBoxApi = OGE_REACT_COLOR_BOX_API;
  protected readonly typesApi = OGE_REACT_INPUTS_TYPES_API;
  protected readonly configApi = OGE_REACT_INPUTS_CONFIG_API;
}
