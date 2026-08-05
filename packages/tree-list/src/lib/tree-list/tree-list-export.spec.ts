import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  effort: number;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', effort: 5 },
  { id: 2, parentId: 1, title: 'Child A1', effort: 3 },
  { id: 3, parentId: 2, title: 'Grand A1a', effort: 1 },
  { id: 4, parentId: null, title: 'Root B', effort: 2 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="autoExpandAll"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="effort" caption="Effort" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  autoExpandAll = true;
}

describe('OgeTreeList CSV export', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    const grid = fixture.debugElement.children[0].componentInstance as OgeTreeList<Task>;
    return { fixture, grid };
  }

  it('indents the first column by level', async () => {
    const { grid } = await render();
    const lines = grid.getCsv({ bom: false }).split('\r\n');
    expect(lines[0]).toBe('Title,Effort');
    expect(lines[1]).toBe('Root A,5');
    expect(lines[2]).toBe('  Child A1,3');
    expect(lines[3]).toBe('    Grand A1a,1');
    expect(lines[4]).toBe('Root B,2');
  });

  it('exports only the visible (expanded) rows', async () => {
    const { grid } = await render((host) => (host.autoExpandAll = false));
    const lines = grid.getCsv({ bom: false }).split('\r\n');
    expect(lines.length).toBe(3); // header + two roots
    expect(lines[1]).toBe('Root A,5');
    expect(lines[2]).toBe('Root B,2');
  });
});
