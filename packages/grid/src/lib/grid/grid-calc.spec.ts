import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FilterExpr, FilterOperator } from '@oge-ui/core';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  status: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', status: 'high' },
  { id: 2, name: 'Grace', status: 'low' },
  { id: 3, name: 'Erin', status: 'medium' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

const SEVERITY: Record<string, number> = { low: 0, medium: 1, high: 2 };

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="rows" keyField="id" [filterRow]="true">
      <oge-column field="name" />
      <oge-column
        field="status"
        [calculateSortValue]="bySeverity"
        [calculateFilterExpression]="atLeast"
      />
    </oge-grid>
  `,
})
class CalcHost {
  readonly rows = ROWS;
  readonly bySeverity = (row: Row) => SEVERITY[row.status];
  /** Filter input matches every status at or above the typed severity. */
  readonly atLeast = (
    value: unknown,
    _op: FilterOperator,
  ): FilterExpr | null => {
    const min = SEVERITY[String(value)];
    if (min === undefined) return null;
    return {
      type: 'or',
      operands: Object.entries(SEVERITY)
        .filter(([, rank]) => rank >= min)
        .map(([status]) => ({
          type: 'binary',
          field: 'status',
          op: 'eq',
          value: status,
        })),
    };
  };
  readonly unused = signal(0);
}

function firstCells(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelector('.oge-cell')?.textContent?.trim() ?? '',
  );
}

describe('OgeGrid calculateSortValue / calculateFilterExpression', () => {
  it('sorts by the custom sort key instead of the raw text', async () => {
    const fixture = TestBed.createComponent(CalcHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // click the Status header → ascending by severity rank (low, medium, high)
    (el.querySelectorAll('.oge-header-cell')[1] as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    expect(firstCells(el)).toEqual(['Grace', 'Erin', 'Ada']);
  });

  it('routes filter-row input through the custom filter expression', async () => {
    const fixture = TestBed.createComponent(CalcHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const statusFilter = el.querySelectorAll(
      '.oge-filter-cell input',
    )[1] as HTMLInputElement;
    statusFilter.value = 'medium';
    statusFilter.dispatchEvent(new Event('input', { bubbles: true }));
    // the filter row debounces its input — poll the rendered rows instead of
    // sleeping a magic duration
    await expect
      .poll(async () => {
        await settle(fixture);
        return firstCells(el).sort();
      })
      .toEqual(['Ada', 'Erin']); // high + medium
  });
});
