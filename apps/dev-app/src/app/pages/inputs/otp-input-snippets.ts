import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeOtpInput'] },
  types: { '@oge-ui/inputs': ['OgeOtpCompletedEvent'] },
  template: `<!-- One labelled role="group"; one Tab stop (the caret cell). Typing
     fills and advances, Backspace clears and steps back, arrows move, and a
     paste — or the SMS autofill (autocomplete="one-time-code") — fills
     every cell. (completed) fires once all cells hold a character. -->
<oge-otp-input
  label="Verification code"
  hint="We sent a 6-digit code to your phone."
  [(value)]="code"
  (completed)="onCompleted($event)"
/>
<p>Value: <code>{{ code() }}</code> · {{ status() }}</p>`,
  body: `protected readonly code = signal('');
protected readonly status = signal('Waiting for the code');

protected onCompleted(event: OgeOtpCompletedEvent): void {
  this.status.set('Verifying ' + event.value);
}`,
});

export const TYPES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeOtpInput'] },
  template: `<!-- type: 'numeric' (digits; Arabic-Indic and full-width digits are
     folded to ASCII) | 'alphanumeric' | 'alphabetic'. letterCase upper-cases
     letters; groupSize draws a decorative separator between groups. -->
<oge-otp-input
  label="Licence key"
  type="alphanumeric"
  letterCase="upper"
  [length]="8"
  [groupSize]="4"
  [(value)]="key"
/>`,
  body: `protected readonly key = signal('');`,
});

export const MASKED_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeOtpInput'] },
  template: `<!-- masked hides the characters like a password field; placeholder
     marks the empty cells; size picks the cell scale. -->
<oge-otp-input
  label="PIN"
  [length]="4"
  [masked]="true"
  placeholder="•"
  size="lg"
  [(value)]="pin"
/>`,
  body: `protected readonly pin = signal('');`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeOtpInput'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  template: `<!-- FormValueControl + ControlValueAccessor. The value is always the
     contiguous characters entered, so a length validator means "complete". -->
<oge-otp-input label="Code" [length]="6" [formControl]="otp" />
<p>Valid: <code>{{ otp.valid }}</code></p>`,
  body: `protected readonly otp = new FormControl('', [
  Validators.required,
  Validators.minLength(6),
]);`,
});
