import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';
import {
  FOREIGN_FIXTURE_XML,
  PRESERVE_FIXTURE_XML,
  V04_FIXTURE_XML,
} from './xml-fixtures';

describe('bpmn-xml v0.5 — unknown-attribute preservation', () => {
  it('round-trips the preservation fixture byte-identically', () => {
    const result = readBpmnXml(PRESERVE_FIXTURE_XML);
    expect(result.error).toBeUndefined();
    expect(result.warnings).toEqual([]);
    expect(result.model).not.toBeNull();
    expect(writeBpmnXml(result.model as NonNullable<typeof result.model>)).toBe(
      PRESERVE_FIXTURE_XML,
    );
  });

  it('stores unknown attributes verbatim by qualified name', () => {
    const model = readBpmnXml(PRESERVE_FIXTURE_XML).model;
    expect(model?.nodes['Task_p']?.foreignAttributes).toEqual({
      'camunda:asyncBefore': 'true',
    });
    expect(model?.edges['Flow_p1']?.foreignAttributes).toEqual({
      'camunda:jobPriority': '5',
    });
    expect(model?.processForeignAttributes).toEqual({
      'camunda:historyTimeToLive': '30',
    });
    expect(model?.definitionsAttrs['camunda:diagramRelationId']).toBe('rel-1');
    expect(model?.definitionsAttrs['xmlns:camunda']).toBe(
      'http://camunda.org/schema/1.0/bpmn',
    );
  });

  it('does not copy the writer-owned namespace declarations into definitionsAttrs', () => {
    const model = readBpmnXml(PRESERVE_FIXTURE_XML).model;
    for (const name of Object.keys(model?.definitionsAttrs ?? {})) {
      expect([
        'xmlns:bpmn',
        'xmlns:bpmndi',
        'xmlns:dc',
        'xmlns:di',
        'xmlns:xsi',
        'xmlns:bioc',
        'xmlns',
      ]).not.toContain(name);
    }
  });

  it('no longer reports unsupported-attribute warnings anywhere', () => {
    for (const xml of [
      FOREIGN_FIXTURE_XML,
      PRESERVE_FIXTURE_XML,
      V04_FIXTURE_XML,
    ]) {
      const result = readBpmnXml(xml);
      expect(
        result.warnings.filter(
          (warning) => (warning.code as string) === 'unsupported-attribute',
        ),
      ).toEqual([]);
    }
  });

  it('re-emits preserved attributes of the camunda-flavored fixture', () => {
    const model = readBpmnXml(FOREIGN_FIXTURE_XML).model;
    const xml = writeBpmnXml(model as NonNullable<typeof model>);
    expect(xml).toContain('camunda:asyncBefore="true"');
    expect(xml).toContain('xmlns:camunda="http://camunda.org/schema/1.0/bpmn"');
    // The re-read produces the same model — preservation is stable.
    const again = readBpmnXml(xml).model;
    expect(again?.nodes['Task_f']?.foreignAttributes).toEqual({
      'camunda:asyncBefore': 'true',
    });
  });

  it('preserves unknown attributes on participants and lanes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:acme="urn:acme" id="D" targetNamespace="urn:t">
  <bpmn:collaboration id="Collab" acme:tag="c">
    <bpmn:participant id="P1" processRef="Proc" acme:owner="ops" />
  </bpmn:collaboration>
  <bpmn:process id="Proc" isExecutable="false">
    <bpmn:laneSet id="LS">
      <bpmn:lane id="L1" acme:tier="gold">
        <bpmn:flowNodeRef>T1</bpmn:flowNodeRef>
      </bpmn:lane>
    </bpmn:laneSet>
    <bpmn:task id="T1" />
  </bpmn:process>
</bpmn:definitions>`;
    const model = readBpmnXml(xml).model;
    expect(model?.pools['P1']?.foreignAttributes).toEqual({
      'acme:owner': 'ops',
    });
    expect(model?.pools['P1']?.lanes[0]?.foreignAttributes).toEqual({
      'acme:tier': 'gold',
    });
    expect(model?.collaborationForeignAttributes).toEqual({ 'acme:tag': 'c' });
    const out = writeBpmnXml(model as NonNullable<typeof model>);
    expect(out).toContain('acme:owner="ops"');
    expect(out).toContain('acme:tier="gold"');
    expect(out).toContain('acme:tag="c"');
    expect(out).toContain('xmlns:acme="urn:acme"');
  });
});
