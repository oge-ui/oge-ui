import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  addNodeCommand,
  addPoolCommand,
  connectCommand,
  setConditionCommand,
  setDefaultFlowCommand,
  updateLabelCommand,
} from './commands';
import { readBpmnXml } from './bpmn-xml-reader';
import { OGE_DEFAULT_BPMN_LINT_MESSAGES } from './config';
import {
  OGE_BPMN_DEFAULT_LINT_RULES,
  bpmnLintSummary,
  bpmnWorstSeverity,
  lintBpmnDiagram,
  resolveBpmnLintRules,
  type OgeBpmnLintRule,
} from './lint';
import { demoProcessXml } from './xml-fixtures';

const rules = OGE_DEFAULT_BPMN_LINT_MESSAGES.rules;

function build(
  steps: ((m: BpmnDiagram) => BpmnDiagram)[],
  start: BpmnDiagram = createEmptyDiagram(),
): BpmnDiagram {
  return steps.reduce((m, step) => step(m), start);
}

const node =
  (
    type: Parameters<typeof addNodeCommand>[0],
    id: string,
    x = 0,
    name?: string,
  ) =>
  (m: BpmnDiagram) => {
    const next = addNodeCommand(type, { x, y: 100 }, id).apply(m);
    return name === undefined ? next : updateLabelCommand(id, name).apply(next);
  };
const flow = (id: string, from: string, to: string) => (m: BpmnDiagram) =>
  connectCommand('sequenceFlow', from, to, id).apply(m);

function ruleIds(model: BpmnDiagram, elementId?: string): string[] {
  return lintBpmnDiagram(model)
    .filter((i) => elementId === undefined || i.elementId === elementId)
    .map((i) => i.ruleId);
}

