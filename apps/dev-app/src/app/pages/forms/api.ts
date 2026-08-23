import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactFormsApiSections } from '../react-forms/api';
import {
  OGE_FORMS_CONFIG_API,
  OGE_FORM_API,
  OGE_FORM_GROUP_API,
  OGE_FORM_ITEM_API,
  OGE_FORM_METADATA_API,
  OGE_FORM_SECTIONS_API,
  OGE_FORM_TEMPLATE_API,
  OGE_VALIDATION_SUMMARY_API,
} from './forms-api-data';

const SECTIONS = [
  'OgeForm',
  'OgeFormItem',
  'OgeFormGroup',
  'OgeValidationSummary',
  'Sections',
  'Template slots',
  'Schema metadata',
  'Forms configuration',
] as const;

/** TOC of the React view — must mirror `ReactFormsApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeForm>',
  'OgeFormItem (OgeFormItemDefinition)',
  'OgeFormGroup (OgeFormGroupDefinition)',
  '<OgeValidationSummary>',
  'Sections (OgeFormSectionDefinition)',
  'Template slots (render props)',
  'Forms configuration',
] as const;

@Component({
  selector: 'app-forms-api',
  imports: [ApiReference, DocHeader, PageToc, ReactFormsApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Forms API"
      category="Forms"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&#64;oge-ui/react-forms</code>: the form itself,
          the item and group definitions of the <code>layout</code> array, the
          sections, the render props, the standalone validation summary and the
          configuration provider. The item model, the rule evaluator and every
          default come from <code>&#64;oge-ui/behavior</code> — the same code
          the Angular form runs.
        </p>
      } @else {
        <p>
          Full surface of <code>&#64;oge-ui/forms</code>: the form itself, the
          two renderless configuration children, the standalone validation
          summary, and the application-wide configuration provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-forms-api />
    } @else {
      <app-api-reference
        title="OgeForm"
        selector="oge-form"
        [sections]="formApi"
      />
      <app-api-reference
        title="OgeFormItem"
        selector="oge-form-item"
        [sections]="formItemApi"
      />
      <app-api-reference
        title="OgeFormGroup"
        selector="oge-form-group"
        [sections]="formGroupApi"
      />
      <app-api-reference
        title="OgeValidationSummary"
        selector="oge-validation-summary"
        [sections]="validationSummaryApi"
      />
      <app-api-reference title="Sections" [sections]="sectionsApi" />
      <app-api-reference title="Template slots" [sections]="templateApi" />
      <app-api-reference title="Schema metadata" [sections]="metadataApi" />
      <app-api-reference title="Forms configuration" [sections]="configApi" />
    }
  `,
})
export class FormsApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly formApi = OGE_FORM_API;
  protected readonly formItemApi = OGE_FORM_ITEM_API;
  protected readonly formGroupApi = OGE_FORM_GROUP_API;
  protected readonly validationSummaryApi = OGE_VALIDATION_SUMMARY_API;
  protected readonly sectionsApi = OGE_FORM_SECTIONS_API;
  protected readonly templateApi = OGE_FORM_TEMPLATE_API;
  protected readonly metadataApi = OGE_FORM_METADATA_API;
  protected readonly configApi = OGE_FORMS_CONFIG_API;
}
