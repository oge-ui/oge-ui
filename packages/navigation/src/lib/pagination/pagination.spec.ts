import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgePagination } from './pagination';
import { provideOgePaginationConfig } from './config';
import type {
  OgePaginationDisplayMode,
  OgePaginationPageChangedEvent,
  OgePaginationPageSizeChangedEvent,
} from './pagination-types';

@Component({
  imports: [OgePagination],
  template: `
    <oge-pagination
      [(pageIndex)]="pageIndex"
      [(pageSize)]="pageSize"
      [itemCount]="itemCount()"
      [pageSizes]="pageSizes()"
      [showInfo]="showInfo()"
      [showFirstLastButtons]="showFirstLastButtons()"
      [showJumpToPageInput]="showJumpToPageInput()"
      [displayMode]="displayMode()"
      [disabled]="disabled()"
      (pageChanged)="pageEvents.push($event)"
      (pageSizeChanged)="sizeEvents.push($event)"
    />
  `,
})
class Host {
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly itemCount = signal<number | undefined>(97);
  readonly pageSizes = signal<readonly (number | 'all')[] | undefined>(
    undefined,
  );
  readonly showInfo = signal(false);
  readonly showFirstLastButtons = signal(false);
  readonly showJumpToPageInput = signal(false);
  readonly displayMode = signal<OgePaginationDisplayMode | undefined>(
    undefined,
  );
  readonly disabled = signal(false);
  readonly pageEvents: OgePaginationPageChangedEvent[] = [];
  readonly sizeEvents: OgePaginationPageSizeChangedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function pagination(fixture: ComponentFixture<Host>): OgePagination {
  return fixture.debugElement.children[0].componentInstance;
}

function pageButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-pagination-page'),
  );
}

function navButtons(fixture: ComponentFixture<unknown>): HTMLButtonElement[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.oge-pagination-nav-btn'),
  );
}

