import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { OgeDateBox, type OgeDateBoxProps } from './date-box';

const input = () => screen.getByRole('combobox') as HTMLInputElement;
const railButton = () =>
  document.querySelector('.oge-input-dropdown') as HTMLElement;
const panel = () => document.querySelector('.oge-date-box-panel');
const timeSlots = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-date-box-time'));

const dayCell = (text: string, scope: ParentNode = document) =>
  Array.from(
    scope.querySelectorAll<HTMLButtonElement>('.oge-calendar-cell'),
  ).find(
    (cell) =>
      cell.textContent?.trim() === text &&
      !cell.classList.contains('oge-calendar-cell-other'),
  );

interface HostState {
  values: (Date | null)[];
  panelEvents: string[];
}

function newState(): HostState {
  return { values: [], panelEvents: [] };
}

function renderHost(
  state: HostState,
  initial: Date | null = null,
  extra: Partial<OgeDateBoxProps> = {},
) {
  function Host() {
    const [value, setValue] = useState<Date | null>(initial);
    return (
      <OgeDateBox
        label="When"
        locale="en-US"
        interval={60}
        value={value}
        onValueChange={(next) => {
          state.values.push(next);
          setValue(next);
        }}
        onDropDownOpened={() => state.panelEvents.push('opened')}
        onDropDownClosed={() => state.panelEvents.push('closed')}
        {...extra}
      />
    );
  }
  return render(<Host />);
}

const current = (state: HostState, initial: Date | null = null) =>
  state.values.length ? state.values[state.values.length - 1] : initial;

function type(text: string): void {
  fireEvent.change(input(), { target: { value: text } });
}

/** Opens the picker and lets the popup measurement + focus hand-off settle. */
async function open(): Promise<void> {
  fireEvent.click(railButton());
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

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

describe('<OgeDateBox>', () => {
  it('formats the bound value via Intl and shows the calendar rail icon', () => {
    renderHost(newState(), new Date(2026, 7, 6));
    expect(input().value).toBe('8/6/26'); // en-US dateStyle: short
    expect(railButton()).toBeTruthy();
  });

  it('commits parsed text on Enter and clears on empty commit', () => {
    const state = newState();
    renderHost(state);
    type('8/6/2026');
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(current(state)).toEqual(new Date(2026, 7, 6));
    type('');
    fireEvent.blur(input());
    expect(current(state)).toBeNull();
  });

  it('marks unparseable text invalid while typing and reverts on blur', () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 6));
    type('garbage');
    expect(document.querySelector('.oge-input-invalid')).toBeTruthy();
    fireEvent.blur(input());
    expect(current(state, new Date(2026, 7, 6))).toEqual(new Date(2026, 7, 6));
    expect(input().value).toBe('8/6/26'); // reverted, not cleared
    expect(document.querySelector('.oge-input-invalid')).toBeNull();
  });

  it('out-of-range text is invalid and never clamped', () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 15), { min: new Date(2026, 7, 10) });
    type('8/5/2026'); // before min
    expect(document.querySelector('.oge-input-invalid')).toBeTruthy();
    fireEvent.blur(input());
    expect(current(state, new Date(2026, 7, 15))).toEqual(
      new Date(2026, 7, 15),
    );
  });

  it('opens the picker and hands DOM focus to the calendar grid; a pick commits and closes', async () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 15));
    await open();
    const dialog = panel() as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(state.panelEvents).toEqual(['opened']);
    expect(document.activeElement).toBe(
      dialog.querySelector('[data-focus-target]'),
    ); // APG focus hand-off

    fireEvent.click(dayCell('20', dialog) as HTMLElement);
    expect(current(state, new Date(2026, 7, 15))).toEqual(
      new Date(2026, 7, 20),
    );
    await waitFor(() => expect(panel()).toBeNull());
    expect(document.activeElement).toBe(input()); // focus restored
    expect(state.panelEvents).toEqual(['opened', 'closed']);
  });

  it('type=time shows the interval list and picking merges into the day', async () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 6, 9, 0), { type: 'time' });
    expect(input().value).toMatch(/9:00/);
    await open();
    expect(timeSlots()).toHaveLength(24); // 60-minute interval
    fireEvent.click(
      timeSlots().find(
        (slot) => slot.textContent?.trim() === '2:00 PM',
      ) as HTMLElement,
    );
    expect(current(state, new Date(2026, 7, 6, 9, 0))).toEqual(
      new Date(2026, 7, 6, 14, 0),
    );
  });

  it('datetime keeps the popup open after a date pick and closes on time pick', async () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 15, 9, 30), { type: 'datetime' });
    await open();
    fireEvent.click(dayCell('20', panel() as HTMLElement) as HTMLElement);
    // date committed with the time-of-day preserved; popup still open
    expect(current(state)).toEqual(new Date(2026, 7, 20, 9, 30));
    expect(panel()).toBeTruthy();
    expect(state.panelEvents).toEqual(['opened']); // still open — no closed yet

    fireEvent.click(
      timeSlots().find(
        (slot) => slot.textContent?.trim() === '2:00 PM',
      ) as HTMLElement,
    );
    expect(current(state)).toEqual(new Date(2026, 7, 20, 14, 0));
    await waitFor(() => expect(panel()).toBeNull());
    expect(state.panelEvents).toEqual(['opened', 'closed']);
  });

  it('useButtons collects picks in a draft and commits on OK only', async () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 15), {
      applyValueMode: 'useButtons',
    });
    await open();
    fireEvent.click(dayCell('20', panel() as HTMLElement) as HTMLElement);
    expect(state.values).toHaveLength(0); // drafted, not committed
    fireEvent.click(document.querySelector('.oge-date-box-ok') as HTMLElement);
    expect(current(state, new Date(2026, 7, 15))).toEqual(
      new Date(2026, 7, 20),
    );
    await waitFor(() => expect(panel()).toBeNull());
  });

  it('timeView=columns renders hour + minute columns and commits picks live', async () => {
    const state = newState();
    renderHost(state, new Date(2026, 7, 6, 9, 0), {
      type: 'time',
      timeView: 'columns',
      interval: 15,
    });
    await open();
    const cols = document.querySelectorAll('.oge-date-box-col');
    expect(cols).toHaveLength(2);
    expect(cols[0].querySelectorAll('.oge-date-box-time')).toHaveLength(24);
    expect(cols[1].querySelectorAll('.oge-date-box-time')).toHaveLength(4); // 15-min

    fireEvent.click(
      Array.from(
        cols[0].querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
      ).find((slot) => slot.textContent?.trim() === '2 PM') as HTMLElement,
    );
    expect(current(state, new Date(2026, 7, 6, 9, 0))).toEqual(
      new Date(2026, 7, 6, 14, 0),
    );
    expect(panel()).toBeTruthy(); // stays open for the minute pick

    fireEvent.click(
      Array.from(
        cols[1].querySelectorAll<HTMLButtonElement>('.oge-date-box-time'),
      ).find((slot) => slot.textContent?.trim() === ':45') as HTMLElement,
    );
    expect(current(state, new Date(2026, 7, 6, 9, 0))).toEqual(
      new Date(2026, 7, 6, 14, 45),
    );
  });
});
