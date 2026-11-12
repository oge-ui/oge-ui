import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { OgeExportingEvent } from '@oge-ui/behavior';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  joined: Date;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', joined: new Date(2026, 0, 1) },
  { id: 2, name: 'Grace', joined: new Date(2026, 1, 1) },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeGrid server-side export', () => {
  let clicked: string[];
  beforeEach(() => {
    clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(`${this.getAttribute('href')} → ${this.download}`);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('columns', [
      'name',
      { field: 'joined', caption: 'Joined', dataType: 'date' },
    ]);
    fixture.componentRef.setInput('selection', { mode: 'multiple' });
    fixture.componentRef.setInput('filterValue', {
      type: 'binary',
      field: 'name',
      op: 'contains',
      value: 'a',
    });
    fixture.detectChanges();
    await settle(fixture);
    return { fixture, grid: fixture.componentInstance };
  }

  it('builds the request from the view and saves the URL the server returns', async () => {
    const { fixture, grid } = await render();
    const request = grid.getExportRequest('xlsx', { fileName: 'people' });
    expect(request).toMatchObject({
      format: 'xlsx',
      fileName: 'people.xlsx',
      loadOptions: {
        filter: { type: 'binary', field: 'name', op: 'contains', value: 'a' },
      },
      columns: [
        { field: 'name', caption: 'Name', dataType: 'string' },
        { field: 'joined', caption: 'Joined', dataType: 'date' },
      ],
    });
    fixture.componentRef.setInput('selectedKeys', [2]);
    await settle(fixture);
    expect(
      grid.getExportRequest('csv', { scope: 'selection' }).selectedKeys,
    ).toEqual([2]);
    const handler = vi.fn(async () => '/api/exports/7');
    await grid.exportOnServer('xlsx', handler, 'people');
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'people.xlsx' }),
    );
    expect(clicked).toEqual(['/api/exports/7 → people.xlsx']);
  });

  it('lets the exporting event rename or cancel', async () => {
    const { grid } = await render();
    const events: OgeExportingEvent[] = [];
    let cancel = true;
    grid.exporting.subscribe((event) => {
      events.push(event);
      if (cancel) event.cancel = true;
      else event.fileName = 'renamed.csv';
    });
    const handler = vi.fn(async () => new Blob(['a']));
    await grid.exportOnServer('csv', handler);
    expect(handler).not.toHaveBeenCalled();
    cancel = false;
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    await grid.exportOnServer('csv', handler, 'grid', { scope: 'selection' });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'renamed.csv', selectedKeys: [] }),
    );
    expect(clicked).toEqual(['blob:x → renamed.csv']);
    expect(events.map((e) => e.fileName)).toEqual(['grid.csv', 'renamed.csv']);
  });
});
