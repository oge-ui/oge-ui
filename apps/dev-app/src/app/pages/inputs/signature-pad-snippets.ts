import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSignaturePad'] },
  template: `<!-- Draw with a mouse, pen or finger. The value is a data: URL (PNG by
     default); Undo (or Ctrl+Z) removes the last stroke, Escape mid-stroke
     cancels it. -->
<oge-signature-pad
  label="Customer signature"
  [(value)]="signature"
  (strokeEnded)="strokes.set($event.strokeCount)"
/>
<p>Strokes: {{ strokes() }} · signed: {{ signature() !== null }}</p>`,
  body: `protected readonly signature = signal<string | null>(null);
protected readonly strokes = signal(0);`,
});

export const TYPED_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSignaturePad'] },
  template: `<!-- The keyboard-accessible alternative: Type renders a name in a
     script font into the same export. [(mode)] is two-way. -->
<oge-signature-pad
  label="Typed signature"
  fontFamily="'Segoe Script', 'Brush Script MT', cursive"
  [(mode)]="mode"
  [(value)]="signature"
/>`,
  body: `protected readonly mode = signal<OgeSignatureMode>('type');
protected readonly signature = signal<string | null>(null);`,
  types: { '@oge-ui/inputs': ['OgeSignatureMode'] },
});

export const SVG_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeSignaturePad'],
    '@oge-ui/buttons': ['OgeButton'],
  },
  template: `<!-- format="svg" exports vector paths and embeds the strokes, so a
     stored value restores an editable pad. The width follows the pen speed
     between minWidth and maxWidth. -->
<oge-signature-pad
  #pad
  label="Approval"
  format="svg"
  strokeColor="#1d4ed8"
  backgroundColor="#ffffff"
  [minWidth]="1.5"
  [maxWidth]="4.5"
  [height]="140"
  [(value)]="svg"
/>
<oge-button text="Save" (clicked)="saved = pad.toDataUrl('svg')" />
<oge-button text="Restore saved" (clicked)="svg.set(saved)" />`,
  body: `protected readonly svg = signal<string | null>(null);
protected saved: string | null = null;`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeSignaturePad'],
    '@oge-ui/buttons': ['OgeButton'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  template: `<!-- A FormValueControl and a ControlValueAccessor: formControl, ngModel
     and [formField] bind it. A stroke marks it touched; reset() empties it. -->
<oge-signature-pad label="Signature" [formControl]="sign" />
<p>Valid: {{ sign.valid }}</p>
<oge-button text="Reset" (clicked)="sign.reset()" />`,
  body: `protected readonly sign = new FormControl<string | null>(null, [
  Validators.required,
]);`,
});
