import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactInputsApiSections } from '../react-inputs/api';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_AUTOCOMPLETE_API,
  OGE_CALENDAR_API,
  OGE_CHECK_BOX_API,
  OGE_COLOR_BOX_API,
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
  'OgeColorBox',
  'Shared input types',
  'Inputs configuration',
] as const;

/** TOC of the React view — must mirror `ReactInputsApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeTextBox>',
  '<OgeTextArea>',
  '<OgeNumberBox>',
  '<OgeSelectBox>',
  '<OgeTreeSelect>',
  '<OgeTagBox>',
  '<OgeAutocomplete>',
  '<OgeCheckBox>',
  '<OgeSlider>',
  '<OgeRangeSlider>',
  '<OgeSwitch>',
  '<OgeRadioGroup>',
  '<OgeCalendar>',
  '<OgeDateBox>',
  '<OgeColorBox>',
  'Shared input types',
  'Inputs configuration',
] as const;

@Component({
  selector: 'app-inputs-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    ReactInputsApiSections,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Inputs API"
      category="Inputs"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-inputs</code> —
          props, callbacks, imperative handles and supporting types. Every
          editor extends one <code>OgeControlProps</code> base, so the shared
          members are listed once per component as "Common" groups,
          component-specific props first. Values are controlled/uncontrolled
          pairs (<code>value</code> + <code>onValueChange</code>, or
          <code>defaultValue</code>), public methods arrive through a
          <code>ref</code> handle, and defaults and strings come from
          <code>&lt;OgeInputsConfigProvider&gt;</code>. Live examples are on the
          <a
            routerLink="/components/inputs"
            class="text-indigo-600 underline dark:text-indigo-400"
            >demo pages</a
          >.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/inputs</code>. The three
          editors share one field chrome and one base class — shared members are
          listed once per editor as "Common" groups, editor-specific members
          first. Live examples are on the
          <a
            routerLink="/components/inputs"
            class="text-indigo-600 underline dark:text-indigo-400"
            >demo pages</a
          >.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-api />
    } @else {
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
      <app-api-reference
        title="OgeColorBox"
        selector="oge-color-box"
        [sections]="colorBoxApi"
      />
      <app-api-reference title="Shared input types" [sections]="typesApi" />
      <app-api-reference title="Inputs configuration" [sections]="configApi" />
    }

    <h3>Notes</h3>
    <ul>
      @if (fw.isReact()) {
        <li>
          Every editor takes a controlled/uncontrolled pair: pass
          <code>value</code> together with <code>onValueChange</code> to own the
          state, or <code>defaultValue</code> alone to let the editor own it —
          never both.
        </li>
        <li>
          <code>onValueCommitted</code> is the reference
          <code>onValueChanged</code> equivalent: the same commits as
          <code>onValueChange</code>, plus <code>previousValue</code> and the
          originating DOM event.
        </li>
        <li>
          The suffix rail order is the same contract as in Angular: prefix ·
          input · pending⊻success · copy · reveal · clear · spin · suffix.
        </li>
      } @else {
        <li>
          All editors implement both classic
          <code>ControlValueAccessor</code> and Signal Forms'
          <code>FormValueControl</code> — the
          <code>readonly</code>/<code>errors</code>/<code>touch</code> names are
          fixed by that contract.
        </li>
        <li>
          <code>(valueCommitted)</code> is the reference
          <code>onValueChanged</code> equivalent; native
          <code>keydown</code>/<code>paste</code>/<code>cut</code> bubble from
          the inner input and can be bound on the host element directly.
        </li>
        <li>
          The suffix rail order is a contract: prefix · input · pending⊻success
          · copy · reveal · clear · spin · suffix.
        </li>
      }
    </ul>
  `,
})
export class InputsApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
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
  protected readonly colorBoxApi = OGE_COLOR_BOX_API;
  protected readonly typesApi = OGE_INPUTS_TYPES_API;
  protected readonly configApi = OGE_INPUTS_CONFIG_API;
}
