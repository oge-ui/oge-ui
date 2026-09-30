import { OGE_DEFAULT_BPMN_MESSAGES } from './config';
import { readBpmnXml } from './bpmn-xml-reader';
import type { BpmnDiagram } from './bpmn-model';
import {
  bpmnColorInputValue,
  bpmnCompensationCommand,
  bpmnFieldKey,
  bpmnLaneNameLabel,
  bpmnMarkerCommand,
  bpmnPresetLabel,
  buildBpmnPropertiesModel,
} from './properties-view';
import {
  V03_FIXTURE_XML,
  V04_FIXTURE_XML,
  demoProcessXml,
} from './xml-fixtures';

const M = OGE_DEFAULT_BPMN_MESSAGES;

function model(xml: string): BpmnDiagram {
  const result = readBpmnXml(xml);
  if (result.model === null) throw new Error(result.error ?? 'no model');
  return result.model;
}

describe('buildBpmnPropertiesModel', () => {
  it('shows the process when nothing is selected', () => {
    const m = model(demoProcessXml('bpmn'));
    const p = buildBpmnPropertiesModel(m, [], M);
    expect(p.view.kind).toBe('process');
    expect(p.appearance).toBeNull();
    expect(p.regionLabel).toBe(`${M.canvasLabel} — ${M.properties.panelLabel}`);
  });

  it('summarizes a multi-selection', () => {
    const m = model(demoProcessXml('bpmn'));
    const p = buildBpmnPropertiesModel(
      m,
      ['StartEvent_1', 'Activity_approve'],
      M,
    );
    expect(p.view.kind).toBe('multi');
    expect(p.multiSummary).toBe('2 elements selected');
    expect(p.appearance?.ids).toEqual(['StartEvent_1', 'Activity_approve']);
  });

  it('offers the morph select and the marker controls on an activity', () => {
    const m = model(demoProcessXml('bpmn'));
    const p = buildBpmnPropertiesModel(m, ['Activity_approve'], M);
    expect(p.view.kind).toBe('node');
    expect(p.morph?.options.length).toBeGreaterThan(1);
    expect(p.marker).toMatchObject({ loopMarker: null, compensation: false });
    expect(p.eventDefinition).toBeNull();
  });

  it('offers event definitions on events and the boundary checkbox', () => {
    const m = model(V03_FIXTURE_XML);
    const boundary = Object.values(m.nodes).find(
      (n) => n.type === 'boundaryEvent',
    );
    expect(boundary).toBeDefined();
    const p = buildBpmnPropertiesModel(m, [boundary?.id ?? ''], M);
    expect(p.eventDefinition?.kinds.length).toBeGreaterThan(0);
    expect(p.boundary?.id).toBe(boundary?.id);
  });

  it('describes a pool with its lanes', () => {
    const m = model(V04_FIXTURE_XML);
    const poolId = Object.keys(m.pools)[0];
    const p = buildBpmnPropertiesModel(m, [poolId], M);
    expect(p.view.kind).toBe('pool');
  });
});

describe('panel command helpers', () => {
  it('keeps the compensation flag when the loop marker changes and vice versa', () => {
    const marker = bpmnMarkerCommand({ id: 'A', compensation: true }, 'loop');
    const compensation = bpmnCompensationCommand(
      { id: 'A', loopMarker: 'loop' },
      false,
    );
    expect(marker.label).toBe(compensation.label);
  });

  it('formats labels from the message templates', () => {
    expect(bpmnLaneNameLabel(M, { id: 'Lane_1' })).toBe('Lane Lane_1 name');
    expect(bpmnPresetLabel(M, '#fff000')).toBe('Fill #fff000');
  });

  it('accepts only 6-digit hex colors for the native color input', () => {
    expect(bpmnColorInputValue('#a1b2c3', '#ffffff')).toBe('#a1b2c3');
    expect(bpmnColorInputValue('red', '#ffffff')).toBe('#ffffff');
  });

  it('reverts on Escape and commits on Enter through a native change', () => {
    const input = document.createElement('input');
    input.value = 'edited';
    const changes: string[] = [];
    input.addEventListener('change', () => changes.push(input.value));
    expect(bpmnFieldKey('Escape', input, 'model')).toBe('revert');
    expect(input.value).toBe('model');
    input.value = 'again';
    expect(bpmnFieldKey('Enter', input, 'model')).toBe('commit');
    expect(changes).toEqual(['again']);
    const area = document.createElement('textarea');
    expect(bpmnFieldKey('Enter', area, '')).toBeNull();
  });
});
