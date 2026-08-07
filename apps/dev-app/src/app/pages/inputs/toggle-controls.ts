import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { OgeCheckBox, OgeRadioGroup, OgeSwitch } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';

const CHECKBOX_SNIPPET = `<oge-check-box [(value)]="agreed">I agree to the terms</oge-check-box>

<!-- tri-state: null renders the indeterminate dash;
     threeState lets USERS cycle null → true → false → null -->
<oge-check-box
  [threeState]="true"
  text="Select all"
  [(value)]="all"
/>`;

const SWITCH_SNIPPET = `<!-- label feeds aria-label — always name your switch -->
<oge-switch label="Notifications" [(value)]="notify" />

<!-- track texts come from the localized messages (ON/OFF);
     override per instance, empty string hides them -->
<oge-switch label="Localized" onText="AÇIK" offText="KAPALI" [(value)]="enabled" />
<oge-switch label="Plain" onText="" offText="" [(value)]="plain" />`;

const RADIO_SNIPPET = `<oge-radio-group
  label="Plan"
  [items]="plans"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="soldOut"
  [(value)]="planId"
/>

<oge-radio-group
  label="Priority"
  layout="horizontal"
  [items]="['Low', 'Normal', 'High']"
  [(value)]="priority"
/>`;

const FORMS_SNIPPET = `// Signal Forms — auto-binds errors/touched/disabled
<oge-check-box [formField]="form.terms">Accept terms</oge-check-box>
<oge-switch label="Marketing" [formField]="form.marketing" />
<oge-radio-group [items]="plans" valueExpr="id" [formField]="form.plan" />

// reactive forms work unchanged
<oge-check-box [formControl]="termsCtrl" text="Accept terms" />`;

const SECTIONS = [
  'Check Box',
  'Switch',
  'Radio Group',
  'Forms integration',
  'Keyboard & accessibility',
] as const;

interface DemoPlan {
  id: string;
  name: string;
  soldOut?: boolean;
}

