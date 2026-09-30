import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React BPMN overview. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../bpmn/overview-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same six sections, same
 * order, same example content, React idiom — a `ref` handle where the Angular
 * snippets use `viewChild`, controlled props where they bind `[(model)]`,
 * `<OgeBpmnConfigProvider>` where they call `provideOgeBpmnConfig()`.
 */
export const BPMN_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnElementsChangedEvent'] },
      name: 'Modeler',
      body: `// controlled zoom: wheel zooming reports back through onZoomChange
const [zoom, setZoom] = useState(1);

// fires on every command, undo/redo, import and newDiagram()
const onChanged = (event: OgeBpmnElementsChangedEvent) => {
  console.log(event.source, event.label);
};`,
      jsx: `<OgeBpmnEditor
  style={{ height: 480 }}
  zoom={zoom}
  onZoomChange={setZoom}
  onElementsChanged={onChanged}
/>`,
    }),
  },
  {
    title: 'Import & export',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: {
        '@oge-ui/react-bpmn': [
          'BpmnImportWarning',
          'OgeBpmnEditorHandle',
          'OgeBpmnImportEvent',
        ],
      },
      name: 'ImportExport',
      before: `const SAMPLE_BPMN_XML = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ...>
  <bpmn:process id="Process_order">
    <bpmn:startEvent id="Start_1" name="Order received" />
    <bpmn:userTask id="Task_review" name="Review order" />
    <bpmn:exclusiveGateway id="Gateway_ok" name="Approved?" default="Flow_no" />
    <!-- ... end events, sequence flows and BPMN DI shapes/edges ... -->
  </bpmn:process>
</bpmn:definitions>\`;`,
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);
const [xml, setXml] = useState(SAMPLE_BPMN_XML);
const [warnings, setWarnings] = useState<readonly BpmnImportWarning[]>([]);

// resolves with { model, warnings, error? }; a fatal parse
// error leaves the current diagram untouched
const importXml = () => void editor.current?.importXml(xml);

// deterministic BPMN 2.0 XML — same model, same bytes
const exportXml = () => setXml(editor.current?.exportXml() ?? xml);

const onImport = (event: OgeBpmnImportEvent) => setWarnings(event.warnings);`,
      jsx: `<>
  <OgeBpmnEditor ref={editor} style={{ height: 420 }} onImportCompleted={onImport} />
  <textarea value={xml} onChange={(e) => setXml(e.target.value)} />
  <button type="button" onClick={importXml}>Import</button>
  <button type="button" onClick={exportXml}>Export</button>
  <p>{warnings.length} warning(s)</p>
</>`,
    }),
  },
  {
    title: 'Autosave & persistence',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnDiagramChangedEvent',
          'OgeBpmnEditorHandle',
        ],
      },
      name: 'Autosave',
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);

// fires once per settled change (autoSaveDebounceMs, default 500ms),
// with the diagram already serialized to both JSON and XML — no
// exportJson() call needed and never mid-drag
const onDiagramChanged = (event: OgeBpmnDiagramChangedEvent) => {
  if (event.source === 'import' || event.source === 'new') return;
  localStorage.setItem('diagram', JSON.stringify(event.json));
  editor.current?.markSaved();
};

const restore = () => {
  const raw = localStorage.getItem('diagram');
  if (raw === null) return;
  // structural validation — a broken envelope never clobbers the canvas
  const result = editor.current?.importJson(JSON.parse(raw));
  if (result?.error !== undefined) console.warn(result.error);
};`,
      jsx: `<>
  <OgeBpmnEditor ref={editor} style={{ height: 420 }} onDiagramChanged={onDiagramChanged} />
  <button type="button" onClick={restore}>Restore last save</button>
</>`,
    }),
  },
  {
    title: 'Overlays & monitoring',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnEditorHandle'] },
      name: 'Monitoring',
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);
const count = useRef(0);

// attach a count bubble to the selected element; the badge tracks it
// through pan, zoom and model changes, hides while the element is
// gone and returns the handle for removeOverlay()
const addBadge = () => {
  const [id] = editor.current?.getSelection() ?? [];
  if (id === undefined) return;
  editor.current?.addOverlay({
    elementId: id,
    // sanitized into real elements — never dangerouslySetInnerHTML
    html: '<span class="badge">' + ++count.current + '</span>',
    position: 'top-right',
    offset: { x: 4, y: -4 },
  });
};

const clearBadges = () => editor.current?.clearOverlays(); // or clearOverlays(elementId)`,
      jsx: `<>
  <OgeBpmnEditor ref={editor} style={{ height: 420 }} />
  <button type="button" onClick={addBadge}>Add badge</button>
  <button type="button" onClick={clearBadges}>Clear</button>
</>`,
    }),
  },
  {
    title: 'Read-only viewer',
    source: reactDemoSource({
      react: ['useEffect', 'useRef'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnEditorHandle'] },
      name: 'Viewer',
      before: `declare const PROCESS_XML: string; // e.g. fetched from your API`,
      body: `const viewer = useRef<OgeBpmnEditorHandle>(null);

// load the diagram once the editor is mounted; readOnly blocks every
// mutation (palette, context pad, keyboard editing, drags) but
// keeps selection, pan, zoom and the accessible reading order
useEffect(() => {
  void viewer.current?.importXml(PROCESS_XML);
}, []);`,
      jsx: `<OgeBpmnEditor ref={viewer} style={{ height: 360 }} readOnly />`,
    }),
  },
  {
    title: 'Configuration & i18n',
    source: reactDemoSource({
      use: { '@oge-ui/react-bpmn': ['OgeBpmnConfigProvider', 'OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnMessages'] },
      name: 'LocalizedModeler',
      before: `// paletteLabels is a full record — every palette entry gets its label
const turkish: Partial<OgeBpmnMessages> = {
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
};`,
      jsx: `// per-instance override via the messages prop, inside
// subtree-scoped defaults (merged over the built-ins):
<OgeBpmnConfigProvider
  config={{
    gridSize: 20, // placement + arrow-key step
    snapThreshold: 8, // neighbor-alignment snapping
    zoomMin: 0.5,
    zoomMax: 2,
    autoSaveDebounceMs: 1000, // onDiagramChanged settle time (0 = sync)
    colorPresets: ['#fee2e2', '#dcfce7', '#dbeafe'], // panel fill swatches
    messages: { emptyText: 'Boş diyagram — paletten bir öğe seçin' },
  }}
>
  <OgeBpmnEditor style={{ height: 420 }} messages={turkish} />
</OgeBpmnConfigProvider>`,
    }),
  },
];
