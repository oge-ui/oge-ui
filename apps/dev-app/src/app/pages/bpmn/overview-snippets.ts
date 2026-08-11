import { demoSource } from '../../shared/demo-source';

/**
 * A small but complete order process — start → user task → gateway → two end
 * events, with full BPMN DI. Fed to the live import/export and read-only
 * demos; a deliberate plain-string fragment (data, not a component).
 */
export const SAMPLE_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_order" targetNamespace="http://ogeui.com/bpmn">
  <bpmn:process id="Process_order" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Order received" />
    <bpmn:userTask id="Task_review" name="Review order" />
    <bpmn:exclusiveGateway id="Gateway_ok" name="Approved?" default="Flow_no" />
    <bpmn:endEvent id="End_ship" name="Shipped" />
    <bpmn:endEvent id="End_reject" name="Rejected" />
    <bpmn:sequenceFlow id="Flow_start" sourceRef="Start_1" targetRef="Task_review" />
    <bpmn:sequenceFlow id="Flow_review" sourceRef="Task_review" targetRef="Gateway_ok" />
    <bpmn:sequenceFlow id="Flow_yes" name="yes" sourceRef="Gateway_ok" targetRef="End_ship" />
    <bpmn:sequenceFlow id="Flow_no" name="no" sourceRef="Gateway_ok" targetRef="End_reject" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_order">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="160" y="218" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_review_di" bpmnElement="Task_review">
        <dc:Bounds x="260" y="196" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_ok_di" bpmnElement="Gateway_ok">
        <dc:Bounds x="420" y="211" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_ship_di" bpmnElement="End_ship">
        <dc:Bounds x="530" y="158" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_reject_di" bpmnElement="End_reject">
        <dc:Bounds x="530" y="278" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_start_di" bpmnElement="Flow_start">
        <di:waypoint x="196" y="236" />
        <di:waypoint x="260" y="236" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_review_di" bpmnElement="Flow_review">
        <di:waypoint x="360" y="236" />
        <di:waypoint x="420" y="236" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_yes_di" bpmnElement="Flow_yes">
        <di:waypoint x="445" y="211" />
        <di:waypoint x="445" y="176" />
        <di:waypoint x="530" y="176" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_no_di" bpmnElement="Flow_no">
        <di:waypoint x="445" y="261" />
        <di:waypoint x="445" y="296" />
        <di:waypoint x="530" y="296" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

export const GETTING_STARTED_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnElementsChangedEvent'] },
  template: `<oge-bpmn-editor
  style="height: 480px"
  [(zoom)]="zoom"
  (elementsChanged)="onChanged($event)"
/>`,
  body: `// two-way zoom model: wheel zooming writes it back
protected readonly zoom = signal(1);

// fires on every command, undo/redo, import and newDiagram()
protected onChanged(event: OgeBpmnElementsChangedEvent): void {
  console.log(event.source, event.label);
}`,
});

export const IMPORT_EXPORT_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  types: { '@oge-ui/bpmn': ['BpmnImportWarning', 'OgeBpmnImportEvent'] },
  template: `<oge-bpmn-editor #editor style="height: 420px" (importCompleted)="onImport($event)" />
<textarea [value]="xml()" (input)="xml.set($any($event.target).value)"></textarea>
<button type="button" (click)="importXml()">Import</button>
<button type="button" (click)="exportXml()">Export</button>`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);

protected readonly xml = signal(SAMPLE_BPMN_XML);
protected readonly warnings = signal<readonly BpmnImportWarning[]>([]);

protected importXml(): void {
  // resolves with { model, warnings, error? }; a fatal parse
  // error leaves the current diagram untouched
  void this.editor().importXml(this.xml());
}

protected exportXml(): void {
  // deterministic BPMN 2.0 XML — same model, same bytes
  this.xml.set(this.editor().exportXml());
}

