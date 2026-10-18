import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  city: string;
  note: string;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

describe('OgeGrid pinned-column edge shadow', () => {
  it('marks the cells bordering the scrolling content and follows the scroll position', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', [
      { id: 1, name: 'Ada', city: 'London', note: 'x' },
    ]);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('columns', [
      { field: 'id', width: 60, pinned: 'left' },
      { field: 'name', width: 100, pinned: 'left' },
      { field: 'city', width: 300 },
      { field: 'note', width: 100, pinned: 'right' },
    ]);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('.oge-header-cell'));
    expect(
      headers.map((h) => h.classList.contains('oge-pin-edge-start')),
    ).toEqual([false, true, false, false]);
    expect(
      headers.map((h) => h.classList.contains('oge-pin-edge-end')),
    ).toEqual([false, false, false, true]);
    const cells = el.querySelectorAll('.oge-rows .oge-row .oge-cell');
    expect(cells[1].classList.contains('oge-pin-edge-start')).toBe(true);
    expect(cells[3].classList.contains('oge-pin-edge-end')).toBe(true);

    const viewport = el.querySelector('.oge-viewport') as HTMLElement;
    Object.defineProperty(viewport, 'scrollWidth', { value: 1000 });
    Object.defineProperty(viewport, 'clientWidth', { value: 400 });
    viewport.scrollLeft = 120;
    viewport.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(viewport.classList.contains('oge-pin-shadow-start')).toBe(true);
    expect(viewport.classList.contains('oge-pin-shadow-end')).toBe(true);
    viewport.scrollLeft = 600;
    viewport.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(viewport.classList.contains('oge-pin-shadow-end')).toBe(false);
  });
});
