import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeColorBox } from '@oge-ui/inputs';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  REACT_INPUTS_COLOR_BOX_SECTIONS,
  ReactInputsColorBoxDemos,
} from '../react-inputs/color-box';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  BUTTONS_SNIPPET,
  FORMATS_SNIPPET,
  FORMS_SNIPPET,
  PALETTE_SNIPPET,
  TYPED_SNIPPET,
} from './color-box-snippets';

const SECTIONS = [
  'Getting started',
  'Formats and alpha',
  'Palette view',
  'Apply with buttons',
  'Typed colors',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-color-box',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeColorBox,
    OgeForm,
    ReactInputsColorBoxDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Color Box"
      category="Inputs"
      [chips]="[
        'composed a11y',
        'CSS color parsing',
        'Signal Forms',
        'useButtons',
      ]"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeColorBox /&gt;</code> is a color editor on the shared
          field chrome: the field shows a live swatch and the committed CSS
          color string; the popup composes a saturation/brightness surface,
          hue/alpha sliders, hex + channel inputs and an optional swatch
          palette. No WAI-ARIA APG color-picker pattern exists, so the popup is
          built from primitives — a <code>role="dialog"</code> that takes real
          DOM focus, APG sliders with mandatory <code>aria-valuetext</code>, a
          2-axis surface with <code>aria-roledescription</code>, and a
          <code>role="grid"</code> palette. The value is the standard React
          controlled/uncontrolled pair: <code>value</code> +
          <code>onValueChange</code>, or <code>defaultValue</code> alone.
        </p>
        <p>
          For a plain form field with no format control, palette or alpha, the
          native <code>&amp;lt;input type="color"&amp;gt;</code> is smaller and
          fully accessible out of the box — reach for this editor when you need
          the string format contract, typed CSS color input, swatch governance
          or the draft/OK commit flow.
        </p>
      } @else {
        <p>
          A color editor on the shared field chrome: the field shows a live
          swatch and the committed CSS color string; the popup composes a
          saturation/brightness surface, hue/alpha sliders, hex + channel inputs
          and an optional swatch palette. No WAI-ARIA APG color-picker pattern
          exists, so the popup is built from primitives — a
          <code>role="dialog"</code> that takes real DOM focus, APG sliders with
          mandatory <code>aria-valuetext</code>, a 2-axis surface with
          <code>aria-roledescription</code>, and a <code>role="grid"</code>
          palette.
        </p>
        <p>
          For a plain form field with no format control, palette or alpha, the
          native <code>&amp;lt;input type="color"&amp;gt;</code> is smaller and
          fully accessible out of the box — reach for this editor when you need
          the string format contract, typed CSS color input, swatch governance
          or the draft/OK commit flow.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-color-box-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'swatch', 'dialog focus']"
        heading="Getting started"
        description="The committed value is a CSS color string — bind it straight to styles. Opening moves DOM focus onto the gradient surface; Escape restores it to the input. In Chromium the panel also offers an eyedropper (the <code>EyeDropper</code> API — progressive enhancement, no polyfill). <code>valueCommitted</code> reports every change with <code>previousValue</code>."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-color-box
          label="Brand color"
          [(value)]="brand"
          [showClearButton]="true"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="color-value">{{ brand() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['format', 'editAlphaChannel', 'alpha widening']"
        heading="Formats and alpha"
        description="<code>format: 'hex' | 'rgb' | 'rgba' | 'hsl'</code> fixes the committed shape (hex default — the DevExtreme choice). <code>editAlphaChannel</code> adds the alpha slider and input; translucent colors widen the output to carry alpha, opaque ones stay compact. Without it alpha is coerced to 1 on commit."
        [code]="formatsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-color-box
            label="Overlay"
            format="rgba"
            [editAlphaChannel]="true"
            [(value)]="overlay"
          />
          <oge-color-box label="Accent (hsl)" format="hsl" [(value)]="accent" />
        </div>
        <p class="mt-3 text-sm">
          Overlay: <code>{{ overlay() }}</code> — Accent:
          <code>{{ accent() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['view', 'palette', 'role=grid']"
        heading="Palette view"
        description="<code>view: 'gradient' | 'palette' | 'both'</code>. The palette is an APG grid — roving tabindex, arrow/Home/End/Ctrl+Home navigation, Enter/Space picks and closes. The selected cell's checkmark picks black or white by WCAG contrast against the swatch."
        [code]="paletteSnippet"
        language="ts"
      >
        <oge-color-box
          label="Tag color"
          view="palette"
          [palette]="swatches"
          [paletteColumns]="5"
          [(value)]="tag"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['applyValueMode', 'draft', 'OK/Cancel']"
        heading="Apply with buttons"
        description="<code>applyValueMode: 'useButtons'</code> collects panel interactions in a draft and commits only on OK; Cancel, Escape or an outside click discards — the date box's exact contract, with Kendo's committed&nbsp;|&nbsp;draft preview pair in the footer. The default <code>'instantly'</code> commits live while dragging (<code>[debounce]</code> throttles the stream)."
        [code]="buttonsSnippet"
        language="ts"
      >
        <oge-color-box
          label="Theme color"
          view="both"
          applyValueMode="useButtons"
          [(value)]="theme"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['CSS parsing', 'named colors', 'revert on blur']"
        heading="Typed colors"
        description="Typed text parses any CSS color — hex in all four lengths, <code>rgb()</code>/<code>rgba()</code> in comma and space/slash syntax, <code>hsl()</code>, the named colors, <code>transparent</code>. Commits normalize to <code>format</code>; unparseable text shows the invalid state while typing and reverts on blur. <code>acceptCustomValue=false</code> makes the text read-only."
        [code]="typedSnippet"
        language="ts"
      >
        <div class="flex flex-wrap gap-4">
          <oge-color-box label="Any CSS color" [(value)]="typed" />
          <oge-color-box
            label="Picker only"
            [acceptCustomValue]="false"
            [(value)]="typed"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['editorType: colorBox', 'editorOptions']"
        heading="Inside a form"
        description="A chrome'd editor: <code>editorType: 'colorBox'</code> with <code>colorFormat</code>, <code>editAlphaChannel</code>, <code>view</code> and <code>palette</code> under <code>editorOptions</code>. Works in all three form bindings."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-form [(formData)]="branding" [items]="formItems" />
        <p class="mt-3 text-sm">
          Model: <code>{{ branding().primary }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsColorBoxPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_COLOR_BOX_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly formatsSnippet = FORMATS_SNIPPET;
  protected readonly paletteSnippet = PALETTE_SNIPPET;
  protected readonly buttonsSnippet = BUTTONS_SNIPPET;
  protected readonly typedSnippet = TYPED_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly brand = signal<string | null>('#3aa0ff');
  protected readonly overlay = signal<string | null>('rgba(58, 160, 255, 0.5)');
  protected readonly accent = signal<string | null>('hsl(210, 100%, 61%)');
  protected readonly tag = signal<string | null>('#16a34a');
  protected readonly theme = signal<string | null>('#7c3aed');
  protected readonly typed = signal<string | null>('rebeccapurple');
  protected readonly swatches: readonly string[] = [
    '#dc2626',
    '#ea580c',
    '#d97706',
    '#16a34a',
    '#0d9488',
    '#2563eb',
    '#7c3aed',
    '#c026d3',
    '#475569',
    '#111827',
  ];
  protected readonly branding = signal({ primary: '#3aa0ff' });
  protected readonly formItems: OgeFormItemData[] = [
    {
      field: 'primary',
      label: 'Primary color',
      editorType: 'colorBox',
      editorOptions: { colorFormat: 'hex', showClearButton: true },
    },
  ];
}
