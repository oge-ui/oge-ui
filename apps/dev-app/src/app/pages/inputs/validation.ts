import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { OgeButton, OgeButtonGroup } from '@oge-ui/buttons';
import {
  OgeNumberBox,
  OgeTextBox,
  type OgeInputValueCommittedEvent,
} from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { PageToc } from '../../shared/page-toc';
import {
  LINKED_SNIPPET,
  PENDING_SNIPPET,
  REACTIVE_SNIPPET,
  SIGNAL_SNIPPET,
  STANDALONE_SNIPPET,
} from './validation-snippets';

const SECTIONS = [
  'Standalone validation',
  'Reactive Forms',
  'Signal Forms',
  'Linked fields',
  'Async validation indicator',
] as const;

@Component({
  selector: 'app-inputs-validation',
  imports: [
    OgeTextBox,
    OgeNumberBox,
    OgeButton,
    OgeButtonGroup,
    ReactiveFormsModule,
    FormField,
    DemoCard,
    DocHeader,
    PageToc,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Input Validation"
      [chips]="[
        'formControl',
        '[formField]',
        'errorDisplay',
        'errorText',
        'pending',
      ]"
    >
      <p>
        One editor, three form systems. Validation messages resolve from the
        i18n config (<code>provideOgeInputsConfig</code>), show per the
        <code>errorDisplay</code> policy (default: after first blur) and are
        announced via <code>aria-live</code>. Signal Forms schema constraints
        (<code>required</code>, <code>minLength</code>, <code>max</code>…)
        auto-bind into the editors through the
        <code>FormValueControl</code> contract.
      </p>
    </app-doc-header>
    <app-page-toc [sections]="sections" />

    <app-demo-card
      [chips]="['standalone: [invalid] + errorText']"
      heading="Standalone validation"
      description="No forms library required: drive the error state yourself with the <code>invalid</code> flag and an explicit <code>errorText</code> message. <code>errorDisplay</code> chooses when errors surface — after the first blur (<code>touched</code>, the default), after the first edit (<code>dirty</code>), or immediately (<code>always</code>)."
      [code]="standaloneSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box
          label="Username"
          [(value)]="username"
          [invalid]="username().length > 0 && username().length < 3"
          errorText="At least 3 characters"
          errorDisplay="always"
        />
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['Reactive Forms', 'CVA house pattern', 'touched-gated errors']"
      heading="Reactive Forms"
      description="Bind with <code>formControl</code>/<code>formControlName</code> as usual — the editor renders the control's validation errors in its own subscript, localized through the messages config (<code>required</code>, <code>email</code>, <code>minlength</code>, <code>min</code>/<code>max</code>…). Touched state, <code>markAllAsTouched()</code>, disable/enable and form resets all flow through automatically."
      [code]="reactiveSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box
          label="E-mail"
          mode="email"
          [formControl]="email"
          hint="required + email"
        />
        <oge-number-box
          label="Quantity (1–10)"
          [formControl]="quantity"
          [min]="1"
          [max]="10"
          [showSpinButtons]="true"
        />
        <span class="self-center text-sm opacity-70">
          status: {{ email.status }} · touched: {{ email.touched }}
        </span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['Signal Forms', '[formField]', 'schema auto-binding']"
      heading="Signal Forms"
      description="The editors implement Angular's <code>FormValueControl</code> contract, so <code>[formField]</code> binds them natively: schema rules like <code>required()</code>, <code>minLength()</code> and <code>max()</code> push their errors <em>and</em> their constraints (native attributes, number clamping bounds) straight into the editor. Blur emits the contract's <code>touch</code>, driving the field's touched state."
      [code]="signalSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box label="Username" [formField]="f.username" />
        <oge-number-box label="Age" [formField]="f.age" />
        <span class="self-center text-sm opacity-70">
          value: {{ f.username().value() }} · valid:
          {{ f.username().valid() }}
        </span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="[
        'linked fields',
        '(valueCommitted)',
        'previousValue',
        'cross-field disable',
      ]"
      heading="Linked fields"
      description="Cross-field rules need no event wiring: bind one field's state to another's signal (<code>[disabled]</code>, <code>[min]</code>…) and the relationship stays live. When you do want an imperative hook, <code>valueCommitted</code> delivers <code>value</code>, <code>previousValue</code> and the originating DOM <code>event</code> — <code>undefined</code> event means the change was programmatic, not typed."
      [code]="linkedSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-button-group
          selectionMode="single"
          [(selectedKeys)]="invoiceType"
          ariaLabel="Invoice type"
        >
          <oge-button value="personal" text="Personal" />
          <oge-button value="company" text="Company" />
        </oge-button-group>
        <oge-text-box
          label="Tax ID"
          [(value)]="taxId"
          [disabled]="!invoiceType().includes('company')"
          hint="enabled for Company only"
        />
        <oge-number-box
          label="Min"
          [(value)]="minValue"
          [showSpinButtons]="true"
        />
        <oge-number-box
          label="Max"
          [(value)]="maxValue"
          [min]="minValue() ?? undefined"
          [showSpinButtons]="true"
          hint="lower bound follows Min"
          (valueCommitted)="lastChange.set($event)"
        />
        <span class="self-center text-sm opacity-70">
          @if (lastChange(); as change) {
            last change: {{ change.previousValue ?? 'empty' }} →
            {{ change.value ?? 'empty' }} ({{
              change.event ? 'user' : 'programmatic'
            }})
          } @else {
            Change Max…
          }
        </span>
      </div>
    </app-demo-card>

    <app-demo-card
      [chips]="['pending (async) + success icon']"
      heading="Async validation indicator"
      description="While a server-side check runs, set <code>pending</code> and a spinner appears in the suffix rail (with screen-reader text). Pair it with <code>showSuccessIcon</code> to confirm a passing value — the success mark hides automatically whenever the field is empty, invalid or pending."
      [code]="pendingSnippet"
      language="ts"
    >
      <div class="flex flex-wrap items-start gap-4">
        <oge-text-box
          label="API key"
          [(value)]="apiKey"
          [pending]="checking()"
          [showSuccessIcon]="'always'"
          hint="type to trigger a fake async check"
          (inputChange)="simulateCheck()"
        />
      </div>
    </app-demo-card>
  `,
})
export class InputsValidationPage {
  protected readonly sections = SECTIONS;
  protected readonly username = signal('');
  protected readonly apiKey = signal('');
  protected readonly checking = signal(false);
  protected readonly invoiceType = signal<readonly string[]>(['personal']);
  protected readonly taxId = signal('');
  protected readonly minValue = signal<number | null>(0);
  protected readonly maxValue = signal<number | null>(10);
  protected readonly lastChange = signal<OgeInputValueCommittedEvent<
    number | null
  > | null>(null);
  private checkTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly quantity = new FormControl<number | null>(null, {
    validators: [Validators.required],
  });

  protected readonly model = signal({
    username: '',
    age: null as number | null,
  });
  protected readonly f = form(this.model, (p) => {
    required(p.username);
    minLength(p.username, 3);
  });

  protected simulateCheck(): void {
    this.checking.set(true);
    if (this.checkTimer !== null) clearTimeout(this.checkTimer);
    this.checkTimer = setTimeout(() => this.checking.set(false), 900);
  }

  protected readonly standaloneSnippet = STANDALONE_SNIPPET;
  protected readonly reactiveSnippet = REACTIVE_SNIPPET;
  protected readonly signalSnippet = SIGNAL_SNIPPET;
  protected readonly linkedSnippet = LINKED_SNIPPET;
  protected readonly pendingSnippet = PENDING_SNIPPET;
}
