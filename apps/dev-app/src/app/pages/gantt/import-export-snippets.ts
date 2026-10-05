import { demoSource } from '../../shared/demo-source';

export const MSPROJECT_SNIPPET = demoSource({
  use: { '@oge-ui/gantt': ['OgeGantt'] },
  types: {
    '@oge-ui/gantt': ['OgeGanttResource', 'OgeGanttWorkCalendar'],
  },
  template: `<!-- /export-msproject has no dependencies: MSPDI XML with WBS, outline
     levels, manual mode, constraints, deadlines, baselines, links with lag,
     resources, assignments with units and the calendar. The import returns
     plain data in the default field names — bind it. -->
<div class="mb-3 flex flex-wrap gap-2">
  <button type="button" (click)="exportXml()">Download .xml</button>
  <input type="file" accept=".xml" (change)="importXml($event)" />
</div>
<oge-gantt
  #gantt
  [tasks]="tasks()"
  [dependencies]="links()"
  [resources]="resources()"
  [workCalendar]="calendar()"
  style="height: 420px"
/>`,
  body: `protected readonly gantt = viewChild.required<OgeGantt<Record<string, unknown>>>('gantt');
protected readonly tasks = signal<Record<string, unknown>[]>([
  { id: 1, title: 'Pack', start: new Date(2026, 7, 3), end: new Date(2026, 7, 6) },
  { id: 2, title: 'Move', start: new Date(2026, 7, 7), end: new Date(2026, 7, 8) },
]);
protected readonly links = signal<Record<string, unknown>[]>([
  { id: 'a', predecessorId: 1, successorId: 2, lag: 1 },
]);
protected readonly resources = signal<OgeGanttResource[]>([]);
protected readonly calendar = signal<OgeGanttWorkCalendar | null>(null);

protected async exportXml(): Promise<void> {
  const { exportGanttToMsProject } = await import('@oge-ui/gantt/export-msproject');
  exportGanttToMsProject(this.gantt(), { filename: 'plan.xml', title: 'Office move' });
}

protected async importXml(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const { importMsProjectXml } = await import('@oge-ui/gantt/export-msproject');
  const plan = importMsProjectXml(await file.text());
  this.tasks.set(plan.tasks as unknown as Record<string, unknown>[]);
  this.links.set(plan.dependencies as unknown as Record<string, unknown>[]);
  this.resources.set(plan.resources);
  this.calendar.set(plan.workCalendar);
}`,
});
