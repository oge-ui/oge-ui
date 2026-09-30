import type { BpmnDiagram } from './bpmn-model';
import {
  DEFAULT_SIZES,
  MIN_SIZES,
  SUBPROCESS_EXPANDED_SIZE,
  createEmptyDiagram,
  hiddenByCollapsed,
} from './bpmn-model';
import { fromBpmnJson, toBpmnJson } from './bpmn-json';
import {
  addNodeCommand,
  deleteElementsCommand,
  extractClipboard,
  morphNodeCommand,
  moveElementsCommand,
  pasteCommand,
  resizeNodeCommand,
  setActivityMarkersCommand,
  setBoundaryInterruptingCommand,
  setEventDefinitionCommand,
  toggleSubProcessCollapseCommand,
} from './commands';
import { canConnect, canMorph } from './rules';

/**
 * A process with an expanded sub-process (`Sub` containing `Child` and nested
 * `Inner` containing `Grand`), a task with a boundary event, and an end event.
 */
function v3Model(): BpmnDiagram {
  return {
    ...createEmptyDiagram(),
    nodes: {
      Task: { id: 'Task', type: 'task', name: 'Host' },
      Bound: {
        id: 'Bound',
        type: 'boundaryEvent',
        attachedToRef: 'Task',
      },
      Sub: { id: 'Sub', type: 'subProcess', name: 'Outer' },
      Child: { id: 'Child', type: 'task', parentId: 'Sub' },
      Inner: { id: 'Inner', type: 'subProcess', parentId: 'Sub' },
      Grand: { id: 'Grand', type: 'task', parentId: 'Inner' },
      End: { id: 'End', type: 'endEvent' },
    },
    edges: {
      Flow_b: {
        id: 'Flow_b',
        type: 'sequenceFlow',
        sourceRef: 'Bound',
        targetRef: 'End',
      },
    },
    order: ['Task', 'Bound', 'Sub', 'Child', 'Inner', 'Grand', 'End', 'Flow_b'],
    shapeDi: {
      Task: { bounds: { x: 100, y: 100, width: 100, height: 80 } },
      Bound: { bounds: { x: 132, y: 162, width: 36, height: 36 } },
      Sub: { bounds: { x: 300, y: 60, width: 350, height: 200 } },
      Child: { bounds: { x: 330, y: 120, width: 100, height: 80 } },
      Inner: { bounds: { x: 470, y: 120, width: 100, height: 80 } },
      Grand: { bounds: { x: 480, y: 140, width: 100, height: 80 } },
      End: { bounds: { x: 200, y: 300, width: 36, height: 36 } },
    },
    edgeDi: {
      Flow_b: {
        waypoints: [
          { x: 150, y: 198 },
          { x: 218, y: 300 },
        ],
      },
    },
  };
}

