import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram, MIN_SIZES } from './bpmn-model';
import { fromBpmnJson, toBpmnJson } from './bpmn-json';
import {
  morphNodeCommand,
  resizeNodeCommand,
  setElementColorsCommand,
} from './commands';
import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import { canMorph, MORPH_GROUPS } from './rules';
import { renderDiagramSvg } from './svg-export';
import { COLORED_FIXTURE_XML } from './xml-fixtures';
import { OGE_DEFAULT_BPMN_COLOR_PRESETS } from '../config';

function baseModel(): BpmnDiagram {
  return {
    ...createEmptyDiagram(),
    nodes: {
      Start: { id: 'Start', type: 'startEvent' },
      Task: { id: 'Task', type: 'task', name: 'Work' },
      End: { id: 'End', type: 'endEvent' },
    },
    edges: {
      Flow_0: {
        id: 'Flow_0',
        type: 'sequenceFlow',
        sourceRef: 'Start',
        targetRef: 'Task',
      },
      Flow_1: {
        id: 'Flow_1',
        type: 'sequenceFlow',
        sourceRef: 'Task',
        targetRef: 'End',
      },
    },
    order: ['Start', 'Task', 'End', 'Flow_0', 'Flow_1'],
    shapeDi: {
      Start: { bounds: { x: 100, y: 100, width: 36, height: 36 } },
      Task: { bounds: { x: 200, y: 78, width: 100, height: 80 } },
      End: { bounds: { x: 400, y: 100, width: 36, height: 36 } },
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
          { x: 300, y: 118 },
          { x: 400, y: 118 },
        ],
      },
    },
  };
}

// --------------------------------------------------------------- bioc colors

