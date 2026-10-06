import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Camunda / Zeebe" page — section-for-section
 * mirror of `../bpmn/camunda-snippets.ts`. Pure data, loaded by the generator
 * and the compile gate in plain Node.
 */
export const BPMN_CAMUNDA_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Camunda / Zeebe properties',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-bpmn': ['OGE_BPMN_CAMUNDA_PROVIDERS', 'OgeBpmnEditor'],
      },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnEditorHandle'] },
      name: 'CamundaEditor',
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);
const [xml, setXml] = useState('');`,
      jsx: `<>
  {/* the opt-in Camunda preset: Zeebe (Camunda 8) task definition, io
      mappings and headers; Camunda 7 assignment and input/output */}
  <OgeBpmnEditor
    ref={editor}
    style={{ height: 480 }}
    propertiesProviders={OGE_BPMN_CAMUNDA_PROVIDERS}
  />
  <button type="button" onClick={() => setXml(editor.current?.exportXml() ?? '')}>
    Export XML
  </button>
  <pre>{xml}</pre>
</>`,
    }),
  },
  {
    title: 'Typed helpers',
    source: reactDemoSource({
      use: {
        '@oge-ui/bpmn-engine': [
          'bpmnZeebeIoMapping',
          'readBpmnXml',
          'setZeebeTaskDefinitionCommand',
          'writeBpmnXml',
        ],
      },
      name: 'Retarget',
      before: `/**
 * The same typed helpers the panel uses, server-side: read a mapping, set a
 * job type, write the XML back (xmlns:zeebe is declared when needed).
 */
export function retarget(xml: string): string {
  const model = readBpmnXml(xml).model;
  if (model === null) return xml;
  console.log(bpmnZeebeIoMapping(model, 'Task_charge').inputs);
  return writeBpmnXml(
    setZeebeTaskDefinitionCommand('Task_charge', { type: 'payment-v2' }).apply(model),
  );
}`,
      jsx: `<p>A headless helper — no canvas needed.</p>`,
    }),
  },
  {
    title: 'Event payloads, documentation & re-parenting',
    source: reactDemoSource({
      react: ['useRef'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnEditorHandle'] },
      name: 'PayloadsEditor',
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);

const downloadPng = async () => {
  // the SVG export rasterized on a canvas — no library
  const blob = await editor.current?.exportPng({ pixelRatio: 2 });
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diagram.png';
  link.click();
  URL.revokeObjectURL(url);
};`,
      jsx: `<>
  {/* select the timer start or the message catch: timer type and
      expression, message reference (or "New message") and documentation
      are panel fields. Drag a task into "Fulfilment" — or pick it in
      "Move to" — to re-parent it; one undo step either way. */}
  <OgeBpmnEditor ref={editor} style={{ height: 480 }} />
  <button type="button" onClick={() => void downloadPng()}>
    Export PNG
  </button>
</>`,
    }),
  },
];
