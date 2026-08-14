import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { ReactButtonsApiSections } from '../react-buttons/api';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_BUTTON_API,
  OGE_BUTTON_GROUP_API,
  OGE_BUTTONS_CONFIG_API,
  OGE_DROP_DOWN_BUTTON_API,
} from './buttons-api-data';

const SECTIONS = [
  'OgeButton',
  'OgeButtonGroup',
  'OgeDropDownButton',
  'Buttons configuration',
] as const;

/** TOC of the React view — must mirror `ReactButtonsApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeButton>',
  '<OgeButtonGroup>',
  '<OgeDropDownButton>',
] as const;

@Component({
  selector: 'app-buttons-api',
  imports: [
    ApiReference,
    DocHeader,
    ReactButtonsApiSections,
    PageToc,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Buttons API"
      category="Buttons"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/buttons</code> — every
        input, output, imperative method and supporting type, compiled from the
        source TSDoc. Cancelable and gesture behavior is documented on the
        <a
          routerLink="/components/buttons"
          class="text-indigo-600 underline dark:text-indigo-400"
          >demo pages</a
        >.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-buttons-api />
    } @else {
      <app-api-reference
        title="OgeButton"
        selector="oge-button"
        [sections]="buttonApi"
      />
      <app-api-reference
        title="OgeButtonGroup"
        selector="oge-button-group"
        [sections]="buttonGroupApi"
      />
      <app-api-reference
        title="OgeDropDownButton"
        selector="oge-drop-down-button"
        [sections]="dropDownButtonApi"
      />
      <app-api-reference title="Buttons configuration" [sections]="configApi" />
    }

    <h3>Notes</h3>
    <ul>
      @if (fw.isReact()) {
        <li>
          <code>onClick</code> <em>is</em> the guarded pipeline — it fires after
          the click guard, hold-to-confirm and auto-repeat have had their say.
          Do not attach a second handler to the inner native button; it would
          bypass every guard.
        </li>
        <li>
          <code>onInitialized</code>/<code>onOptionChanged</code>/<code
            >onContentReady</code
          >
          lifecycle callbacks are intentionally absent — React state, props and
          effects cover them.
        </li>
      } @else {
        <li>
          Outputs never reuse native DOM event names — bind
          <code>(clicked)</code>, not <code>(click)</code>; native events still
          bubble from the host and bypass every guard.
        </li>
        <li>
          <code>onInitialized</code>/<code>onOptionChanged</code>/<code
            >onContentReady</code
          >
          lifecycle callbacks are intentionally absent — Angular lifecycle,
          <code>effect()</code> and signal inputs cover them.
        </li>
      }
    </ul>
  `,
})
export class ButtonsApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly buttonApi = OGE_BUTTON_API;
  protected readonly buttonGroupApi = OGE_BUTTON_GROUP_API;
  protected readonly dropDownButtonApi = OGE_DROP_DOWN_BUTTON_API;
  protected readonly configApi = OGE_BUTTONS_CONFIG_API;
}
