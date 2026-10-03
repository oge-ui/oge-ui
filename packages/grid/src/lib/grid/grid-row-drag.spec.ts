import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeGrid, type OgeRowReorderedEvent } from './grid';

interface Row {
  id: number;
  name: string;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

function names(el: HTMLElement): string[] {
  return Array.from(
    el.querySelectorAll('.oge-row .oge-cell:not(.oge-drag-cell)'),
  ).map((cell) => cell.textContent?.trim() ?? '');
}

/**
 * Pointer events as jsdom can build them (no PointerEvent constructor, no
 * elementFromPoint): the move's own target stands in for the hit-test.
 */
function pointer(
  type: string,
  target: EventTarget,
  x: number,
  y: number,
  pointerType = 'mouse',
): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe('OgeGrid row drag reordering (pointer)', () => {
  async function render() {
    const rows: Row[] = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Erin' },
    ];
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', rows);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('rowDragging', true);
    const events: OgeRowReorderedEvent<Row>[] = [];
    fixture.componentInstance.rowReordered.subscribe((e) => events.push(e));
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, rows, events };
  }

  it('renders drag handles and moves the row in the underlying array on drop', async () => {
    const { fixture, el, rows, events } = await render();
    expect(el.querySelectorAll('.oge-drag-handle').length).toBe(3);
    expect(el.querySelector('[draggable]')).toBeNull();
    expect(names(el)).toEqual(['Ada', 'Grace', 'Erin']);

    // drag row 3 (Erin) onto row 1 (Ada)
    const handles = el.querySelectorAll('.oge-drag-handle');
    pointer('pointerdown', handles[2], 5, 90);
    const target = el
      .querySelectorAll('.oge-row')[0]
      .querySelector('.oge-cell:last-child')!;
    pointer('pointermove', target, 5, 10);
    fixture.detectChanges();
    expect(el.querySelectorAll('.oge-drop-target').length).toBe(1);
    expect(document.querySelector('.oge-drag-ghost')).not.toBeNull();
    pointer('pointerup', target, 5, 10);
    await settle(fixture);

    expect(names(el)).toEqual(['Erin', 'Ada', 'Grace']);
    expect(rows.map((r) => r.name)).toEqual(['Erin', 'Ada', 'Grace']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      key: 3,
      targetKey: 1,
      fromIndex: 2,
      toIndex: 0,
    });
    expect(el.querySelectorAll('.oge-drop-target').length).toBe(0);
    expect(document.querySelector('.oge-drag-ghost')).toBeNull();
  });

  it('a touch on the handle drags at once (the handle is touch-action: none)', async () => {
    const { fixture, el, events } = await render();
    const handles = el.querySelectorAll('.oge-drag-handle');
    pointer('pointerdown', handles[0], 5, 10, 'touch');
    const target = el.querySelectorAll('.oge-row')[1];
    pointer('pointermove', target, 5, 50, 'touch');
    pointer('pointerup', target, 5, 50, 'touch');
    await settle(fixture);
    expect(names(el)).toEqual(['Grace', 'Ada', 'Erin']);
    expect(events).toHaveLength(1);
  });

  it('Escape mid-drag cancels: no move, no event, no indicator', async () => {
    const { fixture, el, events } = await render();
    const handles = el.querySelectorAll('.oge-drag-handle');
    pointer('pointerdown', handles[2], 5, 90);
    pointer('pointermove', el.querySelectorAll('.oge-row')[0], 5, 10);
    escape();
    pointer('pointerup', el.querySelectorAll('.oge-row')[0], 5, 10);
    await settle(fixture);
    expect(names(el)).toEqual(['Ada', 'Grace', 'Erin']);
    expect(events).toHaveLength(0);
    expect(el.querySelectorAll('.oge-drop-target').length).toBe(0);
  });

  it('a pointer drop and Ctrl+ArrowUp emit the identical event', async () => {
    const pointerRun = await render();
    const handles = pointerRun.el.querySelectorAll('.oge-drag-handle');
    pointer('pointerdown', handles[1], 5, 50);
    pointer(
      'pointermove',
      pointerRun.el.querySelectorAll('.oge-row')[0],
      5,
      10,
    );
    pointer('pointerup', pointerRun.el.querySelectorAll('.oge-row')[0], 5, 10);
    await settle(pointerRun.fixture);

    const keyboardRun = await render();
    const cell = keyboardRun.el
      .querySelectorAll<HTMLElement>('.oge-row')[1]
      .querySelector<HTMLElement>('.oge-cell:not(.oge-drag-cell)')!;
    cell.focus();
    cell.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(keyboardRun.fixture);
    expect(keyboardRun.events).toHaveLength(1);
    expect(pointerRun.events).toEqual(keyboardRun.events);
  });
});

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [groupPanel]="true"
      [columnReorder]="true"
      [groupBy]="groupBy()"
    >
      <oge-column field="id" dataType="number" />
      <oge-column field="region" />
      <oge-column field="city" />
    </oge-grid>
  `,
})
class HeaderHost {
  readonly data = [
    { id: 1, region: 'EU', city: 'Berlin' },
    { id: 2, region: 'US', city: 'NYC' },
  ];
  readonly groupBy = signal<string[]>([]);
}

describe('OgeGrid header drag (pointer)', () => {
  async function render(groupBy: string[] = []) {
    const fixture = TestBed.createComponent(HeaderHost);
    fixture.componentInstance.groupBy.set(groupBy);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const header = (id: string) =>
      el.querySelector<HTMLElement>(
        `.oge-header-row > .oge-header-cell[data-colid="${id}"]`,
      )!;
    const captions = () =>
      Array.from(
        el.querySelectorAll('.oge-header-row .oge-header-caption'),
      ).map((h) => h.textContent?.trim());
    const chips = () =>
      Array.from(el.querySelectorAll('.oge-group-chip')).map((c) =>
        c.textContent?.trim(),
      );
    return { fixture, el, header, captions, chips };
  }

  it('reorders columns by dropping a header onto another', async () => {
    const { fixture, header, captions } = await render();
    expect(header('city').hasAttribute('draggable')).toBe(false);
    pointer('pointerdown', header('city'), 300, 10);
    pointer('pointermove', header('region'), 150, 10);
    fixture.detectChanges();
    expect(header('region').classList).toContain('oge-col-drop-target');
    pointer('pointerup', header('region'), 150, 10);
    await settle(fixture);
    expect(captions()).toEqual(['Id', 'City', 'Region']);
    expect(header('region').classList).not.toContain('oge-col-drop-target');
  });

  it('the click a header drag ends with does not sort', async () => {
    const { fixture, el, header } = await render();
    pointer('pointerdown', header('city'), 300, 10);
    pointer('pointermove', header('region'), 150, 10);
    pointer('pointerup', header('region'), 150, 10);
    header('region').click();
    await settle(fixture);
    expect(el.querySelector('[aria-sort="ascending"]')).toBeNull();
  });

  it('groups by a column dropped on the group panel', async () => {
    const { fixture, el, header, chips } = await render();
    const panel = el.querySelector('.oge-group-panel')!;
    pointer('pointerdown', header('region'), 150, 40);
    pointer('pointermove', panel, 150, 5);
    fixture.detectChanges();
    expect(panel.classList).toContain('oge-group-panel-drop-active');
    pointer('pointerup', panel, 150, 5);
    await settle(fixture);
    expect(chips()).toEqual(['Region']);
    expect(panel.classList).not.toContain('oge-group-panel-drop-active');
    expect(el.querySelectorAll('.oge-group-row').length).toBe(2);
  });

  it('a touch swipe on a header scrolls; a long press drags', async () => {
    const { fixture, el, header, chips } = await render();
    const panel = el.querySelector('.oge-group-panel')!;
    pointer('pointerdown', header('region'), 150, 40, 'touch');
    pointer('pointermove', panel, 150, 5, 'touch');
    pointer('pointerup', panel, 150, 5, 'touch');
    await settle(fixture);
    expect(chips()).toEqual([]);

    pointer('pointerdown', header('region'), 150, 40, 'touch');
    await new Promise((resolve) => setTimeout(resolve, 340));
    pointer('pointermove', panel, 150, 5, 'touch');
    pointer('pointerup', panel, 150, 5, 'touch');
    await settle(fixture);
    expect(chips()).toEqual(['Region']);
  });

  it('reorders group chips by dragging, like Ctrl+Arrow on a chip', async () => {
    const { fixture, el, chips } = await render(['region', 'city']);
    expect(chips()).toEqual(['Region', 'City']);
    const chipEls = el.querySelectorAll<HTMLElement>('.oge-group-chip');
    pointer('pointerdown', chipEls[1], 120, 5);
    pointer('pointermove', chipEls[0], 20, 5);
    fixture.detectChanges();
    expect(chipEls[0].classList).toContain('oge-group-chip-drop-target');
    pointer('pointerup', chipEls[0], 20, 5);
    await settle(fixture);
    expect(chips()).toEqual(['City', 'Region']);
  });

  it('a press on the chip remove button never starts a chip drag', async () => {
    const { fixture, el, chips } = await render(['region', 'city']);
    const remove = el.querySelectorAll<HTMLElement>(
      '.oge-group-chip-remove',
    )[1];
    pointer('pointerdown', remove, 120, 5);
    pointer('pointermove', el.querySelectorAll('.oge-group-chip')[0], 20, 5);
    pointer('pointerup', el.querySelectorAll('.oge-group-chip')[0], 20, 5);
    await settle(fixture);
    expect(chips()).toEqual(['Region', 'City']);
  });
});
