import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import { OGE_PIVOT_FIELD_API, OGE_PIVOT_GRID_API } from './pivot-grid-api-data';

const SECTIONS = ['OgePivotGrid', 'OgePivotField'] as const;

@Component({
  selector: 'app-pivot-grid-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pivot Grid API"
      category="Pivot Grid"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      <p>
        Complete API reference for <code>&#64;oge-ui/pivot</code>. The
        aggregation engine (<code>PivotEngine</code>, field configs, the remote
        <code>OgePivotStore</code> contract) is pure TypeScript in
        <code>&#64;oge-ui/core</code>; live demos are on the
        <a
          routerLink="/components/pivot-grid"
          class="text-indigo-600 dark:text-indigo-400"
          >overview</a
        >
        and analytics pages.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-api-reference
      title="OgePivotGrid"
      selector="oge-pivot-grid"
      [sections]="pivotApi"
    />
    <app-api-reference
      title="OgePivotField"
      selector="oge-pivot-field"
      [sections]="fieldApi"
    />

    <h3>Notes</h3>
    <ul>
      <li>
        The pivot has no two-way models — the field layout flows through
        declarative <code>&lt;oge-pivot-field&gt;</code> directives plus user
        overrides, observable via <code>(fieldLayoutChange)</code> and
        <code>getFieldLayout()</code>.
      </li>
      <li>
        The reference <code>cellPrepared</code> callback maps to the
        <code>customizeCell</code> input; chart binding awaits a charting
        package (see ROADMAP).
      </li>
    </ul>
  `,
})
export class PivotGridApiPage {
  protected readonly sections = SECTIONS;
  protected readonly pivotApi = OGE_PIVOT_GRID_API;
  protected readonly fieldApi = OGE_PIVOT_FIELD_API;
}
