import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgeContextMenuEvent,
  OgeHeaderContextMenuEvent,
} from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}

const NODES: Node[] = [
  { id: 1, parentId: null, name: 'Root' },
  { id: 2, parentId: 1, name: 'Child' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

function press(target: Element, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('OgeTreeList keyboard context menus', () => {
  async function render() {
    const fixture = TestBed.createComponent(OgeTreeList<Node>);
    fixture.componentRef.setInput(
      'data',
      NODES.map((n) => ({ ...n })),
    );
    fixture.componentRef.setInput('columns', ['name']);
    fixture.detectChanges();
    await settle(fixture);
    const tree = fixture.componentInstance;
    const rows: OgeContextMenuEvent<Node>[] = [];
    const headers: OgeHeaderContextMenuEvent[] = [];
    tree.rowContextMenu.subscribe((e) => rows.push(e));
    tree.headerContextMenu.subscribe((e) => headers.push(e));
    return { fixture, el: fixture.nativeElement as HTMLElement, rows, headers };
  }

  it('Shift+F10 in a body cell emits rowContextMenu with source keyboard', async () => {
    const { fixture, el, rows } = await render();
    const cell = el.querySelector('.oge-row .oge-cell') as HTMLElement;
    press(cell, { key: 'F10', shiftKey: true });
    await settle(fixture);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 1, source: 'keyboard' });
    // the native echo that may follow is swallowed
    cell.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    expect(rows).toHaveLength(1);
  });

  it('the Menu key on a header emits headerContextMenu with the built-ins', async () => {
    const { fixture, el, headers } = await render();
    const header = el.querySelector(
      '.oge-header-cell[data-colid="name"]',
    ) as HTMLElement;
    press(header, { key: 'ContextMenu' });
    await settle(fixture);
    expect(headers).toHaveLength(1);
    expect(headers[0]).toMatchObject({ field: 'name', source: 'keyboard' });
    expect(headers[0].items.length).toBeGreaterThan(0);
  });
});
