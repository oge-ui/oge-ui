import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { OgeRating, OgeRatingItemTemplate } from '@oge-ui/inputs/rating';
import { DemoCard } from '../../shared/demo-card';
import { DocHeader } from '../../shared/doc-header';
import { FrameworkService } from '../../shared/framework.service';
import { PageToc } from '../../shared/page-toc';
import {
  REACT_INPUTS_RATING_SECTIONS,
  ReactInputsRatingDemos,
} from '../react-inputs/rating';
import {
  BASIC_SNIPPET,
  FORMS_SNIPPET,
  ICONS_SNIPPET,
  PRECISION_SNIPPET,
  RADIO_SNIPPET,
} from './rating-snippets';

const SECTIONS = [
  'Getting started',
  'Half and fractional values',
  'Icons and templates',
  'Radio group semantics',
  'Inside a form',
] as const;

@Component({
  selector: 'app-inputs-rating',
  imports: [
    DemoCard,
    DocHeader,
    PageToc,
    OgeRating,
    OgeRatingItemTemplate,
    ReactiveFormsModule,
    ReactInputsRatingDemos,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-doc-header
      title="Rating"
      category="Inputs"
      categoryLink="/components/inputs"
      [chips]="['APG slider', 'half values', 'RTL', 'forms']"
    >
      @if (fw.isReact()) {
        <p>
          <code>&lt;OgeRating /&gt;</code> from
          <code>&#64;oge-ui/react-inputs</code> is a star rating as a form
          editor: a value between <code>0</code> (not rated, <code>null</code>)
          and <code>max</code> in steps of <code>precision</code>, exposed as
          one APG slider (or a radio group of whole items). The pointer previews
          the value it would pick; a press on the current value clears it.
          Controlled with <code>value</code> + <code>onValueChange</code>, or
          uncontrolled with <code>defaultValue</code>.
        </p>
      } @else {
        <p>
          A star rating as a form editor — Kendo's Rating, PrimeNG's Rating: a
          value between <code>0</code> (not rated, committed as
          <code>null</code>) and <code>max</code> in steps of
          <code>precision</code>, so half stars and averages such as 4.3 render
          exactly. It is one APG <code>role="slider"</code> by default — arrows
          follow the reading direction, so RTL mirrors them — or a radio group
          of whole items with <code>semantics="radiogroup"</code>.
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
      <app-react-inputs-rating-demos />
    } @else {
      <app-demo-card
        [chips]="['value', 'allowClear', 'hover preview']"
        heading="Getting started"
        description="Arrows step by one item (RTL-mirrored), PageUp/PageDown too, Home/End to the ends, the digit keys jump and Delete, Backspace or 0 clear. A press on the current value clears it while <code>allowClear</code> is on; the pointer previews the value it would pick."
        [code]="basicSnippet"
        language="ts"
      >
        <oge-rating label="Your rating" [(value)]="stars" />
        <p class="mt-3 text-sm">
          Value: <code data-testid="rating-value">{{ stars() ?? 'null' }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['precision', 'readonly', 'max']"
        heading="Half and fractional values"
        description="<code>precision</code> sets the step: <code>0.5</code> for half stars — a press in an item's first half picks the half — or <code>0.1</code> to show an average exactly. <code>readonly</code> keeps the rating focusable and announced (<code>aria-readonly</code>) but unchangeable."
        [code]="precisionSnippet"
        language="ts"
      >
        <div class="flex flex-col items-start gap-3">
          <oge-rating label="Half stars" [precision]="0.5" [(value)]="half" />
          <span class="text-sm" data-testid="rating-half">{{
            half() ?? 'null'
          }}</span>
          <oge-rating
            label="Average rating"
            [value]="4.3"
            [precision]="0.1"
            [readonly]="true"
          />
          <oge-rating label="Out of ten" [max]="10" size="sm" [(value)]="ten" />
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['icon', 'ogeRatingItemTemplate', 'selection']"
        heading="Icons and templates"
        description="Pick a built-in glyph — <code>'star' | 'heart' | 'circle'</code> — or render any markup with <code>[ogeRatingItemTemplate]</code>. The template runs once for the empty and once for the filled layer, so fractional fills still work. <code>selection=&quot;single&quot;</code> paints only the item holding the value."
        [code]="iconsSnippet"
        language="ts"
      >
        <div class="flex flex-wrap items-center gap-6">
          <oge-rating label="Love it" icon="heart" size="lg" [(value)]="love" />
          <oge-rating
            label="Effort"
            selection="single"
            [allowClear]="false"
            [(value)]="effort"
          >
            <ng-template ogeRatingItemTemplate let-item>
              <span class="text-sm font-bold">{{ item.itemValue }}</span>
            </ng-template>
          </oge-rating>
        </div>
      </app-demo-card>

      <app-demo-card
        [chips]="['semantics', 'APG radio group', 'roving tabindex']"
        heading="Radio group semantics"
        description='<code>semantics="radiogroup"</code> renders one radio per item with a single roving tab stop: arrows move and select (wrapping at the ends), Space selects. It needs whole-item precision — fractional precisions fall back to the slider.'
        [code]="radioSnippet"
        language="ts"
      >
        <oge-rating
          label="Service"
          semantics="radiogroup"
          [(value)]="service"
        />
        <p class="mt-3 text-sm">
          Value:
          <code data-testid="rating-radio-value">{{
            service() ?? 'null'
          }}</code>
        </p>
      </app-demo-card>

      <app-demo-card
        [chips]="['formControl', 'Validators.required']"
        heading="Inside a form"
        description='A <code>FormValueControl</code> and a ControlValueAccessor: <code>formControl</code>, <code>ngModel</code> and <code>[formField]</code> all bind it. Not rated is <code>null</code>, so <code>Validators.required</code> means "rate it".'
        [code]="formsSnippet"
        language="ts"
      >
        <oge-rating label="Overall" [formControl]="overall" />
        <p class="mt-3 text-sm">
          Valid: <code>{{ overall.valid }}</code>
        </p>
      </app-demo-card>
    }
  `,
})
export class InputsRatingPage {
  protected readonly fw = inject(FrameworkService);
  protected readonly sections = SECTIONS;
  protected readonly reactSections = REACT_INPUTS_RATING_SECTIONS;
  protected readonly basicSnippet = BASIC_SNIPPET;
  protected readonly precisionSnippet = PRECISION_SNIPPET;
  protected readonly iconsSnippet = ICONS_SNIPPET;
  protected readonly radioSnippet = RADIO_SNIPPET;
  protected readonly formsSnippet = FORMS_SNIPPET;

  protected readonly stars = signal<number | null>(3);
  protected readonly half = signal<number | null>(2.5);
  protected readonly ten = signal<number | null>(7);
  protected readonly love = signal<number | null>(4);
  protected readonly effort = signal<number | null>(3);
  protected readonly service = signal<number | null>(4);
  protected readonly overall = new FormControl<number | null>(null, [
    Validators.required,
  ]);
}
