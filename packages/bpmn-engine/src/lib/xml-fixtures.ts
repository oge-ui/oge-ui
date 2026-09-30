import type { BpmnDiagram } from './bpmn-model';

/**
 * Builds the shared demo process serialized with a configurable element prefix, so the
 * prefix-agnostic reader can be exercised against `bpmn:`, `bpmn2:` and default-namespace
 * variants of the exact same document.
 */
export function demoProcessXml(prefix: string): string {
  const p = prefix === '' ? '' : `${prefix}:`;
  const modelNs =
    prefix === ''
      ? 'xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"'
      : `xmlns:${prefix}="http://www.omg.org/spec/BPMN/20100524/MODEL"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<${p}definitions ${modelNs} xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_demo" targetNamespace="http://example.com/bpmn" exporter="OgeTest" exporterVersion="1.0">
  <${p}process id="Process_demo" isExecutable="true">
    <${p}startEvent id="StartEvent_1" name="Start" />
    <${p}userTask id="Activity_approve" name="Approve" />
    <${p}exclusiveGateway id="Gateway_check" default="Flow_no" />
    <${p}endEvent id="EndEvent_1" />
    <${p}sequenceFlow id="Flow_s1" sourceRef="StartEvent_1" targetRef="Activity_approve" />
    <${p}sequenceFlow id="Flow_a1" sourceRef="Activity_approve" targetRef="Gateway_check" />
    <${p}sequenceFlow id="Flow_yes" name="yes" sourceRef="Gateway_check" targetRef="EndEvent_1">
      <${p}conditionExpression xsi:type="${p}tFormalExpression">amount &gt; 100</${p}conditionExpression>
    </${p}sequenceFlow>
    <${p}sequenceFlow id="Flow_no" sourceRef="Gateway_check" targetRef="EndEvent_1" />
    <${p}textAnnotation id="Note_1">
      <${p}text>Check limits</${p}text>
    </${p}textAnnotation>
    <${p}association id="Assoc_1" sourceRef="Note_1" targetRef="Activity_approve" />
  </${p}process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_demo">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_approve_di" bpmnElement="Activity_approve">
        <dc:Bounds x="240" y="130" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_check_di" bpmnElement="Gateway_check">
        <dc:Bounds x="400" y="145" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="520" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Note_1_di" bpmnElement="Note_1">
        <dc:Bounds x="240" y="40" width="100" height="30" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_s1_di" bpmnElement="Flow_s1">
        <di:waypoint x="188" y="170" />
        <di:waypoint x="240" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_a1_di" bpmnElement="Flow_a1">
        <di:waypoint x="340" y="170" />
        <di:waypoint x="400" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_yes_di" bpmnElement="Flow_yes">
        <di:waypoint x="450" y="170" />
        <di:waypoint x="520" y="170" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="470" y="150" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_no_di" bpmnElement="Flow_no">
        <di:waypoint x="425" y="195" />
        <di:waypoint x="425" y="240" />
        <di:waypoint x="538" y="240" />
        <di:waypoint x="538" y="188" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Assoc_1_di" bpmnElement="Assoc_1">
        <di:waypoint x="290" y="130" />
        <di:waypoint x="290" y="70" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</${p}definitions>
`;
}

