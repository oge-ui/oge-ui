import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  OgeOtpInput,
  type OgeOtpCompletedEvent,
} from '@oge-ui/inputs/otp-input';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_OTP_INPUT_SECTIONS,
  ReactInputsOtpInputDemos,
} from '../react-inputs/otp-input';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  MASKED_SNIPPET,
  TYPES_SNIPPET,
} from './otp-input-snippets';

const SECTIONS = [
  'Getting started',
  'Character types and groups',
  'Masked PIN',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-otp-input',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeOtpInput,
    ReactiveFormsModule,
    ReactInputsOtpInputDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="OTP Input"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['one-time-code', 'paste', 'autofill', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeOtpInput /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a one-time-code / PIN field
          of single-character cells that behave as one editor: typing advances,
          Backspace steps back, a paste or the browser's SMS autofill fills
          every cell, and <code>onCompleted</code> fires once the code is whole.
          Controlled with <code>value</code> + <code>onValueChange</code>, or
          uncontrolled with <code>defaultValue</code>.
        </p>
      } @else {
        <p>
          A one-time-code / PIN field — Kendo's OTP Input, PrimeNG's InputOtp:
          <code>length</code> single-character cells in one labelled
          <code>role="group"</code>, each cell named "Character n of m", with a
          single Tab stop on the caret cell. Typing advances, Backspace steps
          back, Delete closes the gap and a paste — or the SMS autofill through
          <code>autocomplete="one-time-code"</code> — fills every cell. The
          value is always the contiguous characters entered, so
          <code>value.length === length</code> means complete.
        </p>
        <p>
          Works standalone via <code>[(value)]</code>, with Signal Forms via
          <code>[formField]</code>, and with reactive/template forms via
          <code>formControl</code>/<code>ngModel</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-otp-input-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'completed', 'autocomplete=one-time-code']"
        heading="Getting started"
        description="Type, paste or let the browser autofill the code. Arrows (RTL-mirrored) and Home/End move between cells, Backspace clears and steps back; <code>(completed)</code> fires once every cell holds a character."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-otp-input
          label="Verification code"
          hint="We sent a 6-digit code to your phone."
          [(value)]="code"
          (completed)="onCompleted($event)"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="otp-value">{{ code() }}</code> ·
          <span data-testid="otp-status">{{ status() }}</span>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['type', 'letterCase', 'groupSize']"
        heading="Character types and groups"
        description="<code>type</code> accepts <code>'numeric'</code> (script and full-width digits fold to ASCII), <code>'alphanumeric'</code> or <code>'alphabetic'</code>; rejected characters never land. <code>letterCase</code> upper- or lower-cases letters and <code>groupSize</code> draws a decorative separator."
        [code]="typesSnippet"
        language="ts"
      >
        <oge-otp-input
          label="Licence key"
          type="alphanumeric"
          letterCase="upper"
          [length]="8"
          [groupSize]="4"
          [(value)]="key"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="otp-key">{{ key() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['masked', 'placeholder', 'size']"
        heading="Masked PIN"
        description="<code>masked</code> hides the characters like a password field; <code>placeholder</code> marks the empty cells and <code>size</code> picks the cell scale."
        [code]="maskedSnippet"
        language="ts"
      >
        <oge-otp-input
          label="PIN"
          [length]="4"
          [masked]="true"
          placeholder="•"
          size="lg"
          [(value)]="pin"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.minLength']"
        heading="Inside a form"
        description='A <code>FormValueControl</code> and a ControlValueAccessor: <code>formControl</code>, <code>ngModel</code> and <code>[formField]</code> all bind it. Because the value is the contiguous characters entered, a length validator means "complete".'
        [code]="formsSnippet"
        language="ts"
      >
        <oge-otp-input label="Code" [length]="6" [formControl]="otp" />
        <p class="mt-3 text-sm">
          Valid: <code>{{ otp.valid }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsOtpInputPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_OTP_INPUT_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly typesSnippet = TYPES_SNIPPET;
  protected readonly maskedSnippet = MASKED_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly code = signal('');
  protected readonly status = signal('Waiting for the code');
  protected readonly key = signal('');
  protected readonly pin = signal('');
  protected readonly otp = new FormControl('', [
    Validators.required,
    Validators.minLength(6),
  ]);

  protected onCompleted(event: OgeOtpCompletedEvent): void {
    this.status.set('Verifying ' + event.value);
  }
}