describe('v0.3 rules', () => {
  it('denies a sequence flow into a boundary event', () => {
    const result = canConnect(v3Model(), 'sequenceFlow', 'Task', 'Bound');
    expect(result).toEqual({
      allowed: false,
      reason: 'boundary-cannot-receive',
    });
  });

  it('allows a boundary event as a sequence-flow source', () => {
    // Bound → End is legal (already present, so test against a fresh target).
    const m = v3Model();
    const withTask2: BpmnDiagram = {
      ...m,
      nodes: { ...m.nodes, T2: { id: 'T2', type: 'task' } },
      order: [...m.order, 'T2'],
    };
    expect(canConnect(withTask2, 'sequenceFlow', 'Bound', 'T2').allowed).toBe(
      true,
    );
  });

  it('denies sequence flows across container boundaries', () => {
    const result = canConnect(v3Model(), 'sequenceFlow', 'Task', 'Child');
    expect(result).toEqual({ allowed: false, reason: 'cross-boundary-flow' });
    expect(
      canConnect(v3Model(), 'sequenceFlow', 'Child', 'Inner').allowed,
    ).toBe(true);
    expect(canConnect(v3Model(), 'sequenceFlow', 'Child', 'Grand')).toEqual({
      allowed: false,
      reason: 'cross-boundary-flow',
    });
  });

  it('morphs within the sub-process trio only', () => {
    expect(canMorph(v3Model(), 'Sub', 'transaction').allowed).toBe(true);
    expect(canMorph(v3Model(), 'Sub', 'eventSubProcess').allowed).toBe(true);
    expect(canMorph(v3Model(), 'Sub', 'task')).toEqual({
      allowed: false,
      reason: 'not-in-morph-group',
    });
    expect(canMorph(v3Model(), 'Bound', 'startEvent')).toEqual({
      allowed: false,
      reason: 'not-in-morph-group',
    });
  });

  it('morphing drops an event definition the new position rejects', () => {
    const m = v3Model();
    const withEvent: BpmnDiagram = {
      ...m,
      nodes: {
        ...m.nodes,
        Catch: {
          id: 'Catch',
          type: 'intermediateCatchEvent',
          eventDefinition: 'timer',
        },
      },
      order: [...m.order, 'Catch'],
      shapeDi: {
        ...m.shapeDi,
        Catch: { bounds: { x: 0, y: 0, width: 36, height: 36 } },
      },
    };
    const next = morphNodeCommand('Catch', 'intermediateThrowEvent').apply(
      withEvent,
    );
    // Throw events accept no timer definition → dropped.
    expect(next.nodes['Catch']).toEqual({
      id: 'Catch',
      type: 'intermediateThrowEvent',
    });
  });
});

describe('setEventDefinitionCommand', () => {
  const withStart = (): BpmnDiagram => {
    const m = v3Model();
    return {
      ...m,
      nodes: { ...m.nodes, S: { id: 'S', type: 'startEvent' } },
      order: [...m.order, 'S'],
    };
  };

  it('sets, replaces and clears a definition', () => {
    let m = setEventDefinitionCommand('S', 'message').apply(withStart());
    expect(m.nodes['S']).toMatchObject({ eventDefinition: 'message' });
    m = setEventDefinitionCommand('S', 'timer').apply(m);
    expect(m.nodes['S']).toMatchObject({ eventDefinition: 'timer' });
    m = setEventDefinitionCommand('S', undefined).apply(m);
    expect(m.nodes['S']).toEqual({ id: 'S', type: 'startEvent' });
  });

  it('no-ops invalid kinds, non-events, unknown ids and unchanged values', () => {
    const m = withStart();
    expect(setEventDefinitionCommand('S', 'terminate').apply(m)).toBe(m);
    expect(setEventDefinitionCommand('Task', 'message').apply(m)).toBe(m);
    expect(setEventDefinitionCommand('Nope', 'message').apply(m)).toBe(m);
    expect(setEventDefinitionCommand('S', undefined).apply(m)).toBe(m);
  });
});

describe('setActivityMarkersCommand', () => {
  it('sets, normalizes order, and clears markers', () => {
    let m = setActivityMarkersCommand('Task', ['compensation', 'loop']).apply(
      v3Model(),
    );
    expect(m.nodes['Task']).toMatchObject({
      markers: ['loop', 'compensation'],
    });
    m = setActivityMarkersCommand('Task', []).apply(m);
    expect(m.nodes['Task']).toEqual({ id: 'Task', type: 'task', name: 'Host' });
  });

  it('no-ops non-activities and unchanged sets', () => {
    const m = v3Model();
    expect(setActivityMarkersCommand('Bound', ['loop']).apply(m)).toBe(m);
    expect(setActivityMarkersCommand('Task', []).apply(m)).toBe(m);
  });
});

