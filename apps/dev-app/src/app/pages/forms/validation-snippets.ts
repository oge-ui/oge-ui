import { demoSource } from '../../shared/demo-source';

export const RULES_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  template: `<oge-form [(formData)]="signup" [showValidationSummary]="true">
  <oge-form-item
    field="username"
    label="Username"
    [validationRules]="[
      { type: 'required' },
      { type: 'stringLength', min: 3, max: 20 },
    ]"
  />
  <oge-form-item
    field="email"
    label="E-mail"
    [validationRules]="[{ type: 'required' }, { type: 'email' }]"
  />
  <oge-form-item
    field="age"
    label="Age"
    [validationRules]="[{ type: 'numeric', min: 18, max: 120 }]"
  />
</oge-form>`,
  body: `protected readonly signup = signal({ username: '', email: '', age: 0 });`,
});

export const CUSTOM_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  types: { '@oge-ui/forms': ['OgeValidationRule'] },
  template: `<oge-form [(formData)]="account">
  <oge-form-item field="password" label="Password" [isRequired]="true" />
  <oge-form-item field="confirm" label="Confirm" [validationRules]="matchRule" />
</oge-form>`,
  body: `protected readonly account = signal({ password: '', confirm: '' });

// a custom rule sees its own value and the whole model, so cross-field
// checks need no second engine
protected readonly matchRule: OgeValidationRule[] = [
  {
    type: 'custom',
    validate: ({ value, data }) =>
      value === data['password'] ? null : 'Passwords do not match',
  },
];`,
});

export const SIGNAL_FORMS_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  helpers: {
    '@angular/forms/signals': [
      'form',
      'required',
      'email',
      'minLength',
      'disabled',
    ],
  },
  template: `<!-- the schema owns validation, required marks, disabled and readonly -->
<oge-form [fieldTree]="profile" [colCount]="2">
  <oge-form-item field="name" label="Name" />
  <oge-form-item field="email" label="E-mail" />
  <oge-form-item field="tenant" label="Tenant" />
</oge-form>

<p>valid: {{ profile().valid() }}</p>`,
  body: `protected readonly model = signal({ name: '', email: '', tenant: 'acme' });

protected readonly profile = form(this.model, (p) => {
  required(p.name);
  minLength(p.name, 2);
  required(p.email);
  email(p.email);
  disabled(p.tenant, () => true);
});`,
});

export const REACTIVE_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm', 'OgeFormItem'] },
  helpers: {
    '@angular/forms': ['FormControl', 'FormGroup', 'Validators'],
  },
  template: `<oge-form [formGroup]="group" [colCount]="2">
  <oge-form-item field="name" label="Name" />
  <oge-form-item field="email" label="E-mail" />
</oge-form>`,
  body: `protected readonly group = new FormGroup({
  name: new FormControl('', Validators.required),
  email: new FormControl('', [Validators.required, Validators.email]),
});`,
});

export const SUMMARY_SNIPPET = demoSource({
  use: {
    '@oge-ui/forms': ['OgeForm', 'OgeFormItem', 'OgeValidationSummary'],
    '@oge-ui/buttons': ['OgeButton'],
  },
  template: `<!-- place the summary yourself, or let the form render it with
     [showValidationSummary]. Either way a row focuses its field. -->
<oge-validation-summary
  [errors]="form.errors()"
  (errorClick)="form.focus($event.field)"
/>

<oge-form #form [(formData)]="ticket" [scrollToFirstInvalid]="true">
  <oge-form-item field="title" label="Title" [isRequired]="true" />
  <oge-form-item field="reporter" label="Reporter" [isRequired]="true" />
  <div ogeFormActions>
    <oge-button text="Save" buttonType="submit" [useSubmitBehavior]="true" />
  </div>
</oge-form>`,
  body: `protected readonly ticket = signal({ title: '', reporter: '' });`,
});

export const CONFIG_SNIPPET = `import { provideOgeFormsConfig } from '@oge-ui/forms';

export const appConfig: ApplicationConfig = {
  providers: [
    provideOgeFormsConfig({
      labelLocation: 'start',
      showOptionalMark: true,
      messages: {
        requiredMark: '•',
        optionalMark: 'isteğe bağlı',
        validationSummaryTitle: '{count} alan düzeltilmeli',
        validationSummaryTitleOne: '1 alan düzeltilmeli',
      },
    }),
  ],
};`;

export const METADATA_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  helpers: {
    '@angular/forms/signals': ['form', 'required', 'email', 'metadata'],
    '@oge-ui/forms': [
      'OGE_FORM_LABEL',
      'OGE_FORM_HINT',
      'OGE_FORM_GROUP',
      'OGE_FORM_COL_SPAN',
      'OGE_FORM_EDITOR',
    ],
  },
  template: `<!-- no items, no children: the schema IS the layout -->
<oge-form [fieldTree]="profile" [colCount]="2" />`,
  body: `protected readonly model = signal({ name: '', email: '', bio: '' });

protected readonly profile = form(this.model, (p) => {
  required(p.name);
  required(p.email);
  email(p.email);

  metadata(p.name, OGE_FORM_LABEL, () => 'Full name');
  metadata(p.email, OGE_FORM_LABEL, () => 'E-mail address');
  metadata(p.email, OGE_FORM_HINT, () => 'Work address, please');
  metadata(p.email, OGE_FORM_GROUP, () => 'Contact');
  metadata(p.bio, OGE_FORM_EDITOR, () => 'textArea' as const);
  metadata(p.bio, OGE_FORM_COL_SPAN, () => 2);
});`,
});
