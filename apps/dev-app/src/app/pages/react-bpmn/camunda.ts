import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  OGE_BPMN_CAMUNDA_PROVIDERS,
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
} from '@oge-ui/react-bpmn';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { CAMUNDA_SAMPLE_XML } from '../bpmn/camunda-snippets';
import { BPMN_CAMUNDA_DEMOS } from './camunda-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_BPMN_CAMUNDA_SECTIONS = [
  'Camunda / Zeebe properties',
  'Typed helpers',
  'Event payloads, documentation & re-parenting',
] as const;

const PRIMARY_BUTTON =
  'rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20';
const SECONDARY_BUTTON =
  'rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800';
const MUTED = 'text-sm text-gray-500 dark:text-gray-400';

function useSample() {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  useEffect(() => {
    void editor.current?.importXml(CAMUNDA_SAMPLE_XML);
  }, []);
  return editor;
}

function CamundaDemo(): ReactNode {
  const editor = useSample();
  const [xml, setXml] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeBpmnEditor, {
      ref: editor,
      style: { height: 480 },
      propertiesProviders: OGE_BPMN_CAMUNDA_PROVIDERS,
      messages: { canvasLabel: 'Camunda diagram' },
    }),
    createElement(
      'div',
      { className: 'mt-3 flex flex-wrap items-start gap-3' },
      createElement(
        'button',
        {
          type: 'button',
          className: PRIMARY_BUTTON,
          'data-testid': 'bpmn-camunda-export',
          onClick: () => setXml(editor.current?.exportXml() ?? ''),
        },
        'Export XML',
      ),
    ),
    xml !== '' &&
      createElement(
        'pre',
        {
          'data-testid': 'bpmn-camunda-xml',
          className:
            'mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11.5px] leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300',
        },
        xml,
      ),
  );
}

function HelpersDemo(): ReactNode {
  return createElement(
    'p',
    { className: MUTED },
    'A headless helper — no canvas needed; see the Code tab.',
  );
}

function PayloadsDemo(): ReactNode {
  const editor = useSample();
  const [status, setStatus] = useState('');
  const downloadPng = async () => {
    const blob = await editor.current?.exportPng({ pixelRatio: 2 });
    if (!blob) {
      setStatus('No canvas available');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.png';
    link.click();
    URL.revokeObjectURL(url);
    setStatus(`PNG exported (${Math.round(blob.size / 1024)} KB)`);
  };
  return createElement(
    'div',
    null,
    createElement(OgeBpmnEditor, {
      ref: editor,
      style: { height: 480 },
      messages: { canvasLabel: 'Event payloads diagram' },
    }),
    createElement(
      'div',
      { className: 'mt-3 flex flex-wrap items-center gap-3' },
      createElement(
        'button',
        {
          type: 'button',
          className: SECONDARY_BUTTON,
          'data-testid': 'bpmn-export-png',
          onClick: () => void downloadPng(),
        },
        'Export PNG',
      ),
      createElement('p', { className: MUTED }, status),
    ),
  );
}

/**
 * The React half of the BPMN "Camunda / Zeebe" page — the same demo sections
 * as the Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-bpmn-camunda-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/bpmn/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['propertiesProviders', 'Zeebe', 'Camunda 7', 'list fields']"
      heading="Camunda / Zeebe properties"
      description="Select <em>Charge card</em> for the Zeebe job type, retries, input / output mappings and task headers (list fields: add, edit, remove rows — each commit is one undo step), or <em>Approve refund</em> for the Camunda 7 assignee, candidate groups, form key and input parameters. Edits rewrite the editable <code>extensionElements</code> tree, declare <code>xmlns:zeebe</code> / <code>xmlns:camunda</code> when needed and leave unknown vendor elements and complex parameters untouched — export to see the XML."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="camunda" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'setZeebeTaskDefinitionCommand',
        'bpmnZeebeIoMapping',
        'headless',
      ]"
      heading="Typed helpers"
      description="The providers sit on typed helpers in <code>&#64;oge-ui/bpmn-engine</code> — <code>bpmnZeebeTaskDefinition</code>, <code>bpmnZeebeIoMapping</code>, <code>bpmnZeebeTaskHeaders</code>, <code>bpmnCamundaInputOutput</code> and their <code>set…Command</code> twins, plus <code>bpmnBindingValue</code> / <code>setBpmnBindingCommand</code> for the element-template bindings. They work on the plain model, so a migration script or a server endpoint uses the same code the panel does."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="helpers" />
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
      description="Select <em>Every hour</em> for the timer type and expression, or <em>Bank confirmed</em> for its message reference — pick <em>New message</em> to create one in <code>&amp;lt;definitions&amp;gt;</code>. Every element, and the process, has a documentation field. Drag a task into <em>Fulfilment</em> (the target highlights) or choose it in <em>Move to</em> — the keyboard path — to re-parent it in one undo step; flows that would cross scopes are removed. <code>exportPng()</code> on the ref handle rasterizes the SVG export."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="payloads" />
    </app-demo-card>
  `,
})
export class ReactBpmnCamundaDemos {
  protected readonly demos = BPMN_CAMUNDA_DEMOS;
  protected readonly camunda = () => createElement(CamundaDemo);
  protected readonly helpers = () => createElement(HelpersDemo);
  protected readonly payloads = () => createElement(PayloadsDemo);
}
