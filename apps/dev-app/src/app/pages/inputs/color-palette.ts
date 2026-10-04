import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { OgeColorPalette } from '@oge-ui/inputs';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_COLOR_PALETTE_SECTIONS,
  ReactInputsColorPaletteDemos,
} from '../react-inputs/color-palette';
import {
  BASIC_SNIPPET,
  CUSTOM_SNIPPET,
  FORMS_SNIPPET,
  PRESETS_SNIPPET,
} from './color-palette-snippets';

const SECTIONS = [
  'Getting started',
  'Presets',
  'Custom swatches',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-color-palette',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeColorPalette,
    ReactiveFormsModule,
    ReactInputsColorPaletteDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Color Palette"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['APG grid', 'presets', 'roving tabindex', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeColorPalette /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is an inline swatch grid as a
          form editor: a built-in preset or your own list in an APG
          <code>role="grid"</code> with one roving tab stop, the picked swatch
          string as the value (<code>value</code> + <code>onValueChange</code>,
          or <code>defaultValue</code>). The grid and its key map are the very
          parts the color box renders.
        </p>
      } @else {
        <p>
          An inline swatch grid as a form editor — Kendo's ColorPalette: a
          built-in preset (<code>default</code>, <code>basic</code>,
          <code>office</code>, <code>material</code>, <code>monochrome</code>)
          or your own list, in an APG <code>role="grid"</code> with one roving
          tab stop and real DOM focus on the tiles. The selected tile carries
          <code>aria-selected</code> and a checkmark colored for contrast.
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
      <app-react-inputs-color-palette-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'APG grid', 'Enter / Space']"
        heading="Getting started"
        description="Arrows move by tile / row (RTL-mirrored; the grid neither wraps nor crosses rows), Home/End to the row edges, Ctrl+Home/Ctrl+End to the corners; Enter, Space or a click picks. The value is the swatch string exactly as listed."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-color-palette label="Tag color" [(value)]="tag" />
        <p class="mt-3 text-sm">
          Value: <code data-testid="palette-value">{{ tag() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['palette', 'office', 'material']"
        heading="Presets"
        description="<code>palette</code> takes a preset name — <code>'default' | 'basic' | 'office' | 'material' | 'monochrome'</code> — and each preset brings its own column count. <code>OGE_COLOR_PALETTE_PRESETS</code> exports the data for building around the same sets."
        [code]="presetsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-start gap-6">
          <oge-color-palette
            label="Office"
            palette="office"
            [(value)]="office"
          />
          <oge-color-palette
            label="Material"
            palette="material"
            [(value)]="material"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['palette: string[]', 'columns', 'tileSize']"
        heading="Custom swatches"
        description="Pass your own CSS colors (unparseable entries are dropped), a <code>columns</code> count and a fixed <code>tileSize</code> in px — the grid then shrink-wraps the tiles instead of sharing the width."
        [code]="customSnippet"
        language="ts"
      >
        <oge-color-palette
          label="Brand swatches"
          [palette]="brand"
          [columns]="4"
          [tileSize]="32"
          [(value)]="swatch"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required', 'disabled']"
        heading="Inside a form"
        description="A <code>FormValueControl</code> and a ControlValueAccessor: <code>formControl</code>, <code>ngModel</code> and <code>[formField]</code> all bind it. Disabling the control takes every tile out of the Tab sequence."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-color-palette
          label="Label color"
          palette="basic"
          [formControl]="color"
        />
        <p class="mt-3 text-sm">
          Valid: <code>{{ color.valid }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsColorPalettePage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_COLOR_PALETTE_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly presetsSnippet = PRESETS_SNIPPET;
  protected readonly customSnippet = CUSTOM_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly tag = signal<string | null>('#4a86e8');
  protected readonly office = signal<string | null>('#4472c4');
  protected readonly material = signal<string | null>('#009688');
  protected readonly brand = [
    '#0f172a',
    '#334155',
    '#64748b',
    '#cbd5e1',
    '#4f46e5',
    '#7c3aed',
    '#db2777',
    '#f59e0b',
  ];
  protected readonly swatch = signal<string | null>('#7c3aed');
  protected readonly color = new FormControl<string | null>(null, [
    Validators.required,
  ]);
}
