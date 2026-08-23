import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton } from '@oge-ui/react-buttons';
import {
  OgeForm,
  OgeFormsConfigProvider,
  OgeValidationSummary,
  type OgeFormErrorEntry,
  type OgeFormHandle,
  type OgeValidationRule,
} from '@oge-ui/react-forms';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { FORMS_VALIDATION_DEMOS } from './validation-snippets';

/**
 * TOC of the React view. The Angular page's three binding sections — Signal
 * Forms, reactive forms and schema-carried layout — document Angular-only
 * engines and have no React counterpart; the gap is recorded in
 * `docs/REACT-PARITY.md`. The four sections that remain keep their headings
 * and their order.
 */
export const REACT_FORMS_VALIDATION_SECTIONS = [
  'Declarative rules',
  'Custom & cross-field rules',
  'Validation summary',
  'Configuration',
] as const;

// `createElement` cannot infer OgeForm's model generic from a props object, so
// each demo instantiates it explicitly. JSX — what the snippets show — infers.
interface Signup {
  username: string;
  email: string;
  age: number;
}
interface Account {
  password: string;
  confirm: string;
}
interface Ticket {
  title: string;
  reporter: string;
}
interface Contact {
  name: string;
  phone: string;
}

const USERNAME_RULES: OgeValidationRule[] = [
  { type: 'required' },
  { type: 'stringLength', min: 3, max: 20 },
];
const EMAIL_RULES: OgeValidationRule[] = [
  { type: 'required' },
  { type: 'email' },
];
const AGE_RULES: OgeValidationRule[] = [{ type: 'numeric', min: 18, max: 120 }];

/** Rule objects, run by the shared evaluator both layers call. */
function DeclarativeRulesDemo(): ReactNode {
  const [signup, setSignup] = useState<Signup>({
    username: '',
    email: '',
    age: 0,
  });
  return createElement(OgeForm<Signup>, {
    formData: signup,
    onFormDataChange: setSignup,
    showValidationSummary: true,
    layout: [
      { field: 'username', label: 'Username', validationRules: USERNAME_RULES },
      { field: 'email', label: 'E-mail', validationRules: EMAIL_RULES },
      { field: 'age', label: 'Age', validationRules: AGE_RULES },
    ],
  });
}

const MATCH_RULE: OgeValidationRule[] = [
  {
    type: 'custom',
    validate: ({ value, data }) =>
      value === data['password'] ? null : 'Passwords do not match',
  },
];

/** A `custom` rule sees the whole model — that is the cross-field story. */
function CustomRulesDemo(): ReactNode {
  const [account, setAccount] = useState<Account>({
    password: '',
    confirm: '',
  });
  return createElement(OgeForm<Account>, {
    formData: account,
    onFormDataChange: setAccount,
    layout: [
      { field: 'password', label: 'Password', isRequired: true },
      { field: 'confirm', label: 'Confirm', validationRules: MATCH_RULE },
    ],
  });
}

/** The standalone summary, fed from `onValidated`. */
function ValidationSummaryDemo(): ReactNode {
  const [ticket, setTicket] = useState<Ticket>({ title: '', reporter: '' });
  const [errors, setErrors] = useState<readonly OgeFormErrorEntry[]>([]);
  const form = useRef<OgeFormHandle<Ticket>>(null);
  return createElement(
    'div',
    null,
    createElement(OgeValidationSummary, {
      errors,
      onErrorClick: (entry: OgeFormErrorEntry) =>
        form.current?.focus(entry.field),
    }),
    createElement(OgeForm<Ticket>, {
      ref: form,
      formData: ticket,
      onFormDataChange: setTicket,
      onValidated: (event) => setErrors(event.errors),
      layout: [
        { field: 'title', label: 'Title', isRequired: true },
        { field: 'reporter', label: 'Reporter', isRequired: true },
      ],
      actions: createElement(OgeButton, {
        text: 'Save',
        stylingMode: 'contained',
        useSubmitBehavior: true,
      }),
    }),
  );
}

/** Defaults and strings for a whole subtree, in one provider. */
function FormsConfigDemo(): ReactNode {
  const [contact, setContact] = useState<Contact>({ name: '', phone: '' });
  return createElement(
    OgeFormsConfigProvider,
    {
      config: {
        labelLocation: 'start',
        showOptionalMark: true,
        messages: {
          requiredMark: '•',
          optionalLabel: 'isteğe bağlı',
          validationSummaryTitle: '{count} alan dikkatinizi bekliyor',
          validationSummaryTitleOne: '1 alan dikkatinizi bekliyor',
        },
      },
    },
    createElement(OgeForm<Contact>, {
      formData: contact,
      onFormDataChange: setContact,
      layout: [
        { field: 'name', label: 'Ad', isRequired: true },
        { field: 'phone', label: 'Telefon' },
      ],
    }),
  );
}

/**
 * The React demo cards of the form-validation page, rendered inside
 * `/components/forms/validation` when the reader has chosen React (ADR 0002).
 */
@Component({
  selector: 'app-react-forms-validation-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <app-demo-card
      [chips]="['required', 'stringLength', 'email', 'numeric']"
      heading="Declarative rules"
      description="Rules are plain objects with a string-union <code>type</code>, evaluated by <code>evaluateOgeValidationRules()</code> in <code>&#64;oge-ui/behavior</code> — the same function the Angular schema calls. Messages come from the <code>&#64;oge-ui/react-inputs</code> message table, so the text under a field is identical whether the editor is used inside a form or on its own."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="rules" />
    </app-demo-card>

    <app-demo-card
      [chips]="['custom', 'cross-field', 'async']"
      heading="Custom &amp; cross-field rules"
      description="A <code>custom</code> rule receives its own value and the whole model, which is how a confirm-password check works without a second engine. There is deliberately no <code>compare</code> rule type — a rule object that names another field loses type safety. An <code>async</code> rule is scheduled by the form and reported when it settles."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="custom" />
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;OgeValidationSummary&gt;', 'onValidated', 'focus()']"
      heading="Validation summary"
      description='The summary is a <code>role="alert"</code> list, so a failed submit is announced. Every row is a real button that focuses its field, and a failed submit also moves focus to the first invalid field and scrolls it into view. Let the form render it with <code>showValidationSummary</code>, or render it yourself — Angular reads the live <code>errors()</code> signal off the instance; React has no signal to read, so the rows come from <code>onValidated</code> or from <code>handle.errors</code>.'
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="summary" />
    </app-demo-card>

    <app-demo-card
      [chips]="['&lt;OgeFormsConfigProvider&gt;', 'messages']"
      heading="Configuration"
      description="Every user-facing string — the required mark, the optional mark, the summary heading — lives in the messages interface, so a translation is one provider. Layout defaults can be set the same way and overridden per instance."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="config" />
    </app-demo-card>
  `,
})
export class ReactFormsValidationDemos {
  protected readonly demos = FORMS_VALIDATION_DEMOS;

  protected readonly rules = () => createElement(DeclarativeRulesDemo);
  protected readonly custom = () => createElement(CustomRulesDemo);
  protected readonly summary = () => createElement(ValidationSummaryDemo);
  protected readonly config = () => createElement(FormsConfigDemo);
}