@Component({
  selector: 'app-inputs-toggle-controls',
  imports: [
    OgeCheckBox,
    OgeSwitch,
    OgeRadioGroup,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Toggle Controls"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['check box', 'switch', 'radio group', 'signal forms']"
    >
      <p>
        Bare (chrome-free) boolean and choice controls:
        <code>&lt;oge-check-box&gt;</code> (two- or three-state),
        <code>&lt;oge-switch&gt;</code> (on/off with localized track text) and
        <code>&lt;oge-radio-group&gt;</code> (WAI-ARIA radiogroup with roving
        tabindex). All three share the select box expression vocabulary where
        items are involved and bind via <code>[(value)]</code>, Signal Forms or
        reactive forms.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      heading="Check Box"
      description="A real (visually hidden) native checkbox drives semantics — label clicks, <kbd>Space</kbd> and <code>aria-checked='mixed'</code> come for free. <code>value</code> is <code>boolean | null</code>: <code>null</code> always renders the indeterminate dash, and <code>threeState</code> lets users cycle into it."
      [chips]="['boolean | null', 'threeState', 'indeterminate']"
      [code]="checkboxSnippet"
    >
      <div class="flex flex-wrap items-center gap-8">
        <oge-check-box [(value)]="agreed">I agree to the terms</oge-check-box>
        <oge-check-box [threeState]="true" text="Select all" [(value)]="all" />
        <div class="text-sm text-gray-500 dark:text-gray-400">
          select all: <code>{{ allLabel() }}</code>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Switch"
      description="A native <code>&lt;button role='switch'&gt;</code> with <code>aria-checked</code> and a sliding thumb. Track texts default to the localized <code>switchOn</code>/<code>switchOff</code> messages ('ON'/'OFF'); override per instance or pass empty strings to hide them. The DevExtreme swipe gesture is deliberately not replicated."
      [chips]="['role=switch', 'onText / offText', 'messages']"
      [code]="switchSnippet"
    >
      <div class="flex flex-wrap items-center gap-8">
        <oge-switch label="Notifications" [(value)]="notify" />
        <oge-switch
          label="Localized"
          onText="AÇIK"
          offText="KAPALI"
          [(value)]="enabled"
        />
        <oge-switch label="Plain" onText="" offText="" [(value)]="plain" />
        <oge-switch label="Small" size="sm" [(value)]="small" />
        <oge-switch label="Disabled" [disabled]="true" [value]="true" />
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Radio Group"
      description="Flat items with <code>displayExpr</code>/<code>valueExpr</code>/<code>disabledExpr</code>; <code>layout</code> switches column/row. Arrows move focus <em>and</em> selection (wrapping, disabled skipped, RTL-aware) per the WAI-ARIA radio-group pattern."
      [chips]="['displayExpr / valueExpr', 'layout', 'roving tabindex']"
      [code]="radioSnippet"
    >
      <div class="flex flex-wrap items-start gap-10">
        <oge-radio-group
          label="Plan"
          [items]="plans"
          displayExpr="name"
          valueExpr="id"
          disabledExpr="soldOut"
          [(value)]="planId"
        />
        <oge-radio-group
          label="Priority"
          layout="horizontal"
          [items]="priorities"
          [(value)]="priority"
        />
        <div class="pt-1 text-sm text-gray-500 dark:text-gray-400">
          plan: <code>{{ planId() ?? 'null' }}</code>
        </div>
      </div>
    </app-demo-card>

    <app-demo-card
      heading="Forms integration"
      description="All three implement Signal Forms' <code>FormValueControl</code> and the classic CVA (constructor-assignment pattern) — <code>[formField]</code>, <code>formControl</code> and <code>ngModel</code> all work. <code>valueCommitted</code> carries <code>previousValue</code> and the originating event."
      [chips]="['FormValueControl', 'CVA', 'valueCommitted']"
      [code]="formsSnippet"
    >
      <div class="text-sm text-gray-500 dark:text-gray-400">
        See the
        <a
          href="/components/inputs/validation"
          class="text-indigo-600 dark:text-indigo-400"
          >validation page</a
        >
        for live Signal Forms demos of the shared state inputs.
      </div>
    </app-demo-card>

    <h3 id="keyboard-accessibility" class="scroll-mt-20">
      Keyboard &amp; accessibility
    </h3>
    <ul>
      <li>
        Check box: native semantics — <kbd>Space</kbd> toggles, label clicks
        work, <code>aria-checked="mixed"</code> via the native
        <code>indeterminate</code> property.
      </li>
      <li>
        Switch: <kbd>Space</kbd>/<kbd>Enter</kbd> toggle the
        <code>role="switch"</code> button; <code>label</code> feeds
        <code>aria-label</code>.
      </li>
      <li>
        Radio group: one tab stop (roving tabindex);
        <kbd>&darr;</kbd>/<kbd>&rarr;</kbd>/<kbd>&uarr;</kbd>/<kbd>&larr;</kbd>
        move focus and selection with wrap-around, <kbd>Home</kbd>/<kbd
          >End</kbd
        >
        jump to the edges, disabled items are skipped.
      </li>
    </ul>
  `,
})
export class InputsToggleControlsPage {
  protected readonly sections = SECTIONS;
  protected readonly checkboxSnippet = CHECKBOX_SNIPPET;
  protected readonly switchSnippet = SWITCH_SNIPPET;
  protected readonly radioSnippet = RADIO_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly agreed = signal<boolean | null>(false);
  protected readonly all = signal<boolean | null>(null);
  protected readonly allLabel = computed(() => {
    const value = this.all();
    return value === null ? 'null (indeterminate)' : String(value);
  });

  protected readonly notify = signal(true);
  protected readonly enabled = signal(false);
  protected readonly plain = signal(false);
  protected readonly small = signal(true);

  protected readonly plans: DemoPlan[] = [
    { id: 'starter', name: 'Starter' },
    { id: 'team', name: 'Team' },
    { id: 'scale', name: 'Scale (sold out)', soldOut: true },
    { id: 'enterprise', name: 'Enterprise' },
  ];
  protected readonly priorities = ['Low', 'Normal', 'High'];

  protected readonly planId = signal<unknown>('team');
  protected readonly priority = signal<unknown>('Normal');
}
