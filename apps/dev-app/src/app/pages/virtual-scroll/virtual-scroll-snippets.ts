import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  dataset: 'employees',
  template: `<!-- give the grid a bounded height and switch virtualScroll on -->
<oge-grid [data]="employees" keyField="id"
          [virtualScroll]="true" [rowHeight]="36" [overscan]="6"
          class="h-[560px]">
  <oge-column field="id" caption="Id" [width]="90" dataType="number" />
  <oge-column field="firstName" caption="First Name" />
  <oge-column field="salary" caption="Salary" dataType="number" />
</oge-grid>`,
});

export const COLUMN_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeColumnDef'] },
  template: `<!-- 200 columns: only the ones near the horizontal viewport are rendered -->
<oge-grid [data]="wideRows" keyField="c0"
          [columns]="wideColumns"
          [scrolling]="{ mode: 'virtual', columnRenderingMode: 'virtual' }"
          class="h-[420px]">
</oge-grid>`,
  body: `protected readonly wideColumns: OgeColumnDef[] = Array.from(
  { length: 200 },
  (_, i) => ({ field: \`c\${i}\`, caption: \`Column \${i}\`, width: 120 }),
);

protected readonly wideRows = Array.from({ length: 500 }, (_, row) =>
  Object.fromEntries(
    this.wideColumns.map((column, i) => [column.field, row * 200 + i]),
  ),
);`,
});

export const AUTO_HEIGHT_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  template: `<!-- rows size to their content; measured heights feed the virtualizer -->
<oge-grid [data]="notes" keyField="id"
          [virtualScroll]="true" [autoRowHeight]="true" [wordWrap]="true"
          class="h-[420px]">
  <oge-column field="id" caption="Id" [width]="70" dataType="number" />
  <oge-column field="title" caption="Title" [width]="180" />
  <oge-column field="body" caption="Body" />
</oge-grid>`,
  body: `protected readonly notes = [
  { id: 1, title: 'Kickoff', body: 'Short note.' },
  { id: 2, title: 'Retro', body: 'A much longer note that wraps over several lines and makes the row taller than its neighbours.' },
];`,
});
