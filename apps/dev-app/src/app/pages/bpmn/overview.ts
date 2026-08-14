import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OgeBpmnEditor,
  provideOgeBpmnConfig,
  type OgeBpmnDiagramChangedEvent,
  type OgeBpmnImportEvent,
} from '@oge-ui/bpmn';
import type { BpmnImportWarning } from '@oge-ui/bpmn';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  AUTOSAVE_SNIPPET,
  CONFIG_SNIPPET,
  GETTING_STARTED_SNIPPET,
  IMPORT_EXPORT_SNIPPET,
  OVERLAYS_SNIPPET,
  READONLY_SNIPPET,
  SAMPLE_BPMN_XML,
} from './overview-snippets';

const SECTIONS = [
  'Getting started',
  'Import & export',
  'Autosave & persistence',
  'Overlays & monitoring',
  'Read-only viewer',
  'Configuration & i18n',
] as const;

const AUTOSAVE_KEY = 'oge-docs-bpmn-autosave';

/** Count-bubble badge markup for the overlays demo (sanitized [innerHTML]). */
const BADGE_HTML = (count: number): string =>
  `<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white shadow">${count}</span>`;

@Component({
  selector: 'app-bpmn-overview',
  imports: [OgeBpmnEditor, DemoCard, DocHeader, PageToc, RouterLink],
  providers: [
    // the site's real logo for every editor on this page; the package default
    // is the built-in drawn mark (no bundled bitmap)
    provideOgeBpmnConfig({ brandLogoUrl: '/favicon-192.png' }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="BPMN Editor"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="[
        'BPMN 2.0 XML',
        'no watermark',
        'pools & lanes',
        'undo/redo',
        'keyboard editing',
      ]"
    >
      <p>
        A from-scratch, Angular-native BPMN 2.0 modeler — not a wrapper. The
        package carries its own dependency-free XML + diagram-interchange engine
        covering the full working element set: all event kinds with the nine
        standard event definitions, boundary events, sub-processes / event
        sub-processes / transactions, pools with lanes and message flows, data
        objects and stores, groups, call activities and activity markers.
        <code>importXml()</code> / <code>exportXml()</code>
        round-trip real BPMN 2.0 documents — Camunda extension elements and
        unknown attributes preserved verbatim, bpmn.io
        <code>bioc</code> element colors interoperable both ways — and the
        canvas is composed accessibility: no APG canvas-editor pattern exists,
        so the editor combines <code>role="application"</code>,
        <code>aria-activedescendant</code> element tracking and a polite live
        region that narrates every action.
      </p>
      <p>
        <code>&#64;oge-ui/bpmn</code> is a commercial package — free for
        evaluation and non-commercial use, with no watermark and no runtime
        license checks. See
        <a
          routerLink="/license"
          class="text-indigo-600 underline dark:text-indigo-400"
          >licensing</a
        >
        for the terms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['palette', 'context pad', 'properties panel', 'minimap']"
      heading="Getting started"
      description="One element, a working modeler — properties panel and minimap included by default (<code>showPropertiesPanel</code> / <code>showMinimap</code>). Pick a shape from the palette and click the canvas — or drag it onto the canvas — to place it; the context pad on a selected element connects, appends and deletes, and grows an align/distribute flyout on multi-selections. The tool strip under the palette switches hand (<code>H</code>), lasso (<code>L</code>), space (<code>S</code>) and global-connect tools; <code>Ctrl+F</code> opens element search. Keyboard: Tab cycles elements, arrows move (Shift for 1px), <code>C</code> connects, <code>A</code> appends, Ctrl+C/X/V/A clipboard, <code>F</code> zooms to fit, <code>F2</code> edits the label, Ctrl+Z / Ctrl+Y undo and redo — Escape cancels any tool or drag."
      [code]="gettingStartedSnippet"
      language="ts"
    >
      <oge-bpmn-editor
        style="height: 480px"
        [(zoom)]="zoom"
        [messages]="{ canvasLabel: 'Getting-started diagram' }"
      />
      <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Zoom: <code>{{ zoomPct() }}%</code> — mouse wheel zooms at the cursor,
        middle-drag or Space-drag pans, the minimap click/drag jumps.
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['importXml', 'exportXml', 'fidelity warnings']"
      heading="Import & export"
      description="The engine reads prefix-agnostic BPMN 2.0 (<code>bpmn:</code>, <code>bpmn2:</code> or no prefix) and writes byte-deterministic XML with normalized prefixes — camunda-flavored files round-trip byte-identically, and bpmn.io <code>bioc</code> element colors are read and written both ways. The few remaining unsupported constructs (nested lane sets, extra event definitions on one event, timer/error payload children) are dropped with an explicit warning in <code>importCompleted</code> — never silently. Edit the XML below, import it, move things around, then export it back."
      [code]="importExportSnippet"
      language="ts"
    >
      <oge-bpmn-editor
        #io
        style="height: 420px"
        [messages]="{ canvasLabel: 'Import and export diagram' }"
        (importCompleted)="onImport($event)"
      />
      <div class="mt-3 flex flex-wrap items-start gap-3">
        <textarea
          data-testid="bpmn-xml"
          class="h-40 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-[11.5px] leading-relaxed text-gray-700 focus:border-indigo-300 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
          spellcheck="false"
          aria-label="BPMN XML"
          [value]="xml()"
          (input)="onXmlInput($event)"
        ></textarea>
        <div class="flex flex-col gap-2">
          <button
            type="button"
            data-testid="bpmn-import"
            class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            (click)="importXml()"
          >
            Import
          </button>
          <button
            type="button"
            data-testid="bpmn-export"
            class="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            (click)="exportXml()"
          >
            Export
          </button>
        </div>
      </div>
      @if (warnings().length > 0) {
        <ul
          class="mt-3 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400"
        >
          @for (warning of warnings(); track $index) {
            <li>
              <code class="text-[12px]">{{ warning.code }}</code> —
              {{ warning.message }}
            </li>
          }
        </ul>
      }
    </app-demo-card>

    <app-demo-card
      [chips]="['diagramChanged', 'exportJson', 'importJson', 'autosave']"
      heading="Autosave & persistence"
      description="The debounced <code>diagramChanged</code> stream is the autosave hook: after edits settle for <code>autoSaveDebounceMs</code> (default 500ms, configurable via <code>provideOgeBpmnConfig()</code>) it emits the diagram already serialized to both the versioned JSON envelope and BPMN XML — never mid-drag. <code>importJson()</code> restores an envelope with full structural validation, so a corrupted payload returns an error instead of clobbering the canvas. Draw below, watch the status line, reload the page, then restore."
      [code]="autosaveSnippet"
      language="ts"
    >
      <oge-bpmn-editor
        #saver
        style="height: 420px"
        [messages]="{ canvasLabel: 'Autosave diagram' }"
        (diagramChanged)="onDiagramChanged($event)"
      />
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="bpmn-restore"
          class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          (click)="restore()"
        >
          Restore last save
        </button>
        <p
          data-testid="bpmn-autosave-status"
          class="text-sm text-gray-500 dark:text-gray-400"
        >
          {{ autosaveStatus() }}
        </p>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['addOverlay', 'removeOverlay', 'clearOverlays']"
      heading="Overlays & monitoring"
      description="<code>addOverlay()</code> attaches an HTML badge to any element — the process-monitoring primitive for token counts, incident markers or heatmaps. Badges anchor to a corner (or the center) of the element&#39;s bounds with an optional diagram-unit offset, track the element through pan, zoom and model changes, and hide (without losing their registration) while the element is gone. The markup renders through Angular&#39;s sanitizing <code>[innerHTML]</code>. Select an element below and add a count bubble to it."
      [code]="overlaysSnippet"
      language="ts"
    >
      <oge-bpmn-editor
        #monitor
        style="height: 420px"
        [messages]="{ canvasLabel: 'Monitoring diagram' }"
      />
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="bpmn-add-overlay"
          class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          (click)="addBadge()"
        >
          Add badge to selection
        </button>
        <button
          type="button"
          data-testid="bpmn-clear-overlays"
          class="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          (click)="clearBadges()"
        >
          Clear overlays
        </button>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ overlayStatus() }}
        </p>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['readOnly', 'viewer mode']"
      heading="Read-only viewer"
      description='<code>[readOnly]="true"</code> turns the editor into a diagram viewer: palette, context pad, properties panel, keyboard editing and drags are all disabled, while selection, pan, zoom-to-fit, element search (Ctrl+F) and the accessible reading order (Tab through elements, live-region announcements) keep working.'
      [code]="readonlySnippet"
      language="ts"
    >
      <oge-bpmn-editor
        #viewer
        style="height: 360px"
        [readOnly]="true"
        [messages]="{ canvasLabel: 'Read-only diagram' }"
      />
    </app-demo-card>

    <app-demo-card
      [chips]="['[messages]', 'provideOgeBpmnConfig', 'i18n']"
      heading="Configuration & i18n"
      description="Every user-facing string — palette labels, tool strip, align flyout, search overlay, properties panel, context-pad actions, live-region announcement templates, the canvas name and hint — lives in <code>OgeBpmnMessages</code>. Override per instance with <code>[messages]</code> (Turkish below) or app-wide with <code>provideOgeBpmnConfig()</code>, which also sets <code>gridSize</code>, <code>snapThreshold</code>, the zoom bounds, <code>autoSaveDebounceMs</code> and the panel&#39;s fill <code>colorPresets</code>."
      [code]="configSnippet"
      language="ts"
    >
      <oge-bpmn-editor style="height: 380px" [messages]="turkishMessages" />
    </app-demo-card>

    <h3>Notes</h3>
    <ul>
      <li>
        The engine (XML reader/writer, JSON envelope, SVG renderer, geometry,
        routing, alignment math, command stack) is pure TypeScript inside the
        package — importable directly as <code>readBpmnXml</code> /
        <code>writeBpmnXml</code> / <code>toBpmnJson</code> /
        <code>fromBpmnJson</code> / <code>renderDiagramSvg</code> for
        server-side or test pipelines.
      </li>
      <li>
        Undo is snapshot-based: every command, including each arrow-key step, is
        exactly one undo entry, and <code>markSaved()</code> pins the save point
        that <code>isDirty()</code> and <code>dirtyChanged</code> report
        against.
      </li>
      <li>
        <code>exportSvg()</code> renders a self-contained static SVG (fitted
        <code>viewBox</code>, neutral colors, custom element colors honored) —
        no DOM cloning, no external CSS.
      </li>
      <li>
        Element coverage spans the full working set — events with all nine
        definition kinds, boundary events, sub-processes / event sub-processes /
        transactions, pools, lanes and message flows, data objects/stores,
        groups, call activities and activity markers. The remaining honest cuts
        (re-parenting by drag, vertical pool creation, multiple event
        definitions per event) are tracked on the
        <a
          href="https://github.com/oge-ui/oge-ui/blob/main/ROADMAP.md"
          target="_blank"
          rel="noopener"
          class="text-indigo-600 underline dark:text-indigo-400"
          >roadmap</a
        >; dropped content always surfaces as import warnings.
      </li>
    </ul>
  `,
})
export class BpmnOverviewPage {
  protected readonly sections = SECTIONS;
  protected readonly gettingStartedSnippet = GETTING_STARTED_SNIPPET;
  protected readonly importExportSnippet = IMPORT_EXPORT_SNIPPET;
  protected readonly autosaveSnippet = AUTOSAVE_SNIPPET;
  protected readonly overlaysSnippet = OVERLAYS_SNIPPET;
  protected readonly readonlySnippet = READONLY_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly zoom = signal(1);
  protected readonly zoomPct = () => Math.round(this.zoom() * 100);

  protected readonly xml = signal(SAMPLE_BPMN_XML);
  protected readonly warnings = signal<readonly BpmnImportWarning[]>([]);

  protected readonly autosaveStatus = signal(
    'Nothing saved yet — place an element to trigger the stream.',
  );
  protected readonly overlayStatus = signal('No badges yet.');

  private readonly io = viewChild<OgeBpmnEditor>('io');
  private readonly saver = viewChild<OgeBpmnEditor>('saver');
  private readonly monitor = viewChild<OgeBpmnEditor>('monitor');
  private readonly viewer = viewChild<OgeBpmnEditor>('viewer');

  private badgeCount = 0;

  /** Turkish per-instance message override — `paletteLabels` is a full record. */
  protected readonly turkishMessages = {
    canvasLabel: 'BPMN diyagram editörü',
    canvasHint: 'Diyagramdan çıkmak için Escape sonra Tab',
    emptyText: 'Boş diyagram — paletten bir öğe seçin',
    paletteLabel: 'Öğe paleti',
    paletteLabels: {
      startEvent: 'Başlangıç olayı',
      endEvent: 'Bitiş olayı',
      intermediateThrowEvent: 'Ara fırlatma olayı',
      intermediateCatchEvent: 'Ara yakalama olayı',
      boundaryEvent: 'Sınır olayı',
      task: 'Görev',
      userTask: 'Kullanıcı görevi',
      serviceTask: 'Servis görevi',
      scriptTask: 'Betik görevi',
      callActivity: 'Çağrı aktivitesi',
      subProcess: 'Alt süreç',
      eventSubProcess: 'Olay alt süreci',
      transaction: 'İşlem',
      exclusiveGateway: 'Dışlayıcı geçit',
      parallelGateway: 'Paralel geçit',
      dataObject: 'Veri nesnesi',
      dataStore: 'Veri deposu',
      group: 'Grup',
      pool: 'Havuz',
      textAnnotation: 'Metin notu',
    },
  } as const;

  constructor() {
    afterNextRender(() => {
      void this.viewer()?.importXml(SAMPLE_BPMN_XML);
      void this.monitor()?.importXml(SAMPLE_BPMN_XML);
    });
  }

  protected onXmlInput(event: Event): void {
    this.xml.set((event.target as HTMLTextAreaElement).value);
  }

  protected importXml(): void {
    void this.io()?.importXml(this.xml());
  }

  protected exportXml(): void {
    const editor = this.io();
    if (editor) {
      this.xml.set(editor.exportXml());
    }
  }

  protected onImport(event: OgeBpmnImportEvent): void {
    this.warnings.set(event.warnings);
  }

  /** Autosave hook: the payload arrives already serialized — just store it. */
  protected onDiagramChanged(event: OgeBpmnDiagramChangedEvent): void {
    if (event.source === 'import' || event.source === 'new') {
      return; // persist user edits only
    }
    const payload = JSON.stringify(event.json);
    try {
      localStorage.setItem(AUTOSAVE_KEY, payload);
    } catch {
      // storage may be unavailable (private mode) — the status still updates
    }
    this.saver()?.markSaved();
    this.autosaveStatus.set(
      `Saved ${payload.length} bytes at ${new Date().toLocaleTimeString()}.`,
    );
  }

  protected restore(): void {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw === null) {
      this.autosaveStatus.set('No saved diagram found.');
      return;
    }
    const { error } = this.saver()?.importJson(JSON.parse(raw)) ?? {};
    this.autosaveStatus.set(
      error !== undefined
        ? `Restore failed: ${error}`
        : `Restored ${raw.length} bytes.`,
    );
  }

  protected addBadge(): void {
    const editor = this.monitor();
    if (!editor) {
      return;
    }
    const [id] = editor.getSelection();
    if (id === undefined) {
      this.overlayStatus.set('Select an element first.');
      return;
    }
    editor.addOverlay({
      elementId: id,
      html: BADGE_HTML(++this.badgeCount),
      position: 'top-right',
      offset: { x: 4, y: -4 },
    });
    this.overlayStatus.set(`Badge #${this.badgeCount} attached to ${id}.`);
  }

  protected clearBadges(): void {
    this.monitor()?.clearOverlays();
    this.badgeCount = 0;
    this.overlayStatus.set('Overlays cleared.');
  }
}
