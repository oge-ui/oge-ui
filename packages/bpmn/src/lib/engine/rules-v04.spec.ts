import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import { canConnect, connectionKindFor } from './rules';

/**
 * Two pools (the first owning the default process), one black-box pool, two
 * tasks per pool, a gateway, an annotation and data elements in the first
 * pool.
 */
function collaborationModel(): BpmnDiagram {
  const base = createEmptyDiagram('Process_1');
  return {
    ...base,
    collaborationId: 'Collab',
    pools: {
      Pool_1: { id: 'Pool_1', processRef: 'Process_1', lanes: [] },
      Pool_2: { id: 'Pool_2', processRef: 'Process_2', lanes: [] },
      Pool_3: { id: 'Pool_3', lanes: [] },
    },
    nodes: {
      A: { id: 'A', type: 'task', poolId: 'Pool_1' },
      A2: { id: 'A2', type: 'task', poolId: 'Pool_1' },
      Gate: { id: 'Gate', type: 'exclusiveGateway', poolId: 'Pool_1' },
      Note: { id: 'Note', type: 'textAnnotation', text: '', poolId: 'Pool_1' },
      D: { id: 'D', type: 'dataObject', poolId: 'Pool_1' },
      S: { id: 'S', type: 'dataStore', poolId: 'Pool_1' },
      G: { id: 'G', type: 'group', poolId: 'Pool_1' },
      B: { id: 'B', type: 'task', poolId: 'Pool_2' },
    },
    edges: {},
    order: ['A', 'A2', 'Gate', 'Note', 'D', 'S', 'G', 'B'],
  };
}

describe('rules v0.4 — pools, message flows, data associations', () => {
  it('denies sequence flows across pools', () => {
    const m = collaborationModel();
    expect(canConnect(m, 'sequenceFlow', 'A', 'B')).toEqual({
      allowed: false,
      reason: 'cross-pool-flow',
    });
    expect(canConnect(m, 'sequenceFlow', 'A', 'A2').allowed).toBe(true);
  });

  it('denies sequence flows touching data elements, groups or pools', () => {
    const m = collaborationModel();
    for (const target of ['D', 'S', 'G', 'Pool_2']) {
      expect(canConnect(m, 'sequenceFlow', 'A', target)).toEqual({
        allowed: false,
        reason: 'sequence-flow-needs-flow-node',
      });
    }
  });

  it('allows message flows only across different pools', () => {
    const m = collaborationModel();
    expect(canConnect(m, 'messageFlow', 'A', 'B').allowed).toBe(true);
    expect(canConnect(m, 'messageFlow', 'A', 'A2')).toEqual({
      allowed: false,
      reason: 'message-flow-same-pool',
    });
    // A node of the default process without an explicit poolId still belongs
    // to Pool_1 (its process is the default process).
    const withImplicit: BpmnDiagram = {
      ...m,
      nodes: { ...m.nodes, Free: { id: 'Free', type: 'task' } },
      order: [...m.order, 'Free'],
    };
    expect(canConnect(withImplicit, 'messageFlow', 'Free', 'A')).toEqual({
      allowed: false,
      reason: 'message-flow-same-pool',
    });
    expect(canConnect(withImplicit, 'messageFlow', 'Free', 'B').allowed).toBe(
      true,
    );
  });

  it('accepts pools (black-box included) as message flow endpoints', () => {
    const m = collaborationModel();
    expect(canConnect(m, 'messageFlow', 'A', 'Pool_3').allowed).toBe(true);
    expect(canConnect(m, 'messageFlow', 'Pool_3', 'Pool_2').allowed).toBe(true);
    expect(canConnect(m, 'messageFlow', 'Pool_1', 'A')).toEqual({
      allowed: false,
      reason: 'message-flow-same-pool',
    });
  });

  it('denies message flows at annotations, data elements and groups', () => {
    const m = collaborationModel();
    for (const source of ['Note', 'D', 'G']) {
      expect(canConnect(m, 'messageFlow', source, 'B')).toEqual({
        allowed: false,
        reason: 'message-flow-invalid-endpoint',
      });
    }
  });

  it('denies duplicate message flows', () => {
    const m = collaborationModel();
    const withFlow: BpmnDiagram = {
      ...m,
      edges: {
        Msg: { id: 'Msg', type: 'messageFlow', sourceRef: 'A', targetRef: 'B' },
      },
    };
    expect(canConnect(withFlow, 'messageFlow', 'A', 'B')).toEqual({
      allowed: false,
      reason: 'duplicate-flow',
    });
  });

  it('requires exactly one data endpoint and an activity for data associations', () => {
    const m = collaborationModel();
    expect(canConnect(m, 'dataAssociation', 'A', 'D').allowed).toBe(true);
    expect(canConnect(m, 'dataAssociation', 'S', 'A').allowed).toBe(true);
    expect(canConnect(m, 'dataAssociation', 'D', 'S')).toEqual({
      allowed: false,
      reason: 'data-association-needs-data',
    });
    expect(canConnect(m, 'dataAssociation', 'A', 'A2')).toEqual({
      allowed: false,
      reason: 'data-association-needs-data',
    });
    expect(canConnect(m, 'dataAssociation', 'D', 'Gate')).toEqual({
      allowed: false,
      reason: 'data-association-needs-activity',
    });
    expect(canConnect(m, 'dataAssociation', 'D', 'B')).toEqual({
      allowed: false,
      reason: 'cross-pool-flow',
    });
  });

  it('connectionKindFor picks message flows for cross-pool and pool endpoints', () => {
    const m = collaborationModel();
    expect(connectionKindFor(m, 'A', 'B')).toBe('messageFlow');
    expect(connectionKindFor(m, 'A', 'Pool_3')).toBe('messageFlow');
    expect(connectionKindFor(m, 'A', 'A2')).toBe('sequenceFlow');
    expect(connectionKindFor(m, 'A', 'D')).toBe('dataAssociation');
    expect(connectionKindFor(m, 'Note', 'A')).toBe('association');
    expect(connectionKindFor(m, 'Pool_1', 'A')).toBeNull();
  });
});
