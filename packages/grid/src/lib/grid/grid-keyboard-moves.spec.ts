import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid, type OgeRowReorderedEvent } from './grid';

interface Row {
  id: number;
  name: string;
  city: string;
  age: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', city: 'London', age: 36 },
  { id: 2, name: 'Grace', city: 'New York', age: 45 },
  { id: 3, name: 'Erin', city: 'Paris', age: 29 },
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

async function setup(inputs: Record<string, unknown> = {}) {
  const rows = ROWS.map((row) => ({ ...row }));
  const fixture = TestBed.createComponent(OgeGrid<Row>);
  fixture.componentRef.setInput('data', rows);
  fixture.componentRef.setInput('columns', ['name', 'city', 'age']);
  fixture.componentRef.setInput('keyField', 'id');
  for (const [name, value] of Object.entries(inputs))
    fixture.componentRef.setInput(name, value);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  const headers = () =>
    Array.from(
      el.querySelectorAll<HTMLElement>(
        '.oge-header-row > .oge-header-cell[data-colid]',
      ),
    );
  const header = (id: string) =>
    headers().find((cell) => cell.dataset['colid'] === id) as HTMLElement;
  const announcer = () =>
    el.querySelector('.oge-grid-announcer')?.textContent?.trim() ?? '';
  return { fixture, el, rows, headers, header, announcer };
}

describe('OgeGrid keyboard alternatives to dragging', () => {
  it('renders the resize handle as a labelled, focusable vertical separator', async () => {
    const t = await setup();
    const handle = t
      .header('name')
      .querySelector('.oge-resize-handle') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('tabindex')).toBe('-1');
    expect(handle.getAttribute('aria-label')).toBe('Resize Name');
    expect(Number(handle.getAttribute('aria-valuemin'))).toBe(50);
    expect(Number(handle.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(t.header('name').getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowLeft Alt+ArrowRight Control+Shift+ArrowLeft Control+Shift+ArrowRight',
    );
  });

  it('resizes a column with Alt+Arrow on its header, clamped to min/max', async () => {
    const t = await setup();
    const grid = t.fixture.componentInstance;
    const event = press(t.header('name'), 'ArrowRight', { altKey: true });
    await settle(t.fixture);
    expect(event.defaultPrevented).toBe(true);
    // jsdom has no layout: the start width is the separator's estimate (120)
    const widths = () =>
      new Map(grid.state().columns?.widths ?? []).get('name');
    expect(widths()).toBe(130);
    expect(t.announcer()).toBe('Name width 130 pixels');
    press(t.header('name'), 'ArrowLeft', { altKey: true, shiftKey: true });
    await settle(t.fixture);
    expect(widths()).toBe(129);
    // the separator: Home jumps to the minimum, never below the 50px floor
    const handle = t
      .header('name')
      .querySelector('.oge-resize-handle') as HTMLElement;
    press(handle, 'Home');
    await settle(t.fixture);
    expect(widths()).toBe(50);
    expect(handle.getAttribute('aria-valuenow')).toBe('50');
  });

  it('honours resize being disabled', async () => {
    const t = await setup({ columnResize: false });
    const event = press(t.header('name'), 'ArrowRight', { altKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(t.header('name').querySelector('.oge-resize-handle')).toBeNull();
  });

  it('moves a column with Ctrl+Shift+Arrow and announces its position', async () => {
    const t = await setup();
    press(t.header('name'), 'ArrowRight', { ctrlKey: true, shiftKey: true });
    await settle(t.fixture);
    expect(t.headers().map((cell) => cell.dataset['colid'])).toEqual([
      'city',
      'name',
      'age',
    ]);
    expect(t.announcer()).toBe('Name moved to position 2 of 3');
    // already first: nothing moves
    press(t.header('city'), 'ArrowLeft', { ctrlKey: true, shiftKey: true });
    await settle(t.fixture);
    expect(t.headers()[0].dataset['colid']).toBe('city');
  });

  it('does not move columns when reordering is off', async () => {
    const t = await setup({ columnReorder: false });
    press(t.header('name'), 'ArrowRight', { ctrlKey: true, shiftKey: true });
    await settle(t.fixture);
    expect(t.headers()[0].dataset['colid']).toBe('name');
  });

  it('moves the focused row with Ctrl+ArrowDown through the drop path', async () => {
    const t = await setup({ rowDragging: true });
    const events: OgeRowReorderedEvent<Row>[] = [];
    t.fixture.componentInstance.rowReordered.subscribe((e) => events.push(e));
    const firstCell = t.el.querySelector('[data-cell="0-0"]') as HTMLElement;
    firstCell.focus();
    firstCell.dispatchEvent(new FocusEvent('focus'));
    await settle(t.fixture);
    const event = press(firstCell, 'ArrowDown', { ctrlKey: true });
    await settle(t.fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(t.rows.map((row) => row.name)).toEqual(['Grace', 'Ada', 'Erin']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      key: 1,
      targetKey: 2,
      fromIndex: 0,
      toIndex: 1,
    });
    expect(t.announcer()).toBe('Row moved to position 2 of 3');
  });

  it('ignores Ctrl+ArrowDown on rows without rowDragging', async () => {
    const t = await setup();
    const firstCell = t.el.querySelector('[data-cell="0-0"]') as HTMLElement;
    firstCell.focus();
    await settle(t.fixture);
    press(firstCell, 'ArrowDown', { ctrlKey: true });
    await settle(t.fixture);
    expect(t.rows.map((row) => row.name)).toEqual(['Ada', 'Grace', 'Erin']);
  });

  it('reorders and removes groupings from the group-panel chips', async () => {
    const t = await setup({ groupPanel: true });
    const grid = t.fixture.componentInstance;
    grid.applyState({
      group: [
        { field: 'city', dir: 'asc' },
        { field: 'age', dir: 'asc' },
      ],
    });
    await settle(t.fixture);
    const chip = (field: string) =>
      t.el.querySelector(
        `.oge-group-chip-remove[data-group-field="${field}"]`,
      ) as HTMLElement;
    press(chip('city'), 'ArrowRight', { ctrlKey: true });
    await settle(t.fixture);
    expect(grid.state().group?.map((d) => d.field)).toEqual(['age', 'city']);
    expect(t.announcer()).toBe('Grouping by City moved to position 2 of 2');
    press(chip('age'), 'Delete');
    await settle(t.fixture);
    expect(grid.state().group?.map((d) => d.field)).toEqual(['city']);
    expect(t.announcer()).toBe('Grouping by Age removed');
  });

  it('offers group / ungroup in the header context menu', async () => {
    const t = await setup({ groupPanel: true });
    t.header('city').dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(t.fixture);
    const texts = Array.from(
      document.querySelectorAll('.oge-menu-item, [role="menuitem"]'),
    ).map((item) => item.textContent?.trim());
    expect(texts).toContain('Group by this column');
  });

  it('moves a column from the column chooser with Ctrl+ArrowDown', async () => {
    const t = await setup({ columnChooser: true });
    (t.el.querySelector('.oge-chooser-button') as HTMLElement).click();
    await settle(t.fixture);
    const item = (id: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.oge-chooser-item'),
      ).find((element) => element.dataset['chooserId'] === id) as HTMLElement;
    expect(item('name').getAttribute('aria-keyshortcuts')).toBe(
      'Control+ArrowUp Control+ArrowDown',
    );
    press(item('name'), 'ArrowDown', { ctrlKey: true });
    await settle(t.fixture);
    expect(t.headers().map((cell) => cell.dataset['colid'])).toEqual([
      'city',
      'name',
      'age',
    ]);
    expect(t.announcer()).toBe('Name moved to position 2 of 3');
  });
});
