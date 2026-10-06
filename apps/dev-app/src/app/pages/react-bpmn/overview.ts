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
  OgeBpmnConfigProvider,
  OgeBpmnEditor,
  type BpmnImportWarning,
  type OgeBpmnDiagramChangedEvent,
  type OgeBpmnEditorHandle,
  type OgeBpmnMessages,
} from '@oge-ui/react-bpmn';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { SAMPLE_BPMN_XML } from '../bpmn/overview-snippets';
import { BPMN_OVERVIEW_DEMOS } from './overview-snippets';

/**
 * TOC of the React view — the same six sections as the Angular overview
 * (`docs/REACT-PARITY.md`: pages mirror section for section).
 */
export const REACT_BPMN_OVERVIEW_SECTIONS = [
  'Getting started',
  'Import & export',
  'Autosave & persistence',
  'Overlays & monitoring',
  'Read-only viewer',
  'Configuration & i18n',
] as const;

const AUTOSAVE_KEY = 'oge-docs-react-bpmn-autosave';

/** Count-bubble badge markup for the overlays demo (sanitized by the editor). */
const BADGE_HTML = (count: number): string =>
  `<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white shadow">${count}</span>`;

const PRIMARY_BUTTON =
  'rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20';
const SECONDARY_BUTTON =
  'rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800';
const MUTED = 'text-sm text-gray-500 dark:text-gray-400';

/** The site's real logo for every editor on this page (Angular: provideOgeBpmnConfig). */
function withLogo(child: ReactNode): ReactNode {
  return createElement(
    OgeBpmnConfigProvider,
    { config: { brandLogoUrl: '/favicon-192.png' } },
    child,
  );
}

function GettingStartedDemo(): ReactNode {
  const [zoom, setZoom] = useState(1);
  return withLogo(
    createElement(
      'div',
      null,
      createElement(OgeBpmnEditor, {
        style: { height: 480 },
        zoom,
        onZoomChange: setZoom,
        messages: { canvasLabel: 'Getting-started diagram' },
      }),
      createElement(
        'p',
        { className: `mt-3 ${MUTED}` },
        'Zoom: ',
        createElement('code', null, `${Math.round(zoom * 100)}%`),
        ' — mouse wheel zooms at the cursor, middle-drag or Space-drag pans, the minimap click/drag jumps.',
      ),
    ),
  );
}

function ImportExportDemo(): ReactNode {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  const [xml, setXml] = useState(SAMPLE_BPMN_XML);
  const [warnings, setWarnings] = useState<readonly BpmnImportWarning[]>([]);
  return withLogo(
    createElement(
      'div',
      null,
      createElement(OgeBpmnEditor, {
        ref: editor,
        style: { height: 420 },
        messages: { canvasLabel: 'Import and export diagram' },
        onImportCompleted: (event) => setWarnings(event.warnings),
      }),
      createElement(
        'div',
        { className: 'mt-3 flex flex-wrap items-start gap-3' },
        createElement('textarea', {
          'data-testid': 'bpmn-xml',
          className:
            'h-40 min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-[11.5px] leading-relaxed text-gray-700 focus:border-indigo-300 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300',
          spellCheck: false,
          'aria-label': 'BPMN XML',
          value: xml,
          onChange: (e: { target: { value: string } }) =>
            setXml(e.target.value),
        }),
        createElement(
          'div',
          { className: 'flex flex-col gap-2' },
          createElement(
            'button',
            {
              type: 'button',
              'data-testid': 'bpmn-import',
              className: PRIMARY_BUTTON,
              onClick: () => void editor.current?.importXml(xml),
            },
            'Import',
          ),
          createElement(
            'button',
            {
              type: 'button',
              'data-testid': 'bpmn-export',
              className: SECONDARY_BUTTON,
              onClick: () => setXml(editor.current?.exportXml() ?? xml),
            },
            'Export',
          ),
        ),
      ),
      warnings.length > 0
        ? createElement(
            'ul',
            {
              className:
                'mt-3 list-disc pl-5 text-sm text-amber-700 dark:text-amber-400',
            },
            warnings.map((warning, index) =>
              createElement(
                'li',
                { key: index },
                createElement(
                  'code',
                  { className: 'text-[12px]' },
                  warning.code,
                ),
                ` — ${warning.message}`,
              ),
            ),
          )
        : null,
    ),
  );
}

