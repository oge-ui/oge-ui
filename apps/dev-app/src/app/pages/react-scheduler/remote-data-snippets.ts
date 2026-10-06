import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Remote data" page — section-for-section mirror
 * of `../scheduler/remote-data-snippets.ts`. Pure data.
 */
export const SCHEDULER_REMOTE_DATA_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Range loading',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-scheduler': ['OgeScheduler'] },
      types: {
        '@oge-ui/react-scheduler': [
          'OgeSchedulerDataSource',
          'OgeSchedulerHandle',
        ],
      },
      name: 'RemoteCalendar',
      before: `// load() runs per visible range: the neighbours are prefetched, navigation
// is debounced, a range the user navigated away from is aborted through
// signal, and every range is cached. Edits go through insert / update /
// remove, then the range reloads.
type Appt = Record<string, unknown>;

// module scope: one source for the component's lifetime (a new object
// would rebind and reload)
const source: OgeSchedulerDataSource<Appt> = {
  debounce: 200,
  load: async ({ startDate, endDate, signal }) => {
    const query = new URLSearchParams({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    });
    // the server returns every appointment overlapping the range, recurring
    // series included; the scheduler expands occurrences client-side
    const response = await fetch('/api/appointments?' + query.toString(), { signal });
    const rows: { id: number; text: string; start: string; end: string }[] =
      await response.json();
    return rows.map((row) => ({
      id: row.id,
      text: row.text,
      startDate: new Date(row.start),
      endDate: new Date(row.end),
    }));
  },
  insert: (item) =>
    fetch('/api/appointments', { method: 'POST', body: JSON.stringify(item) }),
  update: (key, patch) =>
    fetch('/api/appointments/' + String(key), {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  remove: (key) => fetch('/api/appointments/' + String(key), { method: 'DELETE' }),
};`,
      body: `const scheduler = useRef<OgeSchedulerHandle<Appt>>(null);`,
      jsx: `<>
  <div className="mb-3 flex gap-2">
    <button type="button" onClick={() => scheduler.current?.reload()}>
      Reload
    </button>
  </div>
  <OgeScheduler
    ref={scheduler}
    dataSource={source}
    defaultCurrentDate={new Date(2026, 2, 4)}
    defaultCurrentView="week"
    dayStartHour={8}
    dayEndHour={18}
    style={{ height: 560 }}
  />
</>`,
    }),
  },
];
