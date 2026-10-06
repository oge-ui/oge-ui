import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutAppBarApiSections } from '../react-layout/app-bar-api';
import { OGE_APP_BAR_API, OGE_APP_BAR_CONFIG_API } from './app-bar-api-data';

const SECTIONS = ['OgeAppBar', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutAppBarApiSections`' titles. */
const SECTIONS_REACT = ['<OgeAppBar>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-app-bar-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutAppBarApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="App Bar API"
      category="Layout"
      categoryLink="/components/app-bar"
      [chips]="['Properties', 'Slots', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeAppBar&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>: its props, the section node
          props that replace the Angular attribute slots, and the config
          provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-app-bar</code>: its inputs, the three
          section attribute slots and the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-app-bar-api />
    } @else {
      <app-api-reference
        title="OgeAppBar"
        selector="oge-app-bar"
        [sections]="appBarApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutAppBarApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly appBarApi = OGE_APP_BAR_API;
  protected readonly configApi = OGE_APP_BAR_CONFIG_API;
}