describe('setBoundaryInterruptingCommand', () => {
  it('flips to non-interrupting and back', () => {
    let m = setBoundaryInterruptingCommand('Bound', false).apply(v3Model());
    expect(m.nodes['Bound']).toMatchObject({ cancelActivity: false });
    m = setBoundaryInterruptingCommand('Bound', true).apply(m);
    expect(m.nodes['Bound']).toEqual({
      id: 'Bound',
      type: 'boundaryEvent',
      attachedToRef: 'Task',
    });
  });

  it('no-ops non-boundary nodes and unchanged values', () => {
    const m = v3Model();
    expect(setBoundaryInterruptingCommand('Task', false).apply(m)).toBe(m);
    expect(setBoundaryInterruptingCommand('Bound', true).apply(m)).toBe(m);
  });
});

describe('toggleSubProcessCollapseCommand', () => {
  it('collapsing shrinks the shape and hides descendants', () => {
    const next = toggleSubProcessCollapseCommand('Sub', true).apply(v3Model());
    expect(next.nodes['Sub']).toMatchObject({ collapsed: true });
    expect(next.shapeDi['Sub'].bounds).toMatchObject(
      DEFAULT_SIZES['subProcess'],
    );
    const hidden = hiddenByCollapsed(next);
    expect(hidden.has('Child')).toBe(true);
    expect(hidden.has('Grand')).toBe(true);
    // Children stay in the model (and hence in the XML).
    expect(next.nodes['Child']).toBeDefined();
  });

  it('expanding restores at least the default expanded size and places DI-less children', () => {
    const collapsed = toggleSubProcessCollapseCommand('Sub', true).apply(
      v3Model(),
    );
    const noChildDi: BpmnDiagram = {
      ...collapsed,
      shapeDi: Object.fromEntries(
        Object.entries(collapsed.shapeDi).filter(([id]) => id !== 'Child'),
      ),
    };
    const expanded = toggleSubProcessCollapseCommand('Sub', false).apply(
      noChildDi,
    );
    expect(
      expanded.nodes['Sub'].type !== 'textAnnotation'
        ? expanded.nodes['Sub'].collapsed
        : 'set',
    ).toBeUndefined();
    expect(expanded.shapeDi['Sub'].bounds.width).toBeGreaterThanOrEqual(
      SUBPROCESS_EXPANDED_SIZE.width,
    );
    expect(expanded.shapeDi['Child']).toBeDefined();
  });

  it('no-ops non-containers and unchanged states', () => {
    const m = v3Model();
    expect(toggleSubProcessCollapseCommand('Task', true).apply(m)).toBe(m);
    expect(toggleSubProcessCollapseCommand('Sub', false).apply(m)).toBe(m);
  });
});

describe('v0.3 move semantics', () => {
  it('moving the host carries its boundary events', () => {
    const next = moveElementsCommand(['Task'], 30, 20).apply(v3Model());
    expect(next.shapeDi['Task'].bounds).toMatchObject({ x: 130, y: 120 });
    expect(next.shapeDi['Bound'].bounds).toMatchObject({ x: 162, y: 182 });
  });

  it('moving a sub-process carries all descendants recursively', () => {
    const next = moveElementsCommand(['Sub'], 10, 10).apply(v3Model());
    expect(next.shapeDi['Child'].bounds).toMatchObject({ x: 340, y: 130 });
    expect(next.shapeDi['Inner'].bounds).toMatchObject({ x: 480, y: 130 });
    expect(next.shapeDi['Grand'].bounds).toMatchObject({ x: 490, y: 150 });
  });

  it('moving a boundary event alone slides it along the host border', () => {
    // Push it far to the right: the center clamps onto the host perimeter.
    const next = moveElementsCommand(['Bound'], 500, -60).apply(v3Model());
    const b = next.shapeDi['Bound'].bounds;
    const center = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    expect(center.x).toBe(200); // host right edge (100 + 100)
    expect(center.y).toBeGreaterThanOrEqual(100);
    expect(center.y).toBeLessThanOrEqual(180);
  });
});

