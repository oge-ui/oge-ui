import {
  createEmptyDiagram,
  DEFAULT_SIZES,
  generateBpmnId,
  idPrefixFor,
  takenIds,
} from './bpmn-model';
import type { BpmnDiagram } from './bpmn-model';

/** Deterministic pseudo-random source cycling through the given values. */
function seeded(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('bpmn-model', () => {
  describe('createEmptyDiagram', () => {
    it('creates an empty non-executable diagram with default definitions attrs', () => {
      const model = createEmptyDiagram();
      expect(model.processId).toBe('Process_1');
      expect(model.isExecutable).toBe(false);
      expect(model.nodes).toEqual({});
      expect(model.edges).toEqual({});
      expect(model.order).toEqual([]);
      expect(model.definitionsAttrs).toEqual({
        id: 'Definitions_1',
        targetNamespace: 'http://ogeui.com/schema/bpmn',
      });
      expect(model.foreignDefinitionsChildren).toEqual([]);
    });

    it('accepts a custom process id', () => {
      expect(createEmptyDiagram('Process_x').processId).toBe('Process_x');
    });
  });

  describe('generateBpmnId', () => {
    it('produces a bpmn-js-style id from a seeded random source', () => {
      const random = seeded([
        0,
        0.5,
        1 / 36,
        2 / 36,
        35 / 36,
        10 / 36,
        11 / 36,
      ]);
      expect(generateBpmnId('Activity', new Set(), random)).toBe(
        'Activity_0i12zab',
      );
    });

    it('is deterministic for the same seed', () => {
      const a = generateBpmnId('Flow', new Set(), seeded([0.1, 0.2, 0.3]));
      const b = generateBpmnId('Flow', new Set(), seeded([0.1, 0.2, 0.3]));
      expect(a).toBe(b);
    });

    it('retries while the generated id is taken', () => {
      const random = seeded([0, 0, 0, 0, 0, 0, 0, ...Array(7).fill(0.5)]);
      const taken = new Set(['Event_0000000']);
      expect(generateBpmnId('Event', taken, random)).toBe('Event_iiiiiii');
    });

    it('uses the requested prefix and a 7-character base36 suffix', () => {
      const id = generateBpmnId('Gateway', new Set());
      expect(id).toMatch(/^Gateway_[0-9a-z]{7}$/);
    });
  });

  describe('takenIds', () => {
    it('collects node, edge and process ids', () => {
      const model: BpmnDiagram = {
        ...createEmptyDiagram('Process_9'),
        nodes: { A: { id: 'A', type: 'task' } },
        edges: {
          F: { id: 'F', type: 'sequenceFlow', sourceRef: 'A', targetRef: 'A' },
        },
        order: ['A', 'F'],
      };
      expect(takenIds(model)).toEqual(new Set(['A', 'F', 'Process_9']));
    });
  });

  describe('idPrefixFor', () => {
    it('maps every element type to its prefix', () => {
      expect(idPrefixFor('task')).toBe('Activity');
      expect(idPrefixFor('userTask')).toBe('Activity');
      expect(idPrefixFor('serviceTask')).toBe('Activity');
      expect(idPrefixFor('scriptTask')).toBe('Activity');
      expect(idPrefixFor('startEvent')).toBe('Event');
      expect(idPrefixFor('endEvent')).toBe('Event');
      expect(idPrefixFor('intermediateThrowEvent')).toBe('Event');
      expect(idPrefixFor('intermediateCatchEvent')).toBe('Event');
      expect(idPrefixFor('exclusiveGateway')).toBe('Gateway');
      expect(idPrefixFor('parallelGateway')).toBe('Gateway');
      expect(idPrefixFor('sequenceFlow')).toBe('Flow');
      expect(idPrefixFor('textAnnotation')).toBe('TextAnnotation');
      expect(idPrefixFor('association')).toBe('Association');
    });
  });

  describe('DEFAULT_SIZES', () => {
    it('uses bpmn-js-compatible sizes', () => {
      expect(DEFAULT_SIZES['task']).toEqual({ width: 100, height: 80 });
      expect(DEFAULT_SIZES['userTask']).toEqual({ width: 100, height: 80 });
      expect(DEFAULT_SIZES['serviceTask']).toEqual({ width: 100, height: 80 });
      expect(DEFAULT_SIZES['scriptTask']).toEqual({ width: 100, height: 80 });
      expect(DEFAULT_SIZES['startEvent']).toEqual({ width: 36, height: 36 });
      expect(DEFAULT_SIZES['endEvent']).toEqual({ width: 36, height: 36 });
      expect(DEFAULT_SIZES['intermediateThrowEvent']).toEqual({
        width: 36,
        height: 36,
      });
      expect(DEFAULT_SIZES['intermediateCatchEvent']).toEqual({
        width: 36,
        height: 36,
      });
      expect(DEFAULT_SIZES['exclusiveGateway']).toEqual({
        width: 50,
        height: 50,
      });
      expect(DEFAULT_SIZES['parallelGateway']).toEqual({
        width: 50,
        height: 50,
      });
      expect(DEFAULT_SIZES['textAnnotation']).toEqual({
        width: 100,
        height: 30,
      });
    });
  });
});
