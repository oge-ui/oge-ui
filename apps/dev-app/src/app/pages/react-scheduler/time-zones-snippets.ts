import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Time zones" page — section-for-section mirror
 * of `../scheduler/time-zones-snippets.ts`. Pure data.
 */
export const SCHEDULER_TIME_ZONE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Display zone',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'DistributedTeam',
      before: `// Stored dates are instants; timeZone picks the clocks the views show.
// Each meeting keeps its own zone (startTimeZone): a series recurs on that
// zone's clocks, and the editor shows the zone pickers.
const zones = [
  { value: '', text: 'Browser zone' },
  { value: 'America/New_York', text: 'New York' },
  { value: 'Europe/Istanbul', text: 'Istanbul' },
  { value: 'Asia/Kathmandu', text: 'Kathmandu (UTC+5:45)' },
  { value: 'Australia/Lord_Howe', text: 'Lord Howe (half-hour DST)' },
];

const appointments = [
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
      body: `const [zone, setZone] = useState('Europe/Istanbul');`,
      jsx: `<>
  <label className="mb-3 flex items-center gap-2 text-sm">
    Display zone
    <select value={zone} onChange={(event) => setZone(event.target.value)}>
      {zones.map((option) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  </label>
  <OgeScheduler
    dataSource={appointments}
    defaultCurrentDate={new Date(Date.UTC(2026, 2, 4, 12))}
    defaultCurrentView="week"
    timeZone={zone || undefined}
    showTimeZoneEditor
    scrollTime={7}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
  {
    title: 'DST day',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      name: 'SpringForward',
      before: `// New York springs forward at 02:00 on 8 March 2026: the day has 23 hours.
// Slots stay wall-clock slots (02:00–03:00 is skipped by the clocks), a
// drag or a click there lands on the first real instant after the gap, and
// the daily 09:00 series stays at 09:00 on both sides of the switch.
const appointments = [
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
      body: `const [clicked, setClicked] = useState('—');`,
      jsx: `<>
  <OgeScheduler
    dataSource={appointments}
    defaultCurrentDate={new Date(Date.UTC(2026, 2, 8, 17))}
    defaultCurrentView="day"
    views={['day', 'week']}
    timeZone="America/New_York"
    scrollTime={0}
    onCellClick={(event) => setClicked(event.cellDate.toISOString())}
    style={{ height: 560 }}
  />
  <p className="mt-2 text-sm" aria-live="polite">
    Last clicked slot (UTC): {clicked}
  </p>
</>`,
    }),
  },
];
