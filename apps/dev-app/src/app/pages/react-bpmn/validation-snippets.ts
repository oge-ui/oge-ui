import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React "Validation" page — section-for-section mirror
 * of `../bpmn/validation-snippets.ts`. Pure data, loaded by the generator
 * and the compile gate in plain Node.
 */
export const BPMN_VALIDATION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Live validation',
    source: reactDemoSource({
      react: ['useEffect', 'useRef', 'useState'],
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnEditorHandle',
          'OgeBpmnLintChangedEvent',
        ],
      },
      name: 'LintedEditor',
      before: `declare const PROCESS_XML: string; // e.g. fetched from your API`,
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);
const [summary, setSummary] = useState('');

useEffect(() => {
  void editor.current?.importXml(PROCESS_XML);
}, []);

const onLint = (event: OgeBpmnLintChangedEvent) =>
  setSummary(\`\${event.errors} errors, \${event.warnings} warnings\`);`,
      jsx: `<>
  {/* lint validates on every change: badges on offending shapes (the
      problem text joins their accessible name), a Problems toggle in the
      header and a problems panel — Enter on a row selects the element. */}
  <OgeBpmnEditor
    ref={editor}
    style={{ height: 460 }}
    lint
    onLintChanged={onLint}
  />
  <p>{summary}</p>
</>`,
    }),
  },
  {
    title: 'Custom rules & overrides',
    source: reactDemoSource({
      use: { '@oge-ui/react-bpmn': ['OgeBpmnEditor'] },
      types: { '@oge-ui/react-bpmn': ['OgeBpmnLintRulesInput'] },
      name: 'CustomRules',
      before: `// a full rule is added (or replaces the built-in with the same id);
// { id, severity } re-grades a built-in, severity: 'off' disables it
const rules: OgeBpmnLintRulesInput = [
  {
    id: 'task-needs-documentation',
    severity: 'info',
    check: (model) =>
      Object.values(model.nodes)
        .filter(
          (node) =>
            (node.type === 'userTask' || node.type === 'serviceTask') &&
            (node.documentation ?? '').trim() === '',
        )
        .map((node) => ({
          elementId: node.id,
          message: 'Document what this task does',
        })),
  },
  { id: 'label-required', severity: 'info' },
];`,
      jsx: `<OgeBpmnEditor style={{ height: 460 }} lint lintRules={rules} />`,
    }),
  },
  {
    title: 'validate() & headless checks',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-bpmn': [
          'OgeBpmnEditor',
          'lintBpmnDiagram',
          'readBpmnXml',
        ],
      },
      types: {
        '@oge-ui/react-bpmn': ['OgeBpmnEditorHandle', 'OgeBpmnLintIssue'],
      },
      name: 'OnDemandValidation',
      before: `/** The same rules without an editor — a CI gate over stored diagrams. */
export function countErrors(xml: string): number {
  const model = readBpmnXml(xml).model;
  return model === null
    ? 0
    : lintBpmnDiagram(model).filter((i) => i.severity === 'error').length;
}`,
      body: `const editor = useRef<OgeBpmnEditorHandle>(null);
const [issues, setIssues] = useState<readonly OgeBpmnLintIssue[]>([]);`,
      jsx: `<>
  {/* validate() runs the rules on demand — no live linting needed */}
  <OgeBpmnEditor ref={editor} style={{ height: 420 }} />
  <button
    type="button"
    onClick={() => setIssues(editor.current?.validate() ?? [])}
  >
    Validate
  </button>
  {issues.map((issue) => (
    <p key={issue.key}>
      {issue.severity}: {issue.message} ({issue.elementId})
    </p>
  ))}
</>`,
    }),
  },
];
