import { demoSource } from '../../shared/demo-source';

export const RANGE_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: {
    '@oge-ui/grid': ['OgeGridCellRange', 'OgeRangeSelectionChangedEvent'],
  },
  dataset: 'employees',
  template: `<!-- click / Shift+click / drag / Shift+Arrow select ranges; Ctrl+C copies TSV,
     Ctrl+V pastes from Excel, drag the corner handle (or Ctrl+D / Ctrl+R) to fill,
     Ctrl+Z / Ctrl+Y undo and redo -->
<oge-grid [data]="employees" keyField="id"
          selectionMode="cell"
          [rangeSelection]="{ copyHeaders: true, pasteAddsRows: true }"
          [editing]="{ mode: 'batch', allowUpdating: true }"
          [(selectedRanges)]="ranges"
          (rangeSelectionChanged)="onRanges($event)">
  <oge-column field="firstName" caption="First name" />
  <oge-column field="department" caption="Department" />
  <oge-column field="salary" caption="Salary" dataType="number" />
  <oge-column field="hireDate" caption="Hired" dataType="date" />
  <oge-column field="id" caption="Id" [editable]="false" />
</oge-grid>
<p>{{ summary() }}</p>`,
  body: `protected readonly ranges = signal<readonly OgeGridCellRange[]>([]);
protected readonly summary = signal('');

protected onRanges(event: OgeRangeSelectionChangedEvent): void {
  this.summary.set(\`\${event.cellCount} cells in \${event.ranges.length} range(s)\`);
}`,
});

export const ASYNC_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@angular/forms': ['AbstractControl', 'ValidationErrors'] },
  dataset: 'employees',
  template: `<oge-grid [data]="employees" keyField="id"
          [editing]="{ mode: 'row', allowUpdating: true }">
  <!-- the editor is aria-busy while the check runs; Save waits for it -->
  <oge-column field="lastName" caption="Last name (unique)"
              [asyncValidators]="[uniqueName]" />
  <oge-column field="hireDate" caption="Hired at" dataType="datetime" />
</oge-grid>`,
  body: `/** Pretends to ask a server whether the name is taken. */
protected readonly uniqueName = (
  control: AbstractControl,
): Promise<ValidationErrors | null> =>
  new Promise((resolve) =>
    setTimeout(
      () => resolve(control.value === 'Taken' ? { taken: true } : null),
      600,
    ),
  );`,
});
