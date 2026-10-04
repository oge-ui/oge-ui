import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { ogeMaskComplete } from '@oge-ui/behavior';
import {
  OgeInputPrefix,
  OgeTextBox,
  type OgeMaskCompletedEvent,
  type OgeMaskRules,
} from '@oge-ui/inputs';
import { OgeMaskedTextBox } from '@oge-ui/inputs/masked-text-box';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_MASKED_TEXT_BOX_SECTIONS,
  ReactInputsMaskedTextBoxDemos,
} from '../react-inputs/masked-text-box';
import {
  BASIC_SNIPPET,
  DISPLAY_SNIPPET,
  FORMS_SNIPPET,
  SYNTAX_SNIPPET,
  TEXT_BOX_SNIPPET,
  VALUES_SNIPPET,
} from './masked-text-box-snippets';

const SECTIONS = [
  'Getting started',
  'Mask syntax and custom rules',
  'Raw and formatted values',
  'Mask display',
  'Validation and forms',
  'Mask on the text box',
] as const;

const IBAN_MASK = 'LL00 0000 0000 0000 0000 00';

@Component({
  selector: 'app-inputs-masked-text-box',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeMaskedTextBox,
    OgeTextBox,
    OgeInputPrefix,
    FormField,
    ReactiveFormsModule,
    ReactInputsMaskedTextBoxDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Masked Text Box"
      category="Inputs"
      [chips]="fw.isReact() ? reactChips : chips"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeMaskedTextBox /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> formats typed text against a
          fixed pattern — phone numbers, IBANs, licence plates, product codes.
          Typing fills the slot at the caret and skips literals, Backspace and
          Delete empty a slot without shifting the rest, paste takes raw or
          formatted text, and IME composition is applied once it settles.
        </p>
        <p>
          The engine is <code>&#64;oge-ui/behavior</code>'s
          <code>OgeMaskCore</code>, the one the Angular editor runs, and the
          same <code>mask</code> prop works on <code>&lt;OgeTextBox&gt;</code>.
          The value is the controlled/uncontrolled pair — raw characters by
          default, the formatted text with <code>includeLiterals</code>.
        </p>
      } @else {
        <p>
          A mask-first text box — the Kendo / Syncfusion
          <code>MaskedTextBox</code>, DevExtreme's <code>mask</code> option.
          Typing fills the slot at the caret and skips literals, Backspace and
          Delete empty a slot without shifting the rest, paste takes raw or
          formatted text, and IME composition is applied once it settles.
          Positions are logical, so the editor behaves the same in RTL.
        </p>
        <p>
          The engine is <code>&#64;oge-ui/behavior</code>'s
          <code>OgeMaskCore</code>, and the same <code>mask</code> input works
          on <code>&lt;oge-text-box&gt;</code>. It binds through
          <code>[(value)]</code>, <code>[formField]</code> or
          <code>formControl</code> like every other editor in the family.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-masked-text-box-demos />
    } @else {
      <app-demo-card
        [chips]="['mask', 'raw value', 'caret skips literals']"
        heading="Getting started"
        description='<code>0</code> is a required digit; the parentheses, the space and the dash are literals the caret skips. The value is the raw digits — no literals, no placeholders — and a digit-only mask asks mobile keyboards for the numeric layout (<code>inputmode="numeric"</code>).'
        [code]="basicSnippet"
        language="ts"
      >
        <oge-masked-text-box
          label="Phone"
          mask="(000) 000-0000"
          [(value)]="phone"
          autocomplete="tel-national"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="masked-phone-value">{{ phone() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['0 9 # L l A a C c', 'maskRules', 'escapes']"
        heading="Mask syntax and custom rules"
        description="<code>0</code> digit, <code>9</code> optional digit, <code>#</code> digit/space/sign, <code>L</code>/<code>l</code> letter (required/optional, any script), <code>A</code>/<code>a</code> letter or digit, <code>C</code>/<code>c</code> any character; a backslash makes a rule character literal. <code>maskRules</code> adds single-character keys — a <code>RegExp</code>, a string of allowed characters or a predicate."
        [code]="syntaxSnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-masked-text-box
            label="Licence plate"
            mask="00 LLL 000"
            [(value)]="plate"
          />
          <oge-masked-text-box
            label="Hex color"
            mask="HHHHHH"
            [maskRules]="hexRules"
            [(value)]="hex"
          >
            <span ogeInputPrefix>#</span>
          </oge-masked-text-box>
          <oge-masked-text-box
            label="Extension"
            mask="ext. 0999"
            [(value)]="extension"
          />
          <oge-masked-text-box
            label="Product code"
            [mask]="productMask"
            [(value)]="product"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['includeLiterals', 'maskCompleted']"
        heading="Raw and formatted values"
        description="By default the value is the raw characters (DevExtreme's <code>useMaskedValue: false</code>, Kendo's raw value); <code>includeLiterals</code> commits the formatted text instead. <code>maskCompleted</code> fires once, when the last required slot is filled."
        [code]="valuesSnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-masked-text-box
            label="Card (raw)"
            mask="0000 0000 0000 0000"
            [(value)]="cardRaw"
          />
          <oge-masked-text-box
            label="Card (with literals)"
            mask="0000 0000 0000 0000"
            [includeLiterals]="true"
            [(value)]="cardFormatted"
            (maskCompleted)="onCompleted($event)"
          />
        </div>
        <p class="mt-3 text-sm">
          raw: <code data-testid="masked-card-raw">{{ cardRaw() }}</code> ·
          formatted:
          <code data-testid="masked-card-formatted">{{ cardFormatted() }}</code>
        </p>
        <p class="text-sm" data-testid="masked-card-status">{{ status() }}</p>
      </app-demo-card>

      <app-demo-card
        [chips]="['maskChar', 'showMaskMode', 'floating label']"
        heading="Mask display"
        description="<code>maskChar</code> sets the placeholder of empty slots. <code>showMaskMode: 'onFocus'</code> keeps the empty mask hidden while blurred so the <code>placeholder</code> shows; a floating label does the same, so the label never sits on top of the mask."
        [code]="displaySnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-masked-text-box
            label="Date code"
            mask="00.00.0000"
            maskChar="•"
            [(value)]="code"
          />
          <oge-masked-text-box
            label="Postal code"
            mask="00000"
            showMaskMode="onFocus"
            placeholder="5 digits"
            [(value)]="postal"
          />
          <oge-masked-text-box
            label="PIN"
            labelMode="floating"
            mask="0000"
            [(value)]="pin"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['ogeMaskComplete', 'formControl', 'maskInvalidMessage']"
        heading="Validation and forms"
        description="An unfinished mask flags the field (after blur, per <code>errorDisplay</code>) with <code>maskInvalidMessage</code> or the catalog's <code>maskInvalidError</code>. A reactive control gets a <code>{ mask }</code> validator attached automatically; a Signal Forms schema checks the same rule with <code>ogeMaskComplete()</code>, which also runs on a server."
        [code]="formsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-masked-text-box
            label="IBAN"
            [mask]="ibanMask"
            [formField]="f.iban"
          />
          <oge-masked-text-box
            label="Tax number"
            mask="000-000-0000"
            maskInvalidMessage="Enter all 10 digits"
            [formControl]="taxNumber"
          />
        </div>
        <p class="mt-3 text-sm">
          IBAN valid:
          <code data-testid="masked-iban-valid">{{ f.iban().valid() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['oge-text-box', 'mask input']"
        heading="Mask on the text box"
        description="The same engine on the plain text box: <code>mask</code> is optional there, so a time field can keep its clear button, prefix/suffix slots and counter-free chrome. Without a mask it is the ordinary text box."
        [code]="textBoxSnippet"
        language="ts"
      >
        <oge-text-box
          label="Time"
          mask="00:00"
          [includeLiterals]="true"
          [showClearButton]="true"
          [(value)]="time"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="masked-time-value">{{ time() }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsMaskedTextBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_MASKED_TEXT_BOX_SECTIONS;
  protected readonly chips = [
    'shared mask engine',
    'IME-safe',
    'Signal Forms',
    'raw or formatted',
  ];
  protected readonly reactChips = [
    'shared mask engine',
    'IME-safe',
    'controlled props',
    'raw or formatted',
  ];
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly syntaxSnippet = SYNTAX_SNIPPET;
  protected readonly valuesSnippet = VALUES_SNIPPET;
  protected readonly displaySnippet = DISPLAY_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;
  protected readonly textBoxSnippet = TEXT_BOX_SNIPPET;

  protected readonly phone = signal('');
  protected readonly plate = signal('');
  protected readonly hex = signal('');
  protected readonly extension = signal('');
  protected readonly product = signal('');
  protected readonly hexRules: OgeMaskRules = { H: /[0-9a-f]/i };
  protected readonly productMask = '\\A-000-LL';
  protected readonly cardRaw = signal('');
  protected readonly cardFormatted = signal('');
  protected readonly status = signal('Type all 16 digits');
  protected readonly code = signal('');
  protected readonly postal = signal('');
  protected readonly pin = signal('');
  protected readonly time = signal('');

  protected readonly ibanMask = IBAN_MASK;
  protected readonly model = signal({ iban: '' });
  protected readonly f = form(this.model, (p) => {
    required(p.iban);
    validate(p.iban, ({ value }) =>
      ogeMaskComplete(IBAN_MASK, value()) ? undefined : { kind: 'mask' },
    );
  });
  protected readonly taxNumber = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected onCompleted(event: OgeMaskCompletedEvent): void {
    this.status.set(`Complete: ${event.maskedValue}`);
  }
}
