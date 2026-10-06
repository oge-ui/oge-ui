import { demoSource } from '../../shared/demo-source';

export const ZONE_SWITCHER_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- Stored dates are instants; [timeZone] picks the clocks the views show.
     Each meeting keeps its own zone (startTimeZone): a series recurs on that
     zone's clocks, and the editor shows the zone pickers. -->
<label class="mb-3 flex items-center gap-2 text-sm">
  Display zone
  <select (change)="zone.set($any($event.target).value)">
    @for (option of zones; track option.value) {
      <option [value]="option.value" [selected]="option.value === zone()">
        {{ option.text }}
      </option>
    }
  </select>
</label>
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="week"
  [timeZone]="zone() || undefined"
  [showTimeZoneEditor]="true"
  [dayStartHour]="0"
  [dayEndHour]="24"
  [scrollTime]="7"
  style="height: 560px"
/>`,
  body: `protected readonly zones = [
  { value: '', text: 'Browser zone' },
  { value: 'America/New_York', text: 'New York' },
  { value: 'Europe/Istanbul', text: 'Istanbul' },
  { value: 'Asia/Kathmandu', text: 'Kathmandu (UTC+5:45)' },
  { value: 'Australia/Lord_Howe', text: 'Lord Howe (half-hour DST)' },
];
protected readonly zone = signal('Europe/Istanbul');
protected readonly date = new Date(Date.UTC(2026, 2, 4, 12));
protected readonly appointments = [
  {
    id: 1,
    text: 'New York standup',
    startDate: new Date(Date.UTC(2026, 2, 2, 14, 0)), // 09:00 EST
    endDate: new Date(Date.UTC(2026, 2, 2, 14, 30)),
    recurrenceRule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
    startTimeZone: 'America/New_York',
  },
  {
    id: 2,
    text: 'Kathmandu support sync',
    startDate: new Date(Date.UTC(2026, 2, 4, 12, 15)), // 18:00 NPT
    endDate: new Date(Date.UTC(2026, 2, 4, 13, 15)),
    startTimeZone: 'Asia/Kathmandu',
  },
];`,
});

export const DST_DAY_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  template: `<!-- New York springs forward at 02:00 on 8 March 2026: the day has 23 hours.
     Slots stay wall-clock slots (02:00–03:00 is skipped by the clocks), a
     drag or a click there lands on the first real instant after the gap, and
     the daily 09:00 series stays at 09:00 on both sides of the switch. -->
<oge-scheduler
  [dataSource]="appointments"
  [currentDate]="date"
  currentView="day"
  [views]="['day', 'week']"
  timeZone="America/New_York"
  [scrollTime]="0"
  (cellClick)="clicked.set($event.cellDate.toISOString())"
  style="height: 560px"
/>
<p class="mt-2 text-sm" aria-live="polite">Last clicked slot (UTC): {{ clicked() }}</p>`,
  body: `protected readonly clicked = signal('—');
protected readonly date = new Date(Date.UTC(2026, 2, 8, 17));
protected readonly appointments = [
  {
    id: 1,
    text: 'Night shift (1½ real hours)',
    startDate: new Date(Date.UTC(2026, 2, 8, 6, 0)), // 01:00 EST
    endDate: new Date(Date.UTC(2026, 2, 8, 7, 30)), // 03:30 EDT
  },
  {
    id: 2,
    text: 'Daily check-in',
    startDate: new Date(Date.UTC(2026, 2, 6, 14, 0)), // 09:00 EST
    endDate: new Date(Date.UTC(2026, 2, 6, 14, 30)),
    recurrenceRule: 'FREQ=DAILY;COUNT=5',
    startTimeZone: 'America/New_York',
  },
];`,
});
