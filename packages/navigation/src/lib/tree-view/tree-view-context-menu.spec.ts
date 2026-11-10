import { key, render, settle } from './tree-view-test-host';

/** 2.5 — `itemContextMenu`, on the grid's `rowContextMenu` model. */
describe('OgeTreeView itemContextMenu', () => {
  const menu = () => document.querySelector('.oge-context-menu');

  afterEach(() => {
    document.querySelectorAll('.oge-context-menu').forEach((el) => el.remove());
  });

  function rightClick(target: Element, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 30,
      button: 2,
      ...init,
    });
    target.dispatchEvent(event);
    return event;
  }

  it('reports the item and keeps the native menu when no items are added', async () => {
    const { fixture, host, rowFor } = await render((h) =>
      h.expandedKeys.set([1]),
    );
    const event = rightClick(rowFor('Reports') as HTMLElement);
    await settle(fixture);
    expect(host.contextMenus).toHaveLength(1);
    expect(host.contextMenus[0]).toMatchObject({
      key: 2,
      clientX: 40,
      clientY: 30,
      source: 'pointer',
    });
    expect(host.contextMenus[0].item.name).toBe('Reports');
    expect(event.defaultPrevented).toBe(false);
    expect(menu()).toBeNull();
  });

  it('opens its menu with the added items and runs the chosen action', async () => {
    const action = vi.fn();
    const { fixture, host, rowFor } = await render((h) => {
      h.expandedKeys.set([1]);
      h.menuItems = [{ text: 'Rename', action }, { text: 'Delete' }];
    });
    const event = rightClick(rowFor('Reports') as HTMLElement);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(
      menu()?.querySelector('[role="menu"]')?.getAttribute('aria-label'),
    ).toBe('Reports');
    expect(host.focusedKey()).toBe(2);
    (
      Array.from(
        menu()?.querySelectorAll<HTMLElement>('.oge-menu-item') ?? [],
      ).find((el) => el.textContent?.includes('Rename')) as HTMLElement
    ).click();
    await settle(fixture);
    expect(action).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(rowFor('Reports'));
  });

  it('Shift+F10 and the Menu key open it at the focused item', async () => {
    const { fixture, host, rowFor } = await render((h) => {
      h.menuItems = [{ text: 'Rename' }];
    });
    const row = rowFor('Photos') as HTMLElement;
    row.focus();
    key(row, 'F10', { shiftKey: true });
    await settle(fixture);
    expect(host.contextMenus.at(-1)).toMatchObject({
      key: 4,
      source: 'keyboard',
    });
    expect(menu()).not.toBeNull();
    // the echo some browsers send after the key is swallowed
    rightClick(row, { button: 0 });
    await settle(fixture);
    expect(host.contextMenus).toHaveLength(1);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    key(row, 'ContextMenu');
    await settle(fixture);
    expect(host.contextMenus).toHaveLength(2);
  });

  it('reports a touch long-press as source "touch"', async () => {
    const { fixture, host, rowFor } = await render();
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
    });
    Object.defineProperty(event, 'pointerType', { value: 'touch' });
    rowFor('Documents')?.dispatchEvent(event);
    await settle(fixture);
    expect(host.contextMenus[0].source).toBe('touch');
  });

  it('stays out of a disabled tree', async () => {
    const { fixture, host, rowFor } = await render((h) => h.disabled.set(true));
    rightClick(rowFor('Documents') as HTMLElement);
    await settle(fixture);
    expect(host.contextMenus).toHaveLength(0);
  });
});
