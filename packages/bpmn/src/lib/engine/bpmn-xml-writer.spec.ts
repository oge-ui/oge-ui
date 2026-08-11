import type { BpmnDiagram } from './bpmn-model';
import { createEmptyDiagram } from './bpmn-model';
import {
  escapeXmlAttribute,
  escapeXmlText,
  writeBpmnXml,
} from './bpmn-xml-writer';
import { DEMO_EXPECTED_MODEL } from './xml-fixtures';

describe('bpmn-xml-writer', () => {
  describe('escapeXmlAttribute', () => {
    it('escapes ampersand, angle brackets and quotes', () => {
      expect(escapeXmlAttribute('a & b < c > d "e"')).toBe(
        'a &amp; b &lt; c &gt; d &quot;e&quot;',
      );
    });

    it('passes Turkish characters through unchanged', () => {
      expect(escapeXmlAttribute('Sipariş Onayı — Ğüşiöç')).toBe(
        'Sipariş Onayı — Ğüşiöç',
      );
    });
  });

  describe('escapeXmlText', () => {
    it('escapes ampersand and angle brackets but not quotes', () => {
      expect(escapeXmlText('a & b < c > "d"')).toBe(
        'a &amp; b &lt; c &gt; "d"',
      );
    });
  });

  describe('writeBpmnXml', () => {
    it('is byte-deterministic across writes', () => {
      expect(writeBpmnXml(DEMO_EXPECTED_MODEL)).toBe(
        writeBpmnXml(DEMO_EXPECTED_MODEL),
      );
    });

    it('starts with the XML declaration and declares the fixed namespaces', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(
        true,
      );
      expect(xml).toContain(
        'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
      );
      expect(xml).toContain(
        'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"',
      );
      expect(xml).toContain(
        'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"',
      );
      expect(xml).toContain(
        'xmlns:di="http://www.omg.org/spec/DD/20100524/DI"',
      );
      expect(xml).toContain(
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      );
    });

    it('writes the carried definitions attributes and the process header', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain('id="Definitions_demo"');
      expect(xml).toContain('targetNamespace="http://example.com/bpmn"');
      expect(xml).toContain('exporter="OgeTest"');
      expect(xml).toContain(
        '<bpmn:process id="Process_demo" isExecutable="true">',
      );
    });

    it('defaults the definitions id and targetNamespace for a fresh diagram', () => {
      const xml = writeBpmnXml(createEmptyDiagram());
      expect(xml).toContain('id="Definitions_1"');
      expect(xml).toContain('targetNamespace="http://ogeui.com/schema/bpmn"');
      expect(xml).toContain(
        '<bpmn:process id="Process_1" isExecutable="false">',
      );
    });

    it('writes incoming/outgoing references derived from the sequence flows', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain('<bpmn:incoming>Flow_s1</bpmn:incoming>');
      expect(xml).toContain('<bpmn:outgoing>Flow_yes</bpmn:outgoing>');
      expect(xml).toContain('<bpmn:outgoing>Flow_no</bpmn:outgoing>');
      // Associations never contribute incoming/outgoing references.
      expect(xml).not.toContain('<bpmn:incoming>Assoc_1</bpmn:incoming>');
    });

    it('writes the gateway default attribute and the typed condition expression', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain(
        '<bpmn:exclusiveGateway id="Gateway_check" default="Flow_no">',
      );
      expect(xml).toContain(
        '<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100</bpmn:conditionExpression>',
      );
    });

    it('writes text annotations with escaped text content', () => {
      const model: BpmnDiagram = {
        ...createEmptyDiagram(),
        nodes: {
          Note: { id: 'Note', type: 'textAnnotation', text: '5 < 6 & "yes"' },
        },
        order: ['Note'],
        shapeDi: { Note: { bounds: { x: 0, y: 0, width: 100, height: 30 } } },
      };
      const xml = writeBpmnXml(model);
      expect(xml).toContain('<bpmn:text>5 &lt; 6 &amp; "yes"</bpmn:text>');
    });

    it('keeps the fixed attribute order on elements', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain(
        '<bpmn:sequenceFlow id="Flow_yes" name="yes" sourceRef="Gateway_check" targetRef="EndEvent_1">',
      );
    });

    it('emits DI shapes with integer bounds and edges with waypoints in model order', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain(
        '<bpmndi:BPMNShape id="Activity_approve_di" bpmnElement="Activity_approve">',
      );
      expect(xml).toContain(
        '<dc:Bounds x="240" y="130" width="100" height="80" />',
      );
      expect(xml).toContain(
        '<bpmndi:BPMNEdge id="Flow_no_di" bpmnElement="Flow_no">',
      );
      expect(xml).toContain('<di:waypoint x="425" y="195" />');
      expect(xml).toContain('<bpmndi:BPMNLabel>');
      const shapeIndex = xml.indexOf('<bpmndi:BPMNShape id="StartEvent_1_di"');
      const edgeIndex = xml.indexOf('<bpmndi:BPMNEdge id="Flow_s1_di"');
      expect(shapeIndex).toBeGreaterThan(-1);
      expect(edgeIndex).toBeGreaterThan(shapeIndex);
    });

    it('rounds fractional DI coordinates to integers', () => {
      const model: BpmnDiagram = {
        ...createEmptyDiagram(),
        nodes: { A: { id: 'A', type: 'task' } },
        order: ['A'],
        shapeDi: {
          A: { bounds: { x: 10.4, y: 19.6, width: 100.2, height: 79.5 } },
        },
      };
      const xml = writeBpmnXml(model);
      expect(xml).toContain(
        '<dc:Bounds x="10" y="20" width="100" height="80" />',
      );
    });

    it('writes foreign definitions children between the process and the diagram', () => {
      const model: BpmnDiagram = {
        ...createEmptyDiagram(),
        foreignDefinitionsChildren: [
          '<custom:thing xmlns:custom="urn:custom" />',
        ],
      };
      const xml = writeBpmnXml(model);
      const processEnd = xml.indexOf('</bpmn:process>');
      const foreign = xml.indexOf('<custom:thing');
      const diagram = xml.indexOf('<bpmndi:BPMNDiagram');
      expect(foreign).toBeGreaterThan(processEnd);
      expect(diagram).toBeGreaterThan(foreign);
    });

    it('writes node foreign children before the semantic content', () => {
      const model: BpmnDiagram = {
        ...createEmptyDiagram(),
        nodes: {
          A: {
            id: 'A',
            type: 'task',
            foreignChildren: ['<x:doc xmlns:x="urn:x" />'],
          },
          B: { id: 'B', type: 'task' },
        },
        edges: {
          F: { id: 'F', type: 'sequenceFlow', sourceRef: 'A', targetRef: 'B' },
        },
        order: ['A', 'B', 'F'],
        shapeDi: {
          A: { bounds: { x: 0, y: 0, width: 100, height: 80 } },
          B: { bounds: { x: 200, y: 0, width: 100, height: 80 } },
        },
        edgeDi: {
          F: {
            waypoints: [
              { x: 100, y: 40 },
              { x: 200, y: 40 },
            ],
          },
        },
      };
      const xml = writeBpmnXml(model);
      const foreign = xml.indexOf('<x:doc');
      const outgoing = xml.indexOf('<bpmn:outgoing>F</bpmn:outgoing>');
      expect(foreign).toBeGreaterThan(-1);
      expect(outgoing).toBeGreaterThan(foreign);
    });

    it('self-closes elements without children', () => {
      const xml = writeBpmnXml(DEMO_EXPECTED_MODEL);
      expect(xml).toContain(
        '<bpmn:association id="Assoc_1" sourceRef="Note_1" targetRef="Activity_approve" />',
      );
    });
  });
});
