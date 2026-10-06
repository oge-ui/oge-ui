import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn, OgeGrid } from '@oge-ui/grid';
import type { SsrFamily } from '../render';

const rows = [
  { id: 1, name: 'Ada Lovelace', team: 'Research', salary: 4200 },
  { id: 2, name: 'Grace Hopper', team: 'Compilers', salary: 5100 },
  { id: 3, name: 'Alan Turing', team: 'Research', salary: 4800 },
];

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="rows"
      keyField="id"
      [paging]="{ pageSize: 2 }"
      [filterRow]="true"
    >
      <oge-column field="id" caption="Id" [width]="70" dataType="number" />
      <oge-column field="name" caption="Name" />
      <oge-column field="team" caption="Team" />
      <oge-column field="salary" caption="Salary" dataType="number" />
    </oge-grid>
  `,
})
class GridHost {
  protected readonly rows = rows;
}

export const GRID: SsrFamily = {
  name: 'grid',
  host: GridHost,
  expect: ['oge-grid', 'Ada Lovelace'],
};
