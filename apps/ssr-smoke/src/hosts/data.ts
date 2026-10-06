import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeColumn } from '@oge-ui/grid';
import { OgePivotField, OgePivotGrid } from '@oge-ui/pivot';
import { OgeTreeList } from '@oge-ui/tree-list';
import type { SsrFamily } from '../render';

// Fixed dates and explicit locales: the machine and CI locales differ.
const org = [
  { id: 1, parentId: null, name: 'Ada Lovelace', title: 'CEO', headcount: 3 },
  { id: 2, parentId: 1, name: 'Grace Hopper', title: 'CTO', headcount: 2 },
  { id: 3, parentId: 2, name: 'Alan Turing', title: 'Engineer', headcount: 0 },
];

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="org"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
    >
      <oge-column field="name" caption="Name" />
      <oge-column field="title" caption="Title" [width]="140" />
      <oge-column field="headcount" caption="Reports" dataType="number" />
    </oge-tree-list>
  `,
})
class TreeListHost {
  protected readonly org = org;
}

export const TREE_LIST: SsrFamily = {
  name: 'tree-list',
  host: TreeListHost,
  expect: ['oge-tree-list', 'Alan Turing'],
};

const sales = [
  { region: 'EMEA', country: 'Germany', date: '2026-02-11', amount: 1249 },
  { region: 'EMEA', country: 'France', date: '2026-05-02', amount: 890 },
  { region: 'APAC', country: 'Japan', date: '2025-11-19', amount: 2140 },
];

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgePivotGrid, OgePivotField],
  template: `
    <oge-pivot-grid [data]="sales">
      <oge-pivot-field dataField="region" area="row" />
      <oge-pivot-field dataField="country" area="row" />
      <oge-pivot-field dataField="date" area="column" groupInterval="year" />
      <oge-pivot-field dataField="amount" area="data" summaryType="sum" />
    </oge-pivot-grid>
  `,
})
class PivotHost {
  protected readonly sales = sales;
}

export const PIVOT: SsrFamily = {
  name: 'pivot',
  host: PivotHost,
  expect: ['oge-pivot-grid', 'EMEA'],
};
