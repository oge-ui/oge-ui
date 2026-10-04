import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React date editors page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/date-box.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom (`value` + `onValueChange` instead of `[(value)]`,
 * `range`/`onRangeChange` instead of `[(range)]`).
 */
export const INPUTS_DATE_BOX_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Calendar',
    description:
      'WAI-ARIA date grid with a roving-tabindex day: arrows move ±1/±7 days, PgUp/PgDn ±1 month (Shift ±1 year), Home/End week edges. The header drills out to year and decade views. min/max/disabledDates gate selection; week numbers follow a configurable rule.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCalendar'] },
      name: 'CalendarDemo',
      before: `const min = new Date(2026, 7, 10);

const isWeekend = (day: Date): boolean =>
  day.getDay() === 0 || day.getDay() === 6;`,
      body: `const [date, setDate] = useState<Date | null>(new Date(2026, 7, 15));`,
      jsx: `<div className="demo-row">
  <OgeCalendar value={date} onValueChange={setDate} />
  <OgeCalendar
    min={min}
    disabledDates={isWeekend}
    showTodayButton
    showWeekNumbers
    firstDayOfWeek={1}
    value={date}
    onValueChange={setDate}
  />
  <div>
    value: <code>{date?.toDateString() ?? 'null'}</code>
  </div>
</div>`,
    }),
  },
  {
    title: 'Date Box',
    description:
      "The value is always a local Date | null — serialization is the app's concern. Typed text parses by the locale's own part order (dd/mm vs mm/dd) incl. month names; unparseable or out-of-range text shows the invalid state and reverts on blur. The popup follows the APG date-picker-dialog pattern: focus moves into the calendar, Esc returns it.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeDateBox'] },
      name: 'DateBoxDemo',
      before: `const min = new Date(2026, 7, 10);`,
      body: `const [start, setStart] = useState<Date | null>(null);
const [delivery, setDelivery] = useState<Date | null>(null);`,
      jsx: `<div className="demo-row">
  <OgeDateBox label="Start date" value={start} onValueChange={setStart} />
  {/* typed text parses locale-aware through Intl — never Date.parse */}
  <OgeDateBox
    label="Delivery"
    min={min}
    showClearButton
    hint="Not before Aug 10"
    value={delivery}
    onValueChange={setDelivery}
  />
</div>`,
    }),
  },
  {
    title: 'Range selection',
    description:
      "selectionMode: 'range' turns the calendar into a start–end picker with a live hover preview; viewsCount: 2 lays two months side by side. OgeDateRangeBox puts the same picker behind a single field with two parsed inputs — a reversed pair reorders on commit, either end may stay open. type: 'datetime' adds start/end time lists: day and time picks collect in a draft and commit together on OK.",
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeCalendar', 'OgeDateRangeBox'],
      },
      types: { '@oge-ui/react-inputs': ['OgeCalendarRange'] },
      name: 'RangeDemo',
      body: `const [range, setRange] = useState<OgeCalendarRange>([null, null]);
const [period, setPeriod] = useState<OgeCalendarRange>([
  new Date(2026, 7, 10),
  new Date(2026, 7, 20),
]);
const [maintenance, setMaintenance] = useState<OgeCalendarRange>([
  new Date(2026, 7, 14, 22, 0),
  new Date(2026, 7, 15, 6, 30),
]);`,
      jsx: `<div className="demo-row">
  {/* two-view range calendar with hover preview */}
  <OgeCalendar
    selectionMode="range"
    viewsCount={2}
    range={range}
    onRangeChange={setRange}
    firstDayOfWeek={1}
  />
  <div>
    {/* start–end on one field; typed or picked, reversed pairs reorder */}
    <OgeDateRangeBox
      label="Period"
      showClearButton
      value={period}
      onValueChange={setPeriod}
    />
    <div>
      period:{' '}
      <code>
        {period[0]?.toDateString() ?? '—'} → {period[1]?.toDateString() ?? '—'}
      </code>
    </div>
    {/* datetime range: start/end time lists + OK, commits as a draft */}
    <OgeDateRangeBox
      label="Maintenance window"
      type="datetime"
      interval={30}
      showClearButton
      value={maintenance}
      onValueChange={setMaintenance}
    />
    <div>
      window:{' '}
      <code>
        {maintenance[0]?.toLocaleString() ?? '—'} →{' '}
        {maintenance[1]?.toLocaleString() ?? '—'}
      </code>
    </div>
  </div>
</div>`,
    }),
  },
  {
    title: 'Time & datetime',
    description:
      "type switches the editor: time shows a time picker (clock rail icon), datetime pairs it with the calendar — picking a date keeps the popup open for the time. timeView selects the picker layout: one interval list, or iOS-style hour + minute columns. applyValueMode: 'useButtons' collects picks in a draft and commits on OK.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeDateBox'] },
      name: 'TimeDemo',
      body: `const [meeting, setMeeting] = useState<Date | null>(
  new Date(2026, 7, 15, 9, 30),
);
const [alarm, setAlarm] = useState<Date | null>(new Date(2026, 7, 15, 7, 0));
const [due, setDue] = useState<Date | null>(null);`,
      jsx: `<div className="demo-row">
  <OgeDateBox
    label="Meeting"
    type="datetime"
    interval={15}
    value={meeting}
    onValueChange={setMeeting}
  />
  {/* one interval list (default) … */}
  <OgeDateBox
    label="Alarm (list)"
    type="time"
    value={alarm}
    onValueChange={setAlarm}
  />
  {/* … or hour + minute columns */}
  <OgeDateBox
    label="Alarm (columns)"
    type="time"
    timeView="columns"
    interval={5}
    value={alarm}
    onValueChange={setAlarm}
  />
  {/* OK/Cancel commit policy */}
  <OgeDateBox
    label="Due"
    applyValueMode="useButtons"
    value={due}
    onValueChange={setDue}
  />
</div>`,
    }),
  },
  {
    title: 'Clock, seconds & shortcuts',
    description:
      'hour12: true adds an AM/PM column to the column picker (hours 12, 1 … 11); false forces 24-hour; unset follows the locale. showSeconds adds a seconds column and shows the seconds in the field — typed HH:MM:SS parses. showTodayButton / showNowButton put Today and Now in the footer: Today keeps the time of day, Now commits the current time.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeDateBox'] },
      name: 'ClockDemo',
      body: `const [departure, setDeparture] = useState<Date | null>(
  new Date(2026, 7, 15, 18, 45, 0),
);
const [loggedAt, setLoggedAt] = useState<Date | null>(null);`,
      jsx: `<div className="demo-row">
  {/* AM/PM + seconds columns, a Now shortcut */}
  <OgeDateBox
    label="Departure"
    type="time"
    timeView="columns"
    hour12
    showSeconds
    showNowButton
    value={departure}
    onValueChange={setDeparture}
  />
  {/* Today keeps the time of day; Now takes the current time */}
  <OgeDateBox
    label="Logged at"
    type="datetime"
    showTodayButton
    showNowButton
    value={loggedAt}
    onValueChange={setLoggedAt}
  />
</div>`,
    }),
  },
  {
    title: 'Masked entry',
    description:
      "useMaskBehavior swaps free typing for segments in the locale's own order and separators (dd.mm.yyyy in de-DE): digits fill the selected segment and jump on once no further digit fits, ArrowUp/Down step it, ArrowLeft/Right move between segments (mirrored in RTL), Backspace clears one, a/p set AM/PM and Alt+ArrowDown opens the picker. A pasted date fills every segment; an impossible one shows the invalid state and reverts on blur.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeDateBox'] },
      name: 'MaskedDateDemo',
      body: `const [invoiceDate, setInvoiceDate] = useState<Date | null>(null);
const [checkIn, setCheckIn] = useState<Date | null>(
  new Date(2026, 7, 15, 14, 0),
);`,
      jsx: `<div className="demo-row">
  <OgeDateBox
    label="Invoice date"
    locale="de-DE"
    useMaskBehavior
    value={invoiceDate}
    onValueChange={setInvoiceDate}
  />
  <OgeDateBox
    label="Check-in"
    type="datetime"
    locale="en-US"
    useMaskBehavior
    value={checkIn}
    onValueChange={setCheckIn}
  />
</div>`,
    }),
  },
  {
    title: 'Range presets & time ranges',
    description:
      'presets lists quick ranges beside the calendar — the built-in ogeDateRangePresets.last7Days(), thisMonth(), lastMonth()… (labels from the messages) or your own { label, range: () => [start, end] }, evaluated on pick. The active preset reads aria-pressed; the adaptive dialog shows them as a chip row. type: "time" makes a time-range picker: no calendar, two time lists and OK.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeDateRangeBox', 'ogeDateRangePresets'],
      },
      types: {
        '@oge-ui/react-inputs': ['OgeCalendarRange', 'OgeDateRangePreset'],
      },
      name: 'PresetsDemo',
      before: `// Presets are evaluated on render and on pick, never at construction.
const presets: OgeDateRangePreset[] = [
  ogeDateRangePresets.today(),
  ogeDateRangePresets.last7Days(),
  ogeDateRangePresets.last30Days(),
  ogeDateRangePresets.thisMonth(),
  ogeDateRangePresets.lastMonth(),
  ogeDateRangePresets.thisYear(),
  { label: 'Q1 2026', range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)] },
];`,
      body: `const [report, setReport] = useState<OgeCalendarRange>([null, null]);
const [hours, setHours] = useState<OgeCalendarRange>([
  new Date(2026, 7, 15, 9, 0),
  new Date(2026, 7, 15, 17, 30),
]);`,
      jsx: `<div className="demo-row">
  <OgeDateRangeBox
    label="Report period"
    presets={presets}
    value={report}
    onValueChange={setReport}
  />
  {/* a time-range picker: no calendar, two lists + OK */}
  <OgeDateRangeBox
    label="Opening hours"
    type="time"
    interval={30}
    value={hours}
    onValueChange={setHours}
  />
</div>`,
    }),
  },
];
