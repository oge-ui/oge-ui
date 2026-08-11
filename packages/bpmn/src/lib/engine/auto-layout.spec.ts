import { placeMissingDi } from './auto-layout';
import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import { routeOrthogonal } from './edge-routing';

function diagramWithoutDi(): BpmnDiagram {
  return {
    ...createEmptyDiagram(),
    nodes: {
      Start: { id: 'Start', type: 'startEvent' },
      Task_a: { id: 'Task_a', type: 'task' },
      Task_b: { id: 'Task_b', type: 'userTask' },
      End: { id: 'End', type: 'endEvent' },
    },
    edges: {
      Flow_1: {
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Task_a',
      },
      Flow_2: {
        id: 'Flow_2',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Task_b',
      },
      Flow_3: {
        id: 'Flow_3',
        type: 'sequenceFlow',
        sourceRef: 'Task_a',
        targetRef: 'End',
      },
    },
    order: ['Start', 'Task_a', 'Task_b', 'End', 'Flow_1', 'Flow_2', 'Flow_3'],
  };
}

describe('auto-layout', () => {
  describe('placeMissingDi', () => {
    it('places nodes by topological layer and stacks rows', () => {
      const model = placeMissingDi(diagramWithoutDi());
      // Layer 0: Start; layer 1: Task_a and Task_b; layer 2: End.
      expect(model.shapeDi['Start'].bounds).toEqual({
        x: 80,
        y: 80,
        width: 36,
        height: 36,
      });
      expect(model.shapeDi['Task_a'].bounds).toEqual({
        x: 260,
        y: 80,
        width: 100,
        height: 80,
      });
      expect(model.shapeDi['Task_b'].bounds).toEqual({
        x: 260,
        y: 200,
        width: 100,
        height: 80,
      });
      expect(model.shapeDi['End'].bounds).toEqual({
        x: 440,
        y: 80,
        width: 36,
        height: 36,
      });
    });

    it('routes every edge without DI between the placed shapes', () => {
      const model = placeMissingDi(diagramWithoutDi());
      for (const id of ['Flow_1', 'Flow_2', 'Flow_3']) {
        const edge = model.edges[id];
        if (edge === undefined) {
          throw new Error(`missing edge ${id}`);
        }
        expect(model.edgeDi[id].waypoints).toEqual(
          routeOrthogonal(
            model.shapeDi[edge.sourceRef].bounds,
            model.shapeDi[edge.targetRef].bounds,
          ),
        );
      }
    });

    it('keeps existing DI untouched and only fills the gaps', () => {
      const partial: BpmnDiagram = {
        ...diagramWithoutDi(),
        shapeDi: {
          Start: { bounds: { x: 500, y: 500, width: 36, height: 36 } },
        },
      };
      const model = placeMissingDi(partial);
      expect(model.shapeDi['Start'].bounds).toEqual({
        x: 500,
        y: 500,
        width: 36,
        height: 36,
      });
      expect(model.shapeDi['Task_a']).toBeDefined();
    });

    it('falls back to document order for cyclic graphs', () => {
      const cyclic: BpmnDiagram = {
        ...createEmptyDiagram(),
        nodes: {
          A: { id: 'A', type: 'task' },
          B: { id: 'B', type: 'task' },
        },
        edges: {
          F1: {
            id: 'F1',
            type: 'sequenceFlow',
            sourceRef: 'A',
            targetRef: 'B',
          },
          F2: {
            id: 'F2',
            type: 'sequenceFlow',
            sourceRef: 'B',
            targetRef: 'A',
          },
        },
        order: ['A', 'B', 'F1', 'F2'],
      };
      const model = placeMissingDi(cyclic);
      expect(model.shapeDi['A'].bounds).toEqual({
        x: 80,
        y: 80,
        width: 100,
        height: 80,
      });
      expect(model.shapeDi['B'].bounds).toEqual({
        x: 260,
        y: 80,
        width: 100,
        height: 80,
      });
      expect(model.edgeDi['F1']).toBeDefined();
      expect(model.edgeDi['F2']).toBeDefined();
    });

    it('places disconnected artifacts in the first layer', () => {
      const annotated: BpmnDiagram = {
        ...createEmptyDiagram(),
        nodes: { Note: { id: 'Note', type: 'textAnnotation', text: 'hi' } },
        order: ['Note'],
      };
      const model = placeMissingDi(annotated);
      expect(model.shapeDi['Note'].bounds).toEqual({
        x: 80,
        y: 80,
        width: 100,
        height: 30,
      });
    });

    it('returns the same reference when nothing is missing', () => {
      const complete = placeMissingDi(diagramWithoutDi());
      expect(placeMissingDi(complete)).toBe(complete);
      const empty = createEmptyDiagram();
      expect(placeMissingDi(empty)).toBe(empty);
    });
  });
});
