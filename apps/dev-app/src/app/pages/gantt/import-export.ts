import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeGantt,
  type OgeGanttResource,
  type OgeGanttWorkCalendar,
} from '@oge-ui/gantt';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_GANTT_IMPORT_EXPORT_SECTIONS,
  ReactGanttImportExportDemos,
} from '../react-gantt/import-export';
import {
  DEPTH_CALENDAR,
  DEPTH_RESOURCES,
  SAMPLE_MSPDI,
  resourceTasks,
  type DepthLink,
  type DepthTask,
} from './gantt-depth-data';
import { MSPROJECT_SNIPPET } from './import-export-snippets';

const SECTIONS = ['MS Project XML'] as const;

const BUTTON = 'rounded border px-3 py-1 text-sm';

@Component({
  selector: 'app-gantt-import-export',
  imports: [
    DemoCard,
    DocHeader,
    OgeGantt,
    PageToc,
    ReactGanttImportExportDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Import / export"
      category="Gantt"
      categoryLink="/components/gantt"
      [chips]="[
        'MS Project XML',
        '.xml export',
        '.xml import',
        'Excel',
        'PDF',
        'PNG',
      ]"
    >
      <p>
        <code>/export-msproject</code> reads and writes MS Project XML (MSPDI)
        with no dependencies — the same lazy-entry shape as
        <code>/export-excel</code> (<code>exceljs</code> peer),
        <code>/export-pdf</code> (<code>jspdf</code> peer) and
        <code>/export-image</code>, which the overview demonstrates. Every
        exporter reads <code>getExportData()</code>.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-gantt-import-export-demos />
    } @else {
      <app-demo-card
        [chips]="['exportGanttToMsProject', 'importMsProjectXml', 'LinkLag']"
        heading="MS Project XML"
        description="Download the plan as <code>.xml</code> — tasks with WBS and outline levels, constraints, deadlines and baselines, links with their lag, resources with max units, assignments with units and the calendar — or import a sample file. The reader is a small DOM-free tokenizer (no Trusted Types sink, no DTD entities); its result binds straight to the inputs."
        [code]="msprojectSnippet"
        language="ts"
      >
        <div class="mb-3 flex flex-wrap gap-2">
          <button type="button" [class]="button" (click)="exportXml()">
            Download .xml
          </button>
          <button type="button" [class]="button" (click)="previewXml()">
            Show .xml text
          </button>
          <button type="button" [class]="button" (click)="importSample()">
            Import sample .xml
          </button>
        </div>
        <oge-gantt
          #gantt
          [tasks]="tasks()"
          [dependencies]="links()"
          [resources]="resources()"
          [workCalendar]="calendar()"
          style="height: 420px"
        />
        @if (xmlText()) {
          <pre
            class="mt-3 max-h-64 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800"
            >{{ xmlText() }}</pre>
        }
        <p class="mt-2 text-sm" aria-live="polite">{{ status() }}</p>
      </app-demo-card>
    }
  `,
})
export class GanttImportExportPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_GANTT_IMPORT_EXPORT_SECTIONS;
  protected readonly button = BUTTON;
  protected readonly msprojectSnippet = MSPROJECT_SNIPPET;
  protected readonly gantt =
    viewChild.required<OgeGantt<DepthTask, DepthLink>>('gantt');

  protected readonly tasks = signal<DepthTask[]>(resourceTasks());
  protected readonly links = signal<DepthLink[]>([]);
  protected readonly resources = signal<OgeGanttResource[]>(DEPTH_RESOURCES);
  protected readonly calendar = signal<OgeGanttWorkCalendar | null>(
    DEPTH_CALENDAR,
  );
  protected readonly xmlText = signal('');
  protected readonly status = signal('');

  protected async exportXml(): Promise<void> {
    const { exportGanttToMsProject } =
      await import('@oge-ui/gantt/export-msproject');
    exportGanttToMsProject(this.gantt(), {
      filename: 'platform.xml',
      title: 'Platform',
    });
  }

  protected async previewXml(): Promise<void> {
    const { exportGanttToMsProject } =
      await import('@oge-ui/gantt/export-msproject');
    this.xmlText.set(
      exportGanttToMsProject(this.gantt(), {
        title: 'Platform',
        download: false,
      }),
    );
  }

  protected async importSample(): Promise<void> {
    const { importMsProjectXml } =
      await import('@oge-ui/gantt/export-msproject');
    const plan = importMsProjectXml(SAMPLE_MSPDI);
    this.tasks.set(plan.tasks);
    this.links.set(plan.dependencies);
    this.resources.set(plan.resources);
    this.calendar.set(plan.workCalendar);
    this.status.set(
      `Imported "${plan.title}": ${plan.tasks.length} tasks, ${plan.dependencies.length} links, ${plan.resources.length} resource.`,
    );
  }
}