/** The model every prefix variant of the demo process is expected to produce. */
export const DEMO_EXPECTED_MODEL: BpmnDiagram = {
  processId: 'Process_demo',
  isExecutable: true,
  pools: {},
  nodes: {
    StartEvent_1: { id: 'StartEvent_1', type: 'startEvent', name: 'Start' },
    Activity_approve: {
      id: 'Activity_approve',
      type: 'userTask',
      name: 'Approve',
    },
    Gateway_check: {
      id: 'Gateway_check',
      type: 'exclusiveGateway',
      defaultFlowId: 'Flow_no',
    },
    EndEvent_1: { id: 'EndEvent_1', type: 'endEvent' },
    Note_1: { id: 'Note_1', type: 'textAnnotation', text: 'Check limits' },
  },
  edges: {
    Flow_s1: {
      id: 'Flow_s1',
      type: 'sequenceFlow',
      sourceRef: 'StartEvent_1',
      targetRef: 'Activity_approve',
    },
    Flow_a1: {
      id: 'Flow_a1',
      type: 'sequenceFlow',
      sourceRef: 'Activity_approve',
      targetRef: 'Gateway_check',
    },
    Flow_yes: {
      id: 'Flow_yes',
      type: 'sequenceFlow',
      sourceRef: 'Gateway_check',
      targetRef: 'EndEvent_1',
      name: 'yes',
      conditionExpression: 'amount > 100',
    },
    Flow_no: {
      id: 'Flow_no',
      type: 'sequenceFlow',
      sourceRef: 'Gateway_check',
      targetRef: 'EndEvent_1',
    },
    Assoc_1: {
      id: 'Assoc_1',
      type: 'association',
      sourceRef: 'Note_1',
      targetRef: 'Activity_approve',
    },
  },
  order: [
    'StartEvent_1',
    'Activity_approve',
    'Gateway_check',
    'EndEvent_1',
    'Flow_s1',
    'Flow_a1',
    'Flow_yes',
    'Flow_no',
    'Note_1',
    'Assoc_1',
  ],
  shapeDi: {
    StartEvent_1: { bounds: { x: 152, y: 152, width: 36, height: 36 } },
    Activity_approve: { bounds: { x: 240, y: 130, width: 100, height: 80 } },
    Gateway_check: { bounds: { x: 400, y: 145, width: 50, height: 50 } },
    EndEvent_1: { bounds: { x: 520, y: 152, width: 36, height: 36 } },
    Note_1: { bounds: { x: 240, y: 40, width: 100, height: 30 } },
  },
  edgeDi: {
    Flow_s1: {
      waypoints: [
        { x: 188, y: 170 },
        { x: 240, y: 170 },
      ],
    },
    Flow_a1: {
      waypoints: [
        { x: 340, y: 170 },
        { x: 400, y: 170 },
      ],
    },
    Flow_yes: {
      waypoints: [
        { x: 450, y: 170 },
        { x: 520, y: 170 },
      ],
      labelBounds: { x: 470, y: 150, width: 20, height: 14 },
    },
    Flow_no: {
      waypoints: [
        { x: 425, y: 195 },
        { x: 425, y: 240 },
        { x: 538, y: 240 },
        { x: 538, y: 188 },
      ],
    },
    Assoc_1: {
      waypoints: [
        { x: 290, y: 130 },
        { x: 290, y: 70 },
      ],
    },
  },
  definitionsAttrs: {
    id: 'Definitions_demo',
    targetNamespace: 'http://example.com/bpmn',
    exporter: 'OgeTest',
    exporterVersion: '1.0',
  },
  foreignDefinitionsChildren: [],
};

/** Camunda-flavored fixture: extension elements, documentation, vendor attribute, stripped event definition, unsupported sub-process with dangling flows and partially missing DI. */
export const FOREIGN_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_f" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_f" isExecutable="false">
    <bpmn:startEvent id="Start_f">
      <bpmn:messageEventDefinition id="MsgDef_1" />
    </bpmn:startEvent>
    <bpmn:serviceTask id="Task_f" name="Send" camunda:asyncBefore="true">
      <bpmn:documentation>Sends the invoice.</bpmn:documentation>
      <bpmn:extensionElements><camunda:property name="k" value="v" /></bpmn:extensionElements>
    </bpmn:serviceTask>
    <bpmn:subProcess id="Sub_f" />
    <bpmn:sequenceFlow id="Flow_f1" sourceRef="Start_f" targetRef="Task_f" />
    <bpmn:sequenceFlow id="Flow_f2" sourceRef="Task_f" targetRef="Sub_f" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_f">
      <bpmndi:BPMNShape id="Start_f_di" bpmnElement="Start_f">
        <dc:Bounds x="100" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/**
 * v0.5 attribute-preservation fixture, authored byte-for-byte in the writer's
 * own output format: vendor attributes on definitions, process, task and
 * sequence flow plus the `xmlns:camunda` declaration must survive an import →
 * export round trip byte-identically.
 */
