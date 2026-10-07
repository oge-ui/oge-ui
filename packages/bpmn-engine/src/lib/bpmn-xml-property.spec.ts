import { readBpmnXml } from './bpmn-xml-reader';
import { writeBpmnXml } from './bpmn-xml-writer';

/**
 * Property-based round trip of the BPMN XML layer: for random processes
 * (every flow-node kind, event definitions, sub-process children, names
 * with markup characters and non-ASCII text, conditions, documentation,
 * annotations and DI with waypoints), import → export → import gives an
 * equal model, and export is a fixpoint — the second export is byte-equal
 * to the first.
 *
 * Generated with a small seeded PRNG (deterministic: a failure prints the
 * seed and the XML; `OGE_PROPERTY_SEED=<n>` replays a run).
 */
type Rand = () => number;

function rng(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rand: Rand, min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(rand: Rand, items: readonly T[]): T =>
  items[int(rand, 0, items.length - 1)];

const BASE_SEED = Number(process.env['OGE_PROPERTY_SEED'] ?? 20_260_316);

function forAll<T>(
  generate: (rand: Rand) => T,
  check: (value: T) => void,
  runs = 120,
): void {
  for (let run = 0; run < runs; run++) {
    const seed = BASE_SEED + run;
    const value = generate(rng(seed));
    try {
      check(value);
    } catch (error) {
      throw new Error(
        `property failed for seed ${seed} (OGE_PROPERTY_SEED=${seed}):\n` +
          `${String(value).slice(0, 4_000)}\n${String(error)}`,
      );
    }
  }
}

const esc = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const WORDS = [
  'Approve',
  'Check & route',
  'Ödeme <al>',
  'say "hi"',
  'İzmir',
  'نعم',
  "a'b",
  'total > 100',
  'Step',
];

const TASKS = [
  'task',
  'userTask',
  'serviceTask',
  'scriptTask',
  'callActivity',
] as const;
const EVENT_DEFINITIONS = [
  null,
  'messageEventDefinition',
  'timerEventDefinition',
  'signalEventDefinition',
  'conditionalEventDefinition',
] as const;

interface Shape {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function name(rand: Rand): string {
  return rand() < 0.25 ? '' : ` name="${esc(pick(rand, WORDS))}"`;
}

/** A random process document, written the way modelers write one. */
function generateXml(rand: Rand): string {
  const flow: string[] = [];
  const shapes: Shape[] = [];
  const nodes: string[] = [];
  const place = (id: string, w: number, h: number) => {
    shapes.push({ id, x: int(rand, 0, 1200), y: int(rand, 0, 800), w, h });
  };

  flow.push(`<bpmn:startEvent id="Start_1"${name(rand)} />`);
  place('Start_1', 36, 36);
  nodes.push('Start_1');

  const count = int(rand, 1, 10);
  for (let i = 0; i < count; i++) {
    const kind = rand();
    if (kind < 0.45) {
      const id = `Activity_${i}`;
      const type = pick(rand, TASKS);
      const doc =
        rand() < 0.3
          ? `<bpmn:documentation>${esc(pick(rand, WORDS))}</bpmn:documentation>`
          : '';
      flow.push(
        doc
          ? `<bpmn:${type} id="${id}"${name(rand)}>${doc}</bpmn:${type}>`
          : `<bpmn:${type} id="${id}"${name(rand)} />`,
      );
      place(id, 100, 80);
      nodes.push(id);
    } else if (kind < 0.65) {
      const id = `Gateway_${i}`;
      const type = pick(rand, ['exclusiveGateway', 'parallelGateway']);
      flow.push(`<bpmn:${type} id="${id}"${name(rand)} />`);
      place(id, 50, 50);
      nodes.push(id);
    } else if (kind < 0.85) {
      const id = `Event_${i}`;
      const type = pick(rand, [
        'intermediateCatchEvent',
        'intermediateThrowEvent',
      ]);
      const definition =
        type === 'intermediateCatchEvent'
          ? pick(rand, EVENT_DEFINITIONS)
          : pick(rand, [
              null,
              'messageEventDefinition',
              'signalEventDefinition',
            ]);
      flow.push(
        definition
          ? `<bpmn:${type} id="${id}"${name(rand)}><bpmn:${definition} id="${id}_def" /></bpmn:${type}>`
          : `<bpmn:${type} id="${id}"${name(rand)} />`,
      );
      place(id, 36, 36);
      nodes.push(id);
    } else {
      // a sub-process with a child task inside
      const id = `Sub_${i}`;
      const child = `Sub_${i}_task`;
      flow.push(
        `<bpmn:subProcess id="${id}"${name(rand)}><bpmn:task id="${child}"${name(rand)} /></bpmn:subProcess>`,
      );
      place(id, 350, 200);
      const sub = shapes[shapes.length - 1];
      shapes.push({ id: child, x: sub.x + 20, y: sub.y + 40, w: 100, h: 80 });
      nodes.push(id);
    }
  }
  flow.push(`<bpmn:endEvent id="End_1"${name(rand)} />`);
  place('End_1', 36, 36);
  nodes.push('End_1');

  // a chain through every node plus random extra flows between top-level nodes
  const edges: { id: string; from: string; to: string }[] = [];
  for (let i = 0; i + 1 < nodes.length; i++) {
    edges.push({ id: `Flow_${i}`, from: nodes[i], to: nodes[i + 1] });
  }
  for (let i = 0; i < int(rand, 0, 4); i++) {
    const from = pick(rand, nodes.slice(0, -1));
    const to = pick(rand, nodes.slice(1));
    if (from !== to) edges.push({ id: `Flow_x${i}`, from, to });
  }
  for (const edge of edges) {
    const condition =
      edge.from.startsWith('Gateway_') && rand() < 0.5
        ? `<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${esc(pick(rand, WORDS))}</bpmn:conditionExpression>`
        : '';
    flow.push(
      condition
        ? `<bpmn:sequenceFlow id="${edge.id}"${name(rand)} sourceRef="${edge.from}" targetRef="${edge.to}">${condition}</bpmn:sequenceFlow>`
        : `<bpmn:sequenceFlow id="${edge.id}"${name(rand)} sourceRef="${edge.from}" targetRef="${edge.to}" />`,
    );
  }
  if (rand() < 0.5) {
    flow.push(
      `<bpmn:textAnnotation id="Note_1"><bpmn:text>${esc(pick(rand, WORDS))}</bpmn:text></bpmn:textAnnotation>`,
      `<bpmn:association id="Assoc_1" sourceRef="Note_1" targetRef="${pick(rand, nodes)}" />`,
    );
    place('Note_1', 100, 30);
    edges.push({ id: 'Assoc_1', from: 'Note_1', to: '' });
  }

  const byId = new Map(shapes.map((s) => [s.id, s]));
  const di = [
    ...shapes.map(
      (s) =>
        `<bpmndi:BPMNShape id="${s.id}_di" bpmnElement="${s.id}"><dc:Bounds x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" /></bpmndi:BPMNShape>`,
    ),
    ...edges.map((edge) => {
      const from = byId.get(edge.from) as Shape;
      const points = [
        { x: from.x + from.w, y: from.y + from.h / 2 },
        ...Array.from({ length: int(rand, 0, 2) }, () => ({
          x: int(rand, 0, 1200),
          y: int(rand, 0, 800),
        })),
        { x: int(rand, 0, 1200), y: int(rand, 0, 800) },
      ];
      return `<bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">${points
        .map((p) => `<di:waypoint x="${p.x}" y="${p.y}" />`)
        .join('')}</bpmndi:BPMNEdge>`;
    }),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" targetNamespace="http://example.com/bpmn">
<bpmn:process id="Process_1" isExecutable="${rand() < 0.5}">
${flow.join('\n')}
</bpmn:process>
<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
${di.join('\n')}
</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

describe('bpmn-xml round-trip properties', () => {
  it('import → export → import yields an equal model', () => {
    forAll(generateXml, (xml) => {
      const first = readBpmnXml(xml);
      expect(first.error).toBeUndefined();
      expect(first.model).not.toBeNull();
      const second = readBpmnXml(writeBpmnXml(first.model!));
      expect(second.error).toBeUndefined();
      expect(second.model).toEqual(first.model);
    });
  });

  it('export is a fixpoint: exporting the re-import is byte-equal', () => {
    forAll(generateXml, (xml) => {
      const model = readBpmnXml(xml).model!;
      const exported = writeBpmnXml(model);
      expect(writeBpmnXml(readBpmnXml(exported).model!)).toBe(exported);
    });
  });

  it('every generated element survives the trip', () => {
    forAll(generateXml, (xml) => {
      const model = readBpmnXml(xml).model!;
      const ids = [...xml.matchAll(/<bpmn:\w+ id="([^"]+)"/g)]
        .map(([, id]) => id)
        .filter(
          (id) =>
            !id.endsWith('_def') &&
            id !== 'Process_1' &&
            id !== 'Definitions_1',
        );
      const again = readBpmnXml(writeBpmnXml(model)).model!;
      for (const id of ids) {
        expect(id in again.nodes || id in again.edges, id).toBe(true);
      }
    });
  });
});
