import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  OgeStep,
  OgeStepper,
  OgeStepperNext,
  OgeStepperPrevious,
  type OgeStepBlockedEvent,
  type OgeStepperOrientation,
} from '@oge-ui/navigation';
import {
  OgeForm,
  OgeFormGroup,
  OgeFormItem,
  OgeFormSteps,
} from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  CONFIG_SNIPPET,
  FORM_SNIPPET,
  GUARD_SNIPPET,
  LINEAR_SNIPPET,
  NAV_SNIPPET,
  STATE_SNIPPET,
  VERTICAL_SNIPPET,
} from './stepper-snippets';

const SECTIONS = [
  'Commands',
  'Linear flow',
  'Step states',
  'Leave guard',
  'Orientation',
  'Navigation buttons',
  'Inside a form',
  'Configuration',
] as const;

interface Order extends Record<string, unknown> {
  email: string;
  card: string;
}

@Component({
  selector: 'app-navigation-stepper',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeStepper,
    OgeStep,
    OgeStepperNext,
    OgeStepperPrevious,
    OgeForm,
    OgeFormItem,
    OgeFormGroup,
    OgeFormSteps,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Stepper"
      category="Navigation"
      [chips]="['linear', 'stepGuard', 'aria-current', 'wizard']"
    >
      <p>
        A step-by-step process: a list of step headers plus the body of the
        active one. Steps come from projected children, from a data-driven
        <code>steps</code> array, or both.
      </p>
      <p>
        <strong>There is no WAI-ARIA APG pattern for a stepper</strong>, so the
        semantics are a decision rather than an inheritance: an ordered list of
        <code>&lt;button&gt;</code> headers carrying
        <code>aria-current="step"</code>, each body a
        <code>role="region"</code> labelled by its header. That is
        <strong>one semantic in both orientations</strong> — Angular Material
        instead emits <code>role="tablist"</code> when horizontal and
        <code>aria-current</code> when vertical, so the same widget reads as two
        different things to a screen reader, and a tablist claims panels may be
        browsed freely, which is exactly what <code>linear</code> forbids.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['activeIndex', 'showNavigation', 'optional']"
      heading="Commands"
      description="The built-in Back / Next bar becomes Finish on the last step. None of Angular Material, Kendo or PrimeNG ships navigation buttons at all — every one of them makes you hand-roll a wizard's most predictable part."
      [code]="basicSnippet"
      language="ts"
    >
      <oge-stepper
        [(activeIndex)]="basicStep"
        [showNavigation]="true"
        ariaLabel="Checkout"
      >
        <oge-step label="Account" description="Who you are">
          <p class="text-sm opacity-70">Account fields…</p>
        </oge-step>
        <oge-step label="Shipping" [optional]="true">
          <p class="text-sm opacity-70">Shipping fields…</p>
        </oge-step>
        <oge-step label="Review">
          <p class="text-sm opacity-70">Confirm and submit…</p>
        </oge-step>
      </oge-stepper>
    </app-demo-card>

    <app-demo-card
      [chips]="['linear', 'completed', 'editable', 'stepBlocked']"
      heading="Linear flow"
      description="<code>linear</code> blocks moving past a step that is neither <code>completed</code> nor <code>optional</code>; <code>editable: false</code> blocks coming back. Every refusal emits <code>stepBlocked</code> with the reason — Material refuses silently and its own docs tell you to add a live region yourself."
      [code]="linearSnippet"
      language="ts"
    >
      <label class="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          [checked]="accountDone()"
          (change)="accountDone.set(!accountDone())"
        />
        step 1 is complete
      </label>
      <oge-stepper
        [(activeIndex)]="linearStep"
        [linear]="true"
        [showNavigation]="true"
        ariaLabel="Linear flow"
        (stepBlocked)="onBlocked($event)"
      >
        <oge-step label="Account" [completed]="accountDone()" />
        <oge-step label="Payment" />
        <oge-step label="Review" />
      </oge-stepper>
      <p class="mt-2 text-sm opacity-70">
        last refusal → {{ blockedReason() ?? '—' }}
      </p>
    </app-demo-card>

    <app-demo-card
      [chips]="['number', 'active', 'done', 'error']"
      heading="Step states"
      description="The indicator state is derived from the step's own flags. <code>error</code> outranks <code>done</code>, so a completed step that later fails still reads as needing attention. The glyph is <code>aria-hidden</code>, so the state is announced in text as well."
      [code]="stateSnippet"
      language="ts"
    >
      <oge-stepper [activeIndex]="0" ariaLabel="Step states">
        <oge-step label="Active" description="the current step" />
        <oge-step label="Done" [completed]="true" />
        <oge-step label="Error" [completed]="true" [invalid]="true" />
        <oge-step label="Upcoming" />
      </oge-stepper>
    </app-demo-card>

    <app-demo-card
      [chips]="['stepGuard', 'changePending']"
      heading="Leave guard"
      description="<code>stepGuard</code> runs when the user leaves a step, inside the same pipeline the headers use. <code>false</code>, a throw and a rejection all veto; a promise reports <code>changePending</code> and a second gesture meanwhile is dropped. It gates the finish on the last step too."
      [code]="guardSnippet"
      language="ts"
    >
      <label class="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          [checked]="dirty()"
          (change)="dirty.set(!dirty())"
        />
        pretend step 1 has unsaved changes
      </label>
      <oge-stepper
        [(activeIndex)]="guardStep"
        [showNavigation]="true"
        ariaLabel="Leave guard"
      >
        <oge-step label="Details" [stepGuard]="confirmLeave">
          <p class="text-sm opacity-70">Details…</p>
        </oge-step>
        <oge-step label="Done">
          <p class="text-sm opacity-70">Done…</p>
        </oge-step>
      </oge-stepper>
    </app-demo-card>

    <app-demo-card
      [chips]="['orientation', 'display']"
      heading="Orientation"
      description="Vertical stacks the bodies under their own headers. The ARIA model is identical either way — the headers stay buttons with <code>aria-current='step'</code>, so a screen reader hears the same widget."
      [code]="verticalSnippet"
      language="ts"
    >
      <div class="mb-3 flex flex-wrap gap-2">
        @for (option of orientations; track option) {
          <button
            type="button"
            class="rounded border px-2 py-1 text-sm"
            [class.font-semibold]="orientation() === option"
            (click)="orientation.set(option)"
          >
            {{ option }}
          </button>
        }
      </div>
      <oge-stepper
        [orientation]="orientation()"
        [(activeIndex)]="verticalStep"
        [showNavigation]="true"
        ariaLabel="Orientation"
      >
        <oge-step label="One">
          <p class="text-sm opacity-70">First body…</p>
        </oge-step>
        <oge-step label="Two">
          <p class="text-sm opacity-70">Second body…</p>
        </oge-step>
      </oge-stepper>
    </app-demo-card>

    <app-demo-card
      [chips]="['ogeStepperNext', 'ogeStepperPrevious']"
      heading="Navigation buttons"
      description="The directives route through the same pipeline the headers use, so <code>linear</code> and <code>stepGuard</code> still apply. They find the stepper by DI when written inside it, or take one explicitly from outside — which Material's equivalents cannot do."
      [code]="navSnippet"
      language="ts"
    >
      <oge-stepper
        #wizard
        [(activeIndex)]="navStep"
        ariaLabel="Navigation buttons"
      >
        <oge-step label="One">
          <p class="mb-2 text-sm opacity-70">First body…</p>
          <button type="button" class="rounded border px-2 py-1" ogeStepperNext>
            Continue
          </button>
        </oge-step>
        <oge-step label="Two">
          <p class="text-sm opacity-70">Second body…</p>
        </oge-step>
      </oge-stepper>
      <button
        type="button"
        class="mt-3 rounded border px-2 py-1"
        ogeStepperPrevious
        [ogeStepperTarget]="wizard"
      >
        Back
      </button>
    </app-demo-card>

    <app-demo-card
      [chips]="['oge-form-steps', 'linear', 'per-step touched']"
      heading="Inside a form"
      description="<code>&lt;oge-form-steps&gt;</code> wraps the stepper the way <code>&lt;oge-form-tabs&gt;</code> wraps the tabs. Step completion comes from the form's own per-step error rollup, so it behaves identically with <code>[fieldTree]</code>, <code>[formGroup]</code> and <code>[(formData)]</code> — and leaving a step touches only that step's fields, so the steps ahead stay quiet instead of turning red."
      [code]="formSnippet"
      language="ts"
    >
      <oge-form [(formData)]="order">
        <oge-form-steps [linear]="true">
          <oge-form-group caption="Account">
            <oge-form-item field="email" label="E-mail" [isRequired]="true" />
          </oge-form-group>
          <oge-form-group caption="Payment">
            <oge-form-item field="card" label="Card" [isRequired]="true" />
          </oge-form-group>
        </oge-form-steps>
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['provideOgeStepperConfig']"
      heading="Configuration"
      description="Every user-facing string — including the two announced only to screen readers, because the indicator glyph is <code>aria-hidden</code> — lives in the messages interface."
      [code]="configSnippet"
      language="ts"
    >
      <oge-stepper
        [activeIndex]="1"
        [showNavigation]="true"
        [messages]="{
          stepper: 'Adımlar',
          previous: 'Geri',
          next: 'İleri',
          finish: 'Bitir',
        }"
      >
        <oge-step label="Hesap" [completed]="true" />
        <oge-step label="Ödeme" />
      </oge-stepper>
    </app-demo-card>
  `,
})
export class NavigationStepperPage {
  protected readonly sections = SECTIONS;
  protected readonly orientations: readonly OgeStepperOrientation[] = [
    'horizontal',
    'vertical',
  ];

  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly linearSnippet = LINEAR_SNIPPET;
  protected readonly stateSnippet = STATE_SNIPPET;
  protected readonly guardSnippet = GUARD_SNIPPET;
  protected readonly verticalSnippet = VERTICAL_SNIPPET;
  protected readonly navSnippet = NAV_SNIPPET;
  protected readonly formSnippet = FORM_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly basicStep = signal(0);
  protected readonly linearStep = signal(0);
  protected readonly guardStep = signal(0);
  protected readonly verticalStep = signal(0);
  protected readonly navStep = signal(0);
  protected readonly orientation = signal<OgeStepperOrientation>('vertical');

  protected readonly accountDone = signal(false);
  protected readonly dirty = signal(true);
  protected readonly blockedReason = signal<string | undefined>(undefined);
  protected readonly order = signal<Order>({ email: '', card: '' });

  protected readonly confirmLeave = (): boolean =>
    !this.dirty() || confirm('Discard your changes?');

  protected onBlocked(event: OgeStepBlockedEvent): void {
    this.blockedReason.set(event.reason);
  }
}
