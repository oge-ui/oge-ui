import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  Fragment,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { OgeScheduler, type OgeSchedulerHandle } from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  createDemoRangeSource,
  type RangeLogEntry,
  type ZoneAppt,
} from '../scheduler/time-zone-data';
import { SCHEDULER_REMOTE_DATA_DEMOS } from './remote-data-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_REMOTE_DATA_SECTIONS = ['Range loading'] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

function RangeDemo(): ReactNode {
  const scheduler = useRef<OgeSchedulerHandle<ZoneAppt>>(null);
  const [log, setLog] = useState<readonly RangeLogEntry[]>([]);
  // one source for the demo's lifetime: a new object would rebind
  const [source] = useState(() =>
    createDemoRangeSource((entry) =>
      setLog((entries) =>
        [
          entry,
          ...entries.filter((existing) => existing.id !== entry.id),
        ].slice(0, 30),
      ),
    ),
  );
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      createElement(
        'button',
        {
          type: 'button',
          className: BUTTON,
          onClick: () => scheduler.current?.reload(),
        },
        'Reload',
      ),
    ),
    createElement(OgeScheduler<ZoneAppt>, {
      ref: scheduler,
      dataSource: source,
      defaultCurrentDate: new Date(2026, 2, 4),
      defaultCurrentView: 'week',
      dayStartHour: 8,
      dayEndHour: 18,
      style: { height: 520 },
    }),
    createElement(
      'ol',
      {
        className: 'mt-3 max-h-40 overflow-auto text-xs',
        'aria-label': 'Requests',
      },
      log.map((entry) =>
        createElement(
          'li',
          { key: entry.id },
          `#${entry.id} ${entry.text} — ${entry.state}`,
        ),
      ),
    ),
  );
}

/**
 * The React half of "Remote data" — rendered inside
 * `/components/scheduler/remote-data` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-scheduler-remote-data-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/scheduler/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['load', 'signal', 'insert / update / remove', 'reload()']"
      heading="Range loading"
      description="A fake server with 400 ms latency. Navigate quickly: the log shows the debounce, the prefetched neighbours answering from the cache, and the requests aborted on the way. Drag or edit an appointment — the change goes through the source's <code>update</code>, then the range reloads."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="range" />
    </app-demo-card>
  `,
})
export class ReactSchedulerRemoteDataDemos {
  protected readonly demos = SCHEDULER_REMOTE_DATA_DEMOS;
  protected readonly range = () => createElement(RangeDemo);
}
