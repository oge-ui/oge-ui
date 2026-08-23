import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiReference } from '../../shared/api-reference';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import { ReactGridApiSections } from '../react-grid/api';
import {
  OGE_COLUMN_API,
  OGE_GRID_API,
  OGE_GRID_TYPES_API,
} from './data-grid-api-data';

const SECTIONS = [
  'OgeGrid',
  'OgeColumn',
  'Grid types & configuration',
] as const;

/** TOC of the React view — must mirror `ReactGridApiSections`' titles. */
const SECTIONS_REACT = [
  '<OgeGrid>',
  'OgeGridColumnProps',
  'Grid types & configuration',
] as const;

@Component({
  selector: 'app-data-grid-api',
  imports: [ApiReference, DocHeader, PageToc, RouterLink, ReactGridApiSections],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Data Grid API"
      category="Data Grid"
      [chips]="['Properties', 'Methods', 'Events', 'Types']"
    >
      @if (fw.isReact()) {
        <p>
          Complete API reference for <code>&#64;oge-ui/react-grid</code> —
          props, callbacks, the <code>ref</code> handle and the supporting types
          of this slice, compiled from the source TSDoc. Feature guides live on
          the
          <a
            routerLink="/components/data-grid"
            class="text-indigo-600 underline dark:text-indigo-400"
            >demo pages</a
          >.
        </p>
      } @else {
        <p>
          Complete API reference for <code>&#64;oge-ui/grid</code> — inputs,
          two-way models, imperative methods, the full event surface and the
          supporting types, compiled from the source TSDoc. Feature guides live
          on the
          <a
            routerLink="/components/data-grid"
            class="text-indigo-600 underline dark:text-indigo-400"
            >demo pages</a
          >.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? sectionsReact : sections" />

    @if (fw.isReact()) {
      <app-react-grid-api />
    } @else {
      <app-api-reference
        title="OgeGrid"
        selector="oge-grid"
        [sections]="gridApi"
      />
      <app-api-reference
        title="OgeColumn"
        selector="oge-column"
        [sections]="columnApi"
      />
      <app-api-reference
        title="Grid types & configuration"
        [sections]="typesApi"
      />
    }

    <h3>Notes</h3>
    <ul>
      <li>
        Methods are reached through a template reference
        (<code>viewChild(OgeGrid)</code>) — there is no
        <code>instance()</code>/<code>option()</code> machinery; state flows
        through signal inputs and two-way models.
      </li>
      <li>
        jQuery-era members (<code>repaint()</code>, <code>beginUpdate()</code>,
        <code>onOptionChanged</code>…) are intentionally absent; the ROADMAP's
        "API parity" section documents every mapping decision.
      </li>
    </ul>
  `,
})
export class DataGridApiPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly sectionsReact = SECTIONS_REACT;
  protected readonly gridApi = OGE_GRID_API;
  protected readonly columnApi = OGE_COLUMN_API;
  protected readonly typesApi = OGE_GRID_TYPES_API;
}
