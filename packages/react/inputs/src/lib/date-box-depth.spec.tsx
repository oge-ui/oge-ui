import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  ogeDateRangePresets,
  type OgeCalendarRange,
  type OgeDateRangePreset,
} from '@oge-ui/behavior';
import { OgeDateBox, type OgeDateBoxProps } from './date-box';
import { OgeDateRangeBox, type OgeDateRangeBoxProps } from './date-range-box';

const q = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector(selector) as T | null;
const qa = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
) => Array.from(root.querySelectorAll(selector)) as T[];
const byText = (els: Element[], text: string) =>
  els.find((el) => el.textContent?.trim() === text) as HTMLElement | undefined;

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function open(): Promise<void> {
  fireEvent.click(q('.oge-input-dropdown') as HTMLElement);
  await flush();
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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function DateHost(props: {
  initial: Date | null;
  log: (Date | null)[];
  extra?: Partial<OgeDateBoxProps>;
}) {
  const [value, setValue] = useState<Date | null>(props.initial);
  return (
    <OgeDateBox
      label="At"
      value={value}
      onValueChange={(next) => {
        props.log.push(next);
        setValue(next);
      }}
      {...props.extra}
    />
  );
}

describe('<OgeDateBox> time depth', () => {
  it('renders hour / minute / second / AM-PM columns in 12-hour mode', async () => {
    const log: (Date | null)[] = [];
    render(
      <DateHost
        initial={new Date(2026, 7, 6, 9, 0, 0)}
        log={log}
        extra={{
          locale: 'en-US',
          type: 'time',
          timeView: 'columns',
          hour12: true,
          showSeconds: true,
          interval: 15,
        }}
      />,
    );
    await open();
    const cols = qa('.oge-date-box-col');
    expect(cols.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Hours',
      'Minutes',
      'Seconds',
      'AM/PM',
    ]);
    expect(qa('.oge-date-box-time', cols[0])).toHaveLength(12);
    fireEvent.click(byText(qa('.oge-date-box-time', cols[3]), 'PM')!);
    expect(log.at(-1)).toEqual(new Date(2026, 7, 6, 21, 0, 0));
    fireEvent.click(byText(qa('.oge-date-box-time', cols[2]), ':30')!);
    expect(log.at(-1)?.getSeconds()).toBe(30);
  });

  it('Now commits the current time and closes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 4, 17, 25, 41));
    const log: (Date | null)[] = [];
    render(
      <DateHost
        initial={null}
        log={log}
        extra={{
          locale: 'en-US',
          type: 'datetime',
          showNowButton: true,
          showTodayButton: true,
        }}
      />,
    );
    await open();
    expect(q('.oge-date-box-today')).toBeTruthy();
    fireEvent.click(q('.oge-date-box-now') as HTMLElement);
    expect(log.at(-1)).toEqual(new Date(2026, 2, 4, 17, 25, 0));
    await flush();
    expect(q('.oge-date-box-panel')).toBeNull();
  });
});

describe('<OgeDateBox useMaskBehavior>', () => {
  const key = (k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(screen.getByRole('combobox'), { key: k, ...init });

  it('fills locale-ordered segments and commits on blur (StrictMode)', () => {
    const log: (Date | null)[] = [];
    render(
      <StrictMode>
        <DateHost
          initial={null}
          log={log}
          extra={{ locale: 'de-DE', useMaskBehavior: true }}
        />
      </StrictMode>,
    );
    const el = screen.getByRole('combobox') as HTMLInputElement;
    expect(el.value).toBe('');
    fireEvent.focus(el);
    expect(el.value).toBe('dd.mm.yyyy');
    expect([el.selectionStart, el.selectionEnd]).toEqual([0, 2]);
    for (const k of '24032026') key(k);
    expect(el.value).toBe('24.03.2026');
    expect(log).toEqual([]);
    fireEvent.blur(el);
    expect(log.at(-1)).toEqual(new Date(2026, 2, 24));
  });

  it('steps segments with arrows, flags impossible dates and reverts on blur', () => {
    const log: (Date | null)[] = [];
    render(
      <DateHost
        initial={new Date(2026, 0, 31)}
        log={log}
        extra={{ locale: 'de-DE', useMaskBehavior: true }}
      />,
    );
    const el = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(el);
    key('ArrowRight');
    key('ArrowUp');
    expect(el.value).toBe('31.02.2026');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(el);
    expect(el.value).toBe('31.01.2026');
    expect(log).toEqual([]);
  });

  it('opens the picker on Alt+ArrowDown', async () => {
    render(
      <DateHost
        initial={null}
        log={[]}
        extra={{ locale: 'de-DE', useMaskBehavior: true }}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    key('ArrowDown', { altKey: true });
    await flush();
    expect(q('.oge-date-box-panel')).toBeTruthy();
  });
});

function RangeHost(props: {
  log: OgeCalendarRange[];
  extra?: Partial<OgeDateRangeBoxProps>;
}) {
  const [value, setValue] = useState<OgeCalendarRange>([null, null]);
  return (
    <OgeDateRangeBox
      label="Period"
      locale="en-US"
      interval={60}
      value={value}
      onValueChange={(next) => {
        props.log.push(next);
        setValue(next);
      }}
      {...props.extra}
    />
  );
}

describe('<OgeDateRangeBox> presets and time ranges', () => {
  const presets: OgeDateRangePreset[] = [
    ogeDateRangePresets.last7Days(),
    ogeDateRangePresets.thisMonth(),
    { label: 'Q1', range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)] },
  ];

  it('lists presets beside the calendar; a pick commits and closes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 18, 12));
    const log: OgeCalendarRange[] = [];
    render(<RangeHost log={log} extra={{ presets }} />);
    await open();
    const buttons = qa('.oge-date-range-preset');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Last 7 days',
      'This month',
      'Q1',
    ]);
    expect(q('.oge-date-range-presets')).toHaveAttribute(
      'aria-label',
      'Quick ranges',
    );
    fireEvent.click(buttons[0]);
    expect(log.at(-1)).toEqual([new Date(2026, 2, 12), new Date(2026, 2, 18)]);
    await flush();
    expect(q('.oge-date-box-panel')).toBeNull();
    await open();
    expect(qa('.oge-date-range-preset')[0]).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('type time drops the calendar and commits both times via OK', async () => {
    const log: OgeCalendarRange[] = [];
    render(<RangeHost log={log} extra={{ type: 'time' }} />);
    await open();
    expect(q('.oge-calendar')).toBeNull();
    const lists = qa('.oge-date-range-time-col .oge-date-box-times');
    expect(lists).toHaveLength(2);
    fireEvent.click(qa('.oge-date-box-time', lists[0])[9]);
    fireEvent.click(qa('.oge-date-box-time', lists[1])[17]);
    fireEvent.click(q('.oge-date-box-ok') as HTMLElement);
    const [start, end] = log.at(-1) ?? [null, null];
    expect([start?.getHours(), end?.getHours()]).toEqual([9, 17]);
    expect((q('.oge-date-range-input') as HTMLInputElement | null)?.value).toBe(
      '9:00 AM',
    );
  });
});