describe('lintBpmnDiagram', () => {
  it('passes a clean, labelled process', () => {
    const m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('task', 'T', 200, 'Work'),
      node('endEvent', 'E', 400, 'Done'),
      flow('F1', 'S', 'T'),
      flow('F2', 'T', 'E'),
    ]);
    expect(lintBpmnDiagram(m)).toEqual([]);
  });

  it('accepts the demo process apart from its unconditioned gateway flows', () => {
    const result = readBpmnXml(demoProcessXml('bpmn'));
    const model = result.model as BpmnDiagram;
    const ids = new Set(lintBpmnDiagram(model).map((i) => i.ruleId));
    expect(ids.has('start-event-required')).toBe(false);
    expect(ids.has('no-duplicate-ids')).toBe(false);
  });

  it('reports missing start and end events on the process', () => {
    const m = build([node('task', 'T', 0, 'Work')]);
    const issues = lintBpmnDiagram(m);
    expect(issues.map((i) => i.ruleId)).toEqual(
      expect.arrayContaining(['start-event-required', 'end-event-required']),
    );
    expect(
      issues.find((i) => i.ruleId === 'start-event-required'),
    ).toMatchObject({
      elementId: m.processId,
      severity: 'error',
      message: rules.startEventRequired,
    });
  });

  it('reports a disconnected node', () => {
    const m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('endEvent', 'E', 200, 'End'),
      node('task', 'Lonely', 400, 'Alone'),
      flow('F', 'S', 'E'),
    ]);
    expect(ruleIds(m, 'Lonely')).toContain('no-disconnected');
  });

  it('reports a gateway that neither forks nor joins', () => {
    const m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('exclusiveGateway', 'G', 200),
      node('endEvent', 'E', 400, 'End'),
      flow('F1', 'S', 'G'),
      flow('F2', 'G', 'E'),
    ]);
    expect(ruleIds(m, 'G')).toContain('superfluous-gateway');
  });

  it('requires conditions on forking exclusive-gateway flows except the default', () => {
    let m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('exclusiveGateway', 'G', 200, 'Ok?'),
      node('endEvent', 'A', 400, 'Yes'),
      node('endEvent', 'B', 400, 'No'),
      flow('F0', 'S', 'G'),
      flow('Fa', 'G', 'A'),
      flow('Fb', 'G', 'B'),
    ]);
    expect(ruleIds(m, 'Fa')).toContain('conditional-flows');
    expect(ruleIds(m, 'Fb')).toContain('conditional-flows');
    m = setConditionCommand('Fa', '=ok').apply(m);
    m = setDefaultFlowCommand('G', 'Fb').apply(m);
    expect(ruleIds(m, 'Fa')).not.toContain('conditional-flows');
    expect(ruleIds(m, 'Fb')).not.toContain('conditional-flows');
    m = setConditionCommand('Fb', '=x').apply(m);
    expect(lintBpmnDiagram(m).find((i) => i.elementId === 'Fb')?.message).toBe(
      rules.defaultFlowCondition,
    );
  });

  it('reports implicit splits and joins', () => {
    const m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('task', 'T', 200, 'Split'),
      node('task', 'A', 400, 'A'),
      node('task', 'B', 400, 'B'),
      node('task', 'J', 600, 'Join'),
      node('endEvent', 'E', 800, 'End'),
      flow('F1', 'S', 'T'),
      flow('F2', 'T', 'A'),
      flow('F3', 'T', 'B'),
      flow('F4', 'A', 'J'),
      flow('F5', 'B', 'J'),
      flow('F6', 'J', 'E'),
    ]);
    expect(ruleIds(m, 'T')).toContain('no-implicit-split');
    expect(ruleIds(m, 'J')).toContain('no-implicit-join');
  });

  it('requires labels on activities, events and pools', () => {
    const m = build([
      node('startEvent', 'S', 0),
      node('task', 'T', 200),
      node('endEvent', 'E', 400, 'End'),
      flow('F1', 'S', 'T'),
      flow('F2', 'T', 'E'),
    ]);
    expect(ruleIds(m, 'S')).toContain('label-required');
    expect(ruleIds(m, 'T')).toContain('label-required');
    expect(ruleIds(m, 'E')).not.toContain('label-required');
    const pooled = addPoolCommand({ x: 300, y: 300 }, 'P').apply(m);
    expect(ruleIds(pooled, 'P')).toContain('label-required');
  });

  it('reports a duplicate id (a lane named like a node)', () => {
    let m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('endEvent', 'E', 200, 'End'),
      flow('F', 'S', 'E'),
    ]);
    m = { ...m, rootElements: [{ id: 'S', type: 'message' }] };
    const issue = lintBpmnDiagram(m).find(
      (i) => i.ruleId === 'no-duplicate-ids',
    );
    expect(issue?.elementId).toBe('S');
    expect(issue?.message).toContain('"S"');
  });

  it('requires a start event in a sub-process with content', () => {
    let m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('subProcess', 'Sub', 300, 'Sub'),
      node('endEvent', 'E', 600, 'End'),
      flow('F1', 'S', 'Sub'),
      flow('F2', 'Sub', 'E'),
    ]);
    m = addNodeCommand('task', { x: 300, y: 100 }, 'Inner', {
      parentId: 'Sub',
    }).apply(m);
    expect(ruleIds(m, 'Sub')).toContain('sub-process-start-event');
  });

  it('reports a message flow inside one pool', () => {
    let m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('endEvent', 'E', 200, 'End'),
      flow('F', 'S', 'E'),
    ]);
    m = {
      ...m,
      edges: {
        ...m.edges,
        M: { id: 'M', type: 'messageFlow', sourceRef: 'S', targetRef: 'E' },
      },
      order: [...m.order, 'M'],
    };
    expect(ruleIds(m, 'M')).toContain('message-flow-pools');
  });

  it('reports a boundary event without a host or an outgoing flow', () => {
    let m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('task', 'T', 200, 'Work'),
      node('endEvent', 'E', 400, 'End'),
      flow('F1', 'S', 'T'),
      flow('F2', 'T', 'E'),
    ]);
    m = addNodeCommand('boundaryEvent', { x: 200, y: 140 }, 'B', {
      attachedToRef: 'T',
    }).apply(m);
    expect(lintBpmnDiagram(m).find((i) => i.elementId === 'B')?.message).toBe(
      rules.boundaryOutgoing,
    );
    m = addNodeCommand('boundaryEvent', { x: 0, y: 300 }, 'Orphan').apply(m);
    expect(
      lintBpmnDiagram(m).find((i) => i.elementId === 'Orphan')?.message,
    ).toBe(rules.boundaryAttached);
  });

  it('reports a connected node no start event reaches', () => {
    const m = build([
      node('startEvent', 'S', 0, 'Start'),
      node('endEvent', 'E', 200, 'End'),
      node('task', 'A', 400, 'A'),
      node('endEvent', 'E2', 600, 'End 2'),
      flow('F1', 'S', 'E'),
      flow('F2', 'A', 'E2'),
    ]);
    expect(ruleIds(m, 'A')).toContain('no-unreachable');
    expect(ruleIds(m, 'E2')).toContain('no-unreachable');
    expect(ruleIds(m, 'E')).not.toContain('no-unreachable');
  });

  it('orders errors before warnings and summarizes', () => {
    const m = build([node('task', 'T', 0)]);
    const issues = lintBpmnDiagram(m);
    const severities = issues.map((i) => i.severity);
    expect(severities.indexOf('warning')).toBeGreaterThan(
      severities.lastIndexOf('error'),
    );
    const summary = bpmnLintSummary(issues);
    expect(summary.errors + summary.warnings + summary.infos).toBe(
      issues.length,
    );
    expect(bpmnWorstSeverity(issues)).toBe('error');
    expect(bpmnWorstSeverity([])).toBeNull();
  });
});

