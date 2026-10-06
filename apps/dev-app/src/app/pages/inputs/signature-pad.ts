import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { OgeButton } from '@oge-ui/buttons';
import { OgeSignaturePad, type OgeSignatureMode } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_SIGNATURE_PAD_SECTIONS,
  ReactInputsSignaturePadDemos,
} from '../react-inputs/signature-pad';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  SVG_SNIPPET,
  TYPED_SNIPPET,
} from './signature-pad-snippets';

const SECTIONS = [
  'Getting started',
  'Typed signature',
  'SVG and pen options',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-signature-pad',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeButton,
    OgeSignaturePad,
    ReactiveFormsModule,
    ReactInputsSignaturePadDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Signature Pad"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['pointer + touch', 'PNG / SVG', 'typed alternative', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeSignaturePad /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> captures a signature as a form
          value: smoothed, speed-weighted strokes on the shared pointer-gesture
          machine, undo and clear, a typed-signature mode as the keyboard
          alternative, and a <code>data:</code> URL value (<code>value</code> +
          <code>onValueChange</code>, or <code>defaultValue</code>).
        </p>
      } @else {
        <p>
          A signature capture field — Kendo's and Syncfusion's Signature: draw
          with a mouse, pen or finger and the strokes are smoothed into curves
          whose width follows the pen speed. The value is a
          <code>data:</code> URL of the signature (PNG, or SVG that also carries
          the strokes so a stored value restores an editable pad).
        </p>
        <p>
          <strong>Type</strong> is the keyboard-accessible alternative: a real
          labelled text field whose text is rendered in a script font into the
          same export. Works standalone via <code>[(value)]</code>, with Signal
          Forms via <code>[formField]</code>, and with reactive/template forms
          via <code>formControl</code>/<code>ngModel</code>.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-signature-pad-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'undo', 'Escape cancels']"
        heading="Getting started"
        description="Draw on the surface; each pen-up commits a PNG <code>data:</code> URL. Undo (or Ctrl+Z while focus is in the pad) removes the last stroke, Escape mid-stroke cancels it, Clear empties the pad. Strokes are stored surface-relative, so resizing redraws the same signature."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-signature-pad
          label="Customer signature"
          [(value)]="signature"
          (strokeEnded)="strokes.set($event.strokeCount)"
        />
        <p class="mt-3 text-sm">
          Strokes: <code data-testid="signature-strokes">{{ strokes() }}</code>
          · signed:
          <code data-testid="signature-signed">{{ signature() !== null }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['mode: type', 'fontFamily', 'keyboard']"
        heading="Typed signature"
        description="The keyboard alternative (WCAG 2.1.1): <strong>Type</strong> switches to a labelled text field, and the name is rendered in <code>fontFamily</code> into the same export. <code>[(mode)]</code> is two-way; <code>allowTyping</code> hides the switch."
        [code]="typedSnippet"
        language="ts"
      >
        <oge-signature-pad
          label="Typed signature"
          [(mode)]="mode"
          [(value)]="typed"
        />
        <p class="mt-3 text-sm">
          Mode: <code data-testid="signature-mode">{{ mode() }}</code>
          · signed:
          <code data-testid="signature-typed-signed">{{
            typed() !== null
          }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['format: svg', 'minWidth / maxWidth', 'toDataUrl()']"
        heading="SVG and pen options"
        description='<code>format="svg"</code> exports vector paths and embeds the strokes, so writing a stored value back restores an editable pad. <code>minWidth</code>/<code>maxWidth</code> bound the speed-weighted width, <code>strokeColor</code> and <code>backgroundColor</code> set the ink and the baked-in background, <code>height</code> the surface.'
        [code]="svgSnippet"
        language="ts"
      >
        <oge-signature-pad
          #pad
          label="Approval"
          format="svg"
          [minWidth]="1.5"
          [maxWidth]="4.5"
          [height]="140"
          [(value)]="svg"
        />
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <oge-button
            stylingMode="outlined"
            size="sm"
            text="Save"
            data-testid="signature-save"
            (clicked)="saved = pad.toDataUrl('svg')"
          />
          <oge-button
            stylingMode="outlined"
            size="sm"
            text="Restore saved"
            data-testid="signature-restore"
            (clicked)="svg.set(saved)"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required', 'reset()']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor. A finished stroke marks the control touched, so <code>required</code> shows once the signer has tried; <code>reset()</code> empties the pad."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-signature-pad label="Signature" [formControl]="sign" />
        <p class="mt-3 text-sm">
          Valid: <code data-testid="signature-valid">{{ sign.valid }}</code>
          <oge-button
            class="ms-3"
            stylingMode="outlined"
            size="sm"
            text="Reset"
            data-testid="signature-reset"
            (clicked)="sign.reset()"
          />
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsSignaturePadPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_SIGNATURE_PAD_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly typedSnippet = TYPED_SNIPPET;
  protected readonly svgSnippet = SVG_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly signature = signal<string | null>(null);
  protected readonly strokes = signal(0);
  protected readonly mode = signal<OgeSignatureMode>('type');
  protected readonly typed = signal<string | null>(null);
  protected readonly svg = signal<string | null>(null);
  protected saved: string | null = null;
  protected readonly sign = new FormControl<string | null>(null, [
    Validators.required,
  ]);
}
