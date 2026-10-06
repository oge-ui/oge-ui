import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OgeGantt } from '@oge-ui/gantt';
import { OgeKanban } from '@oge-ui/kanban';
import { OgeScheduler } from '@oge-ui/scheduler';
import type { SsrFamily } from '../render';

// Local wall-clock dates, fixed: nothing here may depend on "today".
@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeScheduler],
  template: `
    <oge-scheduler
      [dataSource]="appointments"
      [currentDate]="date"
      currentView="week"
      [dayStartHour]="8"
      [dayEndHour]="18"
      style="height: 560px"
    />
  `,
})
class SchedulerHost {
  protected readonly date = new Date(2026, 7, 6);
  protected readonly appointments = [
    {
      id: 1,
      text: 'Design review',
      startDate: new Date(2026, 7, 4, 9, 30),
      endDate: new Date(2026, 7, 4, 11, 0),
    },
    {
      id: 2,
      text: 'Customer workshop',
      startDate: new Date(2026, 7, 5),
      endDate: new Date(2026, 7, 7),
      allDay: true,
    },
  ];
}

export const SCHEDULER: SsrFamily = {
  name: 'scheduler',
  host: SchedulerHost,
  expect: ['oge-scheduler', 'Design review'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeGantt],
  template: `
    <oge-gantt [tasks]="tasks" [dependencies]="links" style="height: 420px" />
  `,
})
class GanttHost {
  protected readonly tasks = [
    {
      id: 1,
      title: 'Release 1.0',
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 21),
    },
    {
      id: 2,
      parentId: 1,
      title: 'Design',
      start: new Date(2026, 7, 3),
      end: new Date(2026, 7, 7),
      progress: 100,
    },
    {
      id: 3,
      parentId: 1,
      title: 'Ship',
      start: new Date(2026, 7, 21),
      end: new Date(2026, 7, 21),
    },
  ];
  protected readonly links = [{ id: 'a', predecessorId: 2, successorId: 3 }];
}

export const GANTT: SsrFamily = {
  name: 'gantt',
  host: GanttHost,
  // the active zoom level's <option> carries the attribute on the server
  expect: ['oge-gantt', 'Release 1.0', 'selected=""'],
};

@Component({
  selector: 'app-ssr-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="tasks"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      dueDateExpr="due"
      [columns]="columns"
      style="height: 480px"
    />
  `,
})
class KanbanHost {
  protected readonly columns = [
    { key: 'todo', title: 'To do' },
    { key: 'doing', title: 'In progress', wipLimit: 3 },
    { key: 'done', title: 'Done' },
  ];
  protected readonly tasks = [
    {
      id: 1,
      status: 'doing',
      title: 'Checkout revamp',
      due: new Date(2026, 7, 21),
    },
    { id: 2, status: 'todo', title: 'Upgrade CI runners' },
  ];
}

export const KANBAN: SsrFamily = {
  name: 'kanban',
  host: KanbanHost,
  expect: ['oge-kanban', 'Checkout revamp'],
};
