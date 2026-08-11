import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import { canConnect, connectionKindFor } from './rules';

function testModel(): BpmnDiagram {
  return {
    ...createEmptyDiagram(),
    nodes: {
      Start: { id: 'Start', type: 'startEvent' },
      Task: { id: 'Task', type: 'task' },
      Gateway: { id: 'Gateway', type: 'exclusiveGateway' },
      End: { id: 'End', type: 'endEvent' },
      Note: { id: 'Note', type: 'textAnnotation', text: 'note' },
      Note2: { id: 'Note2', type: 'textAnnotation', text: 'other' },
    },
    edges: {
      Flow_1: {
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Task',
      },
      Assoc_1: {
        id: 'Assoc_1',
        type: 'association',
        sourceRef: 'Note',
        targetRef: 'Task',
      },
    },
    order: [
      'Start',
      'Task',
      'Gateway',
      'End',
      'Note',
      'Note2',
      'Flow_1',
      'Assoc_1',
    ],
  };
}

describe('rules', () => {
  describe('canConnect', () => {
    it('allows a plain sequence flow between flow nodes', () => {
      expect(
        canConnect(testModel(), 'sequenceFlow', 'Task', 'Gateway'),
      ).toEqual({
        allowed: true,
      });
    });

    it('denies unknown elements', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'Nope', 'Task')).toEqual({
        allowed: false,
        reason: 'unknown-element',
      });
      expect(canConnect(testModel(), 'association', 'Note', 'Nope')).toEqual({
        allowed: false,
        reason: 'unknown-element',
      });
    });

    it('denies self connections', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'Task', 'Task')).toEqual({
        allowed: false,
        reason: 'self-connection',
      });
      expect(canConnect(testModel(), 'association', 'Note', 'Note')).toEqual({
        allowed: false,
        reason: 'self-connection',
      });
    });

    it('denies sequence flows out of an end event', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'End', 'Task')).toEqual({
        allowed: false,
        reason: 'source-is-end-event',
      });
    });

    it('denies sequence flows into a start event', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'Task', 'Start')).toEqual({
        allowed: false,
        reason: 'target-is-start-event',
      });
    });

    it('denies duplicate same-direction sequence flows', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'Start', 'Task')).toEqual({
        allowed: false,
        reason: 'duplicate-flow',
      });
    });

    it('allows the reverse direction of an existing sequence flow', () => {
      expect(
        canConnect(testModel(), 'sequenceFlow', 'Task', 'Gateway').allowed,
      ).toBe(true);
      expect(
        canConnect(testModel(), 'sequenceFlow', 'Gateway', 'Task').allowed,
      ).toBe(true);
    });

    it('denies sequence flows touching a text annotation', () => {
      expect(canConnect(testModel(), 'sequenceFlow', 'Note', 'Task')).toEqual({
        allowed: false,
        reason: 'annotation-needs-association',
      });
      expect(canConnect(testModel(), 'sequenceFlow', 'Task', 'Note')).toEqual({
        allowed: false,
        reason: 'annotation-needs-association',
      });
    });

    it('allows an association with exactly one annotation end', () => {
      expect(canConnect(testModel(), 'association', 'Note', 'Gateway')).toEqual(
        {
          allowed: true,
        },
      );
      expect(canConnect(testModel(), 'association', 'Gateway', 'Note')).toEqual(
        {
          allowed: true,
        },
      );
    });

    it('denies associations without an annotation end', () => {
      expect(canConnect(testModel(), 'association', 'Task', 'Gateway')).toEqual(
        {
          allowed: false,
          reason: 'association-needs-annotation',
        },
      );
    });

    it('denies associations between two annotations', () => {
      expect(canConnect(testModel(), 'association', 'Note', 'Note2')).toEqual({
        allowed: false,
        reason: 'association-needs-annotation',
      });
    });

    it('denies duplicate associations in either direction', () => {
      expect(canConnect(testModel(), 'association', 'Note', 'Task')).toEqual({
        allowed: false,
        reason: 'duplicate-flow',
      });
      expect(canConnect(testModel(), 'association', 'Task', 'Note')).toEqual({
        allowed: false,
        reason: 'duplicate-flow',
      });
    });
  });

  describe('connectionKindFor', () => {
    it('picks a sequence flow between flow nodes', () => {
      expect(connectionKindFor(testModel(), 'Task', 'Gateway')).toBe(
        'sequenceFlow',
      );
    });

    it('picks an association when either end is an annotation', () => {
      expect(connectionKindFor(testModel(), 'Note', 'Gateway')).toBe(
        'association',
      );
      expect(connectionKindFor(testModel(), 'Gateway', 'Note')).toBe(
        'association',
      );
    });

    it('returns null when nothing is allowed', () => {
      expect(connectionKindFor(testModel(), 'Task', 'Task')).toBeNull();
      expect(connectionKindFor(testModel(), 'Note', 'Note2')).toBeNull();
      expect(connectionKindFor(testModel(), 'End', 'Start')).toBeNull();
      expect(connectionKindFor(testModel(), 'Missing', 'Task')).toBeNull();
    });
  });
});
