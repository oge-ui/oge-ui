import { act, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import type {
  OgeTreeDragOverEvent,
  OgeTreeDragStartingEvent,
  OgeTreeReorderedEvent,
} from '@oge-ui/behavior';
import { OgeTreeView, type OgeTreeViewHandle } from './tree-view';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}
const FLAT: Node[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: null, name: 'Photos' },
];

const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-tree-view-item'));

function stubRects(): void {
  rows().forEach((row, index) => {
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
  fireEvent(target, event);
}

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

function setup() {
  const ref = createRef<OgeTreeViewHandle>();
  const starting: OgeTreeDragStartingEvent<Node>[] = [];
  const over: OgeTreeDragOverEvent<Node>[] = [];
  const reordered: OgeTreeReorderedEvent<Node>[] = [];
  render(
    <OgeTreeView<Node>
      ref={ref}
      items={FLAT}
      displayExpr="name"
      rootValue={null}
      allowDragging
      allowDropBetween={false}
      defaultExpandedKeys={[1]}
      onItemDragStarting={(event) => {
        starting.push({ ...event });
        if (event.item.name === 'Photos') event.cancel = true;
      }}
      onItemDragOver={(event) => {
        over.push({ ...event });
        if (event.dropItem.name === 'Photos') event.cancel = true;
      }}
      onItemReordered={(event) => reordered.push(event)}
    />,
  );
  stubRects();
  return { ref, starting, over, reordered };
}

describe('<OgeTreeView> drag rules', () => {
  // rows: Documents (1), Reports (2), Photos (4)
  it('onItemDragStarting keeps a locked node in place', async () => {
    const { ref, starting, reordered } = setup();
    pointer(rows()[2], 'pointerdown', 50);
    pointer(rows()[0], 'pointermove', 10);
    pointer(rows()[0], 'pointerup', 10);
    await flush();
    expect(starting[0]).toMatchObject({ key: 4, trigger: 'pointer' });
    expect(reordered).toEqual([]);
    expect(ref.current?.cutItem(4)).toBe(false);
  });

  it('onItemDragOver refuses a spot; allowDropBetween false drops inside only', async () => {
    const { ref, over, reordered } = setup();
    pointer(rows()[1], 'pointerdown', 30);
    pointer(rows()[2], 'pointermove', 41);
    await flush();
    expect(rows()[2].className).not.toContain('drop-');
    pointer(rows()[0], 'pointermove', 1);
    await flush();
    expect(rows()[0].classList).toContain('oge-tree-view-item-drop-inside');
    pointer(rows()[0], 'pointerup', 1);
    await flush();
    expect(over.map((e) => [e.dropKey, e.position])).toEqual([
      [4, 'inside'],
      [1, 'inside'],
    ]);
    expect(reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 1,
      position: 'inside',
    });
    act(() => {
      ref.current?.cutItem(2);
    });
    expect(ref.current?.pasteItem(4, 'after')).toBe(false);
  });
});
