import { readBpmnXml } from './bpmn-xml-reader';
import type { BpmnImportWarningCode } from './bpmn-xml-reader';
import {
  CDATA_FIXTURE_XML,
  COLLABORATION_FIXTURE_XML,
  DEMO_EXPECTED_MODEL,
  demoProcessXml,
  FOREIGN_FIXTURE_XML,
  MULTI_PROCESS_FIXTURE_XML,
  NO_DI_FIXTURE_XML,
} from './xml-fixtures';

function codes(result: {
  warnings: readonly { code: BpmnImportWarningCode }[];
}): string[] {
  return result.warnings.map((warning) => warning.code);
}

describe('bpmn-xml-reader', () => {
  describe('prefix variants', () => {
    it('reads the bpmn:-prefixed document', () => {
      const result = readBpmnXml(demoProcessXml('bpmn'));
      expect(result.error).toBeUndefined();
      expect(result.warnings).toEqual([]);
      expect(result.model).toEqual(DEMO_EXPECTED_MODEL);
    });

    it('reads the bpmn2:-prefixed document into the same model', () => {
      const result = readBpmnXml(demoProcessXml('bpmn2'));
      expect(result.warnings).toEqual([]);
      expect(result.model).toEqual(DEMO_EXPECTED_MODEL);
    });

    it('reads the default-namespace unprefixed document into the same model', () => {
      const result = readBpmnXml(demoProcessXml(''));
      expect(result.warnings).toEqual([]);
      expect(result.model).toEqual(DEMO_EXPECTED_MODEL);
    });
  });

  describe('errors', () => {
    it('reports malformed XML as an error with a null model', () => {
      const result = readBpmnXml('this is <not> xml <<');
      expect(result.model).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('rejects a non-definitions root element', () => {
      const result = readBpmnXml('<other xmlns="urn:x" />');
      expect(result.model).toBeNull();
      expect(result.error).toContain('definitions');
    });

    it('rejects a definitions element without a process', () => {
      const result = readBpmnXml(
        '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" />',
      );
      expect(result.model).toBeNull();
      expect(result.error).toContain('process');
    });
  });

  describe('fidelity preservation', () => {
    it('preserves documentation and extensionElements as foreign children', () => {
      const result = readBpmnXml(FOREIGN_FIXTURE_XML);
      const task = result.model?.nodes['Task_f'];
      expect(task?.foreignChildren).toHaveLength(2);
      expect(task?.foreignChildren?.[0]).toContain('documentation');
      expect(task?.foreignChildren?.[0]).toContain('Sends the invoice.');
      expect(task?.foreignChildren?.[1]).toContain('extensionElements');
      expect(task?.foreignChildren?.[1]).toContain('camunda:property');
    });

    it('preserves unknown vendor attributes verbatim (v0.5)', () => {
      const result = readBpmnXml(FOREIGN_FIXTURE_XML);
      expect(result.model?.nodes['Task_f']?.foreignAttributes).toEqual({
        'camunda:asyncBefore': 'true',
      });
      // The vendor namespace declaration rides along on <definitions>.
      expect(result.model?.definitionsAttrs['xmlns:camunda']).toBe(
        'http://camunda.org/schema/1.0/bpmn',
      );
    });

    it('imports a single valid event definition without a warning (v0.3)', () => {
      const result = readBpmnXml(FOREIGN_FIXTURE_XML);
      expect(codes(result)).not.toContain('event-definition-stripped');
      expect(result.model?.nodes['Start_f']).toEqual({
        id: 'Start_f',
        type: 'startEvent',
        eventDefinition: 'message',
      });
    });

    it('imports the sub-process without warnings and keeps its flows (v0.3)', () => {
      const result = readBpmnXml(FOREIGN_FIXTURE_XML);
      expect(codes(result)).not.toContain('unsupported-element');
      expect(codes(result)).not.toContain('dangling-ref');
      const sub = result.model?.nodes['Sub_f'];
      expect(sub?.type).toBe('subProcess');
      // No DI in the fixture → BPMN DI default: collapsed.
      expect(sub?.type === 'subProcess' ? sub.collapsed : null).toBe(true);
      expect(result.model?.edges['Flow_f2']).toBeDefined();
      expect(result.model?.edges['Flow_f1']).toBeDefined();
      expect(result.model?.order).toContain('Flow_f2');
    });

    it('auto-lays-out elements without DI and warns per element', () => {
      const result = readBpmnXml(FOREIGN_FIXTURE_XML);
      const missing = result.warnings.filter(
        (entry) => entry.code === 'missing-di',
      );
      expect(missing.map((entry) => entry.elementId)).toEqual([
        'Task_f',
        'Sub_f',
        'Flow_f1',
        'Flow_f2',
      ]);
      // Start_f keeps its authored DI, the rest is generated.
      expect(result.model?.shapeDi['Start_f'].bounds).toEqual({
        x: 100,
        y: 100,
        width: 36,
        height: 36,
      });
      expect(result.model?.shapeDi['Task_f']).toBeDefined();
      expect(
        result.model?.edgeDi['Flow_f1']?.waypoints.length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('imports a fully DI-less document via auto-layout', () => {
      const result = readBpmnXml(NO_DI_FIXTURE_XML);
      expect(codes(result)).toContain('missing-di');
      expect(Object.keys(result.model?.shapeDi ?? {})).toHaveLength(3);
      expect(Object.keys(result.model?.edgeDi ?? {})).toHaveLength(2);
    });
  });

  describe('structure handling', () => {
    it('imports a collaboration as pools with the first process as default (v0.4)', () => {
      const result = readBpmnXml(COLLABORATION_FIXTURE_XML);
      expect(result.model?.processId).toBe('Process_c');
      expect(result.model?.collaborationId).toBe('Collab_1');
      expect(result.model?.pools['Participant_1']).toEqual({
        id: 'Participant_1',
        processRef: 'Process_c',
        lanes: [],
      });
      // Members of the participant's process carry its pool id.
      expect(result.model?.nodes['Start_c']?.poolId).toBe('Participant_1');
      expect(result.model?.foreignDefinitionsChildren).toHaveLength(0);
      // The participant has no BPMNShape: bounds are generated with a warning.
      expect(
        result.warnings.some(
          (entry) =>
            entry.code === 'missing-di' && entry.elementId === 'Participant_1',
        ),
      ).toBe(true);
      expect(result.model?.shapeDi['Participant_1']).toBeDefined();
      // DI of the participant's flow nodes is matched even on a collaboration plane.
      expect(result.model?.shapeDi['Task_c'].bounds).toEqual({
        x: 200,
        y: 78,
        width: 100,
        height: 80,
      });
    });

    it('imports only the first of multiple processes with a warning', () => {
      const result = readBpmnXml(MULTI_PROCESS_FIXTURE_XML);
      expect(result.model?.processId).toBe('Process_first');
      expect(result.model?.nodes['Start_m']).toBeDefined();
      expect(result.model?.nodes['Task_m']).toBeUndefined();
      const warning = result.warnings.find(
        (entry) => entry.code === 'multiple-processes',
      );
      expect(warning?.elementId).toBe('Process_second');
    });

    it('reads a CDATA condition expression verbatim', () => {
      const result = readBpmnXml(CDATA_FIXTURE_XML);
      const flow = result.model?.edges['Flow_d1'];
      expect(flow?.type).toBe('sequenceFlow');
      expect(
        flow?.type === 'sequenceFlow' ? flow.conditionExpression : null,
      ).toBe('a > 5 && b < 3');
    });

    it('round-trips the default flow attribute of a gateway', () => {
      const result = readBpmnXml(demoProcessXml('bpmn'));
      const gateway = result.model?.nodes['Gateway_check'];
      expect(
        gateway?.type === 'exclusiveGateway' ? gateway.defaultFlowId : null,
      ).toBe('Flow_no');
    });

    it('applies default definitions attributes when the source omits them', () => {
      const result = readBpmnXml(
        '<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"><process id="P" /></definitions>',
      );
      expect(result.model?.definitionsAttrs).toEqual({
        id: 'Definitions_1',
        targetNamespace: 'http://ogeui.com/schema/bpmn',
      });
    });
  });
});
