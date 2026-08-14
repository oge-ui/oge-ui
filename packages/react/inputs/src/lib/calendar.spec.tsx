import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { OgeCalendar, type OgeCalendarProps } from './calendar';
import type { OgeCalendarRange } from '@oge-ui/behavior';

const cells = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-calendar-cell'));

const dayCell = (text: string, view = 0): HTMLButtonElement | undefined => {
  const views = document.querySelectorAll('.oge-calendar-view');
  const scope = views[view] ?? document;
  return Array.from(
    scope.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
  ).find(
    (cell) =>
      cell.textContent?.trim() === text &&
      !cell.classList.contains('oge-calendar-cell-other'),
  );
};

const headerLabel = (): string =>
  document.querySelector('.oge-calendar-view-label')?.textContent?.trim() ?? '';

const focusTargetText = (): string =>
  document.querySelector('[data-focus-target]')?.textContent?.trim() ?? '';

const zoomOut = (): void => {
  fireEvent.click(
    document.querySelector('.oge-calendar-view-label') as HTMLElement,
  );
};

function press(key: string, init: object = {}): void {
  fireEvent.keyDown(
    document.querySelector('.oge-calendar-grid') as HTMLElement,
    { key, ...init },
  );
}

/** The roving focus lands via setTimeout — let it run. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

interface HostState {
  values: (Date | null)[];
  ranges: OgeCalendarRange[];
  clicks: { date: Date; view: string; event: Event }[];
}

function newState(): HostState {
  return { values: [], ranges: [], clicks: [] };
}

function renderHost(
  state: HostState,
  initial: Date | null = new Date(2026, 7, 15),
  extra: Partial<OgeCalendarProps> = {},
) {
  function Host() {
    const [value, setValue] = useState<Date | null>(initial);
    return (
      <OgeCalendar
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        onCellClick={(event) => state.clicks.push(event)}
        firstDayOfWeek={1}
        locale="en-US"
        {...extra}
      />
    );
  }
  return render(<Host />);
}

const currentValue = (
  state: HostState,
  initial: Date | null = new Date(2026, 7, 15),
): Date | null =>
  state.values.length ? state.values[state.values.length - 1] : initial;

describe('<OgeCalendar>', () => {
  it('renders the month of the bound value with the selection marked', () => {
    renderHost(newState());
    expect(headerLabel()).toBe('August 2026');
    const selected = document.querySelector('.oge-calendar-cell-selected');
    expect(selected?.textContent?.trim()).toBe('15');
    expect(selected?.getAttribute('aria-selected')).toBe('true');
    // Monday-first weekday header
    expect(
      document.querySelector('.oge-calendar-weekday')?.textContent,
    ).toContain('Mon');
  });

  it('clicking a day commits it as a local midnight Date', () => {
    const state = newState();
    renderHost(state);
    fireEvent.click(dayCell('20') as HTMLElement);
    expect(currentValue(state)).toEqual(new Date(2026, 7, 20));
  });

  it('onCellClick reports the activated cell with date, view and DOM event', async () => {
    const state = newState();
    renderHost(state);
    fireEvent.click(dayCell('20') as HTMLElement);
    expect(state.clicks).toHaveLength(1);
    expect(state.clicks[0].date).toEqual(new Date(2026, 7, 20));
    expect(state.clicks[0].view).toBe('month');
    expect(state.clicks[0].event).toBeInstanceOf(Event);

    // zoom out: a year-view cell reports view 'year'
    zoomOut();
    fireEvent.click(
      cells().find((cell) => cell.textContent?.trim() === 'Mar') as HTMLElement,
    );
    await settle();
    expect(state.clicks).toHaveLength(2);
    expect(state.clicks[1].view).toBe('year');
    expect(state.clicks[1].date.getMonth()).toBe(2);
  });

  it('min/max and disabledDates render disabled, unselectable cells', () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 15), {
      min: new Date(2026, 7, 10),
      disabledDates: [new Date(2026, 7, 12)],
    });
    expect(dayCell('9')?.disabled).toBe(true);
    const day12 = dayCell('12');
    expect(day12?.disabled).toBe(true);
    fireEvent.click(day12 as HTMLElement);
    expect(currentValue(state)).toEqual(new Date(2026, 7, 15)); // unchanged
  });

  it('navigates months and drills through year/decade views', async () => {
    renderHost(newState());
    const [prev, , next] = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.oge-calendar-header button',
      ),
    );
    fireEvent.click(next);
    expect(headerLabel()).toBe('September 2026');
    fireEvent.click(prev);
    expect(headerLabel()).toBe('August 2026');

    // zoom out to the year view, pick March, land back in the month view
    zoomOut();
    expect(headerLabel()).toBe('2026');
    fireEvent.click(
      cells().find((cell) => cell.textContent?.trim() === 'Mar') as HTMLElement,
    );
    await settle();
    expect(headerLabel()).toBe('March 2026');

    // and out to the decade view
    zoomOut();
    zoomOut();
    expect(headerLabel()).toBe('2020–2029');
  });

  it('exactly one day cell carries the reachable tabindex (roving)', () => {
    renderHost(newState());
    const reachable = cells().filter((cell) => cell.tabIndex === 0);
    expect(reachable).toHaveLength(1);
    expect(reachable[0].textContent?.trim()).toBe('15'); // anchored on value
  });

  it('the today button selects today and marks aria-current', () => {
    const state = newState();
    renderHost(state, null, { showTodayButton: true });
    fireEvent.click(
      document.querySelector('.oge-calendar-today-btn') as HTMLElement,
    );
    const today = new Date();
    expect(currentValue(state, null)).toEqual(
      new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    expect(document.querySelector('[aria-current="date"]')).toBeTruthy();
  });

  it('multiple selection toggles days in and out of the set', () => {
    const collected: (readonly Date[])[] = [];
    function Host() {
      const [values, setValues] = useState<readonly Date[]>([]);
      return (
        <OgeCalendar
          selectionMode="multiple"
          values={values}
          onValuesChange={(next) => {
            collected.push(next);
            setValues(next);
          }}
          defaultFocusedDate={new Date(2026, 7, 15)}
          firstDayOfWeek={1}
          locale="en-US"
        />
      );
    }
    render(<Host />);
    fireEvent.click(dayCell('10') as HTMLElement);
    fireEvent.click(dayCell('12') as HTMLElement);
    expect(
      document.querySelectorAll('.oge-calendar-cell-selected'),
    ).toHaveLength(2);
    fireEvent.click(dayCell('10') as HTMLElement); // toggles back off
    expect(
      document.querySelectorAll('.oge-calendar-cell-selected'),
    ).toHaveLength(1);
    expect(collected[collected.length - 1]).toHaveLength(1);
  });

  it('renderCell replaces the cell body', () => {
    renderHost(newState(), new Date(2026, 7, 15), {
      renderCell: (context) => <span data-day={context.date.getDate()}>•</span>,
    });
    expect(document.querySelector('[data-day="15"]')).toBeTruthy();
    // the default day text is gone — every cell renders the custom body
    expect(dayCell('15')).toBeUndefined();
    expect(cells()).toHaveLength(42);
  });
});

describe('<OgeCalendar> keyboard', () => {
  it('arrows move the roving focus by day and week', async () => {
    const focused: (Date | null)[] = [];
    renderHost(newState(), new Date(2026, 7, 15), {
      onFocusedDateChange: (date) => focused.push(date),
    });
    await settle();
    expect(focusTargetText()).toBe('15');
    press('ArrowRight');
    await settle();
    expect(focusTargetText()).toBe('16');
    expect(focused[focused.length - 1]).toEqual(new Date(2026, 7, 16));
    press('ArrowDown');
    await settle();
    expect(focusTargetText()).toBe('23');
    press('ArrowUp');
    press('ArrowLeft');
    await settle();
    expect(focusTargetText()).toBe('15');
  });

  it('crossing a month boundary swaps the visible month', async () => {
    renderHost(newState(), new Date(2026, 7, 31));
    await settle();
    press('ArrowRight');
    await settle();
    expect(headerLabel()).toBe('September 2026');
    expect(focusTargetText()).toBe('1');
  });

  it('PgUp/PgDn move by month, with Shift by year', async () => {
    renderHost(newState());
    await settle();
    press('PageDown');
    await settle();
    expect(headerLabel()).toBe('September 2026');
    press('PageUp');
    await settle();
    expect(headerLabel()).toBe('August 2026');
    press('PageDown', { shiftKey: true });
    await settle();
    expect(headerLabel()).toBe('August 2027');
  });

  it('Home/End jump to the week edges (Monday-first)', async () => {
    renderHost(newState());
    await settle();
    // Aug 15 2026 is a Saturday; Monday-first week: Mon 10 … Sun 16
    press('Home');
    await settle();
    expect(focusTargetText()).toBe('10');
    press('End');
    await settle();
    expect(focusTargetText()).toBe('16');
  });
});

describe('<OgeCalendar> range selection', () => {
  function renderRange(state: HostState) {
    function Host() {
      const [range, setRange] = useState<OgeCalendarRange>([null, null]);
      return (
        <OgeCalendar
          selectionMode="range"
          viewsCount={2}
          range={range}
          onRangeChange={(next) => {
            state.ranges.push(next);
            setRange(next);
          }}
          defaultFocusedDate={new Date(2026, 7, 15)}
          firstDayOfWeek={1}
          locale="en-US"
        />
      );
    }
    return render(<Host />);
  }

  const lastRange = (state: HostState): OgeCalendarRange =>
    state.ranges[state.ranges.length - 1] ?? [null, null];

  it('renders two side-by-side month views with titles', () => {
    renderRange(newState());
    expect(document.querySelectorAll('.oge-calendar-view')).toHaveLength(2);
    const titles = Array.from(
      document.querySelectorAll('.oge-calendar-view-title'),
    ).map((title) => title.textContent?.trim());
    expect(titles).toHaveLength(2);
    expect(titles[0]).not.toBe(titles[1]); // consecutive months
    // a lead-in day never duplicates the roving tabindex across views
    expect(
      document.querySelectorAll('.oge-calendar-cell[tabindex="0"]'),
    ).toHaveLength(1);
  });

  it('first click starts the range, second completes it (swapped if reversed)', () => {
    const state = newState();
    renderRange(state);
    fireEvent.click(dayCell('20', 0) as HTMLElement);
    expect(lastRange(state)[0]).not.toBeNull();
    expect(lastRange(state)[1]).toBeNull();
    fireEvent.click(dayCell('10', 0) as HTMLElement); // before start → swapped
    expect(lastRange(state)[0]?.getDate()).toBe(10);
    expect(lastRange(state)[1]?.getDate()).toBe(20);
    // interior days get the range shading; edges the selected style
    expect(
      document.querySelectorAll('.oge-calendar-cell-in-range'),
    ).toHaveLength(9);
    expect(
      document.querySelectorAll('.oge-calendar-cell-selected'),
    ).toHaveLength(2);
  });

  it('hovering previews the range while the end is open', () => {
    const state = newState();
    renderRange(state);
    fireEvent.click(dayCell('10', 0) as HTMLElement);
    fireEvent.mouseEnter(dayCell('15', 0) as HTMLElement);
    expect(
      document.querySelectorAll('.oge-calendar-cell-in-range'),
    ).toHaveLength(4); // 11..14
  });

  it('a range across both views spans the shading over the boundary', () => {
    const state = newState();
    renderRange(state);
    fireEvent.click(dayCell('28', 0) as HTMLElement);
    fireEvent.click(dayCell('3', 1) as HTMLElement);
    const [start, end] = lastRange(state);
    expect(start?.getDate()).toBe(28);
    expect(end?.getDate()).toBe(3);
    expect(end && start && end.getTime() > start.getTime()).toBe(true);
  });
});
