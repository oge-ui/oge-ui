import type { BpmnDiagram, BpmnFlowNode } from './bpmn-model';
import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import {
  BPMN_PROCESS_TARGET,
  addRootElementCommand,
  setDocumentationCommand,
  setEventDetailsCommand,
  setForeignAttributeCommand,
  updateRootElementCommand,
} from './commands-extensions';
import {
  addNodeCommand,
  extractClipboard,
  pasteCommand,
  setEventDefinitionCommand,
} from './commands';
import { createEmptyDiagram } from './bpmn-model';
import { fromBpmnJson, toBpmnJson } from './bpmn-json';
import { CAMUNDA_FIXTURE_XML } from './xml-fixtures';

function read(xml: string = CAMUNDA_FIXTURE_XML): BpmnDiagram {
  const result = readBpmnXml(xml);
  if (result.model === null) throw new Error(result.error);
  return result.model;
}

function flowNode(model: BpmnDiagram, id: string): BpmnFlowNode {
  const node = model.nodes[id];
  if (node === undefined || node.type === 'textAnnotation') {
    throw new Error(`no flow node ${id}`);
  }
  return node;
}

describe('G5b XML payloads', () => {
  it('imports every payload without a dropped-payload warning', () => {
    const result = readBpmnXml(CAMUNDA_FIXTURE_XML);
    expect(result.warnings).toEqual([]);
  });

  it('reads documentation on the process, nodes and flows', () => {
    const m = read();
    expect(m.processDocumentation).toBe('Order handling');
    expect(flowNode(m, 'Start_t').documentation).toBe('Cron start');
    const flow = m.edges['Flow_1'];
    expect(flow.type === 'sequenceFlow' && flow.documentation).toBe('Kick-off');
  });

  it('reads event-definition payloads', () => {
    const m = read();
    expect(flowNode(m, 'Start_t').eventDetails).toEqual({
      id: 'TimerDef_1',
      timer: { kind: 'timeCycle', expression: 'R/PT1H' },
    });
    // a derived `{id}_def` id is not stored
    expect(flowNode(m, 'Catch_m').eventDetails).toEqual({
      ref: 'Message_paid',
    });
    expect(flowNode(m, 'Catch_c').eventDetails?.condition).toBe('=stock > 0');
    expect(flowNode(m, 'Throw_l').eventDetails?.linkName).toBe('toEnd');
    expect(flowNode(m, 'End_e').eventDetails?.ref).toBe('Error_pay');
  });

  it('reads the definitions-level root elements', () => {
    const m = read();
    expect(m.rootElements?.map((r) => [r.type, r.id, r.name, r.code])).toEqual([
      ['message', 'Message_paid', 'paid', undefined],
      ['error', 'Error_pay', 'Payment failed', 'PAY-1'],
      ['signal', 'Signal_x', 'stop', undefined],
      ['escalation', 'Esc_x', 'late', 'E1'],
    ]);
    expect(m.rootElements?.[0].foreignChildren?.[0]).toContain(
      'zeebe:subscription',
    );
    expect(m.foreignDefinitionsChildren).toEqual([]);
  });

  it('reads extension elements into an editable tree', () => {
    const m = read();
    expect(flowNode(m, 'Task_z').extensionElements?.[0]).toEqual({
      name: 'zeebe:taskDefinition',
      attributes: { type: 'payment', retries: '5' },
    });
    expect(m.processExtensionElements).toEqual([
      { name: 'zeebe:versionTag', attributes: { value: '1.2' } },
    ]);
  });

  it('round-trips byte-identically after the first write', () => {
    const x1 = writeBpmnXml(read());
    const m2 = read(x1);
    expect(m2).toEqual(read());
    expect(writeBpmnXml(m2)).toBe(x1);
    expect(x1).toContain(
      '<bpmn:timeCycle xsi:type="bpmn:tFormalExpression">R/PT1H</bpmn:timeCycle>',
    );
    expect(x1).toContain(
      '<bpmn:messageEventDefinition id="Catch_m_def" messageRef="Message_paid" />',
    );
    expect(x1).toContain(
      '<bpmn:error id="Error_pay" name="Payment failed" errorCode="PAY-1" />',
    );
    expect(x1).toContain(
      '<zeebe:input source="=order.total" target="amount" />',
    );
    // the complex camunda parameter survives verbatim
    expect(x1).toContain('<camunda:value>a</camunda:value>');
  });

  it('writes documentation first, before extension elements', () => {
    const x = writeBpmnXml(read());
    const start = x.indexOf('<bpmn:startEvent id="Start_t"');
    const doc = x.indexOf('<bpmn:documentation>Cron start', start);
    const def = x.indexOf('<bpmn:timerEventDefinition', start);
    expect(doc).toBeGreaterThan(start);
    expect(def).toBeGreaterThan(doc);
  });

  it('survives the JSON envelope', () => {
    const m = read();
    const parsed = fromBpmnJson(JSON.parse(JSON.stringify(toBpmnJson(m))));
    expect(parsed.model).toEqual(m);
  });
});

