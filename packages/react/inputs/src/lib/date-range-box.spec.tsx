import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import {
  OgeDateRangeBox,
  type OgeDateRangeBoxHandle,
  type OgeDateRangeBoxProps,
} from './date-range-box';
import type { OgeCalendarRange } from '@oge-ui/behavior';

const inputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll('.oge-date-range-input'));
const railButton = () =>
  document.querySelector('.oge-input-dropdown') as HTMLElement;
const panel = () => document.querySelector('.oge-date-box-panel');
const timeLists = (): HTMLElement[] =>
  Array.from(
    document.querySelectorAll('.oge-date-range-time-col .oge-date-box-times'),
  );

const dayCell = (text: string, scope: ParentNode) =>
  Array.from(
    scope.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
  ).find(
    (cell) =>
      cell.textContent?.trim() === text &&
      !cell.classList.contains('oge-calendar-cell-other'),
  );

interface HostState {
  values: OgeCalendarRange[];
  handle: { current: OgeDateRangeBoxHandle | null };
}

function newState(): HostState {
  return { values: [], handle: { current: null } };
}

function renderHost(
  state: HostState,
  initial: OgeCalendarRange = [null, null],
  extra: Partial<OgeDateRangeBoxProps> = {},
) {
  function Host() {
    const [value, setValue] = useState<OgeCalendarRange>(initial);
    const handle = useRef<OgeDateRangeBoxHandle>(null);
    state.handle = handle;
    return (
      <OgeDateRangeBox
        ref={handle}
        label="Period"
        locale="en-US"
        interval={60}
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        {...extra}
      />
    );
  }
  return render(<Host />);
}

const current = (
  state: HostState,
  initial: OgeCalendarRange = [null, null],
): OgeCalendarRange =>
  state.values.length ? state.values[state.values.length - 1] : initial;

function type(el: HTMLInputElement, text: string): void {
  fireEvent.change(el, { target: { value: text } });
}

async function open(): Promise<void> {
  fireEvent.click(railButton());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const pickSlot = (list: HTMLElement, text: string): void => {
  fireEvent.click(
    Array.from(
      list.querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
    ).find((slot) => slot.textContent?.trim() === text) as HTMLElement,
  );
};

beforeEach(() => {
  vi.stubGlobal(
    'requestAnimationFrame',
    (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 0) as unknown as number,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('<OgeDateRangeBox>', () => {
  it('formats both ends of the bound tuple', () => {
    renderHost(newState(), [new Date(2026, 7, 10), new Date(2026, 7, 20)]);
    const [start, end] = inputs();
    expect(start.value).toBe('8/10/26');
    expect(end.value).toBe('8/20/26');
  });

  it('typed sides commit ordered on blur; bad text reverts', () => {
    const state = newState();
    renderHost(state);
    const [start, end] = inputs();
    // reversed pair typed → reordered on commit
    type(start, '8/20/2026');
    type(end, '8/10/2026');
    fireEvent.blur(start);
    expect(current(state)[0]).toEqual(new Date(2026, 7, 10));
    expect(current(state)[1]).toEqual(new Date(2026, 7, 20));

    // garbage on one side keeps the committed value
    type(inputs()[1], 'nope');
    fireEvent.blur(inputs()[1]);
    expect(current(state)[1]).toEqual(new Date(2026, 7, 20));
  });

  it('the popup hosts a two-view range calendar; completing the range commits and closes', async () => {
    const state = newState();
    renderHost(state, [new Date(2026, 7, 15), null]);
    await open();
    const views = document.querySelectorAll('.oge-calendar-view');
    expect(views).toHaveLength(2);
    fireEvent.click(dayCell('20', views[0]) as HTMLElement);
    expect(current(state)).toEqual([
      new Date(2026, 7, 15),
      new Date(2026, 7, 20),
    ]);
    await waitFor(() => expect(panel()).toBeNull()); // closed once complete
  });

  it('clear empties both ends', () => {
    const state = newState();
    renderHost(state, [new Date(2026, 7, 10), new Date(2026, 7, 20)]);
    act(() => state.handle.current?.clear());
    expect(current(state)).toEqual([null, null]);
    expect(inputs()[0].value).toBe('');
  });

  describe('type: datetime', () => {
    const DATETIME: Partial<OgeDateRangeBoxProps> = { type: 'datetime' };

    it('renders time-of-day and parses typed datetimes', () => {
      const state = newState();
      renderHost(
        state,
        [new Date(2026, 7, 10, 9, 30), new Date(2026, 7, 20, 17, 0)],
        DATETIME,
      );
      const [start, end] = inputs();
      expect(start.value).toBe('8/10/26, 9:30 AM');
      expect(end.value).toBe('8/20/26, 5:00 PM');
      type(start, '8/12/2026 8:15 AM');
      fireEvent.blur(start);
      expect(current(state)[0]).toEqual(new Date(2026, 7, 12, 8, 15));
    });

    it('day picks keep the popup open (commit happens via OK)', async () => {
      const state = newState();
      renderHost(state, [new Date(2026, 7, 15, 9, 30), null], DATETIME);
      await open();
      fireEvent.click(
        dayCell(
          '20',
          document.querySelector('.oge-calendar-view') as ParentNode,
        ) as HTMLElement,
      );
      // still open, nothing committed yet
      expect(panel()).not.toBeNull();
      expect(state.values).toHaveLength(0);
      expect(timeLists()).toHaveLength(2);
    });

    it('side time picks + OK commit the range with times, ordered', async () => {
      const state = newState();
      renderHost(
        state,
        [new Date(2026, 7, 10, 9, 30), new Date(2026, 7, 20, 17, 0)],
        DATETIME,
      );
      await open();
      const [startList, endList] = timeLists();
      pickSlot(startList, '11:00 AM');
      // draft only — value untouched until OK
      expect(state.values).toHaveLength(0);
      expect(
        timeLists()[0].querySelector('.oge-date-box-time-selected')
          ?.textContent,
      ).toContain('11:00 AM');
      pickSlot(endList, '3:00 PM');
      fireEvent.click(
        document.querySelector('.oge-date-box-ok') as HTMLElement,
      );
      expect(current(state)).toEqual([
        new Date(2026, 7, 10, 11, 0),
        new Date(2026, 7, 20, 15, 0),
      ]);
      await waitFor(() => expect(panel()).toBeNull());
    });

    it('picking a day keeps the time-of-day of that side', async () => {
      const state = newState();
      renderHost(
        state,
        [new Date(2026, 7, 10, 9, 30), new Date(2026, 7, 20, 17, 0)],
        DATETIME,
      );
      await open();
      // range restarts at the 12th → the start side keeps 9:30
      fireEvent.click(
        dayCell(
          '12',
          document.querySelector('.oge-calendar-view') as ParentNode,
        ) as HTMLElement,
      );
      fireEvent.click(
        document.querySelector('.oge-date-box-ok') as HTMLElement,
      );
      expect(current(state)[0]).toEqual(new Date(2026, 7, 12, 9, 30));
    });
  });
});
