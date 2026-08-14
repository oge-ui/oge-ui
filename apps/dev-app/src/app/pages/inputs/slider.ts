import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { OgeRangeSlider, OgeSlider } from '@oge-ui/inputs';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import {
  REACT_INPUTS_SLIDER_SECTIONS,
  ReactInputsSliderDemos,
} from '../react-inputs/slider';
import { PageToc } from '../../shared/page-toc';
import {
  BASIC_SNIPPET,
  BUTTONS_SNIPPET,
  FORMS_SNIPPET,
  INDICATOR_SNIPPET,
  RANGE_SNIPPET,
  TICKS_SNIPPET,
} from './slider-snippets';

const SECTIONS = [
  'Getting started',
  'Range slider',
  'Ticks and labels',
  'Value indicator',
  'Buttons and vertical',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-slider',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeSlider,
    OgeRangeSlider,
    OgeForm,
    ReactInputsSliderDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Slider"
      category="Inputs"
      [chips]="fw.isReact() ? reactChips : chips"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeSlider /&gt;</code> and
          <code>&lt;OgeRangeSlider /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> are the WAI-ARIA APG slider and
          its multi-thumb sibling as bare form editors: arrows move by
          <code>step</code> (RTL-aware), PageUp/PageDown by
          <code>largeStep</code>, Home/End to the ends, dragging commits live
          (<code>debounce</code> throttles it) and
          <strong>Escape cancels the gesture</strong>, restoring the start value
          — no reference slider offers that.
        </p>
        <p>
          The arithmetic, the gesture rules and the key map are the shared
          <code>&#64;oge-ui/behavior</code> slider core the Angular editor runs,
          so the two layers cannot drift. The API is React's: the
          controlled/uncontrolled <code>value</code> +
          <code>onValueChange</code> pair (or <code>defaultValue</code> alone),
          with <code>onValueCommitted</code> and <code>onSlideEnded</code> for
          the richer payloads.
        </p>
      } @else {
        <p>
          The WAI-ARIA APG slider — and its multi-thumb sibling — as bare form
          editors on the suite's one control base: arrows move by
          <code>step</code> (RTL-aware), PageUp/PageDown by
          <code>largeStep</code>, Home/End to the ends, dragging commits live
          (<code>[debounce]</code> throttles it) and
          <strong>Escape cancels the gesture</strong>, restoring the start value
          — no reference slider offers that.
        </p>
        <p>
          Works standalone via <code>[(value)]</code>, with Signal Forms via
          <code>[formField]</code>, and with reactive/template forms via
          <code>formControl</code>/<code>ngModel</code> — the same three modes
          as every other editor in the family, with no extra wiring.
        </p>
      }
    </app-doc-header>
    <app-page-toc [sections]="fw.isReact() ? reactSections : sections" />

    @if (fw.isReact()) {
      <app-react-inputs-slider-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'step', 'keyboard']"
        heading="Getting started"
        description="One thumb, the full APG key set, live commits while dragging. <code>valueCommitted</code> reports every change; <code>slideEnded</code> fires once per gesture at release — the DevExtreme <code>onHandleRelease</code> timing without a mode switch."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-slider
          [(value)]="volume"
          [min]="0"
          [max]="100"
          ariaLabel="Volume"
        />
        <p class="mt-3 text-sm">
          Value: <code data-testid="slider-value">{{ volume() }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['[start, end]', 'minRange', 'aria constraint']"
        heading="Range slider"
        description="Two thumbs selecting a <code>[start, end]</code> pair. Each thumb's <code>aria-valuemin</code>/<code>aria-valuemax</code> is dynamically constrained by the other — the APG multi-thumb rule — and <code>minRange</code> keeps a minimum gap. Clicking the track moves the nearest thumb."
        [code]="rangeSnippet"
        language="ts"
      >
        <oge-range-slider
          [(value)]="price"
          [min]="0"
          [max]="1000"
          [step]="10"
          [minRange]="50"
        />
        <p class="mt-3 text-sm">
          Range:
          <code data-testid="range-value"
            >{{ price()[0] }} – {{ price()[1] }}</code
          >
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['showTicks', 'tickStep', 'showLabels']"
        heading="Ticks and labels"
        description="Ticks sit on the <code>tickStep</code> grid (falling back to <code>largeStep</code>, then <code>step</code>). <code>showTickLabels</code> renders a formatted label under each tick — Kendo's tick <code>title</code> callback, fed by <code>formatValue</code>; <code>showLabels</code> renders just the <code>min</code>/<code>max</code> ends instead."
        [code]="ticksSnippet"
        language="ts"
      >
        <oge-slider
          [(value)]="rating"
          [min]="0"
          [max]="10"
          [largeStep]="2"
          [showTicks]="true"
          [showTickLabels]="true"
          ariaLabel="Rating"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['valueIndicator', 'formatValue', 'aria-valuetext']"
        heading="Value indicator"
        description="<code>valueIndicator: 'active'</code> shows the bubble while focused or dragging; <code>'always'</code> keeps it up. <code>formatValue</code> feeds the bubble, the end labels <strong>and</strong> <code>aria-valuetext</code> — display and screen-reader announcement can never diverge."
        [code]="indicatorSnippet"
        language="ts"
      >
        <oge-slider
          [(value)]="decibels"
          valueIndicator="active"
          [formatValue]="asDecibels"
          [showLabels]="true"
          ariaLabel="Volume"
        />
      </app-demo-card>

      <app-demo-card
        [chips]="['showButtons', 'orientation']"
        heading="Buttons and vertical"
        description="<code>showButtons</code> adds Kendo-style increment/decrement buttons with press-and-hold repeat (the number box's spin timing). A vertical slider keeps the same role with <code>aria-orientation</code> — Up still increases, per the APG."
        [code]="buttonsSnippet"
        language="ts"
      >
        <oge-slider
          [(value)]="buttoned"
          [showButtons]="true"
          ariaLabel="With buttons"
        />
        <div class="mt-4" style="height: 180px">
          <oge-slider
            [(value)]="buttoned"
            orientation="vertical"
            ariaLabel="Vertical"
          />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['editorType: slider', 'bare editor']"
        heading="Inside a form"
        description="A bare editor: <code>&amp;lt;oge-form&amp;gt;</code> renders the label/hint/error chrome around it. <code>dataType: 'number'</code> still defaults to the number box — the slider is an explicit <code>editorType</code> choice, with <code>min</code>/<code>max</code>/<code>step</code> from <code>editorOptions</code>."
        [code]="formsSnippet"
        language="ts"
      >
        <oge-form [(formData)]="settings" [items]="formItems" />
        <p class="mt-3 text-sm">
          Model: <code>{{ settings().brightness }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsSliderPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_SLIDER_SECTIONS;
  protected readonly chips = [
    'APG slider',
    'multi-thumb',
    'Signal Forms',
    'Escape cancels',
  ];
  protected readonly reactChips = [
    'APG slider',
    'multi-thumb',
    'controlled props',
    'Escape cancels',
  ];
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly rangeSnippet = RANGE_SNIPPET;
  protected readonly ticksSnippet = TICKS_SNIPPET;
  protected readonly indicatorSnippet = INDICATOR_SNIPPET;
  protected readonly buttonsSnippet = BUTTONS_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly volume = signal(40);
  protected readonly price = signal<readonly [number, number]>([200, 600]);
  protected readonly rating = signal(6);
  protected readonly decibels = signal(40);
  protected readonly buttoned = signal(30);
  protected readonly settings = signal({ brightness: 70 });
  protected readonly formItems: OgeFormItemData[] = [
    {
      field: 'brightness',
      label: 'Brightness',
      editorType: 'slider',
      editorOptions: { min: 0, max: 100, step: 5 },
    },
  ];

  protected readonly asDecibels = (value: number): string => `${value} dB`;
}
