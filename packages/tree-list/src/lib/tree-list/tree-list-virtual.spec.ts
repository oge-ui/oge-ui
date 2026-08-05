import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  title: string;
}

/** 100 roots × 999 children = 100k rows. */
function bigTree(): Node[] {
  const rows: Node[] = [];
  let id = 1;
  for (let root = 0; root < 100; root++) {
    const rootId = id++;
    rows.push({ id: rootId, parentId: null, title: `Root ${root}` });
    for (let child = 0; child < 999; child++) {
      rows.push({
        id: id++,
        parentId: rootId,
        title: `Node ${rootId}-${child}`,
      });
    }
  }
  return rows;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <div style="height: 300px; display: flex">
      <oge-tree-list
        style="flex: 1"
        [data]="data"
        keyExpr="id"
        parentIdExpr="parentId"
        [autoExpandAll]="true"
        [virtualScroll]="true"
        [rowHeight]="30"
      >
        <oge-column field="title" />
      </oge-tree-list>
    </div>
  `,
})
class Host {
  readonly data = bigTree();
}

describe('OgeTreeList virtualization', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const grid = fixture.debugElement.children[0].children[0]
      .componentInstance as OgeTreeList<Node>;
    return { fixture, el, grid };
  }

  it('renders only a window of a 100k-row tree', async () => {
    const { el } = await render();
    const rows = el.querySelectorAll('.oge-row');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(100);
    // spacer height covers the full flattened tree
    const body = el.querySelector('.oge-body') as HTMLElement;
    expect(body.style.height).toBe(`${100_000 * 30}px`);
  });

  it('renders the correct slice at an arbitrary scroll position', async () => {
    const { fixture, el, grid } = await render();
    (
      grid as unknown as { scrollTop: { set(value: number): void } }
    ).scrollTop.set(50_000 * 30);
    await settle(fixture);
    const first = el.querySelector('.oge-row');
    expect(first?.textContent).toContain('Node ');
    const indices = Array.from(el.querySelectorAll('.oge-row')).map((row) =>
      Number(row.getAttribute('data-rowindex')),
    );
    expect(Math.min(...indices)).toBeGreaterThan(49_000);
  });

  it('collapsing all roots shrinks the virtual space to the roots', async () => {
    const { fixture, el, grid } = await render();
    grid.collapseAll();
    await settle(fixture);
    const body = el.querySelector('.oge-body') as HTMLElement;
    expect(body.style.height).toBe(`${100 * 30}px`);
  });
});
