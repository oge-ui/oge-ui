import {
  Component,
  TemplateRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeColumnDef } from '../columns/column-def';
import { OgeGrid } from './grid';

interface Firm {
  id: number;
  name: string;
  city: string;
  revenue: number;
}

const FIRMS: Firm[] = [
  { id: 1, name: 'Acme', city: 'Izmir', revenue: 1200 },
  { id: 2, name: 'Bolt', city: 'Ankara', revenue: 300 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

/** Shared columns every page wants — the reason a wrapper exists. */
const COMMON: OgeColumnDef<Firm>[] = [
  { field: 'id', caption: '#', dataType: 'number', width: 60 },
  { field: 'name', caption: 'Firm' },
];

/** A wrapper that owns the grid: projected <oge-column> could not reach it. */
@Component({
  selector: 'oge-test-firm-grid',
  imports: [OgeGrid],
  template: `<oge-grid [data]="data()" keyField="id" [columns]="all()" />`,
})
class FirmGrid {
  readonly data = input.required<readonly Firm[]>();
  readonly extra = input<readonly OgeColumnDef<Firm>[]>([]);
  protected readonly all = computed(() => [...COMMON, ...this.extra()]);
  readonly grid = viewChild.required(OgeGrid<Firm>);
}

@Component({
  imports: [FirmGrid],
  template: `
    <ng-template #revenueCell let-value>€{{ value }}</ng-template>
    <oge-test-firm-grid [data]="firms" [extra]="extra()" />
  `,
})
class Page {
  readonly firms = FIRMS;
  readonly revenueCell =
    viewChild.required<TemplateRef<unknown>>('revenueCell');
  readonly wrapper = viewChild.required(FirmGrid);
  readonly extra = signal<OgeColumnDef<Firm>[]>([]);
}

describe('OgeGrid programmatic columns (OgeColumnDef)', () => {
  it('a wrapper passes shared + page columns with every column option', async () => {
    const fixture = TestBed.createComponent(Page);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.extra.set([
      { field: 'city', visible: false },
      {
        field: 'revenue',
        dataType: 'number',
        totalSummary: 'sum',
        cellTemplate: page.revenueCell(),
      },
    ]);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const headers = [
      ...el.querySelectorAll('.oge-header-cell[data-colid]'),
    ].map((h) => h.textContent?.trim());
    expect(headers).toEqual(['#', 'Firm', 'Revenue']);
    const firstRow = el.querySelector('.oge-row');
    expect(firstRow?.textContent).toContain('€1200');
    const grid = page.wrapper().grid();
    expect(grid.getTotalSummaryValue('revenue')).toBe(1500);
    // numbers align to the end through a def as well
    const idHeader = el.querySelector('.oge-header-cell[data-colid="id"]');
    expect(idHeader?.classList.contains('oge-align-end')).toBe(true);
  });

  it('keeps a definition’s column (and its visibility) across change detection', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Firm>);
    const defs: OgeColumnDef<Firm>[] = [{ field: 'name' }, { field: 'city' }];
    fixture.componentRef.setInput('data', FIRMS);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('columns', defs);
    await settle(fixture);
    const grid = fixture.componentInstance;
    const internals = grid as unknown as {
      declaredColumns: () => { visible: { set(v: boolean): void } }[];
    };
    const first = internals.declaredColumns()[1];
    first.visible.set(false);
    await settle(fixture);
    // a new array with the same definition objects reuses the same columns
    fixture.componentRef.setInput('columns', [...defs]);
    await settle(fixture);
    expect(internals.declaredColumns()[1]).toBe(first);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.oge-header-cell[data-colid]')).toHaveLength(1);
  });
});
