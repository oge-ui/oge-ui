import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  addNodeCommand,
  connectCommand,
  deleteElementsCommand,
  extractClipboard,
  moveElementsCommand,
  pasteCommand,
  setConditionCommand,
  setDefaultFlowCommand,
  updateLabelCommand,
  updateProcessCommand,
  updateWaypointsCommand,
} from './commands';
import { routeOrthogonal } from './edge-routing';

function baseModel(): BpmnDiagram {
  return {
    ...createEmptyDiagram(),
    nodes: {
      Start: { id: 'Start', type: 'startEvent' },
      Gateway: {
        id: 'Gateway',
        type: 'exclusiveGateway',
        defaultFlowId: 'Flow_1',
      },
      Task: { id: 'Task', type: 'task', name: 'Work' },
      Note: { id: 'Note', type: 'textAnnotation', text: 'hi' },
    },
    edges: {
      Flow_0: {
        id: 'Flow_0',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Gateway',
      },
      Flow_1: {
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Gateway',
        targetRef: 'Task',
      },
      Assoc_1: {
        id: 'Assoc_1',
        type: 'association',
        sourceRef: 'Note',
        targetRef: 'Task',
      },
    },
    order: ['Start', 'Gateway', 'Task', 'Note', 'Flow_0', 'Flow_1', 'Assoc_1'],
    shapeDi: {
      Start: { bounds: { x: 100, y: 100, width: 36, height: 36 } },
      Gateway: { bounds: { x: 200, y: 93, width: 50, height: 50 } },
      Task: { bounds: { x: 320, y: 78, width: 100, height: 80 } },
      Note: { bounds: { x: 320, y: 0, width: 100, height: 30 } },
    },
    edgeDi: {
      Flow_0: {
        waypoints: [
          { x: 136, y: 118 },
          { x: 200, y: 118 },
        ],
      },
      Flow_1: {
        waypoints: [
          { x: 250, y: 118 },
          { x: 320, y: 118 },
        ],
      },
      Assoc_1: {
        waypoints: [
          { x: 370, y: 30 },
          { x: 370, y: 78 },
        ],
      },
    },
  };
}