export const PRESERVE_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions id="Definitions_p" camunda:diagramRelationId="rel-1" targetNamespace="http://example.com/bpmn" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <bpmn:process id="Process_p" isExecutable="true" camunda:historyTimeToLive="30">
    <bpmn:startEvent id="Start_p">
      <bpmn:outgoing>Flow_p1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_p" name="Work" camunda:asyncBefore="true">
      <bpmn:incoming>Flow_p1</bpmn:incoming>
    </bpmn:task>
    <bpmn:sequenceFlow id="Flow_p1" sourceRef="Start_p" targetRef="Task_p" camunda:jobPriority="5" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_p">
      <bpmndi:BPMNShape id="Start_p_di" bpmnElement="Start_p">
        <dc:Bounds x="100" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_p_di" bpmnElement="Task_p">
        <dc:Bounds x="200" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_p1_di" bpmnElement="Flow_p1">
        <di:waypoint x="136" y="118" />
        <di:waypoint x="200" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/** Collaboration fixture (single participant): imports as one pool whose process is the default process. */
export const COLLABORATION_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_c" targetNamespace="http://example.com/bpmn">
  <bpmn:collaboration id="Collab_1"><bpmn:participant id="Participant_1" processRef="Process_c" /></bpmn:collaboration>
  <bpmn:process id="Process_c" isExecutable="false">
    <bpmn:startEvent id="Start_c" />
    <bpmn:task id="Task_c" name="Work" />
    <bpmn:sequenceFlow id="Flow_c1" sourceRef="Start_c" targetRef="Task_c" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collab_1">
      <bpmndi:BPMNShape id="Start_c_di" bpmnElement="Start_c">
        <dc:Bounds x="100" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_c_di" bpmnElement="Task_c">
        <dc:Bounds x="200" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_c1_di" bpmnElement="Flow_c1">
        <di:waypoint x="136" y="118" />
        <di:waypoint x="200" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/** Fixture without any diagram interchange: import must warn and auto-lay-out every element. */
export const NO_DI_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_n" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_n" isExecutable="false">
    <bpmn:startEvent id="Start_n" />
    <bpmn:task id="Task_n" />
    <bpmn:endEvent id="End_n" />
    <bpmn:sequenceFlow id="Flow_n1" sourceRef="Start_n" targetRef="Task_n" />
    <bpmn:sequenceFlow id="Flow_n2" sourceRef="Task_n" targetRef="End_n" />
  </bpmn:process>
</bpmn:definitions>
`;

/** Fixture whose condition expression is wrapped in a CDATA section. */
export const CDATA_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_d" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_d" isExecutable="false">
    <bpmn:task id="A_d" />
    <bpmn:task id="B_d" />
    <bpmn:sequenceFlow id="Flow_d1" sourceRef="A_d" targetRef="B_d">
      <bpmn:conditionExpression><![CDATA[a > 5 && b < 3]]></bpmn:conditionExpression>
    </bpmn:sequenceFlow>
  </bpmn:process>
</bpmn:definitions>
`;

/** Fixture containing two processes; only the first one may be imported. */
export const MULTI_PROCESS_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_m" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_first" isExecutable="false">
    <bpmn:startEvent id="Start_m" />
  </bpmn:process>
  <bpmn:process id="Process_second" isExecutable="false">
    <bpmn:task id="Task_m" />
  </bpmn:process>
