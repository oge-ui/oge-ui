import { demoSource } from '../../shared/demo-source';

export const RANGE_LOADING_SNIPPET = demoSource({
  use: { '@oge-ui/scheduler': ['OgeScheduler'] },
  types: {
    '@oge-ui/scheduler': ['OgeSchedulerDataSource', 'OgeSchedulerLoadOptions'],
  },
  template: `<!-- load() runs per visible range: the neighbours are prefetched, navigation
     is debounced, a range the user navigated away from is aborted through
     signal, and every range is cached. Edits go through insert / update /
     remove, then the range reloads. -->
<div class="mb-3 flex gap-2">
  <button type="button" (click)="scheduler().reload()">Reload</button>
</div>
<oge-scheduler
  #cal
  [dataSource]="source"
  [currentDate]="date"
  currentView="week"
  [dayStartHour]="8"
  [dayEndHour]="18"
  style="height: 560px"
/>`,
  body: `protected readonly scheduler = viewChild.required<OgeScheduler<Record<string, unknown>>>('cal');
protected readonly date = new Date(2026, 2, 4);
protected readonly source: OgeSchedulerDataSource<Record<string, unknown>> = {
  debounce: 200,
  load: async ({ startDate, endDate, signal }: OgeSchedulerLoadOptions) => {
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
  remove: (key) =>
    fetch('/api/appointments/' + String(key), { method: 'DELETE' }),
};`,
});
