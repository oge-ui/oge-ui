import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_AUTOCOMPLETE_API,
  OGE_CALENDAR_API,
  OGE_CHECK_BOX_API,
  OGE_DATE_BOX_API,
  OGE_INPUTS_CONFIG_API,
  OGE_INPUTS_TYPES_API,
  OGE_NUMBER_BOX_API,
  OGE_RADIO_GROUP_API,
  OGE_SELECT_BOX_API,
  OGE_TREE_SELECT_API,
  OGE_RANGE_SLIDER_API,
  OGE_SLIDER_API,
  OGE_SWITCH_API,
  OGE_TAG_BOX_API,
  OGE_TEXT_AREA_API,
  OGE_TEXT_BOX_API,
} from './inputs-api-data';

const SECTIONS = [
  'OgeTextBox',
  'OgeTextArea',
  'OgeNumberBox',
  'OgeSelectBox',
  'OgeTreeSelect',
  'OgeTagBox',
  'OgeAutocomplete',
  'OgeCheckBox',
  'OgeSwitch',
  'OgeSlider',
  'OgeRangeSlider',
  'OgeRadioGroup',
  'OgeCalendar',
  'OgeDateBox',
  'Shared input types',
  'Inputs configuration',
] as const;

@Component({
  selector: 'app-inputs-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Inputs API"
      category="Inputs"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/inputs</code>. The three
        editors share one field chrome and one base class — shared members are
        listed once per editor as "Common" groups, editor-specific members
        first. Live examples are on the
        <a
          routerLink="/components/inputs"
          class="text-indigo-600 dark:text-indigo-400"
          >demo pages</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeTextBox"
      selector="oge-text-box"
      [sections]="textBoxApi"
    />
    <app-api-reference
      title="OgeTextArea"
      selector="oge-text-area"
      [sections]="textAreaApi"
    />
    <app-api-reference
      title="OgeNumberBox"
      selector="oge-number-box"
      [sections]="numberBoxApi"
    />
    <app-api-reference
      title="OgeSelectBox"
      selector="oge-select-box"
      [sections]="selectBoxApi"
    />
    <app-api-reference
      title="OgeTreeSelect"
      selector="oge-tree-select"
      [sections]="treeSelectApi"
    />
    <app-api-reference
      title="OgeTagBox"
      selector="oge-tag-box"
      [sections]="tagBoxApi"
    />
    <app-api-reference
      title="OgeAutocomplete"
      selector="oge-autocomplete"
      [sections]="autocompleteApi"
    />
    <app-api-reference
      title="OgeCheckBox"
      selector="oge-check-box"
      [sections]="checkBoxApi"
    />
    <app-api-reference
      title="OgeSlider"
      selector="oge-slider"
      [sections]="sliderApi"
    />
    <app-api-reference
      title="OgeRangeSlider"
      selector="oge-range-slider"
      [sections]="rangeSliderApi"
    />
    <app-api-reference
      title="OgeSwitch"
      selector="oge-switch"
      [sections]="switchApi"
    />
    <app-api-reference
      title="OgeRadioGroup"
      selector="oge-radio-group"
      [sections]="radioGroupApi"
    />
    <app-api-reference
      title="OgeCalendar"
      selector="oge-calendar"
      [sections]="calendarApi"
    />
    <app-api-reference
      title="OgeDateBox"
      selector="oge-date-box"
      [sections]="dateBoxApi"
    />
    <app-api-reference title="Shared input types" [sections]="typesApi" />
    <app-api-reference title="Inputs configuration" [sections]="configApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        All editors implement both classic <code>ControlValueAccessor</code> and
        Signal Forms' <code>FormValueControl</code> — the
        <code>readonly</code>/<code>errors</code>/<code>touch</code> names are
        fixed by that contract.
      </li>
      <li>
        <code>(valueCommitted)</code> is the reference
        <code>onValueChanged</code> equivalent; native
        <code>keydown</code>/<code>paste</code>/<code>cut</code> bubble from the
        inner input and can be bound on the host element directly.
      </li>
      <li>
        The suffix rail order is a contract: prefix · input · pending⊻success ·
        copy · reveal · clear · spin · suffix.
      </li>
    </ul>
  `,
})
export class InputsApiPage {
  protected readonly sections = SECTIONS;
  protected readonly textBoxApi = OGE_TEXT_BOX_API;
  protected readonly textAreaApi = OGE_TEXT_AREA_API;
  protected readonly numberBoxApi = OGE_NUMBER_BOX_API;
  protected readonly selectBoxApi = OGE_SELECT_BOX_API;
  protected readonly treeSelectApi = OGE_TREE_SELECT_API;
  protected readonly tagBoxApi = OGE_TAG_BOX_API;
  protected readonly autocompleteApi = OGE_AUTOCOMPLETE_API;
  protected readonly checkBoxApi = OGE_CHECK_BOX_API;
  protected readonly switchApi = OGE_SWITCH_API;
  protected readonly sliderApi = OGE_SLIDER_API;
  protected readonly rangeSliderApi = OGE_RANGE_SLIDER_API;
  protected readonly radioGroupApi = OGE_RADIO_GROUP_API;
  protected readonly calendarApi = OGE_CALENDAR_API;
  protected readonly dateBoxApi = OGE_DATE_BOX_API;
  protected readonly typesApi = OGE_INPUTS_TYPES_API;
  protected readonly configApi = OGE_INPUTS_CONFIG_API;
}
