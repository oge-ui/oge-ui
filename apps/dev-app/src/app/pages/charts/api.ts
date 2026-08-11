import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  OGE_CHART_API,
  OGE_CHARTS_CONFIG_API,
  OGE_PIE_CHART_API,
} from './charts-api-data';

const SECTIONS = ['OgeChart', 'OgePieChart', 'Configuration'] as const;

@Component({
  selector: 'app-charts-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Charts API"
      category="Charts"
      categoryLink="/components/charts"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/charts</code>. The kernel —
        1-2-5 nice-tick scales, calendar-true time ticks, stacking, bar
        slotting, single-path builders, pie layout, zoom math and the O(log n)
        hit-testing — is pure TypeScript inside the package; live demos are on
        the
        <a
          routerLink="/components/charts"
          class="text-indigo-600 dark:text-indigo-400"
          >overview</a
        >
        page.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgeChart"
      selector="oge-chart"
      [sections]="chartApi"
    />
    <app-api-reference
      title="OgePieChart"
      selector="oge-pie-chart"
      [sections]="pieApi"
    />
    <app-api-reference title="Configuration" [sections]="configApi" />

    <h3>Notes</h3>
    <ul>
      <li>
        Rendering is dependency-free SVG (no D3, no Chart.js, no canvas library)
        and dates are plain local <code>Date</code>s (Intl-only house rule).
        Time ticks are calendar-true: month boundaries land on real month starts
        and DST never shifts a point.
      </li>
      <li>
        No WAI-ARIA APG chart pattern exists. The widget composes:
        <code>role="img"</code> with a generated label, a screen-reader-only
        <code>role="table"</code> carrying the first
        <code>a11yTableLimit</code> rows of data, real legend buttons with
        <code>aria-pressed</code>, and a focusable plot region where
        <strong>arrow keys walk arguments and series</strong> with polite
        live-region announcements — Enter selects, Escape resets the zoom.
      </li>
      <li>
        The performance contract: one <code>&lt;path&gt;</code> per series
        regardless of point count, markers only under
        <code>markerThreshold</code>, binary-search hit-testing and
        rAF-coalesced pointer/resize work — verified by a 50k-point smoke test.
      </li>
    </ul>
  `,
})
export class ChartsApiPage {
  protected readonly sections = SECTIONS;
  protected readonly chartApi = OGE_CHART_API;
  protected readonly pieApi = OGE_PIE_CHART_API;
  protected readonly configApi = OGE_CHARTS_CONFIG_API;
}
