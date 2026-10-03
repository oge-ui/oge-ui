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

/** Pointer events as jsdom builds them; the move's target is the hit. */
function pointer(
  type: string,
  target: EventTarget | null | undefined,
  y = 0,
  pointerType = 'mouse',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 5,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target?.dispatchEvent(event);
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
    pointerType = 'mouse',
  ): Promise<void> {
    pointer(
      'pointerdown',
      rowOf(el, from)?.querySelector('.oge-drag-handle'),
      100,
      pointerType,
    );
    await settle(fixture);
    const target = rowOf(el, to);
    pointer('pointermove', target, 10, pointerType);
    pointer('pointerup', target, 10, pointerType);
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

  it('a touch on the handle drags at once', async () => {
    const { fixture, host, el } = await render();
    await drag(fixture, el, 'Root B', 'Child A1', 'touch');
    expect(host.data[2].parentId).toBe(2);
    expect(host.events).toHaveLength(1);
  });

  it('shows the inside indicator while hovering and Escape cancels', async () => {
    const { fixture, host, el } = await render();
    pointer(
      'pointerdown',
      rowOf(el, 'Root B')?.querySelector('.oge-drag-handle'),
      100,
    );
    pointer('pointermove', rowOf(el, 'Child A1'), 10);
    fixture.detectChanges();
    expect(rowOf(el, 'Child A1')?.classList).toContain('oge-drop-target');
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    pointer('pointerup', rowOf(el, 'Child A1'), 10);
    await settle(fixture);
    expect(host.events).toEqual([]);
    expect(el.querySelector('.oge-drop-target')).toBeNull();
  });
});
