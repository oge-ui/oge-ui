import { demoSource } from '../../shared/demo-source';

export const STANDALONE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<!-- no forms library: drive state via inputs -->
<oge-text-box
  label="Username"
  [(value)]="username"
  [invalid]="username().length > 0 && username().length < 3"
  errorText="At least 3 characters"
  errorDisplay="always"
/>`,
  body: `protected readonly username = signal('');`,
});

export const REACTIVE_SNIPPET = demoSource({
  use: {
    '@angular/forms': ['ReactiveFormsModule'],
    '@oge-ui/inputs': ['OgeTextBox'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  template: `<oge-text-box label="E-mail" mode="email" [formControl]="email" hint="required + email" />`,
  body: `// classic reactive forms — the CVA bridge renders control errors
protected readonly email = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required, Validators.email],
});`,
});

export const LINKED_SNIPPET = demoSource({
  use: {
    '@oge-ui/buttons': ['OgeButton', 'OgeButtonGroup'],
    '@oge-ui/inputs': ['OgeNumberBox', 'OgeTextBox'],
  },
  types: { '@oge-ui/inputs': ['OgeInputValueCommittedEvent'] },
  template: `<!-- cross-field rules: bind state to state — no callbacks needed -->
<oge-button-group selectionMode="single" [(selectedKeys)]="invoiceType">
  <oge-button value="person" text="Person" />
  <oge-button value="company" text="Company" />
</oge-button-group>
<oge-text-box label="Tax ID" [disabled]="!invoiceType().includes('company')" />

<!-- Max takes its lower bound from Min -->
<oge-number-box label="Min" [(value)]="minValue" />
<oge-number-box
  label="Max"
  [min]="minValue() ?? undefined"
  (valueCommitted)="onMaxChanged($event)"
/>`,
  body: `protected readonly invoiceType = signal<string[]>(['person']);
protected readonly minValue = signal<number | null>(null);

// rich change payload: { value, previousValue, event }
protected onMaxChanged(e: OgeInputValueCommittedEvent<number | null>): void {
  console.log(e.previousValue, '→', e.value, e.event ? 'user' : 'programmatic');
}`,
});

export const PENDING_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<oge-text-box
  label="API key"
  [(value)]="apiKey"
  [pending]="checking()"
  [showSuccessIcon]="'always'"
  hint="type to trigger a fake async check"
  (inputChange)="simulateCheck()"
/>`,
  body: `protected readonly apiKey = signal('');
protected readonly checking = signal(false);
private checkTimer: ReturnType<typeof setTimeout> | undefined;

// \`pending\` shows a rail spinner; pair it with async validation
protected simulateCheck(): void {
  this.checking.set(true);
  clearTimeout(this.checkTimer);
  this.checkTimer = setTimeout(() => this.checking.set(false), 900);
}`,
});

export const SIGNAL_SNIPPET = demoSource({
  use: {
    '@angular/forms/signals': ['FormField'],
    '@oge-ui/inputs': ['OgeNumberBox', 'OgeTextBox'],
  },
  helpers: { '@angular/forms/signals': ['form', 'minLength', 'required'] },
  template: `<oge-text-box label="Username" [formField]="f.username" />
<oge-number-box label="Age" [formField]="f.age" />`,
  body: `// Angular Signal Forms — schema constraints auto-bind
protected readonly model = signal({ username: '', age: null as number | null });
protected readonly f = form(this.model, (p) => {
  required(p.username);
  minLength(p.username, 3);
});`,
});
