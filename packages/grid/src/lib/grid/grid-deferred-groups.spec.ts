import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomDataSource, type LoadOptions } from '@oge-ui/core';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  department: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', department: 'Engineering' },
  { id: 2, name: 'Grace', department: 'Engineering' },
  { id: 3, name: 'Erin', department: 'Sales' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid deferred group loading', () => {
  async function render(): Promise<{
    fixture: ComponentFixture<OgeGrid<Row>>;
    el: HTMLElement;
    log: LoadOptions[];
  }> {
    const log: LoadOptions[] = [];
    // fake server: grouped requests return headers only (items: null);
    // child requests filter by the group value and return plain rows
    const source = new CustomDataSource<Row>({
      key: 'id',
      load: async (options) => {
        log.push(options);
        if (options.group?.length) {
          const groups = new Map<string, number>();
          for (const row of ROWS) {
            groups.set(row.department, (groups.get(row.department) ?? 0) + 1);
          }
          return {
            data: [...groups.entries()].map(([key, count]) => ({
              key,
              items: null,
              count,
            })),
            totalCount: ROWS.length,
          };
        }
        const filter = options.filter;
        const value =
          filter && filter.type === 'binary'
            ? filter.value
            : filter && filter.type === 'and'
              ? (
                  filter.operands.find((o) => o.type === 'binary') as {
                    value?: unknown;
                  }
                )?.value
              : undefined;
        return { data: ROWS.filter((row) => row.department === value) };
      },
    });
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', source);
    fixture.componentRef.setInput('columns', ['name', 'department']);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('groupBy', ['department']);
    fixture.componentRef.setInput('grouping', { autoExpandAll: false });
    fixture.detectChanges();
    await settle(fixture);
    return { fixture, el: fixture.nativeElement as HTMLElement, log };
  }

  it('starts collapsed with a single grouped request and no child rows', async () => {
    const { el, log } = await render();
    expect(el.querySelectorAll('.oge-group-row').length).toBe(2);
    expect(el.querySelectorAll('.oge-row').length).toBe(0);
    expect(log.length).toBe(1);
    expect(log[0].group?.length).toBe(1);
    // group headers still show their server-provided counts
    expect(el.querySelector('.oge-group-count')?.textContent).toContain('2');
  });

  it('fetches children only when a group is expanded, then serves them from cache', async () => {
    const { fixture, el, log } = await render();
    (el.querySelectorAll('.oge-group-row')[0] as HTMLElement).click();
    fixture.detectChanges();
    // placeholder row while the child request is in flight
    expect(el.querySelectorAll('.oge-filler-row').length).toBe(1);
    await settle(fixture);
    const names = Array.from(
      el.querySelectorAll('.oge-row .oge-cell:first-child'),
    ).map((cell) => cell.textContent?.trim());
    expect(names).toEqual(['Ada', 'Grace']);
    expect(log.length).toBe(2);
    expect(log[1].group).toBeUndefined();
    expect(log[1].filter).toEqual({
      type: 'binary',
      field: 'department',
      op: 'eq',
      value: 'Engineering',
    });
    // collapse + re-expand: served from the cache, no third request
    (el.querySelectorAll('.oge-group-row')[0] as HTMLElement).click();
    await settle(fixture);
    (el.querySelectorAll('.oge-group-row')[0] as HTMLElement).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row').length).toBe(2);
    expect(log.length).toBe(2);
  });
});
