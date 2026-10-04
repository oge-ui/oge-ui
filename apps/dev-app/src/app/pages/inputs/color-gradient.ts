import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { OgeColorGradient } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_COLOR_GRADIENT_SECTIONS,
  ReactInputsColorGradientDemos,
} from '../react-inputs/color-gradient';
import {
  ALPHA_SNIPPET,
  BASIC_SNIPPET,
  CONTRAST_SNIPPET,
  FORMS_SNIPPET,
} from './color-gradient-snippets';

const SECTIONS = [
  'Getting started',
  'Alpha and formats',
  'Contrast checker',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-color-gradient',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeColorGradient,
    FormField,
    ReactInputsColorGradientDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Color Gradient"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['inline picker', 'WCAG contrast', 'Signal Forms', 'alpha']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeColorGradient /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is the color box's picker as an
          always-visible editor — a saturation/brightness surface, hue and
          optional alpha sliders, hex + channel inputs and an optional WCAG
          contrast readout. The parts, the channel parse rules and the contrast
          math are the shared <code>&#64;oge-ui/behavior</code> code the Angular
          editor runs. The value is the controlled/uncontrolled pair:
          <code>value</code> + <code>onValueChange</code>, or
          <code>defaultValue</code> alone.
        </p>
      } @else {
        <p>
          The color box's picker surfaces as an always-visible form editor —
          Kendo's ColorGradient: a saturation/brightness surface, hue and
          optional alpha sliders, hex + R/G/B(/A) inputs and an optional WCAG
          contrast readout against a background you choose. No APG color-picker
          pattern exists, so it is a labelled
          <code>role="group"</code> of APG sliders (the surface is a 2-axis
          <code>role="slider"</code> with mandatory <code>aria-valuetext</code>)
          and native inputs.
        </p>
        <p>
          Works standalone via <code>[(value)]</code>, with Signal Forms via
          <code>[formField]</code>, and with reactive/template forms via
          <code>formControl</code>/<code>ngModel</code>. Need it in a drop-down?
          That is the color box.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-color-gradient-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'role=group', 'live commit']"
        heading="Getting started"
        description="Surface, hue slider and channel inputs, each its own Tab stop. Dragging commits live and flushes on release; <kbd>Escape</kbd> mid-drag restores the start color. The hue survives a pass through gray — the working color keeps its own HSV."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-color-gradient label="Brand color" [(value)]="brand" />
        <p class="mt-3 text-sm">
          Value:
          <code data-testid="gradient-value">{{ brand() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['editAlphaChannel', 'format', 'showInputs']"
        heading="Alpha and formats"
        description="<code>editAlphaChannel</code> adds the alpha slider and percent input; <code>format: 'hex' | 'rgb' | 'rgba' | 'hsl'</code> fixes the committed string, widening to carry alpha when the color is translucent. <code>showInputs: false</code> keeps only the surface and sliders."
        [code]="alphaSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-color-gradient
            label="Overlay"
            format="rgba"
            [editAlphaChannel]="true"
            [(value)]="overlay"
          />
          <oge-color-gradient
            label="Compact (hsl)"
            format="hsl"
            [showInputs]="false"
            [(value)]="accent"
          />
        </div>
        <p class="mt-3 text-sm">
          Overlay: <code>{{ overlay() }}</code> — Compact:
          <code>{{ accent() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['showContrast', 'contrastBackground', 'AA / AAA']"
        heading="Contrast checker"
        description="<code>showContrast</code> renders the WCAG readout — the ratio of the current color against <code>contrastBackground</code> (translucent colors are composited over it first) with AA (4.5:1) and AAA (7:1) verdicts. A failing 4.499 never displays as a pass. The math is exported as <code>contrastRatio()</code> / <code>contrastLevels()</code>."
        [code]="contrastSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-color-gradient
            label="Text on white"
            [showContrast]="true"
            contrastBackground="#ffffff"
            [(value)]="text"
          />
          <oge-color-gradient
            label="Text on dark"
            [showContrast]="true"
            contrastBackground="#1e293b"
            [(value)]="darkText"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['FormValueControl', 'CVA']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor like every editor in the family: <code>[formField]</code>, <code>formControl</code> and <code>ngModel</code> all bind it, and touched/dirty/disabled follow the bound field."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-color-gradient label="Theme color" [formField]="f.theme" />
        <p class="mt-3 text-sm">
          Model: <code>{{ model().theme }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsColorGradientPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_COLOR_GRADIENT_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly alphaSnippet = ALPHA_SNIPPET;
  protected readonly contrastSnippet = CONTRAST_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly brand = signal<string | null>('#3aa0ff');
  protected readonly overlay = signal<string | null>('rgba(58, 160, 255, 0.5)');
  protected readonly accent = signal<string | null>('hsl(160, 84%, 39%)');
  protected readonly text = signal<string | null>('#767676');
  protected readonly darkText = signal<string | null>('#94a3b8');

  protected readonly model = signal<{ theme: string | null }>({
    theme: '#7c3aed',
  });
  protected readonly f = form(this.model, (p) => {
    required(p.theme);
  });
}
