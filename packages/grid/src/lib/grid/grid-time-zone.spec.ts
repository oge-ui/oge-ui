import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeGrid } from './grid';

interface Job {
  id: number;
  due: Date;
}

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h));

// 02:00 UTC on 5 Mar is still 4 Mar in New York
const JOBS: Job[] = [
  { id: 1, due: utc(2026, 3, 5, 2) },
  { id: 2, due: utc(2026, 3, 6, 12) },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      #grid
      [data]="jobs"
      keyField="id"
      locale="en-US"
      timeZone="America/New_York"
      [filterRow]="true"
      [filterDebounce]="0"
    >
      <oge-column field="id" dataType="number" />
      <oge-column field="due" caption="Due (NY)" dataType="date" />
      <oge-column
        field="due"
        caption="Due (UTC)"
        dataType="date"
        timeZone="UTC"
        [filterable]="false"
      />
    </oge-grid>
  `,
})
class Host {
  readonly jobs = JOBS;
  readonly grid = viewChild.required<OgeGrid<Job>>('grid');
}

describe('OgeGrid timeZone', () => {
  it("shows each date column on its zone's clock", async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const firstRow = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-row',
    ) as HTMLElement;
    const texts = Array.from(firstRow.querySelectorAll('.oge-cell')).map((c) =>
      c.textContent?.trim(),
    );
    expect(texts.slice(1)).toEqual(['3/4/2026', '3/5/2026']);
  });

  it("filters the zone's whole day from the filter row", async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelectorAll(
      '.oge-filter-input .oge-input-native',
    )[1] as HTMLInputElement;
    input.value = '3/4/2026';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    const row = fixture.componentInstance.grid().state().filter?.row?.[0];
    const expr = row?.[1];
    expect(expr?.type).toBe('and');
    if (expr?.type === 'and') {
      expect(
        expr.operands.map((o) =>
          o.type === 'binary' ? (o.value as Date).toISOString() : '',
        ),
      ).toEqual(['2026-03-04T05:00:00.000Z', '2026-03-05T05:00:00.000Z']);
    }
    expect(el.querySelectorAll('.oge-row')).toHaveLength(1);
  });
});
