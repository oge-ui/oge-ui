import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  price: number;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid live updates (DataSource.changes push)', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    source: ArrayDataSource<Row>;
  }> {
    const rows: Row[] = [
      { id: 1, name: 'Alpha', price: 10 },
      { id: 2, name: 'Beta', price: 20 },
      { id: 3, name: 'Gamma', price: 30 },
    ];
    const source = new ArrayDataSource(rows, { key: 'id' });
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['id', 'name', 'price']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.detectChanges();
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement, source };
  }

  function cellTexts(el: HTMLElement, column: number): string[] {
    return Array.from(el.querySelectorAll('.oge-row')).map(
      (row) => row.querySelectorAll('.oge-cell')[column].textContent?.trim() ?? ''
    );
  }

  it('patches updated rows in place without a reload', async () => {
    const { fixture, el, source } = await render();
    expect(cellTexts(el, 2)).toEqual(['10', '20', '30']);
    source.push([{ type: 'update', key: 2, patch: { price: 99 } }]);
    fixture.detectChanges();
    expect(cellTexts(el, 2)).toEqual(['10', '99', '30']);
  });

  it('flashes exactly the patched cells when highlightChanges is on', async () => {
    const { fixture, el, source } = await render();
    fixture.componentRef.setInput('highlightChanges', true);
    fixture.detectChanges();

    source.push([{ type: 'update', key: 2, patch: { price: 99 } }]);
    await settle(fixture);
    const flashed = Array.from(el.querySelectorAll('.oge-cell-flash-a, .oge-cell-flash-b'));
    expect(flashed.length).toBe(1);
    expect(flashed[0].textContent?.trim()).toBe('99');

    // a second batch to the same cell alternates the class so the animation restarts
    const firstClass = flashed[0].classList.contains('oge-cell-flash-a') ? 'a' : 'b';
    source.push([{ type: 'update', key: 2, patch: { price: 77 } }]);
    await settle(fixture);
    const again = el.querySelector('.oge-cell-flash-a, .oge-cell-flash-b');
    expect(again?.classList.contains(`oge-cell-flash-${firstClass}`)).toBe(false);
  });

  it('reflects pushed inserts and removes', async () => {
    const { fixture, el, source } = await render();
    source.push([
      { type: 'insert', item: { id: 4, name: 'Delta', price: 40 } },
      { type: 'remove', key: 1 },
    ]);
    await settle(fixture);
    expect(cellTexts(el, 1)).toEqual(['Beta', 'Gamma', 'Delta']);
  });
});
