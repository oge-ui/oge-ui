import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { buildExcelWorkbook } from '@oge-ui/behavior/export-excel';
import { OgeColumn } from '../columns/column';
import { OgeColumnGroup } from '../columns/column-group';
import { OgeGrid } from './grid';

interface Sale {
  id: number;
  region: string;
  city: string;
  amount: number;
  note: string;
}

const SALES: Sale[] = [
  { id: 1, region: 'US', city: 'NYC', amount: 300, note: 'a' },
  { id: 2, region: 'EU', city: 'Berlin', amount: 100, note: 'b' },
  { id: 3, region: 'EU', city: 'Paris', amount: 200, note: 'c' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn, OgeColumnGroup],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      selectionMode="multiple"
      [groupBy]="groupBy()"
    >
      <oge-column field="id" dataType="number" [width]="70" pinned="left" />
      <oge-column-group caption="Place">
        <oge-column field="region" />
        <oge-column field="city" />
      </oge-column-group>
      <oge-column
        field="amount"
        dataType="number"
        groupSummary="sum"
        groupSummaryPosition="footer"
        totalSummary="sum"
      />
      <oge-column field="note" [visible]="false" />
    </oge-grid>
  `,
})
class Host {
  readonly data = SALES;
  readonly groupBy = signal<string[]>(['region']);
}

describe('OgeGrid export structure', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeGrid<Sale>;
    return { fixture, grid };
  }

  it('carries layout facts, group lines in group order and totals', async () => {
    const { grid } = await render();
    const data = await grid.getExportData();
    expect(data.columns.map((column) => column.field)).toEqual([
      'id',
      'region',
      'city',
      'amount',
    ]);
    expect(data.columns[0]).toMatchObject({ width: 70, pinned: 'left' });
    expect(data.columns[1].bandCaption).toBe('Place');
    expect(
      data.items?.map((item) =>
        item.kind === 'group' ? item.text : item.kind,
      ),
    ).toEqual([
      'Region: EU (2)',
      'data',
      'data',
      'groupFooter',
      'Region: US (1)',
      'data',
      'groupFooter',
      'total',
    ]);
    const total = data.items?.at(-1);
    expect(total?.kind === 'total' && total.summaries[0]).toMatchObject({
      value: 600,
      text: 'Sum: 600',
    });
  });

  it('honours visibleColumnsOnly, selectedRowsOnly and the flat switches', async () => {
    const { grid, fixture } = await render();
    const all = await grid.getExportData({ visibleColumnsOnly: false });
    expect(all.columns.map((column) => column.field)).toContain('note');
    const flat = await grid.getExportData({ groups: false, summaries: false });
    expect(flat.items).toBeUndefined();
    grid.selectedKeys.set([3]);
    await settle(fixture);
    const selected = await grid.getExportData({ selectedRowsOnly: true });
    expect(selected.rows.map((row) => row.id)).toEqual([3]);
  });

  it('feeds the rich workbook builder end to end', async () => {
    const { grid } = await render();
    const sheet = buildExcelWorkbook(await grid.getExportData(), {
      summaryFormulas: true,
    }).getWorksheet('Data');
    expect(sheet?.getCell('B1').value).toBe('Place');
    expect(sheet?.getCell('A3').value).toBe('Region: EU (2)');
    expect(sheet?.getRow(4).outlineLevel).toBe(1);
    expect(sheet?.views[0]).toMatchObject({ xSplit: 1, ySplit: 2 });
  });
});