describe('OgePagination', () => {
  it('renders the constant-width window and marks the current page', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.itemCount.set(400); // 20 pages
    fixture.componentInstance.pageIndex.set(10);
    await settle(fixture);
    const buttons = pageButtons(fixture);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      '1',
      '10',
      '11',
      '12',
      '20',
    ]);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-pagination-ellipsis').length,
    ).toBe(2);
    const current = fixture.nativeElement.querySelector(
      '.oge-pagination-current',
    ) as HTMLElement;
    expect(current.textContent?.trim()).toBe('11');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('two-way models: clicks update the host, host writes re-render', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const third = pageButtons(fixture)[2];
    third.click();
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(2);
    expect(fixture.componentInstance.pageEvents).toEqual([
      {
        pageIndex: 2,
        previousPageIndex: 0,
        pageSize: 20,
        event: expect.anything(),
      },
    ]);

    fixture.componentInstance.pageIndex.set(4);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-pagination-current')
        ?.textContent?.trim(),
    ).toBe('5');
    // programmatic write emitted NO rich event
    expect(fixture.componentInstance.pageEvents.length).toBe(1);
  });

  it('prev disables at the first page, next at the last', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const [prev, next] = navButtons(fixture);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    fixture.componentInstance.pageIndex.set(4); // last of 5
    await settle(fixture);
    expect(navButtons(fixture)[0].disabled).toBe(false);
    expect(navButtons(fixture)[1].disabled).toBe(true);
  });

  it('first/last buttons render on demand and jump to the rails', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showFirstLastButtons.set(true);
    fixture.componentInstance.pageIndex.set(2);
    await settle(fixture);
    const buttons = navButtons(fixture); // first, prev, next, last
    expect(buttons.length).toBe(4);
    buttons[3].click();
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(4);
    buttons[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(0);
  });

  it('unknown total renders prev/next + "Page N" only; next never disables', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.itemCount.set(undefined);
    fixture.componentInstance.pageIndex.set(6);
    fixture.componentInstance.showFirstLastButtons.set(true);
    fixture.componentInstance.showInfo.set(true);
    fixture.componentInstance.showJumpToPageInput.set(true);
    await settle(fixture);
    expect(pageButtons(fixture).length).toBe(0);
    expect(navButtons(fixture).length).toBe(2); // first/last hidden
    expect(
      fixture.nativeElement.querySelector('.oge-pagination-jump'),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.oge-pagination-info'),
    ).toBeNull();
    const indicator = fixture.nativeElement.querySelector(
      '.oge-pagination-indicator',
    ) as HTMLElement;
    expect(indicator.textContent?.trim()).toBe('Page 7');
    expect(navButtons(fixture)[1].disabled).toBe(false);
    expect(pagination(fixture).hasNextPage()).toBe(true);
  });

  it("page-size select commits, 'all' maps to 0 and the index re-clamps", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.pageSizes.set([10, 20, 'all']);
    fixture.componentInstance.pageIndex.set(4); // last of 5 (97/20)
    await settle(fixture);
    const select = fixture.nativeElement.querySelector(
      '.oge-pagination-select',
    ) as HTMLSelectElement;
    select.value = '10';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.pageSize()).toBe(10);
    expect(fixture.componentInstance.sizeEvents[0]).toEqual({
      pageSize: 10,
      previousPageSize: 20,
      pageIndex: 4, // still valid: 97/10 = 10 pages
      event: expect.anything(),
    });

    select.value = 'all';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.pageSize()).toBe(0);
    expect(fixture.componentInstance.pageIndex()).toBe(0); // one page now
    expect(fixture.componentInstance.sizeEvents[1].pageIndex).toBe(0);
  });

  it('renders the info range text', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showInfo.set(true);
    fixture.componentInstance.pageIndex.set(1);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-pagination-info')
        ?.textContent?.trim(),
    ).toBe('21–40 of 97');
  });

  it('jump input commits on change with clamping and re-syncs its display', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showJumpToPageInput.set(true);
    await settle(fixture);
    const jump = fixture.nativeElement.querySelector(
      '.oge-pagination-jump-input',
    ) as HTMLInputElement;
    jump.value = '3';
    jump.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(2);

    jump.value = '99';
    jump.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(4); // clamped to last
    expect(jump.value).toBe('5'); // display re-synced, 1-based
  });

  it('compact mode renders the N / M indicator; adaptive stays full in jsdom', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.displayMode.set('compact');
    fixture.componentInstance.pageIndex.set(2);
    await settle(fixture);
    expect(pageButtons(fixture).length).toBe(0);
    expect(
      fixture.nativeElement
        .querySelector('.oge-pagination-indicator')
        ?.textContent?.trim(),
    ).toBe('3 / 5');

    // adaptive: containerSize <= 0 (jsdom) means "not measured yet" → full
    fixture.componentInstance.displayMode.set('adaptive');
    await settle(fixture);
    expect(pageButtons(fixture).length).toBeGreaterThan(0);
  });

  it('auto-clamps the model when the item count shrinks (no rich event)', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.pageIndex.set(4);
    await settle(fixture);
    fixture.componentInstance.itemCount.set(25); // 2 pages now
    await settle(fixture);
    expect(fixture.componentInstance.pageIndex()).toBe(1);
    expect(fixture.componentInstance.pageEvents.length).toBe(0);
  });

  it('zero items renders a single disabled-rails page and 0–0 info', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.itemCount.set(0);
    fixture.componentInstance.showInfo.set(true);
    await settle(fixture);
    expect(pageButtons(fixture).length).toBe(1);
    const [prev, next] = navButtons(fixture);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('.oge-pagination-info')
        ?.textContent?.trim(),
    ).toBe('0–0 of 0');
  });

  it('disabled disables every control', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.componentInstance.pageSizes.set([10, 20]);
    fixture.componentInstance.showJumpToPageInput.set(true);
    await settle(fixture);
    for (const button of [...pageButtons(fixture), ...navButtons(fixture)]) {
      expect(button.disabled).toBe(true);
    }
    expect(
      (
        fixture.nativeElement.querySelector(
          '.oge-pagination-select',
        ) as HTMLSelectElement
      ).disabled,
    ).toBe(true);
  });

  it('methods drive the model; lastPage no-ops on unknown totals', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const bar = pagination(fixture);
    bar.lastPage();
    expect(fixture.componentInstance.pageIndex()).toBe(4);
    bar.previousPage();
    expect(fixture.componentInstance.pageIndex()).toBe(3);
    bar.firstPage();
    expect(fixture.componentInstance.pageIndex()).toBe(0);
    expect(bar.hasPreviousPage()).toBe(false);

    fixture.componentInstance.itemCount.set(undefined);
    await settle(fixture);
    bar.lastPage(); // no-op
    expect(fixture.componentInstance.pageIndex()).toBe(0);
    bar.nextPage();
    expect(fixture.componentInstance.pageIndex()).toBe(1);
  });

  it('messages override via input and via provider', async () => {
    @Component({
      imports: [OgePagination],
      providers: [
        provideOgePaginationConfig({
          maxButtons: 5,
          messages: { paginationLabel: 'Sayfalama' },
        }),
      ],
      template: `<oge-pagination
        [itemCount]="400"
        [messages]="{ nextPage: 'Sonraki' }"
      />`,
    })
    class ConfigHost {}
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    expect(
      fixture.nativeElement
        .querySelector('.oge-pagination-nav')
        ?.getAttribute('aria-label'),
    ).toBe('Sayfalama');
    const next = navButtons(fixture)[1];
    expect(next.getAttribute('aria-label')).toBe('Sonraki');
    // config maxButtons 5 → window of 5 slots
    expect(
      fixture.nativeElement.querySelectorAll(
        '.oge-pagination-page, .oge-pagination-ellipsis',
      ).length,
    ).toBe(5);
  });
});