function AutosaveDemo(): ReactNode {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  const [status, setStatus] = useState(
    'Nothing saved yet — place an element to trigger the stream.',
  );
  const onDiagramChanged = (event: OgeBpmnDiagramChangedEvent) => {
    if (event.source === 'import' || event.source === 'new') {
      return; // persist user edits only
    }
    const payload = JSON.stringify(event.json);
    try {
      localStorage.setItem(AUTOSAVE_KEY, payload);
    } catch {
      // storage may be unavailable (private mode) — the status still updates
    }
    editor.current?.markSaved();
    setStatus(
      `Saved ${payload.length} bytes at ${new Date().toLocaleTimeString()}.`,
    );
  };
  const restore = () => {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw === null) {
      setStatus('No saved diagram found.');
      return;
    }
    const { error } = editor.current?.importJson(JSON.parse(raw)) ?? {};
    setStatus(
      error !== undefined
        ? `Restore failed: ${error}`
        : `Restored ${raw.length} bytes.`,
    );
  };
  return withLogo(
    createElement(
      'div',
      null,
      createElement(OgeBpmnEditor, {
        ref: editor,
        style: { height: 420 },
        messages: { canvasLabel: 'Autosave diagram' },
        onDiagramChanged,
      }),
      createElement(
        'div',
        { className: 'mt-3 flex flex-wrap items-center gap-3' },
        createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'bpmn-restore',
            className: PRIMARY_BUTTON,
            onClick: restore,
          },
          'Restore last save',
        ),
        createElement(
          'p',
          { 'data-testid': 'bpmn-autosave-status', className: MUTED },
          status,
        ),
      ),
    ),
  );
}

function OverlaysDemo(): ReactNode {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  const count = useRef(0);
  const [status, setStatus] = useState('No badges yet.');
  useEffect(() => {
    void editor.current?.importXml(SAMPLE_BPMN_XML);
  }, []);
  const addBadge = () => {
    const [id] = editor.current?.getSelection() ?? [];
    if (id === undefined) {
      setStatus('Select an element first.');
      return;
    }
    count.current += 1;
    editor.current?.addOverlay({
      elementId: id,
      html: BADGE_HTML(count.current),
      position: 'top-right',
      offset: { x: 4, y: -4 },
    });
    setStatus(`Badge #${count.current} attached to ${id}.`);
  };
  const clearBadges = () => {
    editor.current?.clearOverlays();
    count.current = 0;
    setStatus('Overlays cleared.');
  };
  return withLogo(
    createElement(
      'div',
      null,
      createElement(OgeBpmnEditor, {
        ref: editor,
        style: { height: 420 },
        messages: { canvasLabel: 'Monitoring diagram' },
      }),
      createElement(
        'div',
        { className: 'mt-3 flex flex-wrap items-center gap-3' },
        createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'bpmn-add-overlay',
            className: PRIMARY_BUTTON,
            onClick: addBadge,
          },
          'Add badge to selection',
        ),
        createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'bpmn-clear-overlays',
            className: SECONDARY_BUTTON,
            onClick: clearBadges,
          },
          'Clear overlays',
        ),
        createElement('p', { className: MUTED }, status),
      ),
    ),
  );
}

function ReadOnlyDemo(): ReactNode {
  const viewer = useRef<OgeBpmnEditorHandle>(null);
  useEffect(() => {
    void viewer.current?.importXml(SAMPLE_BPMN_XML);
  }, []);
  return withLogo(
    createElement(OgeBpmnEditor, {
      ref: viewer,
      style: { height: 360 },
      readOnly: true,
      messages: { canvasLabel: 'Read-only diagram' },
    }),
  );
}

/** Turkish per-instance message override — `paletteLabels` is a full record. */
const TURKISH: Partial<OgeBpmnMessages> = {
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
};

function ConfigDemo(): ReactNode {
  return withLogo(
    createElement(OgeBpmnEditor, {
      style: { height: 380 },
      messages: TURKISH,
    }),
  );
}