describe('resolveBpmnLintRules', () => {
  const custom: OgeBpmnLintRule = {
    id: 'task-needs-docs',
    severity: 'info',
    check: (model) =>
      Object.values(model.nodes)
        .filter((n) => n.type === 'task' && n.documentation === undefined)
        .map((n) => ({ elementId: n.id, message: 'Document me' })),
  };

  it('returns the defaults without input', () => {
    expect(resolveBpmnLintRules(undefined)).toBe(OGE_BPMN_DEFAULT_LINT_RULES);
  });

  it('adds, re-grades and disables rules', () => {
    const resolved = resolveBpmnLintRules([
      custom,
      { id: 'label-required', severity: 'off' },
      { id: 'no-disconnected', severity: 'warning' },
    ]);
    const ids = resolved.map((r) => r.id);
    expect(ids).toContain('task-needs-docs');
    expect(ids).not.toContain('label-required');
    expect(resolved.find((r) => r.id === 'no-disconnected')?.severity).toBe(
      'warning',
    );
    const m = build([node('task', 'T', 0)]);
    const issues = lintBpmnDiagram(m, resolved);
    expect(issues.find((i) => i.ruleId === 'task-needs-docs')).toMatchObject({
      severity: 'info',
      message: 'Document me',
    });
    expect(issues.some((i) => i.ruleId === 'label-required')).toBe(false);
  });

  it('replaces a built-in rule with the same id', () => {
    const resolved = resolveBpmnLintRules([
      { id: 'label-required', severity: 'error', check: () => [] },
    ]);
    expect(resolved.length).toBe(OGE_BPMN_DEFAULT_LINT_RULES.length);
    expect(
      lintBpmnDiagram(build([node('task', 'T', 0)]), resolved).some(
        (i) => i.ruleId === 'label-required',
      ),
    ).toBe(false);
  });

  it('skips a rule that throws', () => {
    const broken: OgeBpmnLintRule = {
      id: 'broken',
      severity: 'error',
      check: () => {
        throw new Error('boom');
      },
    };
    expect(() =>
      lintBpmnDiagram(build([node('task', 'T', 0)]), [broken]),
    ).not.toThrow();
  });
});
