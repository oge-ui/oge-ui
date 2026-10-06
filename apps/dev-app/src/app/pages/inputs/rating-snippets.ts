import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRating'] },
  template: `<!-- An APG slider: arrows step (RTL-mirrored), PageUp/PageDown by one
     item, Home/End, digits jump, Delete/Backspace/0 clear. A press on the
     current value clears it (allowClear); the pointer previews the pick. -->
<oge-rating label="Your rating" [(value)]="stars" />
<p>Value: <code>{{ stars() ?? 'null' }}</code></p>`,
  body: `protected readonly stars = signal<number | null>(3);`,
});

export const PRECISION_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRating'] },
  template: `<!-- precision 0.5 = half stars: a press in an item's first half
     picks the half (mirrored in RTL). Fractional display values (an
     average) render exactly with readonly — still focusable, aria-readonly. -->
<oge-rating label="Half stars" [precision]="0.5" [(value)]="half" />
<oge-rating
  label="Average rating"
  [value]="4.3"
  [precision]="0.1"
  [readonly]="true"
/>
<oge-rating label="Out of ten" [max]="10" size="sm" [(value)]="ten" />`,
  body: `protected readonly half = signal<number | null>(2.5);
protected readonly ten = signal<number | null>(7);`,
});

export const ICONS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRating', 'OgeRatingItemTemplate'] },
  template: `<!-- Built-in glyphs: 'star' | 'heart' | 'circle'. The item template
     renders any markup — once for the empty layer, once for the filled one,
     so fractional fills still work. selection="single" paints only the
     item that holds the value (a pick-one scale). -->
<oge-rating label="Love it" icon="heart" size="lg" [(value)]="love" />
<oge-rating label="Effort" selection="single" [allowClear]="false" [(value)]="effort">
  <ng-template ogeRatingItemTemplate let-item>
    <span class="text-sm font-bold">{{ item.itemValue }}</span>
  </ng-template>
</oge-rating>`,
  body: `protected readonly love = signal<number | null>(4);
protected readonly effort = signal<number | null>(3);`,
});

export const RADIO_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRating'] },
  template: `<!-- semantics="radiogroup": one APG radio per item with a roving
     tab stop — arrows move and select (wrapping), Space selects. Needs
     whole-item precision; fractional precisions fall back to the slider. -->
<oge-rating label="Service" semantics="radiogroup" [(value)]="service" />`,
  body: `protected readonly service = signal<number | null>(4);`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeRating'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  template: `<!-- FormValueControl + ControlValueAccessor: formControl, ngModel and
     [formField] all bind it; null (not rated) fails Validators.required. -->
<oge-rating label="Overall" [formControl]="overall" />
<p>Valid: <code>{{ overall.valid }}</code></p>`,
  body: `protected readonly overall = new FormControl<number | null>(null, [
  Validators.required,
]);`,
});
