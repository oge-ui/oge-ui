import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  OgeBpmnEditor,
  type OgeBpmnLintChangedEvent,
  type OgeBpmnLintIssue,
} from '@oge-ui/bpmn';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_BPMN_VALIDATION_SECTIONS,
  ReactBpmnValidationDemos,
} from '../react-bpmn/validation';
import { DEMO_LINT_RULES } from './g5b-demo-data';
import {
  CUSTOM_RULES_SNIPPET,
  LINT_SAMPLE_XML,
  LIVE_LINT_SNIPPET,
  VALIDATE_SNIPPET,
} from './validation-snippets';

const SECTIONS = [
  'Live validation',
  'Custom rules & overrides',
  'validate() & headless checks',
] as const;

@Component({
  selector: 'app-bpmn-validation',
  imports: [
    OgeBpmnEditor,
    DemoCard,
    DocHeader,
    PageToc,
    ReactBpmnValidationDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Validation"
      category="BPMN"
      categoryLink="/components/bpmn"
      [chips]="['lint', 'lintRules', 'problems panel', 'validate()']"
    >
      <p>
        A bpmnlint-style rule engine runs inside
        <code>&#64;oge-ui/bpmn-engine</code>: missing start or end events,
        disconnected and unreachable nodes, gateways that neither fork nor join,
        exclusive-gateway flows without a condition, implicit splits and joins,
        missing labels, duplicate ids, sub-processes without a start event,
        message flows inside one pool and detached boundary events. Turn on live
        linting for badges and a problems panel, add your own rules, or call
        @if (fw.isReact()) {
          <code>validate()</code> on the ref handle
        } @else {
          <code>validate()</code>
        }
        — the same pure functions run on a server or in CI.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-bpmn-validation-demos />
    } @else {
      <app-demo-card
        [chips]="['[lint]', '(lintChanged)', 'badges', 'problems panel']"
        heading="Live validation"
        description='<code>[lint]="true"</code> re-validates after every change. Offending shapes, pools and flows get a severity badge — the badge is <code>aria-hidden</code> and the problem text is appended to the element&#39;s accessible name instead — and the header grows a <em>Problems</em> toggle with the count. The problems panel lists every issue, errors first; click or Enter on a row selects the element and pans it into view. Fix the gateway conditions in the properties panel and watch the count drop.'
        [code]="liveSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #live
          style="height: 460px"
          [lint]="true"
          [messages]="{ canvasLabel: 'Validated diagram' }"
          (lintChanged)="onLint($event)"
        />
        <p
          class="mt-3 text-sm text-gray-500 dark:text-gray-400"
          data-testid="bpmn-lint-summary"
        >
          {{ summary() }}
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['[lintRules]', 'OgeBpmnLintRule', 'severity: off']"
        heading="Custom rules &amp; overrides"
        description="<code>[lintRules]</code> merges with the built-ins: a full rule (<code>{ id, severity, check(model, context) }</code>) is added — or replaces the built-in with the same id — and <code>{ id, severity }</code> re-grades a built-in (<code>&#39;off&#39;</code> disables it). Here a custom <em>info</em> rule asks for documentation on user and service tasks, and the label rule is downgraded to <em>info</em>."
        [code]="customSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #custom
          style="height: 460px"
          [lint]="true"
          [lintRules]="rules"
          [messages]="{ canvasLabel: 'Custom rules diagram' }"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['validate()', 'lintBpmnDiagram', 'CI']"
        heading="validate() &amp; headless checks"
        description="<code>validate()</code> runs the effective rules on demand and returns <code>OgeBpmnLintIssue[]</code> — no live linting needed. The engine function behind it, <code>lintBpmnDiagram(model, rules?)</code>, takes any model from <code>readBpmnXml()</code>, so the same checks gate a save endpoint or a CI job over stored diagrams."
        [code]="validateSnippet"
        language="ts"
      >
        <oge-bpmn-editor
          #manual
          style="height: 420px"
          [messages]="{ canvasLabel: 'On-demand validation diagram' }"
        />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="bpmn-validate"
            class="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-[13px] font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
            (click)="check()"
          >
            Validate
          </button>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ issues().length }} issue(s)
          </p>
        </div>
        <ul class="mt-2 text-sm" data-testid="bpmn-validate-list">
          @for (issue of issues(); track issue.key) {
            <li>
              <code class="text-[12px]">{{ issue.severity }}</code>
              {{ issue.message }} ({{ issue.elementId }})
            </li>
          }
        </ul>
      </app-demo-card>
    }
  `,
})
export class BpmnValidationPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_BPMN_VALIDATION_SECTIONS;
  protected readonly liveSnippet = LIVE_LINT_SNIPPET;
  protected readonly customSnippet = CUSTOM_RULES_SNIPPET;
  protected readonly validateSnippet = VALIDATE_SNIPPET;
  protected readonly rules = DEMO_LINT_RULES;

  private readonly live = viewChild<OgeBpmnEditor>('live');
  private readonly custom = viewChild<OgeBpmnEditor>('custom');
  private readonly manual = viewChild<OgeBpmnEditor>('manual');

  protected readonly summary = signal('');
  protected readonly issues = signal<readonly OgeBpmnLintIssue[]>([]);

  constructor() {
    afterNextRender(() => {
      void this.live()?.importXml(LINT_SAMPLE_XML);
      void this.custom()?.importXml(LINT_SAMPLE_XML);
      void this.manual()?.importXml(LINT_SAMPLE_XML);
    });
  }

  protected onLint(event: OgeBpmnLintChangedEvent): void {
    this.summary.set(
      `${event.errors} error(s), ${event.warnings} warning(s), ${event.infos} info(s)`,
    );
  }

  protected check(): void {
    this.issues.set(this.manual()?.validate() ?? []);
  }
}
