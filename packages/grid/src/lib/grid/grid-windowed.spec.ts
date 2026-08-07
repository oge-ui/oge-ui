import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomDataSource, type LoadOptions } from '@oge-ui/core';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
}

const TOTAL = 100_000;

/** Resolves pending source promises and re-renders. */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

function firstCellTexts(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row:not(.oge-filler-row)')).map(
    (row) => row.querySelectorAll('.oge-cell')[0].textContent?.trim() ?? '',
  );
}

describe('OgeGrid windowed scrolling (remote virtual / infinite)', () => {
  async function render(withTotal = true): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    grid: OgeGrid<Row>;
    log: LoadOptions[];
  }> {
    const log: LoadOptions[] = [];
    const source = new CustomDataSource<Row>({
      key: 'id',
      load: async (options) => {
        log.push(options);
        const skip = options.skip ?? 0;
        const take = options.take ?? 20;
        const data = Array.from(
          { length: Math.max(0, Math.min(take, TOTAL - skip)) },
          (_, i) => ({
            id: skip + i + 1,
            name: `Row ${skip + i + 1}`,
          }),
        );
        return withTotal ? { data, totalCount: TOTAL } : { data };
      },
    });
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['id', 'name']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('scrolling', {
      mode: 'virtual',
      remote: true,
    });
    fixture.componentRef.setInput('rowHeight', 30);
    const grid = fixture.componentInstance;
    (
      grid as unknown as { viewportHeight: { set(v: number): void } }
    ).viewportHeight.set(300);
    fixture.detectChanges();
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement, grid, log };
  }

  it('loads only the first blocks and sizes the spacer to the full total', async () => {
    const { el, log } = await render();
    const skips = log.map((o) => o.skip ?? 0);
    expect(skips).toContain(0);
    expect(Math.max(...skips)).toBeLessThanOrEqual(200); // visible window + read-ahead only
    expect(firstCellTexts(el)[0]).toBe('1');
    const body = el.querySelector('.oge-body') as HTMLElement;
    expect(body.style.height).toBe(`${TOTAL * 30}px`);
  });

  it('shows skeleton fillers, then real rows after a far jump — skipping middle blocks', async () => {
    const { fixture, el, grid, log } = await render();
    const before = log.length;
    (grid as unknown as { scrollTop: { set(v: number): void } }).scrollTop.set(
      50_000 * 30,
    );
    fixture.detectChanges();
    // synchronously after the jump the target block is not loaded yet
    expect(el.querySelectorAll('.oge-filler-row').length).toBeGreaterThan(0);
    await settle(fixture);
    expect(el.querySelectorAll('.oge-filler-row').length).toBe(0);
    const ids = firstCellTexts(el).map(Number);
    expect(Math.min(...ids)).toBeGreaterThanOrEqual(49_900);
    // only the blocks around row 50k were requested, not the ~500 in between
    expect(log.length - before).toBeLessThanOrEqual(4);
    expect(log.some((o) => (o.skip ?? 0) === 50_000)).toBe(true);
  });

  it('re-requests visited blocks never, and invalidates the cache on sort', async () => {
    const { fixture, el, grid, log } = await render();
    const scroll = (grid as unknown as { scrollTop: { set(v: number): void } })
      .scrollTop;
    scroll.set(3000); // rows ~100 — block 1, already read ahead
    await settle(fixture);
    scroll.set(0);
    await settle(fixture);
    const skips = log.map((o) => o.skip ?? 0);
    expect(new Set(skips).size).toBe(skips.length); // no duplicate block requests
    // sorting invalidates every cached block
    el.querySelectorAll('.oge-header-cell')[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    const sorted = log.filter((o) => o.sort?.length);
    expect(sorted.length).toBeGreaterThan(0);
    expect(sorted.some((o) => (o.skip ?? 0) === 0)).toBe(true);
  });

  it('grows the scroll space past the highest loaded row when the total is unknown', async () => {
    const { el } = await render(false);
    const body = el.querySelector('.oge-body') as HTMLElement;
    const height = parseInt(body.style.height, 10);
    expect(height).toBeGreaterThan(200 * 30 - 1); // loaded rows + one growth block
    expect(firstCellTexts(el)[0]).toBe('1');
  });
});
