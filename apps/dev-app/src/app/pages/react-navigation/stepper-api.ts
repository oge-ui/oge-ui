import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_STEPPER_API,
  OGE_REACT_STEPPER_CONFIG_API,
} from './stepper-api-data';

/**
 * The React half of the stepper API reference.
 *
 * Not a route of its own — it renders inside the navigation API page when the
 * reader has chosen React (ADR 0002), through the same `<app-api-reference>`
 * and the same `ApiSections` shape as the Angular tables. The block order
 * mirrors the Angular page exactly, so the two views read as one page across
 * the switch and the parity gate can diff them block by block.
 */
@Component({
  selector: 'app-react-navigation-stepper-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeStepper&gt;" [sections]="stepperApi" />
    <app-api-reference
      title="Stepper configuration"
      [sections]="stepperConfigApi"
    />
  `,
})
export class ReactNavigationStepperApiSections {
  protected readonly stepperApi = OGE_REACT_STEPPER_API;
  protected readonly stepperConfigApi = OGE_REACT_STEPPER_CONFIG_API;
}
