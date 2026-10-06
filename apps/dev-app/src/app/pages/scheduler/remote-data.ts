import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OgeScheduler } from '@oge-ui/scheduler';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_SCHEDULER_REMOTE_DATA_SECTIONS,
  ReactSchedulerRemoteDataDemos,
} from '../react-scheduler/remote-data';
import { RANGE_LOADING_SNIPPET } from './remote-data-snippets';
import {
  createDemoRangeSource,
  type RangeLogEntry,
  type ZoneAppt,
} from './time-zone-data';

const SECTIONS = ['Range loading'] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

@Component({
  selector: 'app-scheduler-remote-data',
  imports: [
    DemoCard,
    DocHeader,
    OgeScheduler,
    PageToc,
    ReactSchedulerRemoteDataDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Remote data"
      category="Scheduler"
      categoryLink="/components/scheduler"
      [chips]="[
        'OgeSchedulerDataSource',
        'load({ startDate, endDate, signal })',
        'prefetch',
        'reload()',
        'remoteFiltering',
      ]"
    >
      <p>
        A real calendar holds years of appointments; the scheduler asks for the
        period on screen. Bind an <code>OgeSchedulerDataSource</code> and its
        <code>load</code> runs per visible range with instants and an
        <code>AbortSignal</code>. The previous and next periods are prefetched,
        quick navigation is debounced, a range the user left is aborted, and
        every loaded range is cached. A filtering <code>&#64;oge-ui/core</code>
        <code>DataSource</code> (OData, a custom source) gets the same per-range
        loading with <code>remoteFiltering</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-scheduler-remote-data-demos />
    } @else {
      <app-demo-card
        [chips]="['load', 'signal', 'insert / update / remove', 'reload()']"
        heading="Range loading"
        description="A fake server with 400 ms latency. Navigate quickly: the log shows the debounce, the prefetched neighbours answering from the cache, and the requests aborted on the way. Drag or edit an appointment — the change goes through the source's <code>update</code>, then the range reloads."
        [code]="snippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button type="button" [class]="button" (click)="scheduler().reload()">
            Reload
          </button>
        </div>
        <oge-scheduler
          #cal
          [dataSource]="source"
          [currentDate]="date"
          currentView="week"
          [dayStartHour]="8"
          [dayEndHour]="18"
          style="height: 520px"
        />
        <ol class="mt-3 max-h-40 overflow-auto text-xs" aria-label="Requests">
          @for (entry of log(); track entry.id) {
            <li>#{{ entry.id }} {{ entry.text }} — {{ entry.state }}</li>
          }
        </ol>
      </app-demo-card>
    }
  `,
})
export class SchedulerRemoteDataPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_SCHEDULER_REMOTE_DATA_SECTIONS;
  protected readonly snippet = RANGE_LOADING_SNIPPET;
  protected readonly button = BUTTON;
  protected readonly scheduler =
    viewChild.required<OgeScheduler<ZoneAppt>>('cal');

  protected readonly date = new Date(2026, 2, 4);
  protected readonly log = signal<readonly RangeLogEntry[]>([]);
  protected readonly source = createDemoRangeSource((entry) =>
    this.log.update((entries) => {
      const rest = entries.filter((existing) => existing.id !== entry.id);
      return [entry, ...rest].slice(0, 30);
    }),
  );
}
