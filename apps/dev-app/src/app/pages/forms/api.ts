import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
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

@Component({
  selector: 'app-forms-api',
  imports: [ApiReference, DocHeader, PageToc],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Forms API"
      category="Forms"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Full surface of <code>&#64;oge-ui/forms</code>: the form itself, the two
        renderless configuration children, the standalone validation summary,
        and the application-wide configuration provider.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

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
  `,
})
export class FormsApiPage {
  protected readonly sections = SECTIONS;
  protected readonly formApi = OGE_FORM_API;
  protected readonly formItemApi = OGE_FORM_ITEM_API;
  protected readonly formGroupApi = OGE_FORM_GROUP_API;
  protected readonly validationSummaryApi = OGE_VALIDATION_SUMMARY_API;
  protected readonly sectionsApi = OGE_FORM_SECTIONS_API;
  protected readonly templateApi = OGE_FORM_TEMPLATE_API;
  protected readonly metadataApi = OGE_FORM_METADATA_API;
  protected readonly configApi = OGE_FORMS_CONFIG_API;
}
