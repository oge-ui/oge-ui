import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactPivotApiSections } from '../react-pivot/api';
import { OGE_PIVOT_FIELD_API, OGE_PIVOT_GRID_API } from './pivot-grid-api-data';

const SECTIONS = ['OgePivotGrid', 'OgePivotField'] as const;

/** TOC of the React view — must mirror `ReactPivotApiSections`' titles. */
const SECTIONS_REACT = ['<OgePivotGrid>', 'OgePivotFieldDef'] as const;

@Component({
  selector: 'app-pivot-grid-api',
  imports: [
    ApiReference,
    DocHeader,
    PageToc,
    RouterLink,
    ReactPivotApiSections,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Pivot Grid API"
      category="Pivot Grid"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-pivot</code> —
          props, callbacks, the <code>ref</code> handle and the field objects.
          The aggregation engine (<code>PivotEngine</code>, field configs, the
          remote <code>OgePivotStore</code> contract) is pure TypeScript in
          <code>&#64;oge-ui/core</code>, and the pivot machine both layers run
          lives in <code>&#64;oge-ui/pivot-engine</code>; live demos are on the
          <a
            routerLink="/components/pivot-grid"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          and analytics pages.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/pivot</code>. The
          aggregation engine (<code>PivotEngine</code>, field configs, the
          remote <code>OgePivotStore</code> contract) is pure TypeScript in
          <code>&#64;oge-ui/core</code>; live demos are on the
          <a
            routerLink="/components/pivot-grid"
            class="text-indigo-600 underline dark:text-indigo-400"
            >overview</a
          >
          and analytics pages.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-pivot-api />
    } @else {
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
    }

    <h3>Notes</h3>
    <ul>
      @if (fw.isReact()) {
        <li>
          The pivot has no controlled props for its layout — the field layout
          flows from the <code>fields</code> array plus user overrides,
          observable via <code>onFieldLayoutChange</code> and
          <code>getFieldLayout()</code> on the handle.
        </li>
      } @else {
        <li>
          The pivot has no two-way models — the field layout flows through
          declarative <code>&lt;oge-pivot-field&gt;</code> directives (or the
          <code>[fields]</code> data twin) plus user overrides, observable via
          <code>(fieldLayoutChange)</code> and <code>getFieldLayout()</code>.
        </li>
      }
      <li>
        The reference <code>cellPrepared</code> callback maps to the
        <code>customizeCell</code> input; chart binding awaits a charting
        package (see ROADMAP).
      </li>
    </ul>
  `,
})
export class PivotGridApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly pivotApi = OGE_PIVOT_GRID_API;
  protected readonly fieldApi = OGE_PIVOT_FIELD_API;
}
