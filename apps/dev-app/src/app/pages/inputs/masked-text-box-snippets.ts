import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs/masked-text-box': ['OgeMaskedTextBox'] },
  template: `<!-- 0 = a required digit; ( ) - and the space are literals the caret
     skips. The value is the raw digits — no literals, no placeholders. -->
<oge-masked-text-box
  label="Phone"
  mask="(000) 000-0000"
  [(value)]="phone"
  autocomplete="tel-national"
/>
<p>Value: <code>{{ phone() }}</code></p>`,
  body: `protected readonly phone = signal('');`,
});

export const SYNTAX_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeInputPrefix'],
    '@oge-ui/inputs/masked-text-box': ['OgeMaskedTextBox'],
  },
  types: { '@oge-ui/inputs': ['OgeMaskRules'] },
  template: `<!-- L = a required letter (any script), 0 = a digit -->
<oge-masked-text-box label="Licence plate" mask="00 LLL 000" [(value)]="plate" />

<!-- a custom rule: H accepts one hex digit (always a required slot) -->
<oge-masked-text-box label="Hex color" mask="HHHHHH" [maskRules]="hexRules" [(value)]="hex">
  <span ogeInputPrefix>#</span>
</oge-masked-text-box>

<!-- 9 = an optional digit; "ext. " has no rule characters, so it is literal -->
<oge-masked-text-box label="Extension" mask="ext. 0999" [(value)]="extension" />

<!-- a backslash makes a rule character literal: "A" here is printed, not typed -->
<oge-masked-text-box label="Product code" [mask]="productMask" [(value)]="product" />`,
  body: `protected readonly plate = signal('');
protected readonly hex = signal('');
protected readonly extension = signal('');
protected readonly product = signal('');
protected readonly hexRules: OgeMaskRules = { H: /[0-9a-f]/i };
protected readonly productMask = '\\\\A-000-LL';`,
});

export const VALUES_SNIPPET = demoSource({
  use: { '@oge-ui/inputs/masked-text-box': ['OgeMaskedTextBox'] },
  types: { '@oge-ui/inputs': ['OgeMaskCompletedEvent'] },
  template: `<!-- raw value (default) vs the formatted text with includeLiterals -->
<oge-masked-text-box label="Card (raw)" mask="0000 0000 0000 0000" [(value)]="raw" />
<oge-masked-text-box
  label="Card (with literals)"
  mask="0000 0000 0000 0000"
  [includeLiterals]="true"
  [(value)]="formatted"
  (maskCompleted)="onCompleted($event)"
/>
<p>raw: <code>{{ raw() }}</code> · formatted: <code>{{ formatted() }}</code></p>
<p>{{ status() }}</p>`,
  body: `protected readonly raw = signal('');
protected readonly formatted = signal('');
protected readonly status = signal('Type all 16 digits');

// fires once, when the last required slot is filled
protected onCompleted(event: OgeMaskCompletedEvent): void {
  this.status.set(\`Complete: \${event.maskedValue}\`);
}`,
});

export const DISPLAY_SNIPPET = demoSource({
  use: { '@oge-ui/inputs/masked-text-box': ['OgeMaskedTextBox'] },
  template: `<!-- a custom placeholder character -->
<oge-masked-text-box label="Date code" mask="00.00.0000" maskChar="•" [(value)]="code" />

<!-- the mask only appears on focus — the placeholder shows while blurred -->
<oge-masked-text-box
  label="Postal code"
  mask="00000"
  showMaskMode="onFocus"
  placeholder="5 digits"
  [(value)]="postal"
/>

<!-- floating labels keep the empty mask hidden until the field is focused -->
<oge-masked-text-box label="PIN" labelMode="floating" mask="0000" [(value)]="pin" />`,
  body: `protected readonly code = signal('');
protected readonly postal = signal('');
protected readonly pin = signal('');`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@angular/forms': ['ReactiveFormsModule'],
    '@angular/forms/signals': ['FormField'],
    '@oge-ui/inputs/masked-text-box': ['OgeMaskedTextBox'],
  },
  helpers: {
    '@angular/forms': ['FormControl', 'Validators'],
    '@angular/forms/signals': ['form', 'required', 'validate'],
    '@oge-ui/behavior': ['ogeMaskComplete'],
  },
  template: `<!-- Signal Forms: the schema checks the mask with ogeMaskComplete() -->
<oge-masked-text-box label="IBAN" mask="LL00 0000 0000 0000 0000 00" [formField]="f.iban" />

<!-- reactive forms: the editor adds a { mask } validator to the control itself -->
<oge-masked-text-box
  label="Tax number"
  mask="000-000-0000"
  maskInvalidMessage="Enter all 10 digits"
  [formControl]="taxNumber"
/>`,
  body: `protected readonly model = signal({ iban: '' });
protected readonly f = form(this.model, (p) => {
  required(p.iban);
  validate(p.iban, ({ value }) =>
    ogeMaskComplete('LL00 0000 0000 0000 0000 00', value())
      ? undefined
      : { kind: 'mask' },
  );
});

protected readonly taxNumber = new FormControl('', {
  nonNullable: true,
  validators: [Validators.required],
});`,
});

export const TEXT_BOX_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeTextBox'] },
  template: `<!-- the same engine on the plain text box: mask is optional there -->
<oge-text-box
  label="Time"
  mask="00:00"
  [includeLiterals]="true"
  [showClearButton]="true"
  [(value)]="time"
/>`,
  body: `protected readonly time = signal('');`,
});