describe('G5b commands', () => {
  it('sets and clears documentation on elements and the process', () => {
    let m = read();
    m = setDocumentationCommand('Task_z', 'Charges').apply(m);
    expect(flowNode(m, 'Task_z').documentation).toBe('Charges');
    m = setDocumentationCommand(BPMN_PROCESS_TARGET, '').apply(m);
    expect(m.processDocumentation).toBeUndefined();
    const x = writeBpmnXml(m);
    expect(x).toContain('<bpmn:documentation>Charges</bpmn:documentation>');
    expect(x).not.toContain('Order handling');
  });

  it('edits a timer and keeps unchanged edits as no-ops', () => {
    const m = read();
    const next = setEventDetailsCommand('Start_t', {
      timer: { kind: 'timeDuration', expression: 'PT5M' },
    }).apply(m);
    expect(flowNode(next, 'Start_t').eventDetails?.timer).toEqual({
      kind: 'timeDuration',
      expression: 'PT5M',
    });
    expect(
      setEventDetailsCommand('Start_t', {
        timer: { kind: 'timeCycle', expression: 'R/PT1H' },
      }).apply(m),
    ).toBe(m);
    // a field of another kind is ignored
    expect(setEventDetailsCommand('Start_t', { ref: 'x' }).apply(m)).toBe(m);
  });

  it('creates a root element and references it in one step', () => {
    const m = read();
    const next = addRootElementCommand({ type: 'signal' }, 'Throw_l').apply(m);
    expect(next).toBe(next); // sanity
    // Throw_l is a link event: the ref is ignored, the signal is still added
    expect(next.rootElements?.length).toBe(5);
    const withSignal = setEventDefinitionCommand('Throw_l', 'signal').apply(m);
    const linked = addRootElementCommand(
      { type: 'signal', name: 'go' },
      'Throw_l',
    ).apply(withSignal);
    const added = linked.rootElements?.[linked.rootElements.length - 1];
    expect(added?.name).toBe('go');
    expect(flowNode(linked, 'Throw_l').eventDetails?.ref).toBe(added?.id);
  });

  it('renames a root element and changes its code', () => {
    const m = updateRootElementCommand('Error_pay', {
      name: 'Declined',
      code: '',
    }).apply(read());
    expect(m.rootElements?.[1]).toEqual({
      id: 'Error_pay',
      type: 'error',
      name: 'Declined',
    });
  });

  it('drops the payload when the definition kind changes', () => {
    const m = setEventDefinitionCommand('Catch_m', 'timer').apply(read());
    expect(flowNode(m, 'Catch_m').eventDetails).toBeUndefined();
  });

  it('strips a stored definition id from a pasted copy', () => {
    const m = read();
    const clip = extractClipboard(m, ['Start_t']);
    if (clip === null) throw new Error('nothing copied');
    const pasted = pasteCommand(clip, { x: 50, y: 50 }).apply(m);
    const copyId = pasted.order[pasted.order.length - 1];
    expect(flowNode(pasted, copyId).eventDetails).toEqual({
      timer: { kind: 'timeCycle', expression: 'R/PT1H' },
    });
  });

  it('sets a vendor attribute and declares its namespace', () => {
    const empty = addNodeCommand(
      'serviceTask',
      { x: 100, y: 100 },
      'Task_z',
    ).apply(createEmptyDiagram());
    expect(empty.definitionsAttrs['xmlns:camunda']).toBeUndefined();
    const next = setForeignAttributeCommand(
      'Task_z',
      'camunda:asyncAfter',
      'true',
      { camunda: 'http://camunda.org/schema/1.0/bpmn' },
    ).apply(empty);
    expect(flowNode(next, 'Task_z').foreignAttributes).toEqual({
      'camunda:asyncAfter': 'true',
    });
    expect(writeBpmnXml(next)).toContain(
      'xmlns:camunda="http://camunda.org/schema/1.0/bpmn"',
    );
    expect(next.definitionsAttrs['xmlns:camunda']).toBe(
      'http://camunda.org/schema/1.0/bpmn',
    );
  });

  it('never writes an element or attribute name that is not a QName', () => {
    const m = read();
    const node = flowNode(m, 'Task_z');
    const hostile: BpmnDiagram = {
      ...m,
      nodes: {
        ...m.nodes,
        Task_z: {
          ...node,
          extensionElements: [
            { name: 'x onload="alert(1)"' },
            { name: 'ok:el', attributes: { 'a b': '1', good: '<"&>' } },
          ],
        },
      },
    };
    const x = writeBpmnXml(hostile);
    expect(x).not.toContain('onload');
    expect(x).toContain('<ok:el good="&lt;&quot;&amp;&gt;" />');
  });
});
