import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList, type OgeTreeRowReparentEvent } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'Child A1' },
  { id: 3, parentId: null, title: 'Root B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowOf(el: HTMLElement, title: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.textContent ?? '').includes(title),
  );
}

function dragEvent(type: string): DragEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { setData: () => undefined, effectAllowed: 'move' },
  });
  return event;
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [rowDragging]="true"
      (rowReparented)="events.push($event)"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  readonly events: OgeTreeRowReparentEvent<Task>[] = [];
}

describe('OgeTreeList drag reparenting', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  async function drag(
    fixture: ComponentFixture<unknown>,
    el: HTMLElement,
    from: string,
    to: string,
  ): Promise<void> {
    rowOf(el, from)
      ?.querySelector('.oge-drag-handle')
      ?.dispatchEvent(dragEvent('dragstart'));
    await settle(fixture);
    const target = rowOf(el, to);
    target?.dispatchEvent(dragEvent('dragover'));
    target?.dispatchEvent(dragEvent('drop'));
    // the in-place mutation triggers an async reload before the tree re-renders
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);
  }

  it('dropping a row onto another makes it a child and mutates the array', async () => {
    const { fixture, host, el } = await render();
    await drag(fixture, el, 'Root B', 'Child A1');
    expect(host.events).toEqual([
      {
        key: 3,
        row: host.data[2],
        fromParentKey: null,
        toParentKey: 2,
        position: 'inside',
      },
    ]);
    expect(host.data[2].parentId).toBe(2);
    const rootB = rowOf(el, 'Root B');
    expect(rootB?.getAttribute('aria-level')).toBe('3');
  });

  it('refuses to drop a row into its own subtree', async () => {
    const { fixture, host, el } = await render();
    await drag(fixture, el, 'Root A', 'Child A1');
    expect(host.events).toEqual([]);
    expect(host.data[0].parentId).toBeNull();
  });
});
