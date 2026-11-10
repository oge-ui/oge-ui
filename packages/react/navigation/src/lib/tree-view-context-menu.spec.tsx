import { act, fireEvent, render, screen } from '@testing-library/react';
import type {
  OgeMenuItem,
  OgeTreeItemContextMenuEvent,
} from '@oge-ui/behavior';
import { OgeTreeView } from './tree-view';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}

const FLAT: Node[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 4, parentId: null, name: 'Photos' },
];

const row = (name: string) =>
  screen
    .getAllByRole('treeitem')
    .find((el) => el.textContent?.trim().startsWith(name)) as HTMLElement;
const menu = () => document.querySelector('.oge-context-menu');
const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
};

function setup(menuItems: OgeMenuItem[] = [], disabled = false) {
  const events: OgeTreeItemContextMenuEvent<Node>[] = [];
  render(
    <OgeTreeView<Node>
      items={FLAT}
      displayExpr="name"
      rootValue={null}
      defaultExpandedKeys={[1]}
      disabled={disabled}
      onItemContextMenu={(event) => {
        events.push(event);
        event.items.push(...menuItems);
      }}
    />,
  );
  return events;
}

describe('<OgeTreeView> onItemContextMenu', () => {
  it('reports the item and keeps the native menu when no items are added', () => {
    const events = setup();
    const notPrevented = fireEvent.contextMenu(row('Reports'), {
      clientX: 40,
      clientY: 30,
    });
    expect(notPrevented).toBe(true);
    expect(events[0]).toMatchObject({ key: 2, source: 'pointer' });
    expect(events[0].item.name).toBe('Reports');
    expect(menu()).toBeNull();
  });

  it('opens its menu with the added items and returns focus on close', async () => {
    const action = vi.fn();
    setup([{ text: 'Rename', action }]);
    const notPrevented = fireEvent.contextMenu(row('Reports'));
    expect(notPrevented).toBe(false);
    await flush();
    expect(screen.getByRole('menu', { name: 'Reports' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    await flush();
    expect(action).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(row('Reports'));
  });

  it('Shift+F10 opens it at the focused item and swallows the echo', async () => {
    const events = setup([{ text: 'Rename' }]);
    const photos = row('Photos');
    act(() => photos.focus());
    fireEvent.keyDown(photos, { key: 'F10', shiftKey: true });
    await flush();
    expect(events.at(-1)).toMatchObject({ key: 4, source: 'keyboard' });
    expect(menu()).not.toBeNull();
    fireEvent.contextMenu(photos, { button: 0 });
    expect(events).toHaveLength(1);
  });

  it('stays out of a disabled tree', () => {
    const events = setup([{ text: 'Rename' }], true);
    fireEvent.contextMenu(row('Documents'));
    expect(events).toHaveLength(0);
  });
});
