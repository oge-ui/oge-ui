import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import type { OgeExportingEvent } from '@oge-ui/behavior';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];

describe('<OgeGrid> server-side export', () => {
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

  it('builds the request, lets onExporting rename or cancel, and saves the result', async () => {
    const ref = createRef<OgeGridHandle<Row>>();
    let cancel = true;
    const events: OgeExportingEvent[] = [];
    render(
      <OgeGrid<Row>
        ref={ref}
        data={ROWS}
        keyField="id"
        columns={['name']}
        selection={{ mode: 'multiple' }}
        selectedKeys={[1]}
        defaultFilterValue={{
          type: 'binary',
          field: 'name',
          op: 'contains',
          value: 'a',
        }}
        onExporting={(event) => {
          events.push(event);
          if (cancel) event.cancel = true;
          else event.fileName = 'renamed.xlsx';
        }}
      />,
    );
    const request = ref.current!.getExportRequest('xlsx', {
      fileName: 'people',
      scope: 'selection',
    });
    expect(request).toMatchObject({
      format: 'xlsx',
      fileName: 'people.xlsx',
      loadOptions: {
        filter: { type: 'binary', field: 'name', op: 'contains', value: 'a' },
      },
      columns: [{ field: 'name', caption: 'Name', dataType: 'string' }],
      selectedKeys: [1],
    });
    const handler = vi.fn(async () => '/api/exports/9');
    await act(() => ref.current!.exportOnServer('xlsx', handler, 'people'));
    expect(handler).not.toHaveBeenCalled();
    cancel = false;
    await act(() =>
      ref.current!.exportOnServer('xlsx', handler, 'people', {
        scope: 'selection',
      }),
    );
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'renamed.xlsx', selectedKeys: [1] }),
    );
    expect(clicked).toEqual(['/api/exports/9 → renamed.xlsx']);
    expect(events).toHaveLength(2);
    expect(ref.current!.getExportRequest('csv').fileName).toBe('grid.csv');
  });
});
