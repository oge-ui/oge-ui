import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { OgeCalendar } from './calendar';
import { OgeDateBox } from './date-box';

const utc = (y: number, m: number, d: number, h = 0) =>
  new Date(Date.UTC(y, m - 1, d, h));

describe('React date editors with a timeZone', () => {
  it("date box: shows the zone's day and commits its midnight", () => {
    const seen: (Date | null)[] = [];
    function Host() {
      const [value, setValue] = useState<Date | null>(utc(2026, 3, 5, 2));
      return (
        <OgeDateBox
          label="Due"
          locale="en-US"
          timeZone="America/New_York"
          value={value}
          onValueChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    const { container } = render(<Host />);
    const input = container.querySelector(
      '.oge-input-native',
    ) as HTMLInputElement;
    expect(input.value).toBe('3/4/26');
    fireEvent.change(input, { target: { value: '3/20/2026' } });
    fireEvent.blur(input);
    expect(seen.at(-1)?.toISOString()).toBe('2026-03-20T04:00:00.000Z');
  });

  it("calendar: the selection and picks are the zone's days", () => {
    const picked: (Date | null)[] = [];
    const ranges: (readonly [Date | null, Date | null])[] = [];
    const { container, rerender } = render(
      <OgeCalendar
        locale="en-US"
        timeZone="Asia/Tokyo"
        defaultValue={utc(2026, 3, 10, 12)}
        onValueChange={(next) => picked.push(next)}
      />,
    );
    const cell = (text: string) =>
      Array.from(
        container.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
      ).find(
        (c) =>
          c.textContent?.trim() === text &&
          !c.classList.contains('oge-calendar-cell-other'),
      ) as HTMLButtonElement;
    expect(
      container
        .querySelector('.oge-calendar-cell-selected')
        ?.textContent?.trim(),
    ).toBe('10');
    fireEvent.click(cell('12'));
    expect(picked.at(-1)?.toISOString()).toBe('2026-03-11T15:00:00.000Z');
    rerender(
      <OgeCalendar
        locale="en-US"
        timeZone="Asia/Tokyo"
        selectionMode="range"
        defaultFocusedDate={new Date(2026, 2, 10)}
        onRangeChange={(next) => ranges.push(next)}
      />,
    );
    fireEvent.click(cell('14'));
    fireEvent.click(cell('16'));
    expect(ranges.at(-1)?.map((d) => d?.toISOString())).toEqual([
      '2026-03-13T15:00:00.000Z',
      '2026-03-15T15:00:00.000Z',
    ]);
  });
});
