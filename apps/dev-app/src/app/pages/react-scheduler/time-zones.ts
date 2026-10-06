import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, Fragment, useState, type ReactNode } from 'react';
import { OgeScheduler } from '@oge-ui/react-scheduler';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEMO_ZONES,
  DST_DATE,
  ZONE_DATE,
  dstAppointments,
  zoneAppointments,
  type ZoneAppt,
} from '../scheduler/time-zone-data';
import { SCHEDULER_TIME_ZONE_DEMOS } from './time-zones-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_SCHEDULER_TIME_ZONE_SECTIONS = [
  'Display zone',
  'DST day',
] as const;

function ZoneDemo(): ReactNode {
  const [data] = useState(() => zoneAppointments());
  const [zone, setZone] = useState('Europe/Istanbul');
  return createElement(
    Fragment,
    null,
    createElement(
      'label',
      { className: 'mb-3 flex items-center gap-2 text-sm' },
      'Display zone',
      createElement(
        'select',
        {
          className: 'rounded border px-2 py-1',
          value: zone,
          onChange: (event: { target: { value: string } }) =>
            setZone(event.target.value),
        },
        DEMO_ZONES.map((option) =>
          createElement(
            'option',
            { key: option.value, value: option.value },
            option.text,
          ),
        ),
      ),
    ),
    createElement(OgeScheduler<ZoneAppt>, {
      dataSource: data,
      defaultCurrentDate: ZONE_DATE,
      defaultCurrentView: 'week',
      timeZone: zone || undefined,
      showTimeZoneEditor: true,
      scrollTime: 7,
      style: { height: 560 },
    }),
  );
}

function DstDemo(): ReactNode {
  const [data] = useState(() => dstAppointments());
  const [clicked, setClicked] = useState('—');
  return createElement(
    Fragment,
    null,
    createElement(OgeScheduler<ZoneAppt>, {
      dataSource: data,
      defaultCurrentDate: DST_DATE,
      defaultCurrentView: 'day',
      views: ['day', 'week'],
      timeZone: 'America/New_York',
      scrollTime: 0,
      onCellClick: (event) => setClicked(event.cellDate.toISOString()),
      style: { height: 560 },
    }),
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'aria-live': 'polite' },
      `Last clicked slot (UTC): ${clicked}`,
    ),
  );
}

/**
 * The React half of "Time zones" — rendered inside
 * `/components/scheduler/time-zones` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-scheduler-time-zone-demos',
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
      [chips]="['timeZone', 'startTimeZone', 'showTimeZoneEditor']"
      heading="Display zone"
      description="One distributed team, four zones. Switch the display zone: every meeting moves to the matching wall time, while the New York standup keeps recurring at 09:00 <em>New York</em> time. Double-click a meeting to see the zone pickers — the date boxes show the meeting's own zone, and a typed time is saved in the picked one."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="zone" />
    </app-demo-card>

    <app-demo-card
      [chips]="['23-hour day', 'skipped hour', 'onCellClick']"
      heading="DST day"
      description="Sunday 8 March 2026 in New York has 23 hours: the clocks jump from 02:00 to 03:00. The night shift spans 01:00–03:30 on the wall but lasts 1½ real hours; a click in the skipped hour reports the first real instant after the gap, and the daily check-in stays at 09:00 on both sides of the switch."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="dst" />
    </app-demo-card>
  `,
})
export class ReactSchedulerTimeZoneDemos {
  protected readonly demos = SCHEDULER_TIME_ZONE_DEMOS;
  protected readonly zone = () => createElement(ZoneDemo);
  protected readonly dst = () => createElement(DstDemo);
}
