import { demoSource } from '../../shared/demo-source';

/**
 * A Camunda-flavoured order process: a timer start, a Zeebe service task
 * (task definition, io mapping, headers), a Camunda 7 user task (assignee,
 * candidate groups, a text input parameter), a message catch referencing a
 * definitions-level message, documentation, and an expanded sub-process to
 * drag elements into (a plain-string fragment: data, not a component).
 */
export const CAMUNDA_SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_camunda" targetNamespace="http://ogeui.com/bpmn">
  <bpmn:process id="Process_payment" name="Payment" isExecutable="true">
    <bpmn:documentation>Charges the customer and waits for the bank.</bpmn:documentation>
    <bpmn:startEvent id="Start_hourly" name="Every hour">
      <bpmn:timerEventDefinition id="Timer_hourly">
        <bpmn:timeCycle xsi:type="bpmn:tFormalExpression">R/PT1H</bpmn:timeCycle>
      </bpmn:timerEventDefinition>
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_charge" name="Charge card">
      <bpmn:documentation>Calls the payment provider.</bpmn:documentation>
      <bpmn:extensionElements>
        <zeebe:taskDefinition type="payment" retries="5" />
        <zeebe:ioMapping>
          <zeebe:input source="=order.total" target="amount" />
          <zeebe:output source="=receipt" target="paymentReceipt" />
        </zeebe:ioMapping>
        <zeebe:taskHeaders>
          <zeebe:header key="currency" value="EUR" />
        </zeebe:taskHeaders>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:userTask id="Task_approve" name="Approve refund" camunda:assignee="demo" camunda:candidateGroups="finance">
      <bpmn:extensionElements>
        <camunda:inputOutput>
          <camunda:inputParameter name="limit">\${order.limit}</camunda:inputParameter>
        </camunda:inputOutput>
      </bpmn:extensionElements>
    </bpmn:userTask>
    <bpmn:intermediateCatchEvent id="Catch_paid" name="Bank confirmed">
      <bpmn:messageEventDefinition id="Catch_paid_def" messageRef="Message_paid" />
    </bpmn:intermediateCatchEvent>
    <bpmn:endEvent id="End_done" name="Done" />
    <bpmn:subProcess id="Sub_fulfil" name="Fulfilment" />
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_hourly" targetRef="Task_charge" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_charge" targetRef="Task_approve" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_approve" targetRef="Catch_paid" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Catch_paid" targetRef="End_done" />
  </bpmn:process>
  <bpmn:message id="Message_paid" name="paymentConfirmed" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_payment">
      <bpmndi:BPMNShape id="Start_hourly_di" bpmnElement="Start_hourly"><dc:Bounds x="150" y="122" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_charge_di" bpmnElement="Task_charge"><dc:Bounds x="240" y="100" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_approve_di" bpmnElement="Task_approve"><dc:Bounds x="400" y="100" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Catch_paid_di" bpmnElement="Catch_paid"><dc:Bounds x="560" y="122" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_done_di" bpmnElement="End_done"><dc:Bounds x="650" y="122" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Sub_fulfil_di" bpmnElement="Sub_fulfil" isExpanded="true"><dc:Bounds x="240" y="240" width="360" height="160" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="186" y="140" /><di:waypoint x="240" y="140" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="340" y="140" /><di:waypoint x="400" y="140" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="500" y="140" /><di:waypoint x="560" y="140" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="596" y="140" /><di:waypoint x="650" y="140" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

export const CAMUNDA_PROVIDERS_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: { '@oge-ui/bpmn': ['OGE_BPMN_CAMUNDA_PROVIDERS'] },
  template: `<!-- the opt-in Camunda preset: Zeebe (Camunda 8) task definition,
     io mappings and headers; Camunda 7 assignment and input/output -->
<oge-bpmn-editor
  #editor
  style="height: 480px"
  [propertiesProviders]="providers"
/>
<button type="button" (click)="xml.set(editor.exportXml())">Export XML</button>
<pre>{{ xml() }}</pre>`,
  body: `protected readonly providers = OGE_BPMN_CAMUNDA_PROVIDERS;
protected readonly xml = signal('');`,
});

export const ZEEBE_HELPERS_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  helpers: {
    '@oge-ui/bpmn-engine': [
      'bpmnZeebeIoMapping',
      'readBpmnXml',
      'setZeebeTaskDefinitionCommand',
      'writeBpmnXml',
    ],
  },
  template: `<oge-bpmn-editor #editor style="height: 360px" />`,
  body: `/**
 * The same typed helpers the panel uses, server-side: read a mapping, set a
 * job type, write the XML back (xmlns:zeebe is declared when needed).
 */
protected retarget(xml: string): string {
  const model = readBpmnXml(xml).model;
  if (model === null) return xml;
  console.log(bpmnZeebeIoMapping(model, 'Task_charge').inputs);
  return writeBpmnXml(
    setZeebeTaskDefinitionCommand('Task_charge', { type: 'payment-v2' }).apply(model),
  );
}`,
});

export const PAYLOADS_SNIPPET = demoSource({
  use: { '@oge-ui/bpmn': ['OgeBpmnEditor'] },
  template: `<!-- select the timer start or the message catch: timer type and
     expression, message reference (or "New message") and documentation are
     panel fields. Drag a task into "Fulfilment" — or pick it in "Move to" —
     to re-parent it; one undo step either way. -->
<oge-bpmn-editor #editor style="height: 480px" />
<button type="button" (click)="downloadPng()">Export PNG</button>`,
  body: `private readonly editor = viewChild.required(OgeBpmnEditor);

protected async downloadPng(): Promise<void> {
  // the SVG export rasterized on a canvas — no library
  const blob = await this.editor().exportPng({ pixelRatio: 2 });
  if (blob === null) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagram.png';
  link.click();
  URL.revokeObjectURL(url);
}`,
});