protected onImport(event: OgeBpmnImportEvent): void {
  this.warnings.set(event.warnings);
}`,
  before: `const SAMPLE_BPMN_XML = \`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ...>
  <bpmn:process id="Process_order">
    <bpmn:startEvent id="Start_1" name="Order received" />
    <bpmn:userTask id="Task_review" name="Review order" />
    <bpmn:exclusiveGateway id="Gateway_ok" name="Approved?" default="Flow_no" />
    <!-- ... end events, sequence flows and BPMN DI shapes/edges ... -->
  </bpmn:process>
</bpmn:definitions>\`;`,
});

export const READONLY_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  template: `<oge-bpmn-editor #viewer style="height: 360px" [readOnly]="true" />`,
  body: `private readonly viewer = viewChild.required(OgeBpmnEditor);

constructor() {
  // load the diagram once the view exists; readOnly blocks every
  // mutation (palette, context pad, keyboard editing, drags) but
  // keeps selection, pan, zoom and the accessible reading order
  afterNextRender(() => {
    void this.viewer().importXml(PROCESS_XML);
  });
}`,
  before: `declare const PROCESS_XML: string; // e.g. fetched from your API`,
});

export const CONFIG_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['provideOgeBpmnConfig'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnMessages'] },
  template: `<!-- per-instance override via the [messages] input -->
<oge-bpmn-editor style="height: 420px" [messages]="turkish" />`,
  body: `// paletteLabels is a full record — every palette entry gets its label
protected readonly turkish: Partial<OgeBpmnMessages> = {
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
  after: `// or app-scoped defaults (merged over the built-ins):
export const appConfig = {
  providers: [
    provideOgeBpmnConfig({
      gridSize: 20, // placement + arrow-key step
      snapThreshold: 8, // neighbor-alignment snapping
      zoomMin: 0.5,
      zoomMax: 2,
      autoSaveDebounceMs: 1000, // diagramChanged settle time (0 = sync)
      colorPresets: ['#fee2e2', '#dcfce7', '#dbeafe'], // panel fill swatches
      messages: { emptyText: 'Boş diyagram — paletten bir öğe seçin' },
    }),
  ],
};`,
});

export const AUTOSAVE_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnDiagramChangedEvent'] },
  template: `<oge-bpmn-editor
  #editor
  style="height: 420px"
  (diagramChanged)="onDiagramChanged($event)"
/>
<button type="button" (click)="restore()">Restore last save</button>`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);

// fires once per settled change (autoSaveDebounceMs, default 500ms),
// with the diagram already serialized to both JSON and XML — no
// exportJson() call needed and never mid-drag
protected onDiagramChanged(event: OgeBpmnDiagramChangedEvent): void {
  if (event.source === 'import' || event.source === 'new') return;
  localStorage.setItem('diagram', JSON.stringify(event.json));
  this.editor().markSaved();
}

protected restore(): void {
  const raw = localStorage.getItem('diagram');
  if (raw === null) return;
  // structural validation — a broken envelope never clobbers the canvas
  const { error } = this.editor().importJson(JSON.parse(raw));
  if (error !== undefined) console.warn(error);
}`,
});

export const OVERLAYS_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  template: `<oge-bpmn-editor #editor style="height: 420px" />
<button type="button" (click)="addBadge()">Add badge</button>
<button type="button" (click)="clearBadges()">Clear</button>`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);
private count = 0;

// attach a count bubble to the selected element; the badge tracks it
// through pan, zoom and model changes, hides while the element is
// gone and returns the handle for removeOverlay()
protected addBadge(): void {
  const [id] = this.editor().getSelection();
  if (id === undefined) return;
  this.editor().addOverlay({
    elementId: id,
    // rendered through Angular's sanitizing [innerHTML]
    html: '<span class="badge">' + ++this.count + '</span>',
    position: 'top-right',
    offset: { x: 4, y: -4 },
  });
}

protected clearBadges(): void {
  this.editor().clearOverlays(); // or clearOverlays(elementId)
}`,
});
