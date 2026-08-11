import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import { demoProcessXml, V04_FIXTURE_XML } from './xml-fixtures';
import type { BpmnDiagram } from './bpmn-model';

function readOrThrow(xml: string): BpmnDiagram {
  const result = readBpmnXml(xml);
  if (result.model === null) {
    throw new Error(result.error ?? 'no model');
  }
  return result.model;
}

describe('bpmn-xml v0.4 — collaboration', () => {
  // ------------------------------------------------------------------ reader

  it('imports participants as pools, including a black-box pool', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.collaborationId).toBe('Collab_v4');
    expect(Object.keys(m.pools)).toEqual(['Pool_a', 'Pool_b', 'Pool_c']);
    expect(m.pools['Pool_a'].name).toBe('Customer');
    expect(m.pools['Pool_a'].processRef).toBe('Process_a');
    expect(m.pools['Pool_c'].processRef).toBeUndefined();
    expect(m.pools['Pool_c'].lanes).toEqual([]);
    // The first process is the default process; the second is pool-owned.
    expect(m.processId).toBe('Process_a');
    expect(m.isExecutable).toBe(false);
    expect(m.pools['Pool_b'].processName).toBe('Supply');
    expect(m.pools['Pool_b'].processExecutable).toBe(true);
  });

  it('assigns poolId to every node of a participant process', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.nodes['Task_a'].poolId).toBe('Pool_a');
    expect(m.nodes['Call_a'].poolId).toBe('Pool_a');
    expect(m.nodes['Task_b'].poolId).toBe('Pool_b');
    expect(m.nodes['Store_b'].poolId).toBe('Pool_b');
  });

  it('reads lanes with their flow node references and DI', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.pools['Pool_a'].lanes).toEqual([
      {
        id: 'Lane_a1',
        name: 'Front',
        flowNodeRefs: ['Start_a', 'Task_a'],
      },
      { id: 'Lane_a2', name: 'Back', flowNodeRefs: ['Call_a'] },
    ]);
    expect(m.shapeDi['Lane_a1']).toEqual({
      bounds: { x: 190, y: 80, width: 670, height: 130 },
      horizontal: true,
    });
    expect(m.shapeDi['Pool_a'].horizontal).toBe(true);
  });

  it('reads message flows, pool endpoints included', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.edges['Msg_1']).toEqual({
      id: 'Msg_1',
      type: 'messageFlow',
      sourceRef: 'Task_a',
      targetRef: 'Task_b',
      name: 'order',
    });
    expect(m.edges['Msg_2']).toEqual({
      id: 'Msg_2',
      type: 'messageFlow',
      sourceRef: 'Task_b',
      targetRef: 'Pool_c',
    });
    expect(m.edgeDi['Msg_1'].waypoints).toHaveLength(2);
  });

  it('imports data elements and in-activity data associations', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.nodes['Data_a']).toMatchObject({
      type: 'dataObject',
      name: 'Order data',
    });
    // The backing <dataObject> is folded into the reference.
    expect(m.nodes['Data_a_ref']).toBeUndefined();
    expect(m.order).not.toContain('Data_a_ref');
    expect(m.nodes['Store_b']).toMatchObject({
      type: 'dataStore',
      name: 'Stock',
    });
    expect(m.edges['DataOut_a']).toEqual({
      id: 'DataOut_a',
      type: 'dataAssociation',
      sourceRef: 'Task_a',
      targetRef: 'Data_a',
    });
    expect(m.edges['DataIn_b']).toEqual({
      id: 'DataIn_b',
      type: 'dataAssociation',
      sourceRef: 'Store_b',
      targetRef: 'Task_b',
    });
  });

  it('imports the group label from its category value and the call activity', () => {
    const m = readOrThrow(V04_FIXTURE_XML);
    expect(m.nodes['Group_a']).toMatchObject({
      type: 'group',
      name: 'Ordering',
    });
    expect(m.nodes['Call_a']).toMatchObject({
      type: 'callActivity',
      calledElement: 'Process_check',
    });
  });

  it('flattens nested lanes with a warning', () => {
    const result = readBpmnXml(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="http://example.com/bpmn">
  <bpmn:collaboration id="C"><bpmn:participant id="P" processRef="Proc" /></bpmn:collaboration>
  <bpmn:process id="Proc" isExecutable="false">
    <bpmn:laneSet id="LS">
      <bpmn:lane id="L1" name="Outer">
        <bpmn:childLaneSet id="CLS">
          <bpmn:lane id="L2" name="Inner"><bpmn:flowNodeRef>T</bpmn:flowNodeRef></bpmn:lane>
        </bpmn:childLaneSet>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:task id="T" />
  </bpmn:process>
</bpmn:definitions>
`);
    expect(
      result.warnings.some((w) => w.code === 'nested-lanes-flattened'),
    ).toBe(true);
    const lanes = result.model?.pools['P'].lanes ?? [];
    expect(lanes.map((lane) => lane.id)).toEqual(['L2', 'L1']);
    expect(lanes[0].flowNodeRefs).toEqual(['T']);
  });

  it('drops lanes of a process without a participant, with a warning', () => {
    const result = readBpmnXml(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="D" targetNamespace="http://example.com/bpmn">
  <bpmn:process id="Proc" isExecutable="false">
    <bpmn:laneSet id="LS"><bpmn:lane id="L1" /></bpmn:laneSet>
    <bpmn:task id="T" />
  </bpmn:process>
</bpmn:definitions>
`);
    expect(result.model?.pools).toEqual({});
    expect(
      result.warnings.some(
        (w) => w.code === 'unsupported-element' && w.localName === 'laneSet',
      ),
    ).toBe(true);
  });

  // ------------------------------------------------------------------ writer

  it('reconstructs the collaboration, lanes, data and category on export', () => {
    const xml = writeBpmnXml(readOrThrow(V04_FIXTURE_XML));
    expect(xml).toContain('<bpmn:collaboration id="Collab_v4">');
    expect(xml).toContain(
      '<bpmn:participant id="Pool_a" name="Customer" processRef="Process_a" />',
    );
    // Black-box pool: participant without processRef, and no process element.
    expect(xml).toContain('<bpmn:participant id="Pool_c" name="Registry" />');
    expect(xml).toContain(
      '<bpmn:messageFlow id="Msg_2" sourceRef="Task_b" targetRef="Pool_c" />',
    );
    expect(xml).toContain('<bpmn:laneSet id="Process_a_laneSet">');
    expect(xml).toContain('<bpmn:flowNodeRef>Task_a</bpmn:flowNodeRef>');
    expect(xml).toContain('<bpmn:dataObject id="Data_a_ref" />');
    expect(xml).toContain(
      '<bpmn:dataObjectReference id="Data_a" name="Order data" dataObjectRef="Data_a_ref" />',
    );
    expect(xml).toContain(
      '<bpmn:dataStoreReference id="Store_b" name="Stock" />',
    );
    expect(xml).toContain('<bpmn:dataOutputAssociation id="DataOut_a">');
    expect(xml).toContain('<bpmn:targetRef>Data_a</bpmn:targetRef>');
    expect(xml).toContain('<bpmn:dataInputAssociation id="DataIn_b">');
    expect(xml).toContain('<bpmn:sourceRef>Store_b</bpmn:sourceRef>');
    expect(xml).toContain(
      '<bpmn:group id="Group_a" categoryValueRef="Group_a_val" />',
    );
    expect(xml).toContain('<bpmn:category id="Group_a_cat">');
    expect(xml).toContain(
      '<bpmn:categoryValue id="Group_a_val" value="Ordering" />',
    );
    expect(xml).toContain('calledElement="Process_check"');
    expect(xml).toContain('bpmnElement="Collab_v4"');
    expect(xml).toContain('isHorizontal="true"');
  });

  it('round-trips the v0.4 fixture model-equal and byte-idempotent', () => {
    const m1 = readOrThrow(V04_FIXTURE_XML);
    const x2 = writeBpmnXml(m1);
    const second = readBpmnXml(x2);
    expect(second.error).toBeUndefined();
    const m2 = second.model;
    expect(m2).toEqual(m1);
    if (m2 === null) {
      throw new Error('second read produced no model');
    }
    expect(writeBpmnXml(m2)).toBe(x2);
  });

  it('keeps single-process exports free of collaboration artifacts', () => {
    const xml = writeBpmnXml(readOrThrow(demoProcessXml('bpmn')));
    expect(xml).not.toContain('collaboration');
    expect(xml).not.toContain('participant');
    expect(xml).not.toContain('laneSet');
    expect(xml).toContain('bpmnElement="Process_demo"');
  });
});
