import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useRef, useState, type ReactNode } from 'react';
import { OgeButton, OgeButtonGroup } from '@oge-ui/react-buttons';
import {
  OgeNumberBox,
  OgeTextBox,
  type OgeFieldError,
} from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_VALIDATION_DEMOS } from './validation-snippets';

/**
 * TOC of the React view — the five sections of the Angular validation page,
 * in the same order. The two form-library sections keep their position and
 * their outcome under React-honest names: Angular's `formControl` and
 * `[formField]` bindings are Angular-only APIs, while in React any form
 * library (or plain state) feeds the same `errors`/`invalid`/`touched` props.
 */
export const REACT_INPUTS_VALIDATION_SECTIONS = [
  'Standalone validation',
  'Form library integration',
  'Schema-driven errors',
  'Linked fields',
  'Async validation indicator',
] as const;

const row = (...children: ReactNode[]) =>
  createElement('div', { className: 'demo-row demo-row-start' }, ...children);

const status = (key: string, text: string) =>
  createElement(
    'span',
    { key, className: 'self-center text-sm opacity-70' },
    text,
  );

/** Self-driven error state — no forms library involved. */
function StandaloneDemo(): ReactNode {
  const [username, setUsername] = useState('');
  return row(
    createElement(OgeTextBox, {
      key: 'username',
      label: 'Username',
      value: username,
      onValueChange: setUsername,
      invalid: username.length > 0 && username.length < 3,
      errorText: 'At least 3 characters',
      errorDisplay: 'always',
    }),
  );
}

/** Whatever produces them, the editor only needs the `OgeFieldError` shape. */
function emailErrors(value: string): OgeFieldError[] {
  if (value === '') return [{ kind: 'required' }];
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? [] : [{ kind: 'email' }];
}

/** External errors + touched gating — the React face of a form library. */
function FormLibraryDemo(): ReactNode {
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const errors = emailErrors(email);
  return row(
    createElement(OgeTextBox, {
      key: 'email',
      label: 'E-mail',
      mode: 'email',
      value: email,
      onValueChange: setEmail,
      errors,
      onBlur: () => setTouched(true),
      hint: 'required + email',
    }),
    createElement(OgeNumberBox, {
      key: 'quantity',
      label: 'Quantity (1–10)',
      value: quantity,
      onValueChange: setQuantity,
      errors: quantity === null ? [{ kind: 'required' }] : [],
      min: 1,
      max: 10,
      showSpinButtons: true,
    }),
    status(
      'st',
      `status: ${errors.length ? 'INVALID' : 'VALID'} · touched: ${touched}`,
    ),
  );
}

/** One rule set, read by both the messages and the constraint props. */
const schema = { username: { required: true, minLength: 3 } };

function usernameErrors(value: string): OgeFieldError[] {
  if (value === '') return [{ kind: 'required' }];
  if (value.length < schema.username.minLength) {
    return [{ kind: 'minLength', message: 'At least 3 characters' }];
  }
  return [];
}

/** Schema rules landing as both errors and native constraints. */
function SchemaDemo(): ReactNode {
  const [username, setUsername] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const errors = usernameErrors(username);
  return row(
    createElement(OgeTextBox, {
      key: 'username',
      label: 'Username',
      value: username,
      onValueChange: setUsername,
      errors,
      required: schema.username.required,
      minLength: schema.username.minLength,
    }),
    createElement(OgeNumberBox, {
      key: 'age',
      label: 'Age',
      value: age,
      onValueChange: setAge,
    }),
    status('st', `value: ${username} · valid: ${errors.length === 0}`),
  );
}

/** Cross-field rules, and the rich `onValueCommitted` payload. */
function LinkedDemo(): ReactNode {
  const [invoiceType, setInvoiceType] = useState<readonly string[]>([
    'personal',
  ]);
  const [taxId, setTaxId] = useState('');
  const [minValue, setMinValue] = useState<number | null>(0);
  const [maxValue, setMaxValue] = useState<number | null>(10);
  const [lastChange, setLastChange] = useState('Change Max…');
  return row(
    createElement(
      OgeButtonGroup,
      {
        key: 'type',
        selectionMode: 'single',
        selectedKeys: invoiceType,
        onSelectionChange: (change) => setInvoiceType(change.selectedKeys),
        ariaLabel: 'Invoice type',
      },
      createElement(OgeButton, {
        key: 'personal',
        value: 'personal',
        text: 'Personal',
      }),
      createElement(OgeButton, {
        key: 'company',
        value: 'company',
        text: 'Company',
      }),
    ),
    createElement(OgeTextBox, {
      key: 'tax',
      label: 'Tax ID',
      value: taxId,
      onValueChange: setTaxId,
      disabled: !invoiceType.includes('company'),
      hint: 'enabled for Company only',
    }),
    createElement(OgeNumberBox, {
      key: 'min',
      label: 'Min',
      value: minValue,
      onValueChange: setMinValue,
      showSpinButtons: true,
    }),
    createElement(OgeNumberBox, {
      key: 'max',
      label: 'Max',
      value: maxValue,
      onValueChange: setMaxValue,
      min: minValue ?? undefined,
      showSpinButtons: true,
      hint: 'lower bound follows Min',
      onValueCommitted: (e) =>
        setLastChange(
          `last change: ${e.previousValue ?? 'empty'} → ${e.value ?? 'empty'} ` +
            `(${e.event ? 'user' : 'programmatic'})`,
        ),
    }),
    status('st', lastChange),
  );
}