describe('per-element colors (bioc interop)', () => {
  it('reads bioc:stroke/bioc:fill from shapes and edges into the DI', () => {
    const { model, warnings } = readBpmnXml(COLORED_FIXTURE_XML);
    expect(model).not.toBeNull();
    expect(model?.shapeDi['Task_col'].stroke).toBe('#0d4372');
    expect(model?.shapeDi['Task_col'].fill).toBe('#bbdefb');
    expect(model?.shapeDi['Start_col'].fill).toBeUndefined();
    expect(model?.edgeDi['Flow_col'].stroke).toBe('#0d4372');
    expect(model?.edgeDi['Flow_col'].fill).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it('reads stroke/fill attributes regardless of the namespace prefix', () => {
    const xml = COLORED_FIXTURE_XML.replace(/bioc:/g, 'x:').replace(
      'xmlns:bioc=',
      'xmlns:x=',
    );
    const { model } = readBpmnXml(xml);
    expect(model?.shapeDi['Task_col'].fill).toBe('#bbdefb');
    expect(model?.edgeDi['Flow_col'].stroke).toBe('#0d4372');
  });

  it('writes bioc attributes and the bioc namespace only when colors exist', () => {
    const plain = writeBpmnXml(baseModel());
    expect(plain).not.toContain('bioc');

    const colored = setElementColorsCommand(['Task', 'Flow_0'], {
      fill: '#bbdefb',
      stroke: '#0d4372',
    }).apply(baseModel());
    const xml = writeBpmnXml(colored);
    expect(xml).toContain(
      'xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0"',
    );
    expect(xml).toContain(
      'bpmnElement="Task" bioc:stroke="#0d4372" bioc:fill="#bbdefb"',
    );
    expect(xml).toContain('bpmnElement="Flow_0" bioc:stroke="#0d4372"');
  });

  it('survives a JSON persistence round trip', () => {
    const colored = setElementColorsCommand(['Task'], {
      fill: '#bbdefb',
      stroke: '#0d4372',
    }).apply(baseModel());
    const parsed = fromBpmnJson(
      JSON.parse(JSON.stringify(toBpmnJson(colored))),
    );
    expect(parsed.error).toBeUndefined();
    expect(parsed.model?.shapeDi['Task'].fill).toBe('#bbdefb');
    expect(parsed.model?.shapeDi['Task'].stroke).toBe('#0d4372');
  });

  it('exports 8 default presets that are hex colors', () => {
    expect(OGE_DEFAULT_BPMN_COLOR_PRESETS).toHaveLength(8);
    for (const color of OGE_DEFAULT_BPMN_COLOR_PRESETS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('setElementColorsCommand', () => {
  it('sets fill and stroke on nodes and edges', () => {
    const next = setElementColorsCommand(['Task', 'Flow_0'], {
      fill: '#ff0000',
      stroke: '#00ff00',
    }).apply(baseModel());
    expect(next.shapeDi['Task']).toMatchObject({
      fill: '#ff0000',
      stroke: '#00ff00',
    });
    expect(next.edgeDi['Flow_0']).toMatchObject({
      fill: '#ff0000',
      stroke: '#00ff00',
    });
    expect(next.shapeDi['Start'].fill).toBeUndefined();
  });

  it('null clears, undefined leaves untouched', () => {
    const colored = setElementColorsCommand(['Task'], {
      fill: '#ff0000',
      stroke: '#00ff00',
    }).apply(baseModel());
    const cleared = setElementColorsCommand(['Task'], {
      fill: null,
    }).apply(colored);
    expect(cleared.shapeDi['Task'].fill).toBeUndefined();
    expect(cleared.shapeDi['Task'].stroke).toBe('#00ff00');
  });

  it('is a same-reference no-op when nothing changes', () => {
    const m = baseModel();
    expect(setElementColorsCommand(['Task'], {}).apply(m)).toBe(m);
    expect(setElementColorsCommand(['Task'], { fill: null }).apply(m)).toBe(m);
    expect(setElementColorsCommand(['Nope'], { fill: '#fff' }).apply(m)).toBe(
      m,
    );
    const colored = setElementColorsCommand(['Task'], {
      fill: '#ff0000',
    }).apply(m);
    expect(
      setElementColorsCommand(['Task'], { fill: '#ff0000' }).apply(colored),
    ).toBe(colored);
  });
});

// -------------------------------------------------------------------- resize

describe('resizeNodeCommand', () => {
  it('updates the bounds and re-routes attached non-manual edges', () => {
    const m = baseModel();
    const next = resizeNodeCommand('Task', {
      x: 200,
      y: 78,
      width: 160,
      height: 120,
    }).apply(m);
    expect(next.shapeDi['Task'].bounds).toEqual({
      x: 200,
      y: 78,
      width: 160,
      height: 120,
    });
    // Both attached edges were re-routed against the new bounds.
    expect(next.edgeDi['Flow_0']).not.toBe(m.edgeDi['Flow_0']);
    expect(next.edgeDi['Flow_1'].waypoints[0].x).toBe(360);
  });

  it('leaves hand-edited (manual) edges untouched', () => {
    const m = baseModel();
    const manual: BpmnDiagram = {
      ...m,
      edgeDi: {
        ...m.edgeDi,
        Flow_0: { ...m.edgeDi['Flow_0'], manual: true },
      },
    };
    const next = resizeNodeCommand('Task', {
      x: 200,
      y: 78,
      width: 160,
      height: 120,
    }).apply(manual);
    expect(next.edgeDi['Flow_0']).toBe(manual.edgeDi['Flow_0']);
    expect(next.edgeDi['Flow_1']).not.toBe(manual.edgeDi['Flow_1']);
  });

  it('is a same-reference no-op for unknown ids and unchanged bounds', () => {
    const m = baseModel();
    expect(
      resizeNodeCommand('Nope', { x: 0, y: 0, width: 10, height: 10 }).apply(m),
    ).toBe(m);
    expect(
      resizeNodeCommand('Task', {
        x: 200,
        y: 78,
        width: 100,
        height: 80,
      }).apply(m),
    ).toBe(m);
  });

  it('exports minimum sizes for activities and text annotations only', () => {
    expect(MIN_SIZES['task']).toEqual({ width: 80, height: 60 });
    expect(MIN_SIZES['userTask']).toEqual({ width: 80, height: 60 });
    expect(MIN_SIZES['textAnnotation']).toEqual({ width: 60, height: 24 });
    expect(MIN_SIZES['startEvent']).toBeUndefined();
    expect(MIN_SIZES['exclusiveGateway']).toBeUndefined();
  });
});

// --------------------------------------------------------------------- morph

describe('type morphing', () => {
  it('defines the four morph groups (boundary events in none)', () => {
    expect(MORPH_GROUPS).toEqual([
      ['task', 'userTask', 'serviceTask', 'scriptTask', 'callActivity'],
      ['exclusiveGateway', 'parallelGateway'],
      [
        'startEvent',
        'endEvent',
        'intermediateThrowEvent',
        'intermediateCatchEvent',
      ],
      ['subProcess', 'eventSubProcess', 'transaction'],
    ]);
  });

  it('allows morphs within a group and denies cross-group morphs', () => {
    const m = baseModel();
    expect(canMorph(m, 'Task', 'serviceTask').allowed).toBe(true);
    expect(canMorph(m, 'Task', 'exclusiveGateway')).toEqual({
      allowed: false,
      reason: 'not-in-morph-group',
    });
    expect(canMorph(m, 'Nope', 'task')).toEqual({
      allowed: false,
      reason: 'unknown-element',
    });
  });

  it('denies morphs that would break sequence-flow rules', () => {
    const m = baseModel();
    // Start has an outgoing flow: it may not become an end event.
    expect(canMorph(m, 'Start', 'endEvent')).toEqual({
      allowed: false,
      reason: 'source-is-end-event',
    });
    // End has an incoming flow: it may not become a start event.
    expect(canMorph(m, 'End', 'startEvent')).toEqual({
      allowed: false,
      reason: 'target-is-start-event',
    });
    // Intermediate events are fine in both positions.
    expect(canMorph(m, 'Start', 'intermediateThrowEvent').allowed).toBe(true);
    expect(canMorph(m, 'End', 'intermediateCatchEvent').allowed).toBe(true);
  });

  it('morphNodeCommand changes only the type, keeping everything else', () => {
    const colored = setElementColorsCommand(['Task'], {
      fill: '#bbdefb',
    }).apply(baseModel());
    const next = morphNodeCommand('Task', 'userTask').apply(colored);
    expect(next.nodes['Task']).toEqual({
      id: 'Task',
      type: 'userTask',
      name: 'Work',
    });
    expect(next.shapeDi['Task']).toBe(colored.shapeDi['Task']);
    expect(next.edges).toBe(colored.edges);
    expect(next.order).toBe(colored.order);
  });

  it('morphNodeCommand no-ops denied morphs and unchanged types', () => {
    const m = baseModel();
    expect(morphNodeCommand('Task', 'task').apply(m)).toBe(m);
    expect(morphNodeCommand('Task', 'parallelGateway').apply(m)).toBe(m);
    expect(morphNodeCommand('Start', 'endEvent').apply(m)).toBe(m);
    expect(morphNodeCommand('Nope', 'task').apply(m)).toBe(m);
  });
});

// ---------------------------------------------------------------- svg export

describe('svg export with colors', () => {
  it('honors DI fill/stroke on shapes and edge strokes', () => {
    const colored = setElementColorsCommand(['Task', 'Flow_0'], {
      fill: '#bbdefb',
      stroke: '#0d4372',
    }).apply(baseModel());
    const svg = renderDiagramSvg(colored);
    expect(svg).toContain('fill="#bbdefb" stroke="#0d4372"');
    expect(svg).toContain('stroke="#0d4372" stroke-width="1.5" marker-end=');
    // Uncolored elements keep the neutral palette.
    expect(svg).toContain('fill="#fff"');
    expect(svg).toContain('stroke="#64748b"');
  });
});
