import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { OGE_REACT_LOCALE_PROVIDER_API } from './locales-api-data';

/**
 * The React half of the localization API reference — rendered inside
 * `/getting-started/localization/api` when the reader has chosen React. Only the
 * wiring differs per layer; the packs block is framework-free and rendered once
 * by the page itself, outside the framework switch.
 */
@Component({
  selector: 'app-react-locales-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="Locale wiring" [sections]="providerApi" />
  `,
})
export class ReactLocalesApiSections {
  protected readonly providerApi = OGE_REACT_LOCALE_PROVIDER_API;
}
