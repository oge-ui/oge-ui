import { demoSource } from '../../shared/demo-source';

export const CALENDAR_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCalendar'] },
  template: `<oge-calendar [(value)]="date" />

<oge-calendar
  [min]="min"
  [disabledDates]="isWeekend"
  [showTodayButton]="true"
  [showWeekNumbers]="true"
  [firstDayOfWeek]="1"
  [(value)]="date"
/>`,
  body: `protected readonly date = signal<Date | null>(null);
protected readonly min = new Date(2026, 0, 1);

protected readonly isWeekend = (day: Date): boolean =>
  day.getDay() === 0 || day.getDay() === 6;`,
});

export const DATEBOX_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateBox'] },
  template: `<oge-date-box label="Start date" [(value)]="start" />

<!-- typed text parses locale-aware through Intl — never Date.parse -->
<oge-date-box
  label="Delivery"
  [min]="today"
  [showClearButton]="true"
  [(value)]="delivery"
/>`,
  body: `protected readonly start = signal<Date | null>(null);
protected readonly delivery = signal<Date | null>(null);
protected readonly today = new Date();`,
});

export const TYPES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateBox'] },
  template: `<oge-date-box label="Meeting" type="datetime" [interval]="15" [(value)]="at" />
<oge-date-box label="Alarm" type="time" [interval]="30" [(value)]="alarm" />

<!-- OK/Cancel commit policy -->
<oge-date-box label="Due" applyValueMode="useButtons" [(value)]="due" />`,
  body: `protected readonly at = signal<Date | null>(null);
protected readonly alarm = signal<Date | null>(null);
protected readonly due = signal<Date | null>(null);`,
});

export const GRID_SNIPPET = demoSource({
  use: { '@oge-ui/grid': ['OgeColumn', 'OgeGrid'] },
  template: `<!-- grid date editors and the filter row now run on <oge-date-box> -->
<oge-grid [data]="rows" keyField="id" [filterRow]="true" [editing]="{ mode: 'cell' }">
  <oge-column field="shipped" dataType="date" />
</oge-grid>
<!-- filtering builds a timezone-safe local day-range: [startOfDay, nextDay) -->`,
  body: `protected readonly rows = [
  { id: 1, shipped: new Date(2026, 2, 11) },
  { id: 2, shipped: new Date(2026, 5, 2) },
];`,
});

export const RANGE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCalendar', 'OgeDateRangeBox'] },
  types: { '@oge-ui/inputs': ['OgeCalendarRange'] },
  template: `<!-- two-view range calendar with hover preview -->
<oge-calendar selectionMode="range" [viewsCount]="2" [(range)]="range" />

<!-- start–end on one field; typed or picked, reversed pairs reorder -->
<oge-date-range-box label="Period" [(value)]="period" />

<!-- datetime range: start/end time lists + OK, commits as a draft; two
     date-times need a wider field than the 240px default -->
<oge-date-range-box type="datetime" [interval]="30" width="min(100%, 360px)" [(value)]="window" />`,
  body: `protected readonly range = signal<OgeCalendarRange>([null, null]);
protected readonly period = signal<OgeCalendarRange>([null, null]);
protected readonly window = signal<OgeCalendarRange>([null, null]);`,
});

export const TIMEVIEW_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateBox'] },
  template: `<!-- one interval list (default) … -->
<oge-date-box type="time" timeView="list" [interval]="30" [(value)]="t1" />

<!-- … or hour + minute columns -->
<oge-date-box type="time" timeView="columns" [interval]="5" [(value)]="t2" />`,
  body: `protected readonly t1 = signal<Date | null>(null);
protected readonly t2 = signal<Date | null>(null);`,
});

export const CLOCK_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateBox'] },
  template: `<!-- hour12: true adds an AM/PM column (hours 12, 1 … 11); showSeconds
     adds a seconds column and puts the seconds in the display text. -->
<oge-date-box
  label="Departure"
  type="time"
  timeView="columns"
  [hour12]="true"
  [showSeconds]="true"
  [showNowButton]="true"
  [(value)]="departure"
/>

<!-- Today / Now footer shortcuts; Today keeps the time of day -->
<oge-date-box
  label="Logged at"
  type="datetime"
  [showTodayButton]="true"
  [showNowButton]="true"
  [(value)]="loggedAt"
/>`,
  body: `protected readonly departure = signal<Date | null>(new Date(2026, 7, 15, 18, 45, 0));
protected readonly loggedAt = signal<Date | null>(null);`,
});

export const MASK_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateBox'] },
  template: `<!-- Segment entry: the locale's numeric pattern (dd.mm.yyyy in de-DE),
     digits fill the selected segment and auto-advance, ArrowUp/Down step
     it, ArrowLeft/Right move, Alt+ArrowDown opens the picker. -->
<oge-date-box
  label="Invoice date"
  locale="de-DE"
  [useMaskBehavior]="true"
  [(value)]="invoiceDate"
/>

<oge-date-box
  label="Check-in"
  type="datetime"
  locale="en-US"
  [useMaskBehavior]="true"
  [(value)]="checkIn"
/>`,
  body: `protected readonly invoiceDate = signal<Date | null>(null);
protected readonly checkIn = signal<Date | null>(new Date(2026, 7, 15, 14, 0));`,
});

export const PRESETS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeDateRangeBox'] },
  helpers: { '@oge-ui/inputs': ['ogeDateRangePresets'] },
  types: { '@oge-ui/inputs': ['OgeCalendarRange', 'OgeDateRangePreset'] },
  template: `<!-- Presets list beside the calendar (a chip row in the adaptive
     dialog). Built-ins take their labels from the messages; a custom
     preset is { label, range: () => [start, end] }. -->
<oge-date-range-box label="Report period" [presets]="presets" [(value)]="report" />

<!-- type="time": a time-range picker — no calendar, two lists + OK -->
<oge-date-range-box label="Opening hours" type="time" [interval]="30" [(value)]="hours" />`,
  body: `protected readonly presets: OgeDateRangePreset[] = [
  ogeDateRangePresets.today(),
  ogeDateRangePresets.last7Days(),
  ogeDateRangePresets.last30Days(),
  ogeDateRangePresets.thisMonth(),
  ogeDateRangePresets.lastMonth(),
  ogeDateRangePresets.thisYear(),
  { label: 'Q1 2026', range: () => [new Date(2026, 0, 1), new Date(2026, 2, 31)] },
];
protected readonly report = signal<OgeCalendarRange>([null, null]);
protected readonly hours = signal<OgeCalendarRange>([
  new Date(2026, 7, 15, 9, 0),
  new Date(2026, 7, 15, 17, 30),
]);`,
});
