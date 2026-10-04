import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import {
  OgeColumn,
  OgeGrid,
  type OgeCellPreparedEvent,
  type OgeConditionalFormat,
  type OgeGridColumnInfo,
} from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { makeEmployees, type Employee } from '../../shared/demo-data';
import { ReactGridConditionalFormattingDemos } from '../react-grid/conditional-formatting';
import {
  FORMATS_SNIPPET,
  SPANS_SNIPPET,
} from './conditional-formatting-snippets';

@Component({
  selector: 'app-conditional-formatting',
  imports: [
    OgeGrid,
    OgeColumn,
    DemoCard,
    DocHeader,
    ReactGridConditionalFormattingDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styles: `
    .demo-formats .is-engineering .oge-cell:first-of-type {
      box-shadow: inset 3px 0 0 var(--oge-accent);
    }
    .demo-formats .is-top-earner {
      font-style: italic;
    }
  `,
  template: `
    <app-doc-header
      title="Conditional Formatting"
      category="Data Grid"
      [chips]="[
        'rowClass',
        'cellClass',
        'conditionalFormats',
        'cellPrepared',
        'mergeCells',
        'cellSpan',
      ]"
    >
      <p>
        Style rows and cells from your data without templates: class hooks,
        declarative formatting rules, data bars, colour scales and icon sets.
        Every visual is a design-token class or a CSS custom property, so
        themes, dark mode and Windows High Contrast keep working.
      </p>
    </app-doc-header>

    @if (fw.isReact()) {
      <app-react-grid-conditional-formatting-demos />
    } @else {
      <h3>Class hooks & formatting rules</h3>
      <p>
        <code>rowClass</code> / <code>cellClass</code> return a string, an array
        or a <code>{{ '{' }} class: condition {{ '}' }}</code> record. A
        column's <code>conditionalFormats</code> mixes rules (<code>when</code>
        as a predicate or an
        <code>{{ '{' }} operator, value {{ '}' }}</code> condition, painted with
        a token <code>tone</code> / <code>background</code>) with a data bar and
        an icon set relative to the rendered rows.
        <code>cellPrepared</code> hands over the element for anything else.
      </p>
      <app-demo-card
        [chips]="['tokens only', 'forced colors']"
        [code]="formatsSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-formats"
          [data]="employees"
          keyField="id"
          [rowClass]="rowClass"
          [cellClass]="cellClass"
          (cellPrepared)="onCellPrepared($event)"
          style="height: 360px"
        >
          <oge-column field="firstName" caption="Name" />
          <oge-column field="department" caption="Department" />
          <oge-column
            field="salary"
            caption="Salary"
            dataType="number"
            [conditionalFormats]="salaryFormats"
          />
          <oge-column
            field="id"
            caption="Score"
            dataType="number"
            [width]="120"
            [conditionalFormats]="scoreFormats"
          />
        </oge-grid>
      </app-demo-card>

      <h3>Merged cells, spans, auto-fit & hints</h3>
      <p>
        <code>mergeCells</code> merges equal adjacent values into one cell with
        <code>aria-rowspan</code>; <code>cellSpan</code> returns
        <code>{{ '{' }} rowSpan, colSpan {{ '}' }}</code> per cell. The arrow
        keys step over a merged area. <code>columnAutoWidth</code> sizes the
        columns to their content (double-click a resize handle, or use the
        header menu's <em>Size to fit</em>, for one column), and
        <code>cellHintEnabled</code> shows truncated text in a tooltip on hover
        and on keyboard focus.
      </p>
      <app-demo-card
        [chips]="['aria-rowspan', 'cellHintEnabled', 'auto-fit']"
        [code]="spansSnippet"
        language="ts"
      >
        <oge-grid
          class="demo-spans"
          [data]="sortedEmployees"
          keyField="id"
          [cellSpan]="cellSpan"
          [cellHintEnabled]="true"
        >
          <oge-column
            field="department"
            caption="Department"
            [mergeCells]="true"
          />
          <oge-column field="city" caption="City" [width]="64" />
          <oge-column field="firstName" caption="First name" [width]="90" />
          <oge-column field="lastName" caption="Last name" />
        </oge-grid>
      </app-demo-card>

      <h3>Notes</h3>
      <ul>
        <li>
          Data bars and colour scales are relative to the column's numeric range
          over the rendered rows unless <code>min</code> / <code>max</code> are
          given; icon sets split that range in thirds unless
          <code>thresholds</code> are given.
        </li>
        <li>
          Spans never cross group rows and are not applied while the grid is
          virtualized; row spans assume uniform row heights.
        </li>
      </ul>
    }
  `,
})
export class ConditionalFormattingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly formatsSnippet = FORMATS_SNIPPET;
  protected readonly spansSnippet = SPANS_SNIPPET;
  protected readonly employees = makeEmployees(40, 11);
  protected readonly sortedEmployees = makeEmployees(14, 5).sort((a, b) =>
    a.department.localeCompare(b.department),
  );

  protected readonly rowClass = (row: Employee) => ({
    'is-engineering': row.department === 'Engineering',
  });

  protected readonly cellClass = (row: Employee, column: OgeGridColumnInfo) =>
    column.field === 'firstName' && row.salary > 100000
      ? 'is-top-earner'
      : null;

  protected readonly salaryFormats: OgeConditionalFormat<Employee>[] = [
    {
      when: { operator: 'ge', value: 100000 },
      style: { tone: 'success', bold: true },
    },
    {
      when: (value) => (value as number) < 45000,
      style: { background: 'danger' },
    },
    { type: 'dataBar' },
  ];

  protected readonly scoreFormats: OgeConditionalFormat<Employee>[] = [
    { type: 'colorScale' },
    { type: 'iconSet', icons: 'arrows' },
  ];

  protected readonly cellSpan = (row: Employee, column: OgeGridColumnInfo) =>
    column.field === 'firstName' && row.id === this.sortedEmployees[0].id
      ? { colSpan: 2 }
      : null;

  protected onCellPrepared(event: OgeCellPreparedEvent<Employee>): void {
    if (event.field === 'salary') event.element.title = String(event.value);
  }
}
