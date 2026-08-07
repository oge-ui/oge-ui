import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { makeEmployees } from '../../shared/demo-data';

const SNIPPET = `<!-- give the grid a bounded height and switch virtualScroll on -->
<oge-grid [data]="employees" keyField="id"
          [virtualScroll]="true" [rowHeight]="36" [overscan]="6"
          class="h-[560px]">
  <oge-column field="id" caption="Id" [width]="90" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`;

const COLUMN_SNIPPET = `<!-- 200 columns: only the ones near the horizontal viewport are rendered -->
<oge-grid [data]="wideRows" keyField="c0"
          [columns]="wideColumns"
          [scrolling]="{ mode: 'virtual', columnRenderingMode: 'virtual' }"
          class="h-[420px]">
</oge-grid>`;

const AUTO_HEIGHT_SNIPPET = `<!-- rows size to their content; measured heights feed the virtualizer -->
<oge-grid [data]="notes" keyField="id"
          [virtualScroll]="true" [autoRowHeight]="true" [wordWrap]="true"
          class="h-[420px]">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" />
  <oge-column field="title" caption="Title" [width]="180" />
  <oge-column field="body" caption="Body" />
</oge-grid>`;

@Component({
  selector: 'app-virtual-scroll',
  imports: [OgeGrid, OgeColumn, DemoCard, DocHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Virtual Scroll"
      [chips]="['virtualScroll', 'rowHeight', 'overscan']"
    >
      <p>
        {{ employees.length.toLocaleString() }} rows in one scrollable list —
        only the visible window is rendered into the DOM. Open DevTools and
        watch the element count while scrolling.
      </p>
    </app-doc-header>

    <app-demo-card [chips]="['100.000 rows']" [code]="snippet">
      <oge-grid
        [data]="employees"
        keyField="id"
        [virtualScroll]="true"
        style="height: 560px"
      >
        <oge-column field="id" caption="Id" [width]="90" dataType="number" />
        <oge-column field="firstName" caption="First Name" />
        <oge-column field="lastName" caption="Last Name" />
        <oge-column field="department" caption="Department" />
        <oge-column field="city" caption="City" />
        <oge-column field="salary" caption="Salary" dataType="number" />
      </oge-grid>
    </app-demo-card>

    <h3>How it works</h3>
    <ul>
      <li>
        Row offsets live in a <strong>Fenwick (binary-indexed) tree</strong>:
        finding the row at any scroll position and the total height are both
        O(log n) — scrolling cost does not grow with list size.
      </li>
      <li>
        Only the visible rows plus an <code>overscan</code> buffer (default 6)
        exist in the DOM; a spacer element keeps the scrollbar honest.
      </li>
      <li>
        Group and master-detail rows participate with their own heights
        (<code>detailRowHeight</code>).
      </li>
      <li>
        Keyboard navigation scrolls the focused row into view automatically,
        even across 100k rows.
      </li>
    </ul>

    <h3>Column virtualization</h3>
    <p>
      Wide grids get the same treatment horizontally:
      <code>columnRenderingMode: 'virtual'</code> renders only the columns near
      the horizontal viewport and stands spacer tracks in for the rest. Scroll
      sideways below — the DOM holds a couple dozen of the 200 columns at any
      time.
    </p>

    <app-demo-card
      [chips]="['200 columns', '1.000 rows']"
      [code]="columnSnippet"
    >
      <oge-grid
        [data]="wideRows"
        keyField="c0"
        [columns]="wideColumns"
        [scrolling]="{ mode: 'virtual', columnRenderingMode: 'virtual' }"
        style="height: 420px"
      />
    </app-demo-card>

    <h3>Variable row heights</h3>
    <p>
      With <code>autoRowHeight</code> the virtualizer stops assuming a fixed row
      height: rendered rows are measured, measurements feed the offset tree, and
      corrections above the viewport are compensated on
      <code>scrollTop</code> in the same frame — no visible jump while scrolling
      through wrapped content.
    </p>

    <app-demo-card
      [chips]="['5.000 rows', 'autoRowHeight', 'wordWrap']"
      [code]="autoHeightSnippet"
    >
      <oge-grid
        [data]="notes"
        keyField="id"
        [virtualScroll]="true"
        [autoRowHeight]="true"
        [wordWrap]="true"
        style="height: 420px"
      >
        <oge-column field="id" caption="Id" [width]="70" dataType="number" />
        <oge-column field="title" caption="Title" [width]="180" />
        <oge-column field="body" caption="Body" />
      </oge-grid>
    </app-demo-card>
  `,
})
export class VirtualScrollPage {
  protected readonly employees = makeEmployees(100_000);
  protected readonly snippet = SNIPPET;
  protected readonly columnSnippet = COLUMN_SNIPPET;

  protected readonly wideColumns = Array.from(
    { length: 200 },
    (_, i) => `c${i}`,
  );
  protected readonly wideRows = Array.from({ length: 1_000 }, (_, r) =>
    Object.fromEntries(
      this.wideColumns.map((field, i) => [field, `R${r + 1} · C${i}`]),
    ),
  ) as Record<string, string>[];

  protected readonly autoHeightSnippet = AUTO_HEIGHT_SNIPPET;
  protected readonly notes = Array.from({ length: 5_000 }, (_, i) => ({
    id: i + 1,
    title: `Note ${i + 1}`,
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(
      1 + ((i * 7) % 5),
    ),
  }));
}
