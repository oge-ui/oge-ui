import { demoSource } from '../../shared/demo-source';

export const CHECKBOX_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeCheckBox'] },
  template: `<oge-check-box [(value)]="agreed">I agree to the terms</oge-check-box>

<!-- tri-state: null renders the indeterminate dash;
     threeState lets USERS cycle null → true → false → null -->
<oge-check-box
  [threeState]="true"
  text="Select all"
  [(value)]="all"
/>`,
  body: `protected readonly agreed = signal<boolean | null>(false);
protected readonly all = signal<boolean | null>(null);`,
});

export const SWITCH_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSwitch'] },
  template: `<!-- label feeds aria-label — always name your switch -->
<oge-switch label="Notifications" [(value)]="notify" />

<!-- track texts come from the localized messages (ON/OFF);
     override per instance, empty string hides them -->
<oge-switch label="Localized" onText="AÇIK" offText="KAPALI" [(value)]="enabled" />
<oge-switch label="Plain" onText="" offText="" [(value)]="plain" />`,
  body: `protected readonly notify = signal(true);
protected readonly enabled = signal(false);
protected readonly plain = signal(false);`,
});

export const RADIO_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRadioGroup'] },
  template: `<oge-radio-group
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
/>`,
  body: `protected readonly plans = [
  { id: 'free', name: 'Free', soldOut: false },
  { id: 'pro', name: 'Pro', soldOut: false },
  { id: 'enterprise', name: 'Enterprise', soldOut: true },
];

protected readonly planId = signal<unknown>('free');
protected readonly priority = signal<unknown>('Normal');`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@angular/forms': ['ReactiveFormsModule'],
    '@angular/forms/signals': ['FormField'],
    '@oge-ui/inputs': ['OgeCheckBox', 'OgeRadioGroup', 'OgeSwitch'],
  },
  helpers: {
    '@angular/forms': ['FormControl'],
    '@angular/forms/signals': ['form'],
  },
  template: `<!-- Signal Forms — auto-binds errors/touched/disabled -->
<oge-check-box [formField]="f.terms">Accept terms</oge-check-box>
<oge-switch label="Marketing" [formField]="f.marketing" />
<oge-radio-group [items]="plans" valueExpr="id" [formField]="f.plan" />

<!-- reactive forms work unchanged -->
<oge-check-box [formControl]="termsCtrl" text="Accept terms" />`,
  body: `protected readonly plans = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
];

protected readonly model = signal({
  terms: false,
  marketing: false,
  plan: 'free',
});
protected readonly f = form(this.model);

protected readonly termsCtrl = new FormControl(false, { nonNullable: true });`,
});