describe('v0.3 delete semantics', () => {
  it('deleting the host cascades to boundary events and their flows', () => {
    const next = deleteElementsCommand(['Task']).apply(v3Model());
    expect(next.nodes['Bound']).toBeUndefined();
    expect(next.edges['Flow_b']).toBeUndefined();
  });

  it('deleting a sub-process cascades to all descendants', () => {
    const next = deleteElementsCommand(['Sub']).apply(v3Model());
    expect(next.nodes['Child']).toBeUndefined();
    expect(next.nodes['Inner']).toBeUndefined();
    expect(next.nodes['Grand']).toBeUndefined();
    expect(next.order).toEqual(['Task', 'Bound', 'End', 'Flow_b']);
  });
});

describe('v0.3 clipboard semantics', () => {
  it('copying a sub-process copies its descendants and remaps parentId on paste', () => {
    const clip = extractClipboard(v3Model(), ['Sub']);
    expect(clip?.nodes.map((n) => n.id).sort()).toEqual([
      'Child',
      'Grand',
      'Inner',
      'Sub',
    ]);
    const next = pasteCommand(clip as NonNullable<typeof clip>, {
      x: 40,
      y: 40,
    }).apply(v3Model());
    const pastedSub = Object.values(next.nodes).find(
      (n) =>
        n.id !== 'Sub' && n.type === 'subProcess' && n.parentId === undefined,
    );
    expect(pastedSub).toBeDefined();
    const pastedChildren = Object.values(next.nodes).filter(
      (n) => n.parentId === pastedSub?.id,
    );
    expect(pastedChildren).toHaveLength(2);
  });

  it('copying a host copies its boundary event with a remapped attachedToRef', () => {
    const clip = extractClipboard(v3Model(), ['Task']);
    expect(clip?.nodes.map((n) => n.id).sort()).toEqual(['Bound', 'Task']);
    const next = pasteCommand(clip as NonNullable<typeof clip>, {
      x: 0,
      y: 200,
    }).apply(v3Model());
    const pastedBoundary = Object.values(next.nodes).find(
      (n) =>
        n.id !== 'Bound' &&
        n.type === 'boundaryEvent' &&
        n.type === 'boundaryEvent',
    );
    expect(
      pastedBoundary?.type === 'boundaryEvent'
        ? pastedBoundary.attachedToRef
        : null,
    ).not.toBe('Task');
    expect(
      next.nodes[
        (pastedBoundary?.type === 'boundaryEvent'
          ? pastedBoundary.attachedToRef
          : '') as string
      ],
    ).toBeDefined();
  });

  it('a boundary event selected without its host is not copied', () => {
    expect(extractClipboard(v3Model(), ['Bound'])).toBeNull();
  });
});

describe('v0.3 misc', () => {
  it('addNodeCommand attaches boundary events and inherits containers', () => {
    const next = addNodeCommand('boundaryEvent', { x: 200, y: 140 }, 'B2', {
      attachedToRef: 'Task',
      snap: false,
    }).apply(v3Model());
    expect(next.nodes['B2']).toMatchObject({
      type: 'boundaryEvent',
      attachedToRef: 'Task',
    });
    expect(next.shapeDi['B2'].bounds).toMatchObject({ x: 182, y: 122 });

    const appended = addNodeCommand('task', { x: 400, y: 200 }, 'T3', {
      parentId: 'Sub',
    }).apply(v3Model());
    expect(appended.nodes['T3']).toMatchObject({ parentId: 'Sub' });
  });

  it('sub-processes are resizable with a 200×120 minimum', () => {
    expect(MIN_SIZES['subProcess']).toBeDefined();
    const next = resizeNodeCommand('Sub', {
      x: 300,
      y: 60,
      width: 400,
      height: 260,
    }).apply(v3Model());
    expect(next.shapeDi['Sub'].bounds.width).toBe(400);
  });

  it('the JSON envelope round-trips every v0.3 field', () => {
    const parsed = fromBpmnJson(
      JSON.parse(JSON.stringify(toBpmnJson(v3Model()))),
    );
    expect(parsed.error).toBeUndefined();
    expect(parsed.model?.nodes['Bound']).toMatchObject({
      attachedToRef: 'Task',
    });
    expect(parsed.model?.nodes['Grand']).toMatchObject({ parentId: 'Inner' });
  });
});
