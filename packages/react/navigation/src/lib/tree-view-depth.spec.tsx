import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type {
  OgeTreeEditedEvent,
  OgeTreeReorderedEvent,
  OgeTreeTransferredEvent,
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
  { id: 5, parentId: 4, name: 'Holiday' },
];

const TARGET: Node[] = [
  { id: 10, parentId: null, name: 'Inbox' },
  { id: 11, parentId: null, name: 'Archive' },
];

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function rowsOf(host: Element): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>('.oge-tree-view-item'));
}

function stubRects(rows: HTMLElement[], top: number): void {
  rows.forEach((row, index) => {
    row.getBoundingClientRect = () =>
      ({
        top: top + index * 20,
        bottom: top + index * 20 + 20,
        left: 0,
        right: 200,
        width: 200,
        height: 20,
        x: 0,
        y: top + index * 20,
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

function Pair(props: {
  group?: string;
  onReordered?: (event: OgeTreeReorderedEvent<Node>) => void;
  onTransferred?: (event: OgeTreeTransferredEvent<Node>) => void;
  sourceRef?: React.Ref<OgeTreeViewHandle>;
  targetRef?: React.Ref<OgeTreeViewHandle>;
}) {
  return (
    <>
      <div data-testid="source">
        <OgeTreeView
          ref={props.sourceRef}
          treeId="source-tree"
          items={FLAT}
          displayExpr="name"
          rootValue={null}
          allowDragging
          dragGroup={props.group}
          defaultExpandedKeys={[1]}
          onItemTransferred={props.onTransferred}
        />
      </div>
      <div data-testid="target">
        <OgeTreeView
          ref={props.targetRef}
          treeId="target-tree"
          items={TARGET}
          displayExpr="name"
          rootValue={null}
          allowDragging
          dragGroup={props.group}
          onItemReordered={props.onReordered}
        />
      </div>
    </>
  );
}

describe('OgeTreeView drag between trees', () => {
  it('drops a node of one tree onto a row of another of the same group', async () => {
    const reordered: OgeTreeReorderedEvent<Node>[] = [];
    const transferred: OgeTreeTransferredEvent<Node>[] = [];
    const { getByTestId } = render(
      <Pair
        group="files"
        onReordered={(e) => reordered.push(e)}
        onTransferred={(e) => transferred.push(e)}
      />,
    );
    await flush();
    const source = rowsOf(getByTestId('source'));
    const target = rowsOf(getByTestId('target'));
    stubRects(source, 0);
    stubRects(target, 200);
    pointer(source[1], 'pointerdown', 30);
    pointer(target[0], 'pointermove', 210);
    await flush();
    expect(target[0].className).toContain('oge-tree-view-item-drop-inside');
    pointer(target[0], 'pointerup', 210);
    await flush();
    expect(reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 10,
      position: 'inside',
      sourceTreeId: 'source-tree',
      targetTreeId: 'target-tree',
      trigger: 'pointer',
    });
    expect(transferred).toHaveLength(1);
  });

  it('moves with Ctrl+X / Ctrl+V and through cutItem / pasteItem', async () => {
    const reordered: OgeTreeReorderedEvent<Node>[] = [];
    const sourceRef = createRef<OgeTreeViewHandle>();
    const targetRef = createRef<OgeTreeViewHandle>();
    const { getByTestId } = render(
      <Pair
        group="files"
        onReordered={(e) => reordered.push(e)}
        sourceRef={sourceRef}
        targetRef={targetRef}
      />,
    );
    await flush();
    const source = rowsOf(getByTestId('source'));
    act(() => source[1].focus());
    fireEvent.keyDown(source[1], { key: 'x', ctrlKey: true });
    await flush();
    expect(rowsOf(getByTestId('source'))[1].className).toContain(
      'oge-tree-view-item-cut',
    );
    const target = rowsOf(getByTestId('target'));
    act(() => target[1].focus());
    fireEvent.keyDown(target[1], { key: 'v', ctrlKey: true });
    await flush();
    expect(reordered[0]).toMatchObject({
      dragKey: 2,
      dropKey: 11,
      position: 'inside',
      trigger: 'keyboard',
    });
    act(() => {
      sourceRef.current?.cutItem(4);
      targetRef.current?.pasteItem(10, 'before');
    });
    expect(reordered[1]).toMatchObject({
      dragKey: 4,
      dropKey: 10,
      position: 'before',
    });
  });

  it('keeps ungrouped trees apart', async () => {
    const reordered: unknown[] = [];
    const { getByTestId } = render(
      <Pair onReordered={(e) => reordered.push(e)} />,
    );
    await flush();
    const source = rowsOf(getByTestId('source'));
    const target = rowsOf(getByTestId('target'));
    stubRects(source, 0);
    stubRects(target, 200);
    pointer(source[1], 'pointerdown', 30);
    pointer(target[0], 'pointermove', 210);
    pointer(target[0], 'pointerup', 210);
    await flush();
    expect(reordered).toEqual([]);
  });
});

function Editable(props: {
  onEdited?: (event: OgeTreeEditedEvent<Node>) => void;
  validate?: (value: string) => string | null;
}) {
  const [items, setItems] = useState(FLAT);
  return (
    <OgeTreeView
      items={items}
      displayExpr="name"
      rootValue={null}
      allowEditing
      editOnDblClick
      validateEdit={props.validate}
      onItemEdited={(event) => {
        props.onEdited?.(event);
        setItems((rows) =>
          rows.map((row) =>
            row.id === event.key ? { ...row, name: event.value } : row,
          ),
        );
      }}
    />
  );
}

describe('OgeTreeView label editing', () => {
  const field = () =>
    document.querySelector<HTMLInputElement>('.oge-tree-view-edit-input');

  it('opens on F2, commits on Enter and returns focus to the row', async () => {
    const edited: OgeTreeEditedEvent<Node>[] = [];
    render(<Editable onEdited={(e) => edited.push(e)} />);
    await flush();
    const row = rowsOf(document.body)[0];
    act(() => row.focus());
    fireEvent.keyDown(row, { key: 'F2' });
    await flush();
    expect(document.activeElement).toBe(field());
    expect(field()?.value).toBe('Documents');
    (field() as HTMLInputElement).value = 'Docs';
    fireEvent.keyDown(field() as HTMLInputElement, { key: 'Enter' });
    await flush();
    expect(edited[0]).toMatchObject({
      previousValue: 'Documents',
      value: 'Docs',
    });
    expect(field()).toBeNull();
    expect(rowsOf(document.body)[0].textContent).toContain('Docs');
    expect(document.activeElement).toBe(rowsOf(document.body)[0]);
  });

  it('cancels on Escape and shows validation errors', async () => {
    const edited: unknown[] = [];
    render(
      <Editable
        onEdited={(e) => edited.push(e)}
        validate={(v) => (v.length < 3 ? 'Too short' : null)}
      />,
    );
    await flush();
    const row = rowsOf(document.body)[1];
    fireEvent.doubleClick(row.querySelector('.oge-tree-view-text') as Element);
    await flush();
    expect(field()?.value).toBe('Photos');
    (field() as HTMLInputElement).value = 'ab';
    fireEvent.keyDown(field() as HTMLInputElement, { key: 'Enter' });
    await flush();
    expect(field()?.getAttribute('aria-invalid')).toBe('true');
    expect(
      document.querySelector('.oge-tree-view-edit-error')?.textContent,
    ).toBe('Too short');
    fireEvent.keyDown(field() as HTMLInputElement, { key: 'Escape' });
    await flush();
    expect(field()).toBeNull();
    expect(edited).toEqual([]);
  });
});

describe('OgeTreeView "Load more" paging', () => {
  const ITEMS: Node[] = [
    { id: 1, parentId: null, name: 'Root' },
    ...Array.from({ length: 5 }, (_, i) => ({
      id: 101 + i,
      parentId: 1,
      name: `Child ${i + 1}`,
    })),
  ];

  it('renders a Load more row and reveals the next page', async () => {
    const shown: unknown[] = [];
    render(
      <OgeTreeView
        items={ITEMS}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1]}
        childPageSize={2}
        onChildPageShown={(e) => shown.push(e)}
      />,
    );
    await flush();
    const more = () =>
      document.querySelector<HTMLElement>('.oge-tree-view-item-more');
    expect(more()?.textContent?.trim()).toBe('Show 3 more items');
    expect(rowsOf(document.body)[1].getAttribute('aria-setsize')).toBe('5');
    expect(more()?.hasAttribute('aria-setsize')).toBe(false);
    act(() => more()?.focus());
    fireEvent.keyDown(more() as HTMLElement, { key: 'Enter' });
    await flush();
    expect(shown[0]).toMatchObject({ parentKey: 1, shown: 4, total: 5 });
    expect(more()?.textContent?.trim()).toBe('Show 1 more item');
    expect(document.activeElement?.textContent?.trim()).toBe('Child 3');
  });

  it('survives StrictMode with paging, editing and dragging on', async () => {
    const ref = createRef<OgeTreeViewHandle>();
    render(
      <StrictMode>
        <OgeTreeView
          ref={ref}
          items={ITEMS}
          displayExpr="name"
          rootValue={null}
          defaultExpandedKeys={[1]}
          childPageSize={2}
          allowEditing
          allowDragging
          dragGroup="strict"
        />
      </StrictMode>,
    );
    await flush();
    act(() => ref.current?.showMoreChildren(1));
    await flush();
    expect(
      document.querySelector('.oge-tree-view-item-more')?.textContent?.trim(),
    ).toBe('Show 1 more item');
    act(() => {
      ref.current?.editItem(101);
    });
    await flush();
    expect(field2()).not.toBeNull();
    act(() => ref.current?.cancelEdit());
    await flush();
    expect(field2()).toBeNull();
    // the peer re-registered after StrictMode's remount: a cut is accepted
    expect(ref.current?.cutItem(101)).toBe(true);
  });
});

function field2() {
  return document.querySelector('.oge-tree-view-edit-input');
}
