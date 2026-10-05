import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  Fragment,
  createElement,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OgeGantt,
  type OgeGanttHandle,
  type OgeGanttResource,
  type OgeGanttWorkCalendar,
} from '@oge-ui/react-gantt';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import {
  DEPTH_CALENDAR,
  DEPTH_RESOURCES,
  SAMPLE_MSPDI,
  resourceTasks,
  type DepthLink,
  type DepthTask,
} from '../gantt/gantt-depth-data';
import { GANTT_IMPORT_EXPORT_DEMOS } from './import-export-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_GANTT_IMPORT_EXPORT_SECTIONS = ['MS Project XML'] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

const button = (label: string, onClick: () => void): ReactNode =>
  createElement(
    'button',
    { type: 'button', className: BUTTON, onClick },
    label,
  );

function MsProjectDemo(): ReactNode {
  const gantt = useRef<OgeGanttHandle<DepthTask, DepthLink>>(null);
  const [tasks, setTasks] = useState<DepthTask[]>(() => resourceTasks());
  const [links, setLinks] = useState<DepthLink[]>([]);
  const [resources, setResources] =
    useState<OgeGanttResource[]>(DEPTH_RESOURCES);
  const [calendar, setCalendar] = useState<OgeGanttWorkCalendar | null>(
    DEPTH_CALENDAR,
  );
  const [xmlText, setXmlText] = useState('');
  const [status, setStatus] = useState('');
  const load = () => import('@oge-ui/react-gantt/export-msproject');
  return createElement(
    Fragment,
    null,
    createElement(
      'div',
      { className: 'mb-3 flex flex-wrap gap-2' },
      button('Download .xml', () => {
        const handle = gantt.current;
        if (!handle) return;
        void load().then(({ exportGanttToMsProject }) =>
          exportGanttToMsProject(handle, {
            filename: 'platform.xml',
            title: 'Platform',
          }),
        );
      }),
      button('Show .xml text', () => {
        const handle = gantt.current;
        if (!handle) return;
        void load().then(({ exportGanttToMsProject }) =>
          setXmlText(
            exportGanttToMsProject(handle, {
              title: 'Platform',
              download: false,
            }),
          ),
        );
      }),
      button('Import sample .xml', () => {
        void load().then(({ importMsProjectXml }) => {
          const plan = importMsProjectXml(SAMPLE_MSPDI);
          setTasks(plan.tasks);
          setLinks(plan.dependencies);
          setResources(plan.resources);
          setCalendar(plan.workCalendar);
          setStatus(
            `Imported "${plan.title}": ${plan.tasks.length} tasks, ${plan.dependencies.length} links, ${plan.resources.length} resource.`,
          );
        });
      }),
    ),
    createElement(OgeGantt<DepthTask, DepthLink>, {
      ref: gantt,
      tasks,
      dependencies: links,
      resources,
      workCalendar: calendar,
      style: { height: 420 },
    }),
    xmlText
      ? createElement(
          'pre',
          {
            className:
              'mt-3 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800',
          },
          xmlText,
        )
      : null,
    createElement(
      'p',
      { className: 'mt-2 text-sm', 'aria-live': 'polite' },
      status,
    ),
  );
}

/**
 * The React half of "Import / export" — rendered inside
 * `/components/gantt/import-export` when the reader has chosen React.
 */
@Component({
  selector: 'app-react-gantt-import-export-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrls: [
    '../../../../../../packages/react/gantt/src/styles.scss',
    '../../../../../../packages/react/overlay/src/styles.scss',
    '../../../../../../packages/react/forms/src/styles.scss',
    '../../../../../../packages/react/inputs/src/styles.scss',
  ],
  template: `
    <app-demo-card
      [chips]="['exportGanttToMsProject', 'importMsProjectXml', 'LinkLag']"
      heading="MS Project XML"
      description="Download the plan as <code>.xml</code> — tasks with WBS and outline levels, constraints, deadlines and baselines, links with their lag, resources with max units, assignments with units and the calendar — or import a sample file. The reader is a small DOM-free tokenizer (no Trusted Types sink, no DTD entities); its result goes straight into props."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="msproject" />
    </app-demo-card>
  `,
})
export class ReactGanttImportExportDemos {
  protected readonly demos = GANTT_IMPORT_EXPORT_DEMOS;
  protected readonly msproject = () => createElement(MsProjectDemo);
}
