import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import { hiddenByCollapsed } from './bpmn-model';
import type { BpmnDiagram } from './bpmn-model';
import { V03_FIXTURE_XML } from './xml-fixtures';

function readModel(xml: string): BpmnDiagram {
  const result = readBpmnXml(xml);
  if (result.model === null) {
    throw new Error(result.error ?? 'no model');
  }
  return result.model;
}

function wrap(processContent: string, di = ''): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
    'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
    'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
    'id="Definitions_t" targetNamespace="http://example.com/bpmn">\n' +
    `<bpmn:process id="Process_t" isExecutable="false">${processContent}</bpmn:process>\n${di}</bpmn:definitions>`
  );
}

describe('bpmn-xml v0.3 element coverage', () => {
  // ---------------------------------------------------------- event definitions

  it('reads event definitions on every position of the fixture', () => {
    const m = readModel(V03_FIXTURE_XML);
    const kinds = Object.fromEntries(
      Object.values(m.nodes)
        .filter((n) => n.type !== 'textAnnotation')
        .filter((n) => n.type !== 'textAnnotation' && n.eventDefinition)
        .map((n) => [
          n.id,
          n.type !== 'textAnnotation' ? n.eventDefinition : undefined,
        ]),
    );
    expect(kinds).toEqual({
      Start_v3: 'message',
      Bound_v3: 'timer',
      Catch_v3: 'link',
      Throw_v3: 'escalation',
      End_v3: 'terminate',
    });
  });

  it('writes event definitions back with a deterministic derived id', () => {
    const xml = writeBpmnXml(readModel(V03_FIXTURE_XML));
    expect(xml).toContain('<bpmn:messageEventDefinition id="Start_v3_def" />');
    expect(xml).toContain('<bpmn:timerEventDefinition id="Bound_v3_def" />');
    expect(xml).toContain('<bpmn:terminateEventDefinition id="End_v3_def" />');
  });

  it('keeps the FIRST of multiple event definitions, warning about the rest', () => {
    const result = readBpmnXml(
      wrap(
        '<bpmn:startEvent id="S"><bpmn:timerEventDefinition /><bpmn:signalEventDefinition /></bpmn:startEvent>',
      ),
    );
    const node = result.model?.nodes['S'];
    expect(node?.type === 'startEvent' ? node.eventDefinition : null).toBe(
      'timer',
    );
    const warning = result.warnings.find(
      (w) => w.code === 'event-definition-stripped',
    );
    expect(warning?.localName).toBe('signalEventDefinition');
  });

  it('drops a definition invalid for its position with invalid-event-definition', () => {
    // A terminate definition is only valid on end events.
    const result = readBpmnXml(
      wrap(
        '<bpmn:startEvent id="S"><bpmn:terminateEventDefinition /></bpmn:startEvent>',
      ),
    );
    const node = result.model?.nodes['S'];
    expect(
      node?.type === 'startEvent' ? node.eventDefinition : 'set',
    ).toBeUndefined();
    const warning = result.warnings.find(
      (w) => w.code === 'invalid-event-definition',
    );
    expect(warning?.elementId).toBe('S');
  });

  it('drops an unknown *EventDefinition with event-definition-stripped', () => {
    const result = readBpmnXml(
      wrap(
        '<bpmn:endEvent id="E"><bpmn:cancelEventDefinition /></bpmn:endEvent>',
      ),
    );
    const warning = result.warnings.find(
      (w) => w.code === 'event-definition-stripped',
    );
    expect(warning?.localName).toBe('cancelEventDefinition');
  });

  // --------------------------------------------------------------- boundary events

  it('reads a non-interrupting boundary event with its host reference', () => {
    const m = readModel(V03_FIXTURE_XML);
    const boundary = m.nodes['Bound_v3'];
    expect(boundary).toMatchObject({
      type: 'boundaryEvent',
      attachedToRef: 'Task_v3',
      cancelActivity: false,
      eventDefinition: 'timer',
    });
  });

  it('writes boundary attributes back (cancelActivity only when false)', () => {
    const xml = writeBpmnXml(readModel(V03_FIXTURE_XML));
    expect(xml).toContain(
      '<bpmn:boundaryEvent id="Bound_v3" attachedToRef="Task_v3" cancelActivity="false">',
    );
  });

  it('drops a boundary event whose host is missing, cascading its flows', () => {
    const result = readBpmnXml(
      wrap(
        '<bpmn:task id="T" /><bpmn:boundaryEvent id="B" attachedToRef="Nope" />' +
          '<bpmn:endEvent id="E" /><bpmn:sequenceFlow id="F" sourceRef="B" targetRef="E" />',
      ),
    );
    expect(result.model?.nodes['B']).toBeUndefined();
    expect(result.model?.edges['F']).toBeUndefined();
    const codes = result.warnings.map((w) => w.code);
    expect(codes.filter((c) => c === 'dangling-ref')).toHaveLength(2);
  });

  // ------------------------------------------------------------------ sub-processes

  it('reads nested sub-processes with parentId and DI-driven collapse state', () => {
    const m = readModel(V03_FIXTURE_XML);
    expect(m.nodes['Sub_v3']).toMatchObject({ type: 'subProcess' });
    expect(
      m.nodes['Sub_v3'].type !== 'textAnnotation'
        ? m.nodes['Sub_v3'].collapsed
        : 'set',
    ).toBeUndefined(); // isExpanded="true" → expanded
    expect(m.nodes['SubStart_v3']).toMatchObject({ parentId: 'Sub_v3' });
    expect(m.nodes['Inner_v3']).toMatchObject({
      type: 'subProcess',
      parentId: 'Sub_v3',
      collapsed: true,
    });
    expect(m.nodes['InnerTask_v3']).toMatchObject({
      parentId: 'Inner_v3',
      markers: ['compensation'],
    });
    expect(m.nodes['EvtSub_v3']).toMatchObject({
      type: 'eventSubProcess',
      collapsed: true,
    });
    expect(m.nodes['Tx_v3']).toMatchObject({
      type: 'transaction',
      collapsed: true,
    });
  });

  it('hides children of collapsed containers and generates no DI for them', () => {
    const m = readModel(V03_FIXTURE_XML);
    const hidden = hiddenByCollapsed(m);
    expect(hidden.has('InnerTask_v3')).toBe(true);
    expect(hidden.has('TxTask_v3')).toBe(true);
    expect(hidden.has('SubStart_v3')).toBe(false);
    expect(m.shapeDi['InnerTask_v3']).toBeUndefined();
    expect(m.shapeDi['TxTask_v3']).toBeUndefined();
  });

  it('does not warn missing-di for children hidden inside collapsed containers', () => {
    const result = readBpmnXml(V03_FIXTURE_XML);
    expect(result.warnings).toEqual([]);
  });

  it('nests children inside their container elements and writes variants', () => {
    const xml = writeBpmnXml(readModel(V03_FIXTURE_XML));
    expect(xml).toContain('<bpmn:subProcess id="Sub_v3" name="Outer">');
    expect(xml).toMatch(
      /<bpmn:subProcess id="Sub_v3"[^>]*>[\s\S]*<bpmn:subProcess id="Inner_v3"[\s\S]*<\/bpmn:subProcess>[\s\S]*<\/bpmn:subProcess>/,
    );
    // Nested elements are indented one level deeper than process children.
    expect(xml).toContain('\n      <bpmn:startEvent id="SubStart_v3"');
    expect(xml).toContain('\n        <bpmn:task id="InnerTask_v3"');
    expect(xml).toContain(
      '<bpmn:subProcess id="EvtSub_v3" triggeredByEvent="true" />',
    );
    expect(xml).toContain('<bpmn:transaction id="Tx_v3">');
    expect(xml).toContain('isForCompensation="true"');
  });

  it('writes isExpanded on every sub-process shape', () => {
    const xml = writeBpmnXml(readModel(V03_FIXTURE_XML));
    expect(xml).toContain('bpmnElement="Sub_v3" isExpanded="true"');
    expect(xml).toContain('bpmnElement="Inner_v3" isExpanded="false"');
    expect(xml).toContain('bpmnElement="EvtSub_v3" isExpanded="false"');
    expect(xml).toContain('bpmnElement="Tx_v3" isExpanded="false"');
  });

  // ------------------------------------------------------------------ markers

  it('reads loop and multi-instance markers', () => {
    const m = readModel(V03_FIXTURE_XML);
    expect(m.nodes['Task_v3']).toMatchObject({
      markers: ['multiInstanceSequential'],
    });
    expect(m.nodes['TxTask_v3']).toMatchObject({ markers: ['loop'] });
  });

  it('writes marker characteristics back', () => {
    const xml = writeBpmnXml(readModel(V03_FIXTURE_XML));
    expect(xml).toContain(
      '<bpmn:multiInstanceLoopCharacteristics isSequential="true" />',
    );
    expect(xml).toContain('<bpmn:standardLoopCharacteristics />');
  });

  // ----------------------------------------------------------------- round trip

  it('round-trips the v0.3 fixture: model-equal re-read, byte-identical re-write', () => {
    const first = readModel(V03_FIXTURE_XML);
    const xml = writeBpmnXml(first);
    const second = readModel(xml);
    expect(second).toEqual(first);
    expect(writeBpmnXml(second)).toBe(xml);
  });

  it('auto-places a DI-less boundary event on its host border', () => {
    const result = readBpmnXml(
      wrap(
        '<bpmn:task id="T" /><bpmn:boundaryEvent id="B" attachedToRef="T" />',
        '<bpmndi:BPMNDiagram id="D"><bpmndi:BPMNPlane id="P" bpmnElement="Process_t">' +
          '<bpmndi:BPMNShape id="T_di" bpmnElement="T"><dc:Bounds x="200" y="100" width="100" height="80" /></bpmndi:BPMNShape>' +
          '</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>',
      ),
    );
    const bounds = result.model?.shapeDi['B']?.bounds;
    expect(bounds).toEqual({ x: 232, y: 162, width: 36, height: 36 });
  });
});
