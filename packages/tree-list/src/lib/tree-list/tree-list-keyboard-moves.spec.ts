import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList, type OgeTreeRowReparentEvent } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  owner: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', owner: 'Ada' },
  { id: 2, parentId: 1, title: 'Child A1', owner: 'Grace' },
  { id: 4, parentId: 1, title: 'Child A2', owner: 'Linus' },
  { id: 3, parentId: null, title: 'Root B', owner: 'Erin' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

function press(
  target: Element,
  key: string,
  mods: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...mods,
  });
  target.dispatchEvent(event);
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
      <oge-column field="owner" [maxWidth]="160" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  readonly events: OgeTreeRowReparentEvent<Task>[] = [];
}

describe('OgeTreeList keyboard alternatives to dragging', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const titles = () =>
      Array.from(el.querySelectorAll('.oge-row')).map((row) =>
        row.querySelector('[data-cell$="-0"]')?.textContent?.trim(),
      );
    const cellOf = (title: string) =>
      Array.from(el.querySelectorAll<HTMLElement>('[data-cell$="-0"]')).find(
        (cell) => (cell.textContent ?? '').includes(title),
      ) as HTMLElement;
    const header = (id: string) =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          '.oge-header-row > .oge-header-cell[data-colid]',
        ),
      ).find((cell) => cell.dataset['colid'] === id) as HTMLElement;
    const announcer = () =>
      el.querySelector('.oge-grid-announcer')?.textContent?.trim() ?? '';
    const focus = async (title: string) => {
      const cell = cellOf(title);
      cell.focus();
      cell.dispatchEvent(new FocusEvent('focus'));
      await settle(fixture);
      return cell;
    };
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      titles,
      cellOf,
      header,
      announcer,
      focus,
    };
  }

  it('moves a row among its siblings with Ctrl+ArrowUp/Down', async () => {
    const t = await render();
    expect(t.titles()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']);
    const cell = await t.focus('Child A2');
    press(cell, 'ArrowUp', { ctrlKey: true });
    await settle(t.fixture);
    expect(t.titles()).toEqual(['Root A', 'Child A2', 'Child A1', 'Root B']);
    expect(t.host.events.at(-1)).toMatchObject({
      key: 4,
      toParentKey: 1,
      position: 'before',
    });
    expect(t.announcer()).toBe('Row moved to level 2, position 1 of 2');
    // the focus followed the row
    expect(document.activeElement?.textContent).toContain('Child A2');
  });

  it('indents with Ctrl+ArrowRight and outdents with Ctrl+ArrowLeft', async () => {
    const t = await render();
    let cell = await t.focus('Child A2');
    press(cell, 'ArrowRight', { ctrlKey: true });
    await settle(t.fixture);
    expect(t.host.data.find((task) => task.id === 4)?.parentId).toBe(2);
    expect(t.host.events.at(-1)).toMatchObject({
      key: 4,
      fromParentKey: 1,
      toParentKey: 2,
      position: 'inside',
    });
    expect(t.announcer()).toBe('Row moved to level 3, position 1 of 1');
    cell = await t.focus('Child A2');
    press(cell, 'ArrowLeft', { ctrlKey: true });
    await settle(t.fixture);
    expect(t.host.data.find((task) => task.id === 4)?.parentId).toBe(1);
    expect(t.host.events.at(-1)).toMatchObject({
      key: 4,
      toParentKey: 1,
      position: 'after',
    });
  });

  it('does nothing at an edge (a root cannot outdent)', async () => {
    const t = await render();
    const cell = await t.focus('Root A');
    const event = press(cell, 'ArrowLeft', { ctrlKey: true });
    await settle(t.fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(t.host.events).toHaveLength(0);
  });

  it('resizes with Alt+Arrow up to the column maxWidth', async () => {
    const t = await render();
    const handle = t
      .header('owner')
      .querySelector('.oge-resize-handle') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-label')).toBe('Resize Owner');
    expect(handle.getAttribute('aria-valuemax')).toBe('160');
    press(handle, 'End');
    await settle(t.fixture);
    expect(handle.getAttribute('aria-valuenow')).toBe('160');
    press(t.header('owner'), 'ArrowRight', { altKey: true });
    await settle(t.fixture);
    expect(t.announcer()).toBe('Owner width 160 pixels');
  });

  it('moves a column with Ctrl+Shift+Arrow', async () => {
    const t = await render();
    press(t.header('owner'), 'ArrowLeft', { ctrlKey: true, shiftKey: true });
    await settle(t.fixture);
    const ids = Array.from(
      t.el.querySelectorAll<HTMLElement>(
        '.oge-header-row > .oge-header-cell[data-colid]',
      ),
    ).map((cell) => cell.dataset['colid']);
    expect(ids).toEqual(['owner', 'title']);
    expect(t.announcer()).toBe('Owner moved to position 1 of 2');
  });
});
