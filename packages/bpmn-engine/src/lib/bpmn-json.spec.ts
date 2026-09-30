import { fromBpmnJson, toBpmnJson } from './bpmn-json';
import { createEmptyDiagram } from './bpmn-model';
import { DEMO_EXPECTED_MODEL } from './xml-fixtures';

describe('bpmn-json', () => {
  it('round-trips a diagram through the JSON envelope and JSON.stringify', () => {
    const json = toBpmnJson(DEMO_EXPECTED_MODEL);
    expect(json.version).toBe(1);
    const parsed: unknown = JSON.parse(JSON.stringify(json));
    const result = fromBpmnJson(parsed);
    expect(result.error).toBeUndefined();
    expect(result.model).toEqual(DEMO_EXPECTED_MODEL);
    // The returned model is a clone, not the caller's object graph.
    expect(result.model).not.toBe((parsed as { diagram: unknown }).diagram);
  });

  it('accepts an empty diagram and tolerates unknown extra keys', () => {
    const json = toBpmnJson(createEmptyDiagram());
    const withExtras = {
      ...json,
      future: 'stuff',
      diagram: { ...json.diagram, futureField: [1, 2, 3] },
    };
    const result = fromBpmnJson(withExtras);
    expect(result.model).not.toBeNull();
    expect(result.model?.processId).toBe('Process_1');
  });

  it('rejects non-objects and wrong versions', () => {
    expect(fromBpmnJson(null).error).toBe('Not a JSON object');
    expect(fromBpmnJson('x').error).toBe('Not a JSON object');
    expect(fromBpmnJson({ version: 2, diagram: {} }).error).toContain(
      'Unsupported version',
    );
    expect(fromBpmnJson({ version: 1 }).error).toContain('diagram');
  });

  it('rejects missing required maps and malformed order', () => {
    const good = JSON.parse(
      JSON.stringify(toBpmnJson(DEMO_EXPECTED_MODEL)),
    ) as { version: 1; diagram: Record<string, unknown> };
    const withoutNodes = {
      version: 1,
      diagram: { ...good.diagram, nodes: undefined },
    };
    expect(fromBpmnJson(withoutNodes).error).toContain('nodes');
    const badOrder = {
      version: 1,
      diagram: { ...good.diagram, order: [1, 2] },
    };
    expect(fromBpmnJson(badOrder).error).toContain('order');
  });

  it('rejects corrupt id cross-references', () => {
    const base = (): { version: 1; diagram: Record<string, unknown> } =>
      JSON.parse(JSON.stringify(toBpmnJson(DEMO_EXPECTED_MODEL)));

    const danglingOrder = base();
    (danglingOrder.diagram['order'] as string[]).push('Ghost');
    expect(fromBpmnJson(danglingOrder).error).toContain('Ghost');

    const danglingEdge = base();
    (danglingEdge.diagram['edges'] as Record<string, { sourceRef: string }>)[
      'Flow_s1'
    ].sourceRef = 'Ghost';
    expect(fromBpmnJson(danglingEdge).error).toContain('unknown source');

    const danglingDefault = base();
    (
      danglingDefault.diagram['nodes'] as Record<
        string,
        { defaultFlowId?: string }
      >
    )['Gateway_check'].defaultFlowId = 'Ghost';
    expect(fromBpmnJson(danglingDefault).error).toContain('default flow');

    const orphanShapeDi = base();
    (orphanShapeDi.diagram['shapeDi'] as Record<string, unknown>)['Ghost'] = {
      bounds: { x: 0, y: 0, width: 1, height: 1 },
    };
    expect(fromBpmnJson(orphanShapeDi).error).toContain('no matching node');
  });

  it('rejects malformed DI geometry', () => {
    const base = JSON.parse(
      JSON.stringify(toBpmnJson(DEMO_EXPECTED_MODEL)),
    ) as { version: 1; diagram: Record<string, unknown> };
    (base.diagram['edgeDi'] as Record<string, { waypoints: unknown }>)[
      'Flow_s1'
    ].waypoints = [{ x: 'NaN', y: 0 }];
    expect(fromBpmnJson(base).error).toContain('invalid waypoints');
  });

  it('fills default definitions attrs when the envelope omits them', () => {
    const json = JSON.parse(
      JSON.stringify(toBpmnJson(createEmptyDiagram())),
    ) as { version: 1; diagram: Record<string, unknown> };
    delete json.diagram['definitionsAttrs'];
    delete json.diagram['foreignDefinitionsChildren'];
    const result = fromBpmnJson(json);
    expect(result.model?.definitionsAttrs['id']).toBe('Definitions_1');
    expect(result.model?.foreignDefinitionsChildren).toEqual([]);
  });
});
