import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

type Row = Record<string, string> & { c0: string };

const FIELDS = Array.from({ length: 100 }, (_, i) => `c${i}`);
const ROWS: Row[] = Array.from({ length: 5 }, (_, r) =>
  Object.fromEntries(FIELDS.map((field, i) => [field, `r${r}v${i}`]))
) as Row[];

describe('OgeGrid column virtualization', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    grid: OgeGrid<Row>;
  }> {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', FIELDS);
    fixture.componentRef.setInput('scrolling', { columnRenderingMode: 'virtual' });
    const grid = fixture.componentInstance;
    (grid as unknown as { hostWidth: { set(v: number): void } }).hostWidth.set(800);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, grid };
  }

  function headerCaptions(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('.oge-header-cell:not(.oge-col-spacer)')).map(
      (cell) => cell.querySelector('.oge-header-caption')?.textContent?.trim() ?? ''
    );
  }

  it('renders only the columns near the horizontal viewport', async () => {
    const { el } = await render();
    const captions = headerCaptions(el);
    expect(captions.length).toBeLessThan(30);
    expect(captions[0]).toBe('C0');
    // a right spacer track stands in for the ~80 hidden columns
    expect(el.querySelectorAll('.oge-header-row .oge-col-spacer').length).toBe(1);
    const firstRow = el.querySelector('.oge-row') as HTMLElement;
    expect(firstRow.querySelectorAll('.oge-cell:not(.oge-col-spacer)').length).toBe(
      captions.length
    );
  });

  it('shifts the window and keeps absolute cell indexes under horizontal scroll', async () => {
    const { fixture, el, grid } = await render();
    (grid as unknown as { scrollLeft: { set(v: number): void } }).scrollLeft.set(5000);
    await fixture.whenStable();
    fixture.detectChanges();
    const captions = headerCaptions(el);
    expect(captions[0]).not.toBe('C0');
    expect(el.querySelectorAll('.oge-header-row .oge-col-spacer').length).toBe(2);
    // data-cell carries the absolute column index, not the slice index
    const firstCell = el.querySelector('.oge-row .oge-cell:not(.oge-col-spacer)') as HTMLElement;
    const absIndex = Number(firstCell.getAttribute('data-cell')?.split('-')[1]);
    expect(absIndex).toBeGreaterThan(0);
    expect(firstCell.textContent?.trim()).toBe(`r0v${absIndex}`);
    expect(firstCell.getAttribute('aria-colindex')).toBe(String(absIndex + 1));
  });

  it('keeps every column in the DOM when the mode is standard', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', FIELDS);
    (fixture.componentInstance as unknown as { hostWidth: { set(v: number): void } }).hostWidth.set(800);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.oge-header-cell').length).toBe(100);
    expect(el.querySelectorAll('.oge-col-spacer').length).toBe(0);
  });
});
