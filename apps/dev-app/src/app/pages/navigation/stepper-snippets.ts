import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeStepper', 'OgeStep'] },
  template: `<!-- Steps come from projected children, from a [steps] array, or
     both (children first). The built-in Back / Next bar is opt-in — none of
     the reference steppers ships one at all. -->
<oge-stepper [(activeIndex)]="step" [showNavigation]="true">
  <oge-step label="Account" description="Who you are">Account fields…</oge-step>
  <oge-step label="Shipping" [optional]="true">Shipping fields…</oge-step>
  <oge-step label="Review">Confirm and submit…</oge-step>
</oge-stepper>`,
  body: `protected readonly step = signal(0);`,
});

export const LINEAR_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeStepper', 'OgeStep'] },
  types: { '@oge-ui/navigation': ['OgeStepBlockedEvent'] },
  template: `<!-- linear blocks moving past a step that is neither completed
     nor optional, and editable:false blocks coming back. Every refusal says
     WHY — Angular Material refuses silently and tells you to add your own
     live region. -->
<oge-stepper
  [(activeIndex)]="step"
  [linear]="true"
  [showNavigation]="true"
  (stepBlocked)="onBlocked($event)"
>
  <oge-step label="Account" [completed]="accountDone()" [editable]="false" />
  <oge-step label="Payment" [completed]="paymentDone()" />
  <oge-step label="Review" />
</oge-stepper>`,
  body: `protected readonly step = signal(0);
protected readonly accountDone = signal(false);
protected readonly paymentDone = signal(false);

protected onBlocked(event: OgeStepBlockedEvent): void {
  console.log('refused because', event.reason);
}`,
});

export const GUARD_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeStepper', 'OgeStep'] },
  template: `<!-- stepGuard runs when the user LEAVES a step, inside the same
     pipeline the headers use. false, a throw and a rejection all veto; a
     promise reports changePending and a second gesture meanwhile is dropped.
     It gates the finish on the last step too. -->
<oge-stepper [(activeIndex)]="step" [showNavigation]="true">
  <oge-step label="Details" [stepGuard]="confirmLeave">Details…</oge-step>
  <oge-step label="Done">Done…</oge-step>
</oge-stepper>`,
  body: `protected readonly step = signal(0);
protected readonly dirty = signal(true);

protected readonly confirmLeave = (): boolean =>
  !this.dirty() || confirm('Discard your changes?');`,
});

export const STATE_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeStepper', 'OgeStep'] },
  template: `<!-- The indicator state is derived: error outranks done, so a
     completed step that later fails still reads as needing attention. The
     glyph is aria-hidden, so the state is also announced in text. -->
<oge-stepper [activeIndex]="0" display="full">
  <oge-step label="Active" description="the current step" />
  <oge-step label="Done" [completed]="true" />
  <oge-step label="Error" [completed]="true" [invalid]="true" />
  <oge-step label="Upcoming" />
</oge-stepper>`,
});

export const VERTICAL_SNIPPET = demoSource({
  use: { '@oge-ui/navigation': ['OgeStepper', 'OgeStep'] },
  types: { '@oge-ui/navigation': ['OgeStepperOrientation'] },
  template: `<!-- The ARIA semantics do NOT change with the orientation: it is
     an ordered list of buttons with aria-current="step" either way. Angular
     Material swaps to role="tablist" when horizontal, so the same widget
     reads as two different things to a screen reader. -->
<oge-stepper [orientation]="orientation()" [(activeIndex)]="step">
  <oge-step label="One">First body…</oge-step>
  <oge-step label="Two">Second body…</oge-step>
</oge-stepper>`,
  body: `protected readonly step = signal(0);
protected readonly orientation = signal<OgeStepperOrientation>('vertical');`,
});

export const NAV_SNIPPET = demoSource({
  use: {
    '@oge-ui/navigation': [
      'OgeStepper',
      'OgeStep',
      'OgeStepperNext',
      'OgeStepperPrevious',
    ],
  },
  template: `<!-- The directives route through the same pipeline the headers
     use, so linear and stepGuard still apply. They work inside the stepper by
     DI, or bound to it from outside — which Material's cannot do. -->
<oge-stepper #wizard [(activeIndex)]="step">
  <oge-step label="One">
    First body…
    <button type="button" ogeStepperNext>Continue</button>
  </oge-step>
  <oge-step label="Two">Second body…</oge-step>
</oge-stepper>

<button type="button" ogeStepperPrevious [ogeStepperTarget]="wizard">Back</button>`,
  body: `protected readonly step = signal(0);`,
});

export const FORM_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': ['OgeForm', 'OgeFormItem', 'OgeFormGroup', 'OgeFormSteps'],
  },
  template: `<!-- <oge-form-steps> wraps the stepper the way <oge-form-tabs>
     wraps the tabs. Step completion comes from the form's own per-step error
     rollup, so it works identically with [fieldTree], [formGroup] and
     [(formData)] — and leaving a step touches only THAT step's fields, so the
     steps ahead stay quiet instead of turning red. -->
<oge-form [(formData)]="order">
  <oge-form-steps [linear]="true">
    <oge-form-group caption="Account">
      <oge-form-item field="email" label="E-mail" [isRequired]="true" />
    </oge-form-group>
    <oge-form-group caption="Payment">
      <oge-form-item field="card" label="Card" [isRequired]="true" />
    </oge-form-group>
  </oge-form-steps>
</oge-form>`,
  body: `protected readonly order = signal({ email: '', card: '' });`,
});

export const CONFIG_SNIPPET = `import { provideOgeStepperConfig } from '@oge-ui/navigation';

bootstrapApplication(App, {
  providers: [
    provideOgeStepperConfig({
      linear: true,
      messages: { next: 'İleri', previous: 'Geri', finish: 'Bitir' },
    }),
  ],
});`;
