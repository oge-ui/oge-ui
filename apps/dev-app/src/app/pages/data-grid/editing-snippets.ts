import { demoSource } from '../../shared/demo-source';

export const SNIPPET = demoSource({
  use: {
    '@angular/forms': ['ReactiveFormsModule'],
    '@oge-ui/grid': ['OgeColumn', 'OgeEditTemplate', 'OgeGrid'],
  },
  types: { '@oge-ui/grid': ['OgeSavingChangesEvent'] },
  dataset: 'employees',
  before: `interface Employee {
  id: number;
  firstName: string;
  department: string;
}`,
  template: `<oge-grid [data]="employees" keyField="id"
          [editing]="{ mode: 'batch', allowUpdating: true, allowAdding: true, allowDeleting: true }"
          (savingChanges)="onSaving($event)">
  <oge-column field="id" [editable]="false" />
  <oge-column field="firstName" [required]="true" />
  <oge-column field="department">
    <!-- custom editor gets the reactive FormControl -->
    <select *ogeEditTemplate="let control" [formControl]="control">
      <option>Engineering</option><option>Sales</option>
    </select>
  </oge-column>
</oge-grid>`,
  body: `protected onSaving(event: OgeSavingChangesEvent<Employee>): void {
  // event.changes = [{ type: 'update' | 'insert' | 'remove', key, data }]
  // set event.cancel = true to abort; otherwise the DataSource
  // (insert/update/remove) is called and the grid reloads.
  console.log(event.changes);
}`,
});

export const LOOKUP_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  types: { '@oge-ui/grid': ['OgeCommandButton'] },
  before: `interface Assignment {
  id: number;
  countryId: number;
  cityId: number;
  done: boolean;
}

const CITIES = [
  { id: 1, countryId: 1, name: 'Hamburg' },
  { id: 2, countryId: 1, name: 'Berlin' },
  { id: 3, countryId: 2, name: 'İzmir' },
];`,
  template: `<oge-grid [data]="assignments" keyField="id"
          [editing]="{ mode: 'row', allowUpdating: true, allowDeleting: true }"
          [commandButtons]="commandButtons">
  <oge-column field="countryId" caption="Country"
              [lookup]="{ dataSource: countries, valueExpr: 'id', displayExpr: 'name' }" />
  <!-- cascading: the city list depends on the row's (draft) country -->
  <oge-column field="cityId" caption="City"
              [lookup]="{ dataSource: citiesOf, valueExpr: 'id', displayExpr: 'name' }" />
</oge-grid>`,
  body: `protected readonly assignments: Assignment[] = [
  { id: 1, countryId: 1, cityId: 1, done: false },
  { id: 2, countryId: 2, cityId: 3, done: true },
];

protected readonly countries = [
  { id: 1, name: 'Germany' },
  { id: 2, name: 'Türkiye' },
];

protected readonly citiesOf = (row: Assignment) =>
  CITIES.filter((c) => c.countryId === row.countryId);

protected readonly commandButtons: OgeCommandButton<Assignment>[] = [
  { name: 'edit' },
  { name: 'delete' },
  {
    text: 'Archive',
    visible: (row) => !row.done,
    onClick: (row) => this.archive(row),
  },
];

private archive(row: Assignment): void {
  console.log('archive', row.id);
}`,
});
