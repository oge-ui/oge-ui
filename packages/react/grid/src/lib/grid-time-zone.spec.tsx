import { fireEvent, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { OgeGrid } from './grid';
import type { OgeGridHandle } from './grid-types';

interface Job {
  id: number;
  due: Date;
}

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h));

const JOBS: Job[] = [
  { id: 1, due: utc(2026, 3, 5, 2) },
  { id: 2, due: utc(2026, 3, 6, 12) },
];

const rows = () => document.querySelectorAll('.oge-rows .oge-row');

function setup() {
  const ref = createRef<OgeGridHandle<Job>>();
  render(
    <OgeGrid
      ref={ref}
      data={JOBS}
      keyField="id"
      locale="en-US"
      timeZone="America/New_York"
      filterRow
      filterDebounce={0}
      columns={[
        { field: 'id', dataType: 'number' },
        { field: 'due', caption: 'Due (NY)', dataType: 'date' },
        {
          field: 'due',
          caption: 'Due (UTC)',
          dataType: 'date',
          timeZone: 'UTC',
          filterable: false,
        },
      ]}
    />,
  );
  return ref;
}

describe('<OgeGrid> timeZone', () => {
  it("shows each date column on its zone's clock", async () => {
    setup();
    await waitFor(() => expect(rows()).toHaveLength(2));
    const texts = Array.from(rows()[0].querySelectorAll('.oge-cell')).map((c) =>
      c.textContent?.trim(),
    );
    expect(texts.slice(1)).toEqual(['3/4/2026', '3/5/2026']);
  });

  it("filters the zone's whole day from the filter row", async () => {
    const ref = setup();
    await waitFor(() => expect(rows()).toHaveLength(2));
    const input = document.querySelectorAll(
      '.oge-filter-input .oge-input-native',
    )[1] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3/4/2026' } });
    fireEvent.blur(input);
    await waitFor(() => expect(rows()).toHaveLength(1));
    const expr = ref.current?.state().filter?.row?.[0]?.[1];
    expect(
      expr?.type === 'and'
        ? expr.operands.map((o) =>
            o.type === 'binary' ? (o.value as Date).toISOString() : '',
          )
        : [],
    ).toEqual(['2026-03-04T05:00:00.000Z', '2026-03-05T05:00:00.000Z']);
  });
});