/** The `pending` spinner and the success mark. */
function PendingDemo(): ReactNode {
  const [apiKey, setApiKey] = useState('');
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const simulateCheck = () => {
    setChecking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setChecking(false), 900);
  };
  return row(
    createElement(OgeTextBox, {
      key: 'key',
      label: 'API key',
      value: apiKey,
      onValueChange: setApiKey,
      pending: checking,
      showSuccessIcon: 'always',
      hint: 'type to trigger a fake async check',
      onInputChange: simulateCheck,
    }),
  );
}

/**
 * The React half of the input validation page — the same five sections in the
 * same order as the Angular page, rendered as real React trees inside
 * `/components/inputs/validation` when the reader has chosen React (ADR 0002).
 * Angular's `formControl`/`[formField]` sections keep their place with React's
 * own route to the same outcome: externally supplied `errors`, touched-gated
 * display and schema constraints.
 */
@Component({
  selector: 'app-react-inputs-validation-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The React editors carry the class names but no styles of their own —
  // the docs pull the same SCSS the package build compiles.
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['standalone: invalid + errorText']"
      heading="Standalone validation"
      description="No forms library required: drive the error state yourself with the <code>invalid</code> flag and an explicit <code>errorText</code> message. <code>errorDisplay</code> chooses when errors surface — after the first blur (<code>touched</code>, the default), after the first edit (<code>dirty</code>), or immediately (<code>always</code>)."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="standalone" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'errors: OgeFieldError[]',
        'any form library',
        'touched-gated errors',
      ]"
      heading="Form library integration"
      description="React's counterpart of Angular's <code>formControl</code> binding: instead of a control directive, the editors take <code>errors</code> (an <code>OgeFieldError[]</code>) plus <code>invalid</code>, <code>touched</code>, <code>dirty</code> and <code>pending</code> — so React Hook Form, Formik, TanStack Form or plain state all render into the same subscript. Error kinds resolve to localized messages from the config (<code>required</code>, <code>email</code>, <code>minLength</code>, <code>min</code>/<code>max</code>…), and the default <code>errorDisplay=&quot;touched&quot;</code> gates them on the first blur — the field tracks its own touched state, so nothing extra is wired for that."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="formLibrary" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'schema rules',
        'errors + constraints',
        'Zod / Valibot / hand-written',
      ]"
      heading="Schema-driven errors"
      description="React's counterpart of Angular's <code>[formField]</code> schema binding: a schema (Zod, Valibot, Yup or a hand-written rule set) validates the model and each rule lands in the editor twice — as an <code>errors</code> entry for the message, and as the matching constraint prop (<code>required</code>, <code>minLength</code>, <code>min</code>/<code>max</code>) for the native attributes and the number clamping bounds. Blur marks the field touched, so messages appear exactly when Signal Forms would show them."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="schemaDriven" />
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'linked fields',
        'onValueCommitted',
        'previousValue',
        'cross-field disable',
      ]"
      heading="Linked fields"
      description="Cross-field rules need no event wiring: derive one field's props from another piece of state (<code>disabled</code>, <code>min</code>…) and the relationship stays live. When you do want an imperative hook, <code>onValueCommitted</code> delivers <code>value</code>, <code>previousValue</code> and the originating DOM <code>event</code> — an <code>undefined</code> event means the change was programmatic, not typed."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="linked" />
    </app-demo-card>

    <app-demo-card
      [chips]="['pending (async) + success icon']"
      heading="Async validation indicator"
      description="While a server-side check runs, set <code>pending</code> and a spinner appears in the suffix rail (with screen-reader text). Pair it with <code>showSuccessIcon</code> to confirm a passing value — the success mark hides automatically whenever the field is empty, invalid or pending."
      [code]="demos[4].source"
      language="tsx"
    >
      <app-react-host [render]="pending" />
    </app-demo-card>
  `,
})
export class ReactInputsValidationDemos {
  protected readonly demos = INPUTS_VALIDATION_DEMOS;

  protected readonly standalone = () => createElement(StandaloneDemo);
  protected readonly formLibrary = () => createElement(FormLibraryDemo);
  protected readonly schemaDriven = () => createElement(SchemaDemo);
  protected readonly linked = () => createElement(LinkedDemo);
  protected readonly pending = () => createElement(PendingDemo);
}
