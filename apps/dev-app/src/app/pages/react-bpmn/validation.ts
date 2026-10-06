import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  OgeBpmnEditor,
  type OgeBpmnEditorHandle,
  type OgeBpmnLintIssue,
} from '@oge-ui/react-bpmn';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { DEMO_LINT_RULES } from '../bpmn/g5b-demo-data';
import { LINT_SAMPLE_XML } from '../bpmn/validation-snippets';
import { BPMN_VALIDATION_DEMOS } from './validation-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_BPMN_VALIDATION_SECTIONS = [
  'Live validation',
  'Custom rules & overrides',
  'validate() & headless checks',
] as const;

const PRIMARY_BUTTON =
  'rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20';
const MUTED = 'text-sm text-gray-500 dark:text-gray-400';

/** Loads the flawed sample once the editor exists. */
function useSample(): RefObject<OgeBpmnEditorHandle | null> {
  const editor = useRef<OgeBpmnEditorHandle>(null);
  useEffect(() => {
    void editor.current?.importXml(LINT_SAMPLE_XML);
  }, []);
  return editor;
}

function LiveDemo(): ReactNode {
  const editor = useSample();
  const [summary, setSummary] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeBpmnEditor, {
      ref: editor,
      style: { height: 460 },
      lint: true,
      messages: { canvasLabel: 'Validated diagram' },
      onLintChanged: (event) =>
        setSummary(
          `${event.errors} error(s), ${event.warnings} warning(s), ${event.infos} info(s)`,
        ),
    }),
    createElement(
      'p',
      { className: `mt-3 ${MUTED}`, 'data-testid': 'bpmn-lint-summary' },
      summary,
    ),
  );
}

function CustomRulesDemo(): ReactNode {
  const editor = useSample();
  return createElement(OgeBpmnEditor, {
    ref: editor,
    style: { height: 460 },
    lint: true,
    lintRules: DEMO_LINT_RULES,
    messages: { canvasLabel: 'Custom rules diagram' },
  });
}

function ValidateDemo(): ReactNode {
  const editor = useSample();
  const [issues, setIssues] = useState<readonly OgeBpmnLintIssue[]>([]);
  return createElement(
    'div',
    null,
    createElement(OgeBpmnEditor, {
      ref: editor,
      style: { height: 420 },
      messages: { canvasLabel: 'On-demand validation diagram' },
    }),
    createElement(
      'div',
      { className: 'mt-3 flex flex-wrap items-center gap-3' },
      createElement(
        'button',
        {
          type: 'button',
          className: PRIMARY_BUTTON,
          'data-testid': 'bpmn-validate',
          onClick: () => setIssues(editor.current?.validate() ?? []),
        },
        'Validate',
      ),
      createElement('p', { className: MUTED }, `${issues.length} issue(s)`),
    ),
    createElement(
      'ul',
      { className: 'mt-2 text-sm', 'data-testid': 'bpmn-validate-list' },
      ...issues.map((issue) =>
        createElement(
          'li',
          { key: issue.key },
          createElement('code', { className: 'text-[12px]' }, issue.severity),
          ` ${issue.message} (${issue.elementId})`,
        ),
      ),
    ),
  );
}

/**
 * The React half of the BPMN "Validation" page — the same demo sections as
 * the Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-bpmn-validation-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/bpmn/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['lint', 'onLintChanged', 'badges', 'problems panel']"
      heading="Live validation"
      description="<code>lint</code> re-validates after every change. Offending shapes, pools and flows get a severity badge — the badge is <code>aria-hidden</code> and the problem text is appended to the element&#39;s accessible name instead — and the header grows a <em>Problems</em> toggle with the count. The problems panel lists every issue, errors first; click or Enter on a row selects the element and pans it into view. Fix the gateway conditions in the properties panel and watch the count drop."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="live" />
    </app-demo-card>

    <app-demo-card
      [chips]="['lintRules', 'OgeBpmnLintRule', 'severity: off']"
      heading="Custom rules &amp; overrides"
      description="<code>lintRules</code> merges with the built-ins: a full rule (<code>{ id, severity, check(model, context) }</code>) is added — or replaces the built-in with the same id — and <code>{ id, severity }</code> re-grades a built-in (<code>&#39;off&#39;</code> disables it). Here a custom <em>info</em> rule asks for documentation on user and service tasks, and the label rule is downgraded to <em>info</em>."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="custom" />
    </app-demo-card>

    <app-demo-card
      [chips]="['validate()', 'lintBpmnDiagram', 'CI']"
      heading="validate() &amp; headless checks"
      description="<code>validate()</code> on the ref handle runs the effective rules on demand and returns <code>OgeBpmnLintIssue[]</code> — no live linting needed. The engine function behind it, <code>lintBpmnDiagram(model, rules?)</code>, takes any model from <code>readBpmnXml()</code>, so the same checks gate a save endpoint or a CI job over stored diagrams."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="manual" />
    </app-demo-card>
  `,
})
export class ReactBpmnValidationDemos {
  protected readonly demos = BPMN_VALIDATION_DEMOS;
  protected readonly live = () => createElement(LiveDemo);
  protected readonly custom = () => createElement(CustomRulesDemo);
  protected readonly manual = () => createElement(ValidateDemo);
}
