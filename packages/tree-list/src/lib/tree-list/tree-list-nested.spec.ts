import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList, type OgeTreeRowReparentEvent } from './tree-list';

interface NestedTask {
  id: number;
  title: string;
  items?: NestedTask[];
}

interface FlatTask {
  id: number;
  parentId: number | null;
  title: string;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

function rowOf(el: HTMLElement, text: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.textContent ?? '').includes(text),
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      itemsExpr="items"
      [autoExpandAll]="true"
    >
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class NestedHost {
  readonly data: NestedTask[] = [
    {
      id: 1,
      title: 'Root A',
      items: [
        { id: 2, title: 'Child A1', items: [{ id: 3, title: 'Grand A1a' }] },
        { id: 4, title: 'Child A2' },
      ],
    },
    { id: 5, title: 'Root B' },
  ];
}

describe('OgeTreeList nested payloads (itemsExpr)', () => {
  it('renders inline children with correct levels and hierarchy', async () => {
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTitles(el)).toEqual([
      'Root A',
      'Child A1',
      'Grand A1a',
      'Child A2',
      'Root B',
    ]);
    expect(rowOf(el, 'Grand A1a')?.getAttribute('aria-level')).toBe('3');
    expect(rowOf(el, 'Child A2')?.getAttribute('aria-level')).toBe('2');
  });
});

function dragEvent(type: string, clientY = 0): DragEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', {
    value: { setData: () => undefined, effectAllowed: 'move' },
  });
  Object.defineProperty(event, 'clientY', { value: clientY });
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
class OrderHost {
  readonly data: FlatTask[] = [
    { id: 1, parentId: null, title: 'Root A' },
    { id: 2, parentId: 1, title: 'Child A1' },
    { id: 3, parentId: 1, title: 'Child A2' },
    { id: 4, parentId: null, title: 'Root B' },
  ];
  readonly events: OgeTreeRowReparentEvent<FlatTask>[] = [];
}

describe('OgeTreeList sibling ordering (before/after drops)', () => {
  it('dropping in the top quarter orders the row before the target', async () => {
    const fixture = TestBed.createComponent(OrderHost);
    await settle(fixture);
    const host = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);

    rowOf(el, 'Child A2')
      ?.querySelector('.oge-drag-handle')
      ?.dispatchEvent(dragEvent('dragstart'));
    await settle(fixture);
    const target = rowOf(el, 'Child A1');
    // jsdom rects are 0-height → dropPositionOf falls back to 'inside';
    // stub a rect so the top-quarter math is exercised for real
    if (target) {
      target.getBoundingClientRect = () =>
        ({ top: 100, height: 36, bottom: 136 }) as DOMRect;
    }
    target?.dispatchEvent(dragEvent('dragover', 102)); // top quarter
    target?.dispatchEvent(dragEvent('drop', 102));
    await settle(fixture);
    await new Promise((resolve) => setTimeout(resolve));
    await settle(fixture);

    expect(host.events).toHaveLength(1);
    expect(host.events[0]).toMatchObject({
      key: 3,
      toParentKey: 1,
      position: 'before',
    });
    // Child A2 now precedes Child A1 under the same parent
    expect(rowTitles(el)).toEqual(['Root A', 'Child A2', 'Child A1', 'Root B']);
  });
});
