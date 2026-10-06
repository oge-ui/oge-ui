import { demoSource } from '../../shared/demo-source';

/**
 * A small process with deliberate modeling problems — unconditioned flows out
 * of an exclusive gateway, a dead-end task, a disconnected unlabeled task —
 * for the validation demos (a plain-string fragment: data, not a component).
 */
export const LINT_SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_lint" targetNamespace="http://ogeui.com/bpmn">
  <bpmn:process id="Process_lint" isExecutable="false">
    <bpmn:startEvent id="Start_1" name="Claim filed" />
    <bpmn:userTask id="Task_review" name="Review claim" />
    <bpmn:exclusiveGateway id="Gateway_ok" name="Covered?" />
    <bpmn:endEvent id="End_paid" name="Paid" />
    <bpmn:task id="Task_fix" name="Ask for documents" />
    <bpmn:task id="Task_orphan" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_review" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_review" targetRef="Gateway_ok" />
    <bpmn:sequenceFlow id="Flow_yes" name="yes" sourceRef="Gateway_ok" targetRef="End_paid" />
    <bpmn:sequenceFlow id="Flow_no" name="no" sourceRef="Gateway_ok" targetRef="Task_fix" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_lint">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1"><dc:Bounds x="160" y="218" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_review_di" bpmnElement="Task_review"><dc:Bounds x="250" y="196" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_ok_di" bpmnElement="Gateway_ok"><dc:Bounds x="410" y="211" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_paid_di" bpmnElement="End_paid"><dc:Bounds x="530" y="138" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_fix_di" bpmnElement="Task_fix"><dc:Bounds x="500" y="276" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_orphan_di" bpmnElement="Task_orphan"><dc:Bounds x="250" y="340" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="196" y="236" /><di:waypoint x="250" y="236" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="350" y="236" /><di:waypoint x="410" y="236" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_yes_di" bpmnElement="Flow_yes"><di:waypoint x="435" y="211" /><di:waypoint x="435" y="156" /><di:waypoint x="530" y="156" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_no_di" bpmnElement="Flow_no"><di:waypoint x="435" y="261" /><di:waypoint x="435" y="316" /><di:waypoint x="500" y="316" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

export const LIVE_LINT_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnLintChangedEvent'] },
  template: `<!-- [lint] validates on every change: badges on offending shapes (the
     problem text joins their accessible name), a Problems toggle in the
     header and a problems panel — Enter on a row selects the element. -->
<oge-bpmn-editor
  #editor
  style="height: 460px"
  [lint]="true"
  (lintChanged)="onLint($event)"
/>
<p>{{ summary() }}</p>`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);

protected readonly summary = signal('');

constructor() {
  afterNextRender(() => void this.editor().importXml(PROCESS_XML));
}

protected onLint(event: OgeBpmnLintChangedEvent): void {
  this.summary.set(\`\${event.errors} errors, \${event.warnings} warnings\`);
}`,
  before: `declare const PROCESS_XML: string; // e.g. fetched from your API`,
});

export const CUSTOM_RULES_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnLintRulesInput'] },
  template: `<oge-bpmn-editor style="height: 460px" [lint]="true" [lintRules]="rules" />`,
  body: `// a full rule is added (or replaces the built-in with the same id);
// { id, severity } re-grades a built-in, severity: 'off' disables it
protected readonly rules: OgeBpmnLintRulesInput = [
  {
    id: 'task-needs-documentation',
    severity: 'info',
    check: (model) =>
      Object.values(model.nodes)
        .filter(
          (node) =>
            (node.type === 'userTask' || node.type === 'serviceTask') &&
            (node.documentation ?? '').trim() === '',
        )
        .map((node) => ({
          elementId: node.id,
          message: 'Document what this task does',
        })),
  },
  { id: 'label-required', severity: 'info' },
];`,
});

export const VALIDATE_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['lintBpmnDiagram', 'readBpmnXml'] },
  types: { '@oge-ui/bpmn': ['OgeBpmnLintIssue'] },
  template: `<!-- validate() runs the rules on demand — no live linting needed -->
<oge-bpmn-editor #editor style="height: 420px" />
<button type="button" (click)="check()">Validate</button>
@for (issue of issues(); track issue.key) {
  <p>{{ issue.severity }}: {{ issue.message }} ({{ issue.elementId }})</p>
}`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);

protected readonly issues = signal<readonly OgeBpmnLintIssue[]>([]);

protected check(): void {
  this.issues.set(this.editor().validate());
}

/** The same rules without an editor — a CI gate over stored diagrams. */
protected headless(xml: string): number {
  const model = readBpmnXml(xml).model;
  return model === null
    ? 0
    : lintBpmnDiagram(model).filter((i) => i.severity === 'error').length;
}`,
});
