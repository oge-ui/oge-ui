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

<!-- datetime range: start/end time lists + OK, commits as a draft -->
<oge-date-range-box type="datetime" [interval]="30" [(value)]="window" />`,
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
