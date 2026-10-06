import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { OgeBpmnEditor, OgeBpmnPropertiesEntryTemplate } from '@oge-ui/bpmn';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_BPMN_EXTENDING_SECTIONS,
  ReactBpmnExtendingDemos,
} from '../react-bpmn/extending';
import { CAMUNDA_SAMPLE_XML } from './camunda-snippets';
import {
  PALETTE_SNIPPET,
  PROVIDERS_SNIPPET,
  RENDERERS_SNIPPET,
  TEMPLATES_SNIPPET,
} from './extending-snippets';
import {
  DEMO_CONTEXT_PAD_PROVIDER,
  DEMO_PALETTE_PROVIDER,
  DEMO_RENDERERS,
  DEMO_SLA_PROVIDER,
  DEMO_TEMPLATE_PROVIDER,
} from './g5b-demo-data';
import { SAMPLE_BPMN_XML } from './overview-snippets';
import { LINT_SAMPLE_XML } from './validation-snippets';

const SECTIONS = [
  'Properties providers',
  'Palette & context pad',
  'Renderers',
  'Element templates',
] as const;

@Component({
  selector: 'app-bpmn-extending',
  imports: [
    OgeBpmnEditor,
    OgeBpmnPropertiesEntryTemplate,
    DemoCard,
    DocHeader,
    PageToc,
    ReactBpmnExtendingDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Extending the editor"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="[
        'propertiesProviders',
        'paletteProvider',
        'contextPadProvider',
        'renderers',
        'element templates',
      ]"
    >
      <p>
        Every extension point is data plus callbacks — no subclassing, no
        injected services. Properties providers add typed panel fields whose
        commits are undoable engine commands; palette and context-pad entries
        bring icons, labels, hotkeys and actions; renderers replace a type&#39;s
        shape; element templates pre-configure elements the way Camunda
        Modeler&#39;s do. Icons and shapes are built with the safe
        <code>bpmnSvg</code> builders and sanitized before they render — there
        is no raw-markup path.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-bpmn-extending-demos />
    } @else {
      <app-demo-card
        [chips]="[
          '[propertiesProviders]',
          'select · checkbox · custom',
          '[ogeBpmnPropertiesEntry]',
        ]"
        heading="Properties providers"
        description="A provider returns groups of typed entries for the selected element — <code>text</code>, <code>textarea</code>, <code>select</code>, <code>checkbox</code>, <code>expression</code>, <code>list</code> or <code>custom</code> — and each entry&#39;s <code>set(value)</code> returns the engine command a commit runs, so every field is one undo step. A <code>custom</code> entry is drawn by an <code>&amp;lt;ng-template ogeBpmnPropertiesEntry&amp;gt;</code>. Select <em>Review order</em> to see the <em>Service level</em> group; the values land as <code>oge:*</code> attributes in the exported XML."
        [code]="providersSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #providers
          style="height: 480px"
          [propertiesProviders]="slaProviders"
          [messages]="{ canvasLabel: 'Properties providers diagram' }"
        >
          <ng-template
            ogeBpmnPropertiesEntry="sla-effort"
            let-entry
            let-commit="commit"
            let-id="inputId"
          >
            <span class="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="40"
                class="min-w-0 flex-1"
                [attr.aria-labelledby]="id"
                [value]="entry.value"
                (change)="commit($any($event.target).value)"
              />
              <span class="text-xs tabular-nums">{{ entry.value }} h</span>
            </span>
          </ng-template>
        </oge-bpmn-editor>
      </app-demo-card>

      <app-demo-card
        [chips]="['[paletteProvider]', '[contextPadProvider]', 'hotkeys']"
        heading="Palette &amp; context pad"
        description="Custom palette entries render after the built-ins and join the palette&#39;s roving tabindex; custom context-pad actions render beside the built-in ones for the selected element. Both take a <code>bpmnSvg</code> icon, a label (the accessible name and tooltip) and an optional single-character <code>hotkey</code> advertised with <code>aria-keyshortcuts</code> — keys the canvas already uses are never shadowed. Press <kbd>M</kbd> on the canvas to arm the templated <em>Mail task</em>, select an element and press <kbd>R</kbd> to mark it reviewed."
        [code]="paletteSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #palette
          style="height: 460px"
          [paletteProvider]="paletteProvider"
          [contextPadProvider]="padProvider"
          [messages]="{ canvasLabel: 'Custom palette diagram' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['[renderers]', 'bpmnSvg', 'exportSvg / exportPng']"
        heading="Renderers"
        description="<code>[renderers]</code> overrides a node type&#39;s shape: the renderer gets the node, its size and DI colors and returns a <code>bpmnSvg</code> tree in shape-local coordinates (or <code>null</code> for the built-in glyph). The tree is sanitized — unknown tags, <code>on*</code> handlers, <code>href</code>, <code>style</code> and external <code>url()</code> are dropped — and the editor still draws labels, markers, selection and badges. Exports use the same renderer."
        [code]="renderersSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #renderers
          style="height: 420px"
          [renderers]="customRenderers"
          [messages]="{ canvasLabel: 'Custom renderer diagram' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="[
          'bpmnElementTemplatesProvider',
          'OgeBpmnElementTemplate',
          'zeebe:modelerTemplate',
        ]"
        heading="Element templates"
        description="Templates follow Camunda Modeler&#39;s JSON shape: <code>appliesTo</code>, an optional <code>elementType</code> to morph to, and properties bound to an attribute, the documentation or a Zeebe / Camunda extension value. <code>bpmnElementTemplatesProvider(templates)</code> adds a <em>Template</em> select to every applicable element; applying writes every default in one undo step and records <code>zeebe:modelerTemplate</code>, after which the panel shows the template&#39;s fields. Select <em>Ask for documents</em> and pick <em>Send mail</em>."
        [code]="templatesSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #templates
          style="height: 460px"
          [propertiesProviders]="templateProviders"
          [messages]="{ canvasLabel: 'Element templates diagram' }"
        />
      </app-demo-card>
    }
  `,
})
export class BpmnExtendingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BPMN_EXTENDING_SECTIONS;
  protected readonly providersSnippet = PROVIDERS_SNIPPET;
  protected readonly paletteSnippet = PALETTE_SNIPPET;
  protected readonly renderersSnippet = RENDERERS_SNIPPET;
  protected readonly templatesSnippet = TEMPLATES_SNIPPET;
  protected readonly slaProviders = [DEMO_SLA_PROVIDER];
  protected readonly paletteProvider = DEMO_PALETTE_PROVIDER;
  protected readonly padProvider = DEMO_CONTEXT_PAD_PROVIDER;
  protected readonly customRenderers = DEMO_RENDERERS;
  protected readonly templateProviders = [DEMO_TEMPLATE_PROVIDER];

  private readonly providers = viewChild<OgeBpmnEditor>('providers');
  private readonly palette = viewChild<OgeBpmnEditor>('palette');
  private readonly renderers = viewChild<OgeBpmnEditor>('renderers');
  private readonly templates = viewChild<OgeBpmnEditor>('templates');

  constructor() {
    afterNextRender(() => {
      void this.providers()?.importXml(SAMPLE_BPMN_XML);
      void this.palette()?.importXml(SAMPLE_BPMN_XML);
      void this.renderers()?.importXml(CAMUNDA_SAMPLE_XML);
      void this.templates()?.importXml(LINT_SAMPLE_XML);
    });
  }
}
