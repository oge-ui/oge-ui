import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLocalesApiSections } from './react-api';
import {
  OGE_LOCALE_PACKS_API,
  OGE_LOCALE_PROVIDER_API,
} from './locales-api-data';

const SECTIONS = ['Locale wiring', 'Locale packs'] as const;

/** API reference of `@oge-ui/locales` and the umbrellas' one-call wiring. */
@Component({
  selector: 'app-locales-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLocalesApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Localization API"
      category="Getting Started"
      categoryLink="/getting-started/localization"
      [chips]="['@oge-ui/locales', 'OgeLocalePack', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Ready-made translations: the
          <code>&lt;OgeLocaleProvider&gt;</code> from
          <code>&#64;oge-ui/react</code> and the framework-free
          <code>&#64;oge-ui/locales</code> packs it applies.
        </p>
      } @else {
        <p>
          Ready-made translations: <code>provideOgeLocale()</code> from
          <code>oge-ui</code> and the framework-free
          <code>&#64;oge-ui/locales</code> packs it applies.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    @if (fw.isReact()) {
      <app-react-locales-api />
    } @else {
      <app-api-reference title="Locale wiring" [sections]="providerApi" />
    }
    <!-- framework-free: the same packs in both layers -->
    <app-api-reference title="Locale packs" [sections]="packsApi" />
  `,
})
export class LocalesApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly providerApi = OGE_LOCALE_PROVIDER_API;
  protected readonly packsApi = OGE_LOCALE_PACKS_API;
}
