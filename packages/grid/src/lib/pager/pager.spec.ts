import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgePager } from './pager';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgePager events', () => {
  async function render(inputs: Record<string, unknown> = {}): Promise<{
    fixture: ComponentFixture<OgePager>;
    el: HTMLElement;
    pager: OgePager;
  }> {
    const fixture = TestBed.createComponent(OgePager);
    fixture.componentRef.setInput('pageIndex', 1);
    fixture.componentRef.setInput('pageCount', 5);
    fixture.componentRef.setInput('totalCount', 50);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('pageSizes', [10, 20, 'all']);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    await settle(fixture);
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      pager: fixture.componentInstance,
    };
  }

  it('pageChange emits for the previous / next / numbered page buttons', async () => {
    const { el, pager } = await render();
    const pages: number[] = [];
    pager.pageChange.subscribe((page) => pages.push(page));
    el.querySelector<HTMLButtonElement>(
      '[aria-label="Previous page"]',
    )?.click();
    el.querySelector<HTMLButtonElement>('[aria-label="Next page"]')?.click();
    const four = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-pager-btn'),
    ).find((btn) => btn.textContent?.trim() === '4');
    four?.click();
    expect(pages).toEqual([0, 2, 3]); // prev of 1, next of 1, page "4" = index 3
  });

  it('pageChange stays silent on the disabled edge buttons', async () => {
    const { el, pager } = await render({ pageIndex: 0, pageCount: 1 });
    const pages: number[] = [];
    pager.pageChange.subscribe((page) => pages.push(page));
    const prev = el.querySelector<HTMLButtonElement>(
      '[aria-label="Previous page"]',
    );
    const next = el.querySelector<HTMLButtonElement>(
      '[aria-label="Next page"]',
    );
    expect(prev?.disabled).toBe(true);
    expect(next?.disabled).toBe(true);
    prev?.click();
    next?.click();
    expect(pages).toEqual([]);
  });

  it('pageSizeChange emits the numeric size and 0 for the "all" option', async () => {
    const { el, pager } = await render();
    const sizes: number[] = [];
    pager.pageSizeChange.subscribe((size) => sizes.push(size));
    const select = el.querySelector<HTMLSelectElement>(
      '.oge-pager-sizes select',
    );
    expect(select).toBeTruthy();
    if (!select) return;
    select.value = '20';
    select.dispatchEvent(new Event('change'));
    select.value = 'all';
    select.dispatchEvent(new Event('change'));
    expect(sizes).toEqual([20, 0]);
  });
});
