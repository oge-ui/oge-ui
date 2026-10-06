import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactLayoutAlertApiSections } from '../react-layout/alert-api';
import { OGE_ALERT_API, OGE_ALERT_CONFIG_API } from './alert-api-data';

const SECTIONS = ['OgeAlert', 'Configuration'] as const;

/** TOC of the React view — must mirror `ReactLayoutAlertApiSections`' titles. */
const SECTIONS_REACT = ['<OgeAlert>', 'Configuration'] as const;

@Component({
  selector: 'app-layout-alert-api',
  imports: [ApiReference, DocHeader, PageToc, ReactLayoutAlertApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Alert API"
      category="Layout"
      categoryLink="/components/alert"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Full surface of <code>&lt;OgeAlert&gt;</code> from
          <code>&#64;oge-ui/react-layout</code>, its ref handle and the config
          provider.
        </p>
      } @else {
        <p>
          Full surface of <code>oge-alert</code>, its
          <code>[ogeAlertActions]</code> / <code>[ogeAlertIcon]</code> slots and
          the config provider.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-layout-alert-api />
    } @else {
      <app-api-reference
        title="OgeAlert"
        selector="oge-alert"
        [sections]="alertApi"
      />
      <app-api-reference title="Configuration" [sections]="configApi" />
    }
  `,
})
export class LayoutAlertApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly alertApi = OGE_ALERT_API;
  protected readonly configApi = OGE_ALERT_CONFIG_API;
}
