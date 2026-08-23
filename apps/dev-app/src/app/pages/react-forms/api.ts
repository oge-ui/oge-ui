import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_FORMS_CONFIG_API,
  OGE_REACT_FORM_API,
  OGE_REACT_FORM_GROUP_API,
  OGE_REACT_FORM_ITEM_API,
  OGE_REACT_FORM_SECTIONS_API,
  OGE_REACT_FORM_TEMPLATE_API,
  OGE_REACT_VALIDATION_SUMMARY_API,
} from './react-forms-api-data';

/**
 * The React half of the forms API reference.
 *
 * Not a route of its own — it renders inside `/components/forms/api` when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page, so the two views read as one page across the
 * switch and the parity gate can diff them block by block.
 *
 * Two Angular blocks have no counterpart here, both deliberately: the item and
 * group blocks document plain objects rather than child components, and the
 * "Schema metadata" block documents Signal Forms metadata keys — an Angular
 * binding React does not have (recorded in `docs/REACT-PARITY.md` and in the
 * parity gate).
 */
@Component({
  selector: 'app-react-forms-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeForm&gt;" [sections]="formApi" />
    <app-api-reference
      title="OgeFormItem (OgeFormItemDefinition)"
      [sections]="formItemApi"
    />
    <app-api-reference
      title="OgeFormGroup (OgeFormGroupDefinition)"
      [sections]="formGroupApi"
    />
    <app-api-reference
      title="&lt;OgeValidationSummary&gt;"
      [sections]="validationSummaryApi"
    />
    <app-api-reference
      title="Sections (OgeFormSectionDefinition)"
      [sections]="sectionsApi"
    />
    <app-api-reference
      title="Template slots (render props)"
      [sections]="templateApi"
    />
    <app-api-reference title="Forms configuration" [sections]="configApi" />
  `,
})
export class ReactFormsApiSections {
  protected readonly formApi = OGE_REACT_FORM_API;
  protected readonly formItemApi = OGE_REACT_FORM_ITEM_API;
  protected readonly formGroupApi = OGE_REACT_FORM_GROUP_API;
  protected readonly validationSummaryApi = OGE_REACT_VALIDATION_SUMMARY_API;
  protected readonly sectionsApi = OGE_REACT_FORM_SECTIONS_API;
  protected readonly templateApi = OGE_REACT_FORM_TEMPLATE_API;
  protected readonly configApi = OGE_REACT_FORMS_CONFIG_API;
}
