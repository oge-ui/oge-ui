import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
}));

/**
 * JSDOM has no real layout, so the viewport height is driven directly through
 * the component's internal signal — the window math itself does not depend on
 * layout (it is covered by @oge-ui/core property tests). Real scrolling is
 * verified in the Playwright e2e suite.
 */
describe('OgeGrid virtualization', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    grid: OgeGrid<Row>;
  }> {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('columns', ['id', 'name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('virtualScroll', true);
    fixture.componentRef.setInput('rowHeight', 30);
    const grid = fixture.componentInstance;
    (
      grid as unknown as { viewportHeight: { set(v: number): void } }
    ).viewportHeight.set(300);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, grid };
  }

  function renderedIds(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('.oge-row')).map(
      (row) => row.querySelectorAll('.oge-cell')[0].textContent?.trim() ?? '',
    );
  }

  it('renders only the visible window plus overscan', async () => {
    const { el } = await render();
    // 300px viewport / 30px rows = 10 visible + 1 boundary + 6 overscan below
    const ids = renderedIds(el);
    expect(ids.length).toBeLessThan(20);
    expect(ids[0]).toBe('1');
  });

  it('sizes the spacer to the full list height', async () => {
    const { el } = await render();
    const body = el.querySelector('.oge-body') as HTMLElement;
    expect(body.style.height).toBe(`${1000 * 30}px`);
  });

  it('renders the correct slice at an arbitrary scroll position', async () => {
    const { fixture, el, grid } = await render();
    (grid as unknown as { scrollTop: { set(v: number): void } }).scrollTop.set(
      15_000,
    ); // row 500
    await fixture.whenStable();
    fixture.detectChanges();
    const ids = renderedIds(el).map(Number);
    expect(Math.min(...ids)).toBeLessThanOrEqual(501);
    expect(Math.max(...ids)).toBeGreaterThanOrEqual(510);
    const firstRow = el.querySelector('.oge-row') as HTMLElement;
    expect(firstRow.getAttribute('aria-rowindex')).toBe(
      String(Math.min(...ids) + 1),
    );
    const rowsEl = el.querySelector('.oge-rows') as HTMLElement;
    expect(rowsEl.style.transform).toBe(
      `translateY(${(Math.min(...ids) - 1) * 30}px)`,
    );
  });

  it('folds measured heights into the offset tree in autoRowHeight mode', async () => {
    const { fixture, el, grid } = await render();
    fixture.componentRef.setInput('autoRowHeight', true);
    // simulate the after-render measurement: rows 1 and 2 are taller than 30px
    (
      grid as unknown as {
        measuredHeights: { set(v: ReadonlyMap<string | number, number>): void };
      }
    ).measuredHeights.set(
      new Map<string | number, number>([
        [1, 90],
        [2, 60],
      ]),
    );
    await fixture.whenStable();
    fixture.detectChanges();
    const body = el.querySelector('.oge-body') as HTMLElement;
    // 998 default rows + 90 + 60 instead of 1000 × 30
    expect(body.style.height).toBe(`${998 * 30 + 150}px`);
    // rows keep natural height (no forced style) so content can wrap
    const firstRow = el.querySelector('.oge-row') as HTMLElement;
    expect(firstRow.style.height).toBe('');
  });

  it('clamps the window at the end of the list', async () => {
    const { fixture, el, grid } = await render();
    (grid as unknown as { scrollTop: { set(v: number): void } }).scrollTop.set(
      999_999,
    );
    await fixture.whenStable();
    fixture.detectChanges();
    const ids = renderedIds(el).map(Number);
    expect(Math.max(...ids)).toBe(1000);
  });
});
