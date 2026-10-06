import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useEffect, useRef, type ReactNode } from 'react';
import {
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
  type OgeBpmnEditorProps,
} from '@oge-ui/react-bpmn';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { CAMUNDA_SAMPLE_XML } from '../bpmn/camunda-snippets';
import {
  DEMO_CONTEXT_PAD_PROVIDER,
  DEMO_PALETTE_PROVIDER,
  DEMO_RENDERERS,
  DEMO_SLA_PROVIDER,
  DEMO_TEMPLATE_PROVIDER,
} from '../bpmn/g5b-demo-data';
import { SAMPLE_BPMN_XML } from '../bpmn/overview-snippets';
import { LINT_SAMPLE_XML } from '../bpmn/validation-snippets';
import { BPMN_EXTENDING_DEMOS } from './extending-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_BPMN_EXTENDING_SECTIONS = [
  'Properties providers',
  'Palette & context pad',
  'Renderers',
  'Element templates',
] as const;

/** An editor that loads `xml` once it exists. */
function SampleEditor({
  xml,
  ...props
}: OgeBpmnEditorProps & { xml: string }): ReactNode {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  useEffect(() => {
    void editor.current?.importXml(xml);
  }, [xml]);
  return createElement(OgeBpmnEditor, { ref: editor, ...props });
}

const SLA_PROVIDERS = [DEMO_SLA_PROVIDER];
const TEMPLATE_PROVIDERS = [DEMO_TEMPLATE_PROVIDER];

function ProvidersDemo(): ReactNode {
  return createElement(SampleEditor, {
    xml: SAMPLE_BPMN_XML,
    style: { height: 480 },
    propertiesProviders: SLA_PROVIDERS,
    messages: { canvasLabel: 'Properties providers diagram' },
    renderPropertiesEntry: (entry, { commit, inputId }) =>
      createElement(
        'span',
        { className: 'flex items-center gap-2' },
        createElement('input', {
          type: 'range',
          min: 1,
          max: 40,
          className: 'min-w-0 flex-1',
          'aria-labelledby': inputId,
          defaultValue: String(entry.value),
          onPointerUp: (event: { currentTarget: HTMLInputElement }) =>
            commit(event.currentTarget.value),
          onKeyUp: (event: { currentTarget: HTMLInputElement }) =>
            commit(event.currentTarget.value),
        }),
        createElement(
          'span',
          { className: 'text-xs tabular-nums' },
          `${String(entry.value)} h`,
        ),
      ),
  });
}

function PaletteDemo(): ReactNode {
  return createElement(SampleEditor, {
    xml: SAMPLE_BPMN_XML,
    style: { height: 460 },
    paletteProvider: DEMO_PALETTE_PROVIDER,
    contextPadProvider: DEMO_CONTEXT_PAD_PROVIDER,
    messages: { canvasLabel: 'Custom palette diagram' },
  });
}

function RenderersDemo(): ReactNode {
  return createElement(SampleEditor, {
    xml: CAMUNDA_SAMPLE_XML,
    style: { height: 420 },
    renderers: DEMO_RENDERERS,
    messages: { canvasLabel: 'Custom renderer diagram' },
  });
}

function TemplatesDemo(): ReactNode {
  return createElement(SampleEditor, {
    xml: LINT_SAMPLE_XML,
    style: { height: 460 },
    propertiesProviders: TEMPLATE_PROVIDERS,
    messages: { canvasLabel: 'Element templates diagram' },
  });
}

/**
 * The React half of the BPMN "Extending the editor" page — the same demo
 * sections as the Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-bpmn-extending-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/bpmn/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="[
        'propertiesProviders',
        'select · checkbox · custom',
        'renderPropertiesEntry',
      ]"
      heading="Properties providers"
      description="A provider returns groups of typed entries for the selected element — <code>text</code>, <code>textarea</code>, <code>select</code>, <code>checkbox</code>, <code>expression</code>, <code>list</code> or <code>custom</code> — and each entry&#39;s <code>set(value)</code> returns the engine command a commit runs, so every field is one undo step. A <code>custom</code> entry is drawn by the <code>renderPropertiesEntry</code> render prop. Select <em>Review order</em> to see the <em>Service level</em> group; the values land as <code>oge:*</code> attributes in the exported XML."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="providers" />
    </app-demo-card>

    <app-demo-card
      [chips]="['paletteProvider', 'contextPadProvider', 'hotkeys']"
      heading="Palette &amp; context pad"
      description="Custom palette entries render after the built-ins and join the palette&#39;s roving tabindex; custom context-pad actions render beside the built-in ones for the selected element. Both take a <code>bpmnSvg</code> icon, a label (the accessible name and tooltip) and an optional single-character <code>hotkey</code> advertised with <code>aria-keyshortcuts</code> — keys the canvas already uses are never shadowed. Press <kbd>M</kbd> on the canvas to arm the templated <em>Mail task</em>, select an element and press <kbd>R</kbd> to mark it reviewed."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="palette" />
    </app-demo-card>

    <app-demo-card
      [chips]="['renderers', 'bpmnSvg', 'exportSvg / exportPng']"
      heading="Renderers"
      description="<code>renderers</code> overrides a node type&#39;s shape: the renderer gets the node, its size and DI colors and returns a <code>bpmnSvg</code> tree in shape-local coordinates (or <code>null</code> for the built-in glyph). The tree is sanitized — unknown tags, <code>on*</code> handlers, <code>href</code>, <code>style</code> and external <code>url()</code> are dropped — and the editor still draws labels, markers, selection and badges. Exports use the same renderer."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="renderers" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'bpmnElementTemplatesProvider',
        'OgeBpmnElementTemplate',
        'zeebe:modelerTemplate',
      ]"
      heading="Element templates"
      description="Templates follow Camunda Modeler&#39;s JSON shape: <code>appliesTo</code>, an optional <code>elementType</code> to morph to, and properties bound to an attribute, the documentation or a Zeebe / Camunda extension value. <code>bpmnElementTemplatesProvider(templates)</code> adds a <em>Template</em> select to every applicable element; applying writes every default in one undo step and records <code>zeebe:modelerTemplate</code>, after which the panel shows the template&#39;s fields. Select <em>Ask for documents</em> and pick <em>Send mail</em>."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="templates" />
    </app-demo-card>
  `,
})
export class ReactBpmnExtendingDemos {
  protected readonly demos = BPMN_EXTENDING_DEMOS;
  protected readonly providers = () => createElement(ProvidersDemo);
  protected readonly palette = () => createElement(PaletteDemo);
  protected readonly renderers = () => createElement(RenderersDemo);
  protected readonly templates = () => createElement(TemplatesDemo);
}
