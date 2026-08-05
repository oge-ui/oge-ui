import { ComponentFixture, TestBed } from '@angular/core/testing';
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
  return Array.from(el.querySelectorAll('.oge-row .oge-cell:not(.oge-drag-cell)')).map(
    (cell) => cell.textContent?.trim() ?? ''
  );
}

describe('OgeGrid row drag reordering', () => {
  it('renders drag handles and moves the row in the underlying array on drop', async () => {
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
    fixture.detectChanges();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.oge-drag-handle').length).toBe(3);
    expect(names(el)).toEqual(['Ada', 'Grace', 'Erin']);

    // drag row 3 (Erin) onto row 1 (Ada)
    const handles = el.querySelectorAll('.oge-drag-handle');
    handles[2].dispatchEvent(new Event('dragstart', { bubbles: true }));
    const targetRow = el.querySelectorAll('.oge-row')[0];
    targetRow.dispatchEvent(new Event('dragover', { bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelectorAll('.oge-drop-target').length).toBe(1);
    targetRow.dispatchEvent(new Event('drop', { bubbles: true }));
    await settle(fixture);

    expect(names(el)).toEqual(['Erin', 'Ada', 'Grace']);
    expect(rows.map((r) => r.name)).toEqual(['Erin', 'Ada', 'Grace']);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ key: 3, targetKey: 1, fromIndex: 2, toIndex: 0 });
    expect(el.querySelectorAll('.oge-drop-target').length).toBe(0);
  });
});
