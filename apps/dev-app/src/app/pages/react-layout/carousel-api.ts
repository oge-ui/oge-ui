import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import {
  OGE_REACT_CAROUSEL_API,
  OGE_REACT_CAROUSEL_CONFIG_API,
} from './carousel-api-data';

/**
 * The React half of the carousel API reference — rendered inside
 * `/components/carousel/api` when the reader has chosen React (ADR 0002).
 * The block order mirrors the Angular page, so the parity gate can diff the
 * two block by block.
 */
@Component({
  selector: 'app-react-layout-carousel-api',
  imports: [ApiReference],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-api-reference title="&lt;OgeCarousel&gt;" [sections]="carouselApi" />
    <app-api-reference title="Configuration" [sections]="configApi" />
  `,
})
export class ReactLayoutCarouselApiSections {
  protected readonly carouselApi = OGE_REACT_CAROUSEL_API;
  protected readonly configApi = OGE_REACT_CAROUSEL_CONFIG_API;
}