</bpmn:definitions>
`;

/**
 * v0.3 element-coverage fixture: event definitions on every position, a
 * non-interrupting boundary event with a timer, a two-level nested
 * sub-process (outer expanded, inner collapsed), an event sub-process, a
 * transaction, and loop / multi-instance / compensation markers.
 */
export const V03_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_v3" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_v3" isExecutable="false">
    <bpmn:startEvent id="Start_v3" name="Msg start">
      <bpmn:messageEventDefinition id="Start_v3_def" />
    </bpmn:startEvent>
    <bpmn:userTask id="Task_v3" name="Approve">
      <bpmn:multiInstanceLoopCharacteristics isSequential="true" />
    </bpmn:userTask>
    <bpmn:boundaryEvent id="Bound_v3" attachedToRef="Task_v3" cancelActivity="false">
      <bpmn:timerEventDefinition id="Bound_v3_def" />
    </bpmn:boundaryEvent>
    <bpmn:subProcess id="Sub_v3" name="Outer">
      <bpmn:startEvent id="SubStart_v3" />
      <bpmn:subProcess id="Inner_v3" name="Inner">
        <bpmn:task id="InnerTask_v3" isForCompensation="true" />
      </bpmn:subProcess>
      <bpmn:sequenceFlow id="Flow_sub1" sourceRef="SubStart_v3" targetRef="Inner_v3" />
    </bpmn:subProcess>
    <bpmn:subProcess id="EvtSub_v3" triggeredByEvent="true" />
    <bpmn:transaction id="Tx_v3">
      <bpmn:task id="TxTask_v3">
        <bpmn:standardLoopCharacteristics />
      </bpmn:task>
    </bpmn:transaction>
    <bpmn:intermediateCatchEvent id="Catch_v3">
      <bpmn:linkEventDefinition id="Catch_v3_def" />
    </bpmn:intermediateCatchEvent>
    <bpmn:intermediateThrowEvent id="Throw_v3">
      <bpmn:escalationEventDefinition id="Throw_v3_def" />
    </bpmn:intermediateThrowEvent>
    <bpmn:endEvent id="End_v3">
      <bpmn:terminateEventDefinition id="End_v3_def" />
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_v3a" sourceRef="Start_v3" targetRef="Task_v3" />
    <bpmn:sequenceFlow id="Flow_v3b" sourceRef="Bound_v3" targetRef="End_v3" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_v3">
      <bpmndi:BPMNShape id="Start_v3_di" bpmnElement="Start_v3">
        <dc:Bounds x="100" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_v3_di" bpmnElement="Task_v3">
        <dc:Bounds x="200" y="130" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Bound_v3_di" bpmnElement="Bound_v3">
        <dc:Bounds x="232" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Sub_v3_di" bpmnElement="Sub_v3" isExpanded="true">
        <dc:Bounds x="360" y="80" width="350" height="200" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="SubStart_v3_di" bpmnElement="SubStart_v3">
        <dc:Bounds x="390" y="160" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Inner_v3_di" bpmnElement="Inner_v3" isExpanded="false">
        <dc:Bounds x="480" y="140" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EvtSub_v3_di" bpmnElement="EvtSub_v3" isExpanded="false">
        <dc:Bounds x="360" y="320" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Tx_v3_di" bpmnElement="Tx_v3" isExpanded="false">
        <dc:Bounds x="500" y="320" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Catch_v3_di" bpmnElement="Catch_v3">
        <dc:Bounds x="760" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Throw_v3_di" bpmnElement="Throw_v3">
        <dc:Bounds x="830" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_v3_di" bpmnElement="End_v3">
        <dc:Bounds x="900" y="152" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_sub1_di" bpmnElement="Flow_sub1">
        <di:waypoint x="426" y="178" />
        <di:waypoint x="480" y="178" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_v3a_di" bpmnElement="Flow_v3a">
        <di:waypoint x="136" y="170" />
        <di:waypoint x="200" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_v3b_di" bpmnElement="Flow_v3b">
        <di:waypoint x="250" y="228" />
        <di:waypoint x="250" y="260" />
        <di:waypoint x="918" y="260" />
        <di:waypoint x="918" y="188" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/** bpmn.io-colored fixture: `bioc:stroke`/`bioc:fill` on a shape and an edge. */
export const COLORED_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" id="Definitions_col" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Process_col" isExecutable="false">
    <bpmn:startEvent id="Start_col" />
    <bpmn:task id="Task_col" name="Tinted" />
    <bpmn:sequenceFlow id="Flow_col" sourceRef="Start_col" targetRef="Task_col" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_col">
      <bpmndi:BPMNShape id="Start_col_di" bpmnElement="Start_col">
        <dc:Bounds x="100" y="100" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_col_di" bpmnElement="Task_col" bioc:stroke="#0d4372" bioc:fill="#bbdefb">
        <dc:Bounds x="200" y="78" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_col_di" bpmnElement="Flow_col" bioc:stroke="#0d4372">
        <di:waypoint x="136" y="118" />
        <di:waypoint x="200" y="118" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

/**
 * v0.4 collaboration fixture: two participant pools with processes (one with
 * two lanes), a black-box pool, message flows (node↔node and node↔pool), a
 * data object with an in-activity output association, a data store with an
 * input association, a labeled group (category/categoryValue pair) and a call
 * activity.
 */
export const V04_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_v4" targetNamespace="http://example.com/bpmn">
  <bpmn:collaboration id="Collab_v4">
    <bpmn:participant id="Pool_a" name="Customer" processRef="Process_a" />
    <bpmn:participant id="Pool_b" name="Supplier" processRef="Process_b" />
    <bpmn:participant id="Pool_c" name="Registry" />
    <bpmn:messageFlow id="Msg_1" name="order" sourceRef="Task_a" targetRef="Task_b" />
    <bpmn:messageFlow id="Msg_2" sourceRef="Task_b" targetRef="Pool_c" />
  </bpmn:collaboration>
  <bpmn:process id="Process_a" isExecutable="false">
    <bpmn:laneSet id="LaneSet_a">
      <bpmn:lane id="Lane_a1" name="Front">
        <bpmn:flowNodeRef>Start_a</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_a</bpmn:flowNodeRef>
      </bpmn:lane>
      <bpmn:lane id="Lane_a2" name="Back">
        <bpmn:flowNodeRef>Call_a</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:startEvent id="Start_a" />
    <bpmn:task id="Task_a" name="Order">
      <bpmn:dataOutputAssociation id="DataOut_a">
        <bpmn:targetRef>Data_a</bpmn:targetRef>
      </bpmn:dataOutputAssociation>
    </bpmn:task>
    <bpmn:callActivity id="Call_a" name="Check" calledElement="Process_check" />
    <bpmn:sequenceFlow id="Flow_a1" sourceRef="Start_a" targetRef="Task_a" />
    <bpmn:sequenceFlow id="Flow_a2" sourceRef="Task_a" targetRef="Call_a" />
    <bpmn:dataObject id="Data_a_ref" />
    <bpmn:dataObjectReference id="Data_a" name="Order data" dataObjectRef="Data_a_ref" />
    <bpmn:group id="Group_a" categoryValueRef="Group_a_val" />
  </bpmn:process>
  <bpmn:process id="Process_b" name="Supply" isExecutable="true">
    <bpmn:task id="Task_b" name="Fulfil">
      <bpmn:dataInputAssociation id="DataIn_b">
        <bpmn:sourceRef>Store_b</bpmn:sourceRef>
      </bpmn:dataInputAssociation>
    </bpmn:task>
    <bpmn:dataStoreReference id="Store_b" name="Stock" />
  </bpmn:process>
  <bpmn:category id="Group_a_cat">
    <bpmn:categoryValue id="Group_a_val" value="Ordering" />
  </bpmn:category>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collab_v4">
      <bpmndi:BPMNShape id="Pool_a_di" bpmnElement="Pool_a" isHorizontal="true">
        <dc:Bounds x="160" y="80" width="700" height="260" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_a1_di" bpmnElement="Lane_a1" isHorizontal="true">
        <dc:Bounds x="190" y="80" width="670" height="130" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_a2_di" bpmnElement="Lane_a2" isHorizontal="true">
        <dc:Bounds x="190" y="210" width="670" height="130" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Pool_b_di" bpmnElement="Pool_b" isHorizontal="true">
        <dc:Bounds x="160" y="390" width="700" height="160" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Pool_c_di" bpmnElement="Pool_c" isHorizontal="true">
        <dc:Bounds x="160" y="600" width="700" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Start_a_di" bpmnElement="Start_a">
        <dc:Bounds x="230" y="127" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_a_di" bpmnElement="Task_a">
        <dc:Bounds x="320" y="105" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Call_a_di" bpmnElement="Call_a">
        <dc:Bounds x="320" y="235" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Data_a_di" bpmnElement="Data_a">
        <dc:Bounds x="490" y="120" width="36" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Group_a_di" bpmnElement="Group_a">
        <dc:Bounds x="300" y="95" width="260" height="230" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_b_di" bpmnElement="Task_b">
        <dc:Bounds x="320" y="430" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Store_b_di" bpmnElement="Store_b">
        <dc:Bounds x="490" y="445" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_a1_di" bpmnElement="Flow_a1">
        <di:waypoint x="266" y="145" />
        <di:waypoint x="320" y="145" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_a2_di" bpmnElement="Flow_a2">
        <di:waypoint x="370" y="185" />
        <di:waypoint x="370" y="235" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="DataOut_a_di" bpmnElement="DataOut_a">
        <di:waypoint x="420" y="145" />
        <di:waypoint x="490" y="145" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Msg_1_di" bpmnElement="Msg_1">
        <di:waypoint x="370" y="185" />
        <di:waypoint x="370" y="430" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Msg_2_di" bpmnElement="Msg_2">
        <di:waypoint x="420" y="470" />
        <di:waypoint x="420" y="600" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="DataIn_b_di" bpmnElement="DataIn_b">
        <di:waypoint x="490" y="470" />
        <di:waypoint x="420" y="470" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
