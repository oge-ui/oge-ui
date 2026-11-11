import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeTreeView } from './tree-view';
import type {
  OgeTreeDragOverEvent,
  OgeTreeDragStartingEvent,
  OgeTreeReorderedEvent,
} from './tree-view-types';
import { FLAT, settle, type Node } from './tree-view-test-host';

function stubRects(rows: HTMLElement[]): void {
  rows.forEach((row, index) => {
    row.getBoundingClientRect = () =>
      ({
        top: index * 20,
        bottom: index * 20 + 20,
        left: 0,
        right: 200,
        width: 200,
        height: 20,
        x: 0,
        y: index * 20,
        toJSON: () => ({}),
      }) as DOMRect;
  });
}

function pointer(target: Element, type: string, clientY: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 10,
    clientY,
    button: 0,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeView],
  template: `
    <oge-tree-view
      [items]="items"
      displayExpr="name"
      [rootValue]="null"
      [allowDragging]="true"
      [allowDropBetween]="false"
      [expandedKeys]="[1]"
      (itemDragStarting)="onStarting($event)"
      (itemDragOver)="onOver($event)"
      (itemReordered)="reordered.push($event)"
    />
  `,
})
class RulesHost {
  readonly items = FLAT;
  readonly tree = viewChild.required(OgeTreeView<Node>);
  readonly starting: OgeTreeDragStartingEvent<Node>[] = [];
  readonly over: OgeTreeDragOverEvent<Node>[] = [];
  readonly reordered: OgeTreeReorderedEvent<Node>[] = [];
  onStarting(event: OgeTreeDragStartingEvent<Node>): void {
    this.starting.push({ ...event });
    if (event.item.name === 'Photos') event.cancel = true; // locked
  }
  onOver(event: OgeTreeDragOverEvent<Node>): void {
    this.over.push({ ...event });
    if (event.dropItem.name === 'Photos') event.cancel = true; // no drops here
  }
}

async function render() {
  const fixture = TestBed.createComponent(RulesHost);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const rows = () =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.oge-tree-view-item',
      ),
    );
  stubRects(rows());
  return { fixture, host: fixture.componentInstance, rows };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeTreeView drag rules', () => {
  // rows: Documents (1), Reports (2), Photos (4)
  it('itemDragStarting keeps a locked node in place', async () => {
    const { fixture, host, rows } = await render();
    pointer(rows()[2], 'pointerdown', 50);
    pointer(rows()[0], 'pointermove', 10);
    await settle(fixture);
    expect(rows()[2].classList).not.toContain('oge-tree-view-item-dragging');
    pointer(rows()[0], 'pointerup', 10);
    expect(host.starting[0]).toMatchObject({ key: 4, trigger: 'pointer' });
    expect(host.reordered).toEqual([]);
    expect(host.tree().cutItem(4)).toBe(false);
    expect(host.starting.at(-1)).toMatchObject({ key: 4, trigger: 'keyboard' });
  });

  it('itemDragOver refuses a spot; allowDropBetween false drops inside only', async () => {
    const { fixture, host, rows } = await render();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[2], 'pointermove', 41); // Photos: refused
    await settle(fixture);
    expect(rows()[2].className).not.toContain('drop-');
    pointer(rows()[0], 'pointermove', 1); // Documents' top edge
    await settle(fixture);
    expect(rows()[0].classList).toContain('oge-tree-view-item-drop-inside');
    pointer(rows()[0], 'pointerup', 1);
    await settle(fixture);
    expect(host.over.map((e) => [e.dropKey, e.position])).toEqual([
      [4, 'inside'],
      [1, 'inside'],
    ]);
    expect(host.reordered).toHaveLength(1);
    expect(host.reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 1,
      position: 'inside',
    });
    // the keyboard twin cannot drop between either
    expect(host.tree().cutItem(2)).toBe(true);
    expect(host.tree().pasteItem(4, 'after')).toBe(false);
  });
});
