import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  disabled,
  email,
  form,
  metadata,
  minLength,
  required,
} from '@angular/forms/signals';
import { OgeButton } from '@oge-ui/buttons';
import {
  OGE_FORM_COL_SPAN,
  OGE_FORM_EDITOR,
  OGE_FORM_GROUP,
  OGE_FORM_HINT,
  OGE_FORM_LABEL,
  OgeForm,
  OgeFormItem,
  OgeValidationSummary,
  type OgeValidationRule,
} from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  CONFIG_SNIPPET,
  CUSTOM_SNIPPET,
  METADATA_SNIPPET,
  REACTIVE_SNIPPET,
  RULES_SNIPPET,
  SIGNAL_FORMS_SNIPPET,
  SUMMARY_SNIPPET,
} from './validation-snippets';

const SECTIONS = [
  'Declarative rules',
  'Custom & cross-field rules',
  'Angular Signal Forms',
  'Reactive forms',
  'Validation summary',
  'Schema-carried layout',
  'Configuration',
] as const;

@Component({
  selector: 'app-forms-validation',
  imports: [
    OgeButton,
    OgeForm,
    OgeFormItem,
    OgeValidationSummary,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Form validation"
      category="Forms"
      [chips]="['validationRules', 'Signal Forms', 'summary', 'focus']"
    >
      <p>
        There is exactly one validation engine here: Angular's
        <strong>Signal Forms</strong>. <code>validationRules</code> is
        declarative sugar that compiles into a schema — a
        <code>required</code> rule becomes <code>required()</code>,
        <code>stringLength</code> becomes
        <code>minLength()</code>/<code>maxLength()</code>, and so on. Nothing in
        <code>&#64;oge-ui/forms</code> re-implements validation.
      </p>
      <p>
        Which means the rules only apply where the form owns the model, i.e.
        <code>[(formData)]</code>. Bind <code>[fieldTree]</code> or
        <code>[formGroup]</code> and the caller owns validation; the form warns
        in dev mode if you set rules anyway.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['required', 'stringLength', 'email', 'numeric']"
      heading="Declarative rules"
      description="Rules are plain objects with a string-union <code>type</code>. Messages come from <code>&#64;oge-ui/inputs</code>' message table, so the text under a field is identical whether the editor is used inside a form or on its own."
      [code]="rulesSnippet"
      language="ts"
    >
      <oge-form [(formData)]="signup" [showValidationSummary]="true">
        <oge-form-item
          field="username"
          label="Username"
          [validationRules]="usernameRules"
        />
        <oge-form-item
          field="email"
          label="E-mail"
          [validationRules]="emailRules"
        />
        <oge-form-item field="age" label="Age" [validationRules]="ageRules" />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['custom', 'cross-field', 'async']"
      heading="Custom & cross-field rules"
      description="A <code>custom</code> rule receives its own value and the whole model, which is how a confirm-password check works without a second engine. There is deliberately no <code>compare</code> rule type — a rule object that names another field loses type safety, and <code>validate()</code> with <code>valueOf()</code> in a real schema does it properly."
      [code]="customSnippet"
      language="ts"
    >
      <oge-form [(formData)]="account">
        <oge-form-item field="password" label="Password" [isRequired]="true" />
        <oge-form-item
          field="confirm"
          label="Confirm"
          [validationRules]="matchRule"
        />
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['[fieldTree]', 'schema', 'disabled()', 'readonly()']"
      heading="Angular Signal Forms"
      description="Bind the tree that <code>form()</code> returns. The schema owns everything: validity, required marks, disabled and read-only state. The form binds Angular's own <code>FormField</code> directive, so <code>min</code>/<code>max</code>/<code>minLength</code>/<code>pattern</code> reach the editors automatically — which is also why a template <code>[disabled]</code> binding is not written in this mode; the directive would overwrite it."
      [code]="signalFormsSnippet"
      language="ts"
    >
      <oge-form [fieldTree]="profile" [colCount]="2">
        <oge-form-item field="name" label="Name" />
        <oge-form-item field="email" label="E-mail" />
        <oge-form-item field="tenant" label="Tenant" />
      </oge-form>
      <p class="mt-2 text-sm opacity-70">valid: {{ profile().valid() }}</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['[formGroup]', 'Validators', 'FormControl']"
      heading="Reactive forms"
      description="An existing <code>FormGroup</code> binds straight in — the editors' control-value-accessor path carries the value, and the control's own validators drive the messages. Use this to put a form layout over code you are not ready to migrate."
      [code]="reactiveSnippet"
      language="ts"
    >
      <oge-form [formGroup]="group" [colCount]="2">
        <oge-form-item field="name" label="Name" />
        <oge-form-item field="email" label="E-mail" />
      </oge-form>
      <p class="mt-2 text-sm opacity-70">group.valid: {{ group.valid }}</p>
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;oge-validation-summary&gt;', 'errors()', 'focus()']"
      heading="Validation summary"
      description='The summary is a <code>role="alert"</code> list, so a failed submit is announced. Every row is a real button that focuses its field, and a failed submit also moves focus to the first invalid field and scrolls it into view. Render it yourself, or let the form do it with <code>[showValidationSummary]</code>.'
      [code]="summarySnippet"
      language="ts"
    >
      <oge-validation-summary
        [errors]="ticketForm.errors()"
        (errorClick)="ticketForm.focus($event.field)"
      />
      <oge-form #ticketForm [(formData)]="ticket">
        <oge-form-item field="title" label="Title" [isRequired]="true" />
        <oge-form-item field="reporter" label="Reporter" [isRequired]="true" />
        <div ogeFormActions>
          <oge-button
            text="Save"
            stylingMode="contained"
            buttonType="submit"
            [useSubmitBehavior]="true"
          />
        </div>
      </oge-form>
    </app-demo-card>

    <app-demo-card
      [chips]="['metadata()', 'OGE_FORM_LABEL', 'OGE_FORM_GROUP']"
      heading="Schema-carried layout"
      description="Angular 22's <code>createMetadataKey()</code> lets a schema carry more than validation. Attach a label, a hint, a group, a column span or an editor next to the rules, and <code>&amp;lt;oge-form [fieldTree]&amp;gt;</code> generates the entire layout — no items array, no template children. Angular's own <code>REQUIRED</code>/<code>MIN</code>/<code>MAX</code>/<code>PATTERN</code> metadata already reaches the editors, so none of it is duplicated."
      [code]="metadataSnippet"
      language="ts"
    >
      <oge-form [fieldTree]="metaProfile" [colCount]="2" />
    </app-demo-card>

    <app-demo-card
      [chips]="['provideOgeFormsConfig', 'messages']"
      heading="Configuration"
      description="Every user-facing string — the required mark, the optional mark, the summary heading — lives in the messages interface, so a translation is one provider. Layout defaults can be set the same way and overridden per instance."
      [code]="configSnippet"
      language="ts"
    />
  `,
})
export class FormsValidationPage {
  protected readonly sections = SECTIONS;
  protected readonly rulesSnippet = RULES_SNIPPET;
  protected readonly customSnippet = CUSTOM_SNIPPET;
  protected readonly signalFormsSnippet = SIGNAL_FORMS_SNIPPET;
  protected readonly reactiveSnippet = REACTIVE_SNIPPET;
  protected readonly summarySnippet = SUMMARY_SNIPPET;
  protected readonly configSnippet = CONFIG_SNIPPET;

  protected readonly signup = signal({ username: '', email: '', age: 0 });
  protected readonly usernameRules: OgeValidationRule[] = [
    { type: 'required' },
    { type: 'stringLength', min: 3, max: 20 },
  ];
  protected readonly emailRules: OgeValidationRule[] = [
    { type: 'required' },
    { type: 'email' },
  ];
  protected readonly ageRules: OgeValidationRule[] = [
    { type: 'numeric', min: 18, max: 120 },
  ];

  protected readonly account = signal({ password: '', confirm: '' });
  protected readonly matchRule: OgeValidationRule[] = [
    {
      type: 'custom',
      validate: ({ value, data }) =>
        value === data['password'] ? null : 'Passwords do not match',
    },
  ];

  protected readonly signalModel = signal({
    name: '',
    email: '',
    tenant: 'acme',
  });
  protected readonly profile = form(this.signalModel, (p) => {
    required(p.name);
    minLength(p.name, 2);
    required(p.email);
    email(p.email);
    disabled(p.tenant, () => true);
  });

  protected readonly group = new FormGroup({
    name: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  protected readonly ticket = signal({ title: '', reporter: '' });

  protected readonly metadataSnippet = METADATA_SNIPPET;
  protected readonly metaModel = signal({ name: '', email: '', bio: '' });
  protected readonly metaProfile = form(this.metaModel, (p) => {
    required(p.name);
    required(p.email);
    email(p.email);

    metadata(p.name, OGE_FORM_LABEL, () => 'Full name');
    metadata(p.email, OGE_FORM_LABEL, () => 'E-mail address');
    metadata(p.email, OGE_FORM_HINT, () => 'Work address, please');
    metadata(p.email, OGE_FORM_GROUP, () => 'Contact');
    metadata(p.bio, OGE_FORM_EDITOR, () => 'textArea' as const);
    metadata(p.bio, OGE_FORM_COL_SPAN, () => 2);
  });
}
