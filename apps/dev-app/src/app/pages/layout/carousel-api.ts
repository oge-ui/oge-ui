import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutCarouselApiSections } from '../react-layout/carousel-api';
import { OGE_CAROUSEL_API, OGE_CAROUSEL_CONFIG_API } from './carousel-api-data';

const SECTIONS = ['OgeCarousel', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutCarouselApiSections`' titles. */
const SECTIONS_REACT = ['<OgeCarousel>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-carousel-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutCarouselApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Carousel API"
      category="Layout"
      categoryLink="/components/carousel"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeCarousel&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the ref handle, the
          callbacks, the declarative <code>&lt;OgeCarouselSlide&gt;</code>, the
          render prop and the config provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-carousel</code>: its inputs, methods and
          outputs, the declarative <code>oge-carousel-slide</code>, the slide
          template and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-carousel-api />
    } @else {
      <app-api-reference
        title="OgeCarousel"
        selector="oge-carousel"
        [sections]="carouselApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutCarouselApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly carouselApi = OGE_CAROUSEL_API;
  protected readonly configApi = OGE_CAROUSEL_CONFIG_API;
}