describe('commands', () => {
  describe('addNodeCommand', () => {
    it('adds a node centered at the snapped point with default sizes', () => {
      const model = addNodeCommand(
        'task',
        { x: 203, y: 107 },
        'Task_new',
      ).apply(baseModel());
      expect(model.nodes['Task_new']).toEqual({ id: 'Task_new', type: 'task' });
      expect(model.order[model.order.length - 1]).toBe('Task_new');
      expect(model.shapeDi['Task_new']).toEqual({
        bounds: { x: 150, y: 70, width: 100, height: 80 },
      });
    });

    it('creates a text annotation with empty text', () => {
      const model = addNodeCommand(
        'textAnnotation',
        { x: 100, y: 100 },
        'Note_new',
      ).apply(baseModel());
      expect(model.nodes['Note_new']).toEqual({
        id: 'Note_new',
        type: 'textAnnotation',
        text: '',
      });
      expect(model.shapeDi['Note_new']).toEqual({
        bounds: { x: 50, y: 85, width: 100, height: 30 },
      });
    });

    it('generates a fresh id when none is given', () => {
      const model = addNodeCommand('startEvent', { x: 0, y: 0 }).apply(
        baseModel(),
      );
      const added = Object.keys(model.nodes).filter(
        (id) => !baseModel().nodes[id],
      );
      expect(added).toHaveLength(1);
      expect(added[0]).toMatch(/^Event_[0-9a-z]{7}$/);
    });

    it('is a no-op when the id is already taken', () => {
      const model = baseModel();
      expect(addNodeCommand('task', { x: 0, y: 0 }, 'Task').apply(model)).toBe(
        model,
      );
    });
  });

  describe('moveElementsCommand', () => {
    it('moves shape bounds and re-routes touched edges', () => {
      const before = baseModel();
      const model = moveElementsCommand(['Task'], 40, 30).apply(before);
      expect(model.shapeDi['Task'].bounds).toEqual({
        x: 360,
        y: 108,
        width: 100,
        height: 80,
      });
      expect(model.edgeDi['Flow_1'].waypoints).toEqual(
        routeOrthogonal(
          before.shapeDi['Gateway'].bounds,
          model.shapeDi['Task'].bounds,
        ),
      );
      expect(model.edgeDi['Assoc_1'].waypoints).toEqual(
        routeOrthogonal(
          before.shapeDi['Note'].bounds,
          model.shapeDi['Task'].bounds,
        ),
      );
      // Untouched edges keep their waypoints.
      expect(model.edgeDi['Flow_0']).toBe(before.edgeDi['Flow_0']);
    });

    it('moves shape label bounds along', () => {
      const withLabel: BpmnDiagram = {
        ...baseModel(),
        shapeDi: {
          ...baseModel().shapeDi,
          Start: {
            bounds: { x: 100, y: 100, width: 36, height: 36 },
            labelBounds: { x: 90, y: 140, width: 56, height: 14 },
          },
        },
      };
      const model = moveElementsCommand(['Start'], 10, 20).apply(withLabel);
      expect(model.shapeDi['Start'].labelBounds).toEqual({
        x: 100,
        y: 160,
        width: 56,
        height: 14,
      });
    });

    it('is a no-op for a zero delta or unknown ids', () => {
      const model = baseModel();
      expect(moveElementsCommand(['Task'], 0, 0).apply(model)).toBe(model);
      expect(moveElementsCommand(['Missing'], 10, 10).apply(model)).toBe(model);
      expect(moveElementsCommand([], 10, 10).apply(model)).toBe(model);
    });
  });

  describe('connectCommand', () => {
    it('adds a routed edge between two shapes', () => {
      const before = baseModel();
      const model = connectCommand(
        'sequenceFlow',
        'Start',
        'Task',
        'Flow_new',
      ).apply(before);
      expect(model.edges['Flow_new']).toEqual({
        id: 'Flow_new',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Task',
      });
      expect(model.order[model.order.length - 1]).toBe('Flow_new');
      expect(model.edgeDi['Flow_new'].waypoints).toEqual(
        routeOrthogonal(
          before.shapeDi['Start'].bounds,
          before.shapeDi['Task'].bounds,
        ),
      );
    });

    it('creates associations without a name field', () => {
      const model = connectCommand(
        'association',
        'Note',
        'Gateway',
        'Assoc_new',
      ).apply(baseModel());
      expect(model.edges['Assoc_new']).toEqual({
        id: 'Assoc_new',
        type: 'association',
        sourceRef: 'Note',
        targetRef: 'Gateway',
      });
    });

    it('is a no-op for unknown endpoints', () => {
      const model = baseModel();
      expect(
        connectCommand('sequenceFlow', 'Missing', 'Task').apply(model),
      ).toBe(model);
      expect(
        connectCommand('sequenceFlow', 'Start', 'Missing').apply(model),
      ).toBe(model);
    });
  });

  describe('deleteElementsCommand', () => {
    it('deletes a node and cascades to its edges', () => {
      const model = deleteElementsCommand(['Task']).apply(baseModel());
      expect(model.nodes['Task']).toBeUndefined();
      expect(model.edges['Flow_1']).toBeUndefined();
      expect(model.edges['Assoc_1']).toBeUndefined();
      expect(model.edges['Flow_0']).toBeDefined();
      expect(model.order).toEqual(['Start', 'Gateway', 'Note', 'Flow_0']);
      expect(model.shapeDi['Task']).toBeUndefined();
      expect(model.edgeDi['Flow_1']).toBeUndefined();
      expect(model.edgeDi['Assoc_1']).toBeUndefined();
    });

    it('clears defaultFlowId references to deleted flows', () => {
      const model = deleteElementsCommand(['Flow_1']).apply(baseModel());
      expect(model.nodes['Gateway']).toEqual({
        id: 'Gateway',
        type: 'exclusiveGateway',
      });
    });

    it('deletes edges directly', () => {
      const model = deleteElementsCommand(['Assoc_1']).apply(baseModel());
      expect(model.edges['Assoc_1']).toBeUndefined();
      expect(model.nodes['Note']).toBeDefined();
    });

    it('is a no-op for unknown ids', () => {
      const model = baseModel();
      expect(deleteElementsCommand(['Missing']).apply(model)).toBe(model);
      expect(deleteElementsCommand([]).apply(model)).toBe(model);
    });
  });

  describe('updateLabelCommand', () => {
    it('renames a flow node', () => {
      const model = updateLabelCommand('Task', 'Approve').apply(baseModel());
      expect(model.nodes['Task']).toEqual({
        id: 'Task',
        type: 'task',
        name: 'Approve',
      });
    });

    it('updates annotation text', () => {
      const model = updateLabelCommand('Note', 'New note').apply(baseModel());
      expect(model.nodes['Note']).toEqual({
        id: 'Note',
        type: 'textAnnotation',
        text: 'New note',
      });
    });

    it('renames a sequence flow', () => {
      const model = updateLabelCommand('Flow_1', 'yes').apply(baseModel());
      expect(model.edges['Flow_1']).toEqual({
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Gateway',
        targetRef: 'Task',
        name: 'yes',
      });
    });

    it('is a no-op for unchanged text, associations and unknown ids', () => {
      const model = baseModel();
      expect(updateLabelCommand('Task', 'Work').apply(model)).toBe(model);
      expect(updateLabelCommand('Note', 'hi').apply(model)).toBe(model);
      expect(updateLabelCommand('Assoc_1', 'nope').apply(model)).toBe(model);
      expect(updateLabelCommand('Missing', 'x').apply(model)).toBe(model);
    });
  });

  describe('setDefaultFlowCommand', () => {
    it('marks an outgoing flow as default', () => {
      const cleared = setDefaultFlowCommand('Gateway', undefined).apply(
        baseModel(),
      );
      const model = setDefaultFlowCommand('Gateway', 'Flow_1').apply(cleared);
      expect(model.nodes['Gateway']).toEqual({
        id: 'Gateway',
        type: 'exclusiveGateway',
        defaultFlowId: 'Flow_1',
      });
    });

    it('clears the default flow', () => {
      const model = setDefaultFlowCommand('Gateway', undefined).apply(
        baseModel(),
      );
      expect(model.nodes['Gateway']).toEqual({
        id: 'Gateway',
        type: 'exclusiveGateway',
      });
    });

    it('rejects flows that do not leave the gateway', () => {
      const model = baseModel();
      expect(setDefaultFlowCommand('Gateway', 'Flow_0').apply(model)).toBe(
        model,
      );
      expect(setDefaultFlowCommand('Gateway', 'Assoc_1').apply(model)).toBe(
        model,
      );
      expect(setDefaultFlowCommand('Gateway', 'Missing').apply(model)).toBe(
        model,
      );
    });

    it('is a no-op for unchanged values, annotations and unknown ids', () => {
      const model = baseModel();
      expect(setDefaultFlowCommand('Gateway', 'Flow_1').apply(model)).toBe(
        model,
      );
      expect(setDefaultFlowCommand('Note', 'Flow_1').apply(model)).toBe(model);
      expect(setDefaultFlowCommand('Missing', undefined).apply(model)).toBe(
        model,
      );
    });
  });

  describe('setConditionCommand', () => {
    it('sets a condition expression', () => {
      const model = setConditionCommand('Flow_1', 'x > 3').apply(baseModel());
      expect(model.edges['Flow_1']).toEqual({
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Gateway',
        targetRef: 'Task',
        conditionExpression: 'x > 3',
      });
    });

    it('clears a condition expression', () => {
      const withCondition = setConditionCommand('Flow_1', 'x > 3').apply(
        baseModel(),
      );
      const model = setConditionCommand('Flow_1', undefined).apply(
        withCondition,
      );
      expect(model.edges['Flow_1']).toEqual({
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Gateway',
        targetRef: 'Task',
      });
    });

    it('is a no-op for unchanged values, associations and unknown ids', () => {
      const model = baseModel();
      expect(setConditionCommand('Flow_1', undefined).apply(model)).toBe(model);
      expect(setConditionCommand('Assoc_1', 'x').apply(model)).toBe(model);
      expect(setConditionCommand('Missing', 'x').apply(model)).toBe(model);
    });
  });

  describe('updateProcessCommand', () => {
    it('sets and clears the process name and toggles isExecutable', () => {
      const named = updateProcessCommand({ name: 'Billing' }).apply(
        baseModel(),
      );
      expect(named.processName).toBe('Billing');
      const executable = updateProcessCommand({ isExecutable: true }).apply(
        named,
      );
      expect(executable.isExecutable).toBe(true);
      expect(executable.processName).toBe('Billing');
      const cleared = updateProcessCommand({ name: '' }).apply(executable);
      expect(cleared.processName).toBeUndefined();
    });

    it('is a no-op for unchanged values and empty patches', () => {
      const model = baseModel();
      expect(updateProcessCommand({}).apply(model)).toBe(model);
      expect(updateProcessCommand({ name: '' }).apply(model)).toBe(model);
      expect(updateProcessCommand({ isExecutable: false }).apply(model)).toBe(
        model,
      );
    });
  });

  describe('updateWaypointsCommand', () => {
    const bent = [
      { x: 136, y: 118 },
      { x: 170, y: 60 },
      { x: 200, y: 118 },
    ];

    it('replaces the waypoints and marks the edge DI as manual', () => {
      const model = updateWaypointsCommand('Flow_0', bent).apply(baseModel());
      expect(model.edgeDi['Flow_0'].waypoints).toEqual(bent);
      expect(model.edgeDi['Flow_0'].manual).toBe(true);
    });

    it('is a no-op for unknown edges, short polylines and unchanged manual waypoints', () => {
      const model = baseModel();
      expect(updateWaypointsCommand('Missing', bent).apply(model)).toBe(model);
      expect(
        updateWaypointsCommand('Flow_0', [{ x: 1, y: 1 }]).apply(model),
      ).toBe(model);
      const manual = updateWaypointsCommand('Flow_0', bent).apply(model);
      expect(updateWaypointsCommand('Flow_0', bent).apply(manual)).toBe(manual);
    });

    it('manual edges translate when both endpoints move and re-route (clearing manual) when one moves', () => {
      const manual = updateWaypointsCommand('Flow_0', bent).apply(baseModel());
      const both = moveElementsCommand(['Start', 'Gateway'], 10, 20).apply(
        manual,
      );
      expect(both.edgeDi['Flow_0'].waypoints).toEqual(
        bent.map((p) => ({ x: p.x + 10, y: p.y + 20 })),
      );
      expect(both.edgeDi['Flow_0'].manual).toBe(true);

      const one = moveElementsCommand(['Start'], 0, 60).apply(manual);
      expect(one.edgeDi['Flow_0'].manual).toBeUndefined();
      expect(one.edgeDi['Flow_0'].waypoints).toEqual(
        routeOrthogonal(
          { x: 100, y: 160, width: 36, height: 36 },
          manual.shapeDi['Gateway'].bounds,
        ),
      );
    });
  });

  describe('extractClipboard / pasteCommand', () => {
    it('extracts selected nodes plus edges whose both endpoints are selected', () => {
      const clip = extractClipboard(baseModel(), ['Start', 'Gateway']);
      expect(clip).not.toBeNull();
      expect(clip?.nodes.map((n) => n.id)).toEqual(['Start', 'Gateway']);
      expect(clip?.edges.map((e) => e.id)).toEqual(['Flow_0']);
      expect(clip?.shapeDi['Start']).toBeDefined();
      expect(clip?.edgeDi['Flow_0']).toBeDefined();
    });

    it('returns null for selections without nodes', () => {
      expect(extractClipboard(baseModel(), ['Flow_0'])).toBeNull();
      expect(extractClipboard(baseModel(), [])).toBeNull();
    });

    it('pastes with fresh ids, remapped internal edge refs and translated DI', () => {
      const base = baseModel();
      const clip = extractClipboard(base, ['Start', 'Gateway']);
      const model = pasteCommand(clip as NonNullable<typeof clip>, {
        x: 20,
        y: 20,
      }).apply(base);
      expect(model.order.length).toBe(base.order.length + 3);
      const newIds = model.order.slice(base.order.length);
      for (const id of newIds) {
        expect(base.order.includes(id)).toBe(false);
      }
      const [newStart, newGateway, newFlow] = newIds;
      expect(model.nodes[newStart].type).toBe('startEvent');
      expect(model.nodes[newGateway].type).toBe('exclusiveGateway');
      const edge = model.edges[newFlow];
      expect(edge.sourceRef).toBe(newStart);
      expect(edge.targetRef).toBe(newGateway);
      expect(model.shapeDi[newStart].bounds).toEqual({
        x: 120,
        y: 120,
        width: 36,
        height: 36,
      });
      expect(model.edgeDi[newFlow].waypoints).toEqual([
        { x: 156, y: 138 },
        { x: 220, y: 138 },
      ]);
      // The originals are untouched.
      expect(model.nodes['Start']).toEqual(base.nodes['Start']);
    });

    it('remaps defaultFlowId when the flow was copied and drops it otherwise', () => {
      const base = baseModel();
      const withFlow = extractClipboard(base, ['Gateway', 'Task']);
      const kept = pasteCommand(withFlow as NonNullable<typeof withFlow>, {
        x: 20,
        y: 20,
      }).apply(base);
      const keptIds = kept.order.slice(base.order.length);
      const [newGateway, , newFlow] = keptIds;
      const gw = kept.nodes[newGateway];
      expect(gw.type === 'textAnnotation' ? undefined : gw.defaultFlowId).toBe(
        newFlow,
      );

      const withoutFlow = extractClipboard(base, ['Gateway']);
      const dropped = pasteCommand(
        withoutFlow as NonNullable<typeof withoutFlow>,
        { x: 20, y: 20 },
      ).apply(base);
      const droppedId = dropped.order[dropped.order.length - 1];
      const gw2 = dropped.nodes[droppedId];
      expect(
        gw2.type === 'textAnnotation' ? 'n/a' : gw2.defaultFlowId,
      ).toBeUndefined();
    });
  });
});
