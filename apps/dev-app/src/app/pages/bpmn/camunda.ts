import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { OGE_BPMN_CAMUNDA_PROVIDERS, OgeBpmnEditor } from '@oge-ui/bpmn';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_BPMN_CAMUNDA_SECTIONS,
  ReactBpmnCamundaDemos,
} from '../react-bpmn/camunda';
import {
  CAMUNDA_PROVIDERS_SNIPPET,
  CAMUNDA_SAMPLE_XML,
  PAYLOADS_SNIPPET,
  ZEEBE_HELPERS_SNIPPET,
} from './camunda-snippets';

const SECTIONS = [
  'Camunda / Zeebe properties',
  'Typed helpers',
  'Event payloads, documentation & re-parenting',
] as const;

@Component({
  selector: 'app-bpmn-camunda',
  imports: [OgeBpmnEditor, DemoCard, DocHeader, PageToc, ReactBpmnCamundaDemos],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Camunda / Zeebe"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="[
        'OGE_BPMN_CAMUNDA_PROVIDERS',
        'zeebe:taskDefinition',
        'zeebe:ioMapping',
        'camunda:assignee',
        'event payloads',
      ]"
    >
      <p>
        Camunda files always round-tripped verbatim; now their extension
        elements are editable. <code>OGE_BPMN_CAMUNDA_PROVIDERS</code> — the
        opt-in <em>camundaProviders</em> preset — adds Camunda 8 (Zeebe) task
        definitions, input / output mappings and task headers and Camunda 7
        user-task assignment and input / output parameters to the properties
        panel. Event definitions keep their payloads (timer expressions, message
        / signal / error / escalation references with the definitions-level root
        elements, conditions, link names), and every element has a documentation
        field.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-bpmn-camunda-demos />
    } @else {
      <app-demo-card
        [chips]="['[propertiesProviders]', 'Zeebe', 'Camunda 7', 'list fields']"
        heading="Camunda / Zeebe properties"
        description="Select <em>Charge card</em> for the Zeebe job type, retries, input / output mappings and task headers (list fields: add, edit, remove rows — each commit is one undo step), or <em>Approve refund</em> for the Camunda 7 assignee, candidate groups, form key and input parameters. Edits rewrite the editable <code>extensionElements</code> tree, declare <code>xmlns:zeebe</code> / <code>xmlns:camunda</code> when needed and leave unknown vendor elements and complex parameters untouched — export to see the XML."
        [code]="providersSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #camunda
          style="height: 480px"
          [propertiesProviders]="providers"
          [messages]="{ canvasLabel: 'Camunda diagram' }"
        />
        <div class="mt-3 flex flex-wrap items-start gap-3">
          <button
            type="button"
            data-testid="bpmn-camunda-export"
            class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            (click)="exportXml()"
          >
            Export XML
          </button>
        </div>
        @if (xml()) {
          <pre
            data-testid="bpmn-camunda-xml"
            class="mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11.5px] leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
            >{{ xml() }}</pre>
        }
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'setZeebeTaskDefinitionCommand',
          'bpmnZeebeIoMapping',
          'headless',
        ]"
        heading="Typed helpers"
        description="The providers sit on typed helpers in <code>&#64;oge-ui/bpmn-engine</code> — <code>bpmnZeebeTaskDefinition</code>, <code>bpmnZeebeIoMapping</code>, <code>bpmnZeebeTaskHeaders</code>, <code>bpmnCamundaInputOutput</code> and their <code>set…Command</code> twins, plus <code>bpmnBindingValue</code> / <code>setBpmnBindingCommand</code> for the element-template bindings. They work on the plain model, so a migration script or a server endpoint uses the same code the panel does."
        [code]="helpersSnippet"
        language="ts"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          A headless helper — no canvas needed; see the Code tab.
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'timer',
          'messageRef',
          'documentation',
          'Move to',
          'exportPng()',
        ]"
        heading="Event payloads, documentation &amp; re-parenting"
        description="Select <em>Every hour</em> for the timer type and expression, or <em>Bank confirmed</em> for its message reference — pick <em>New message</em> to create one in <code>&amp;lt;definitions&amp;gt;</code>. Every element, and the process, has a documentation field. Drag a task into <em>Fulfilment</em> (the target highlights) or choose it in <em>Move to</em> — the keyboard path — to re-parent it in one undo step; flows that would cross scopes are removed. <code>exportPng()</code> rasterizes the SVG export."
        [code]="payloadsSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #payloads
          style="height: 480px"
          [messages]="{ canvasLabel: 'Event payloads diagram' }"
        />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="bpmn-export-png"
            class="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            (click)="downloadPng()"
          >
            Export PNG
          </button>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ pngStatus() }}
          </p>
        </div>
      </app-demo-card>
    }
  `,
})
export class BpmnCamundaPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BPMN_CAMUNDA_SECTIONS;
  protected readonly providersSnippet = CAMUNDA_PROVIDERS_SNIPPET;
  protected readonly helpersSnippet = ZEEBE_HELPERS_SNIPPET;
  protected readonly payloadsSnippet = PAYLOADS_SNIPPET;
  protected readonly providers = OGE_BPMN_CAMUNDA_PROVIDERS;

  private readonly camunda = viewChild<OgeBpmnEditor>('camunda');
  private readonly payloads = viewChild<OgeBpmnEditor>('payloads');

  protected readonly xml = signal('');
  protected readonly pngStatus = signal('');

  constructor() {
    afterNextRender(() => {
      void this.camunda()?.importXml(CAMUNDA_SAMPLE_XML);
      void this.payloads()?.importXml(CAMUNDA_SAMPLE_XML);
    });
  }

  protected exportXml(): void {
    this.xml.set(this.camunda()?.exportXml() ?? '');
  }

  protected async downloadPng(): Promise<void> {
    const blob = await this.payloads()?.exportPng({ pixelRatio: 2 });
    if (blob === null || blob === undefined) {
      this.pngStatus.set('No canvas available');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.png';
    link.click();
    URL.revokeObjectURL(url);
    this.pngStatus.set(`PNG exported (${Math.round(blob.size / 1024)} KB)`);
  }
}