/**
 * The React half of the BPMN overview — the same six demo sections as the
 * Angular page, with the same example content, rendered as real React trees
 * inside `/components/bpmn` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-bpmn-overview-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editor carries the class names but no styles of its own — the
  // docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/bpmn/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['palette', 'context pad', 'properties panel', 'minimap']"
      heading="Getting started"
      description="One element, a working modeler — properties panel and minimap included by default (<code>showPropertiesPanel</code> / <code>showMinimap</code>). Pick a shape from the palette and click the canvas — or drag it onto the canvas — to place it; the context pad on a selected element connects, appends and deletes, and grows an align/distribute flyout on multi-selections. The tool strip under the palette switches hand (<code>H</code>), lasso (<code>L</code>), space (<code>S</code>) and global-connect tools; <code>Ctrl+F</code> opens element search. Keyboard: Tab cycles elements, arrows move (Shift for 1px), <code>C</code> connects, <code>A</code> appends, Ctrl+C/X/V/A clipboard, <code>F</code> zooms to fit, <code>F2</code> edits the label, Ctrl+Z / Ctrl+Y undo and redo — Escape cancels any tool or drag."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="gettingStarted" />
    </app-demo-card>

    <app-demo-card
      [chips]="['importXml', 'exportXml', 'fidelity warnings']"
      heading="Import & export"
      description="The engine reads prefix-agnostic BPMN 2.0 (<code>bpmn:</code>, <code>bpmn2:</code> or no prefix) and writes byte-deterministic XML with normalized prefixes — camunda-flavored files round-trip byte-identically, and bpmn.io <code>bioc</code> element colors are read and written both ways. Timer expressions, message / signal / error / escalation references, documentation and Camunda / Zeebe extension elements are read into editable fields; the few remaining unsupported constructs (nested lane sets, extra event definitions on one event) are dropped with an explicit warning in <code>onImportCompleted</code> — never silently. Edit the XML below, import it, move things around, then export it back."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="importExport" />
    </app-demo-card>

    <app-demo-card
      [chips]="['onDiagramChanged', 'exportJson', 'importJson', 'autosave']"
      heading="Autosave & persistence"
      description="The debounced <code>onDiagramChanged</code> stream is the autosave hook: after edits settle for <code>autoSaveDebounceMs</code> (default 500ms, configurable via <code>&amp;lt;OgeBpmnConfigProvider&amp;gt;</code>) it reports the diagram already serialized to both the versioned JSON envelope and BPMN XML — never mid-drag. <code>importJson()</code> restores an envelope with full structural validation, so a corrupted payload returns an error instead of clobbering the canvas. Draw below, watch the status line, reload the page, then restore."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="autosave" />
    </app-demo-card>

    <app-demo-card
      [chips]="['addOverlay', 'removeOverlay', 'clearOverlays']"
      heading="Overlays & monitoring"
      description="<code>addOverlay()</code> on the ref handle attaches an HTML badge to any element — the process-monitoring primitive for token counts, incident markers or heatmaps. Badges anchor to a corner (or the center) of the element&#39;s bounds with an optional diagram-unit offset, track the element through pan, zoom and model changes, and hide (without losing their registration) while the element is gone. The markup is sanitized into real elements — never <code>dangerouslySetInnerHTML</code>. Select an element below and add a count bubble to it."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="overlays" />
    </app-demo-card>

    <app-demo-card
      [chips]="['readOnly', 'viewer mode']"
      heading="Read-only viewer"
      description="<code>readOnly</code> turns the editor into a diagram viewer: palette, context pad, properties panel, keyboard editing and drags are all disabled, while selection, pan, zoom-to-fit, element search (Ctrl+F) and the accessible reading order (Tab through elements, live-region announcements) keep working."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="readOnly" />
    </app-demo-card>

    <app-demo-card
      [chips]="['messages', 'OgeBpmnConfigProvider', 'i18n']"
      heading="Configuration & i18n"
      description="Every user-facing string — palette labels, tool strip, align flyout, search overlay, properties panel, context-pad actions, live-region announcement templates, the canvas name and hint — lives in <code>OgeBpmnMessages</code>. Override per instance with <code>messages</code> (Turkish below) or for a subtree with <code>&amp;lt;OgeBpmnConfigProvider&amp;gt;</code>, which also sets <code>gridSize</code>, <code>snapThreshold</code>, the zoom bounds, <code>autoSaveDebounceMs</code> and the panel&#39;s fill <code>colorPresets</code>."
      [code]="demos[5].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactBpmnOverviewDemos {
  protected readonly demos = BPMN_OVERVIEW_DEMOS;
  protected readonly gettingStarted = () => createElement(GettingStartedDemo);
  protected readonly importExport = () => createElement(ImportExportDemo);
  protected readonly autosave = () => createElement(AutosaveDemo);
  protected readonly overlays = () => createElement(OverlaysDemo);
  protected readonly readOnly = () => createElement(ReadOnlyDemo);
  protected readonly config = () => createElement(ConfigDemo);
}
