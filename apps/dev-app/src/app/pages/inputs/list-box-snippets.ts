import { demoSource } from '../../shared/demo-source';

const CITY_TYPE = `interface City {
  id: number;
  name: string;
  country: string;
  closed?: boolean;
}`;

const CITY_DATA = `protected readonly cities: City[] = [
  { id: 1, name: 'Amsterdam', country: 'Netherlands' },
  { id: 2, name: 'Ankara', country: 'Türkiye' },
  { id: 3, name: 'Berlin', country: 'Germany' },
  { id: 4, name: 'Bonn', country: 'Germany', closed: true },
  { id: 5, name: 'Hamburg', country: 'Germany' },
  { id: 6, name: 'İstanbul', country: 'Türkiye' },
  { id: 7, name: 'İzmir', country: 'Türkiye' },
  { id: 8, name: 'Rotterdam', country: 'Netherlands' },
];`;

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeListBox'] },
  before: CITY_TYPE,
  template: `<!-- One Tab stop: the role="listbox" carries aria-activedescendant.
     Arrows, Home/End, PageUp/PageDown move — and in single mode the
     selection follows. Typing jumps by prefix (accent-insensitive). -->
<oge-list-box
  label="City"
  [items]="cities"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="closed"
  [height]="220"
  [(value)]="city"
/>`,
  body: `${CITY_DATA}
protected readonly city = signal<unknown>(3);`,
});

export const MULTIPLE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeListBox'] },
  before: CITY_TYPE,
  template: `<!-- aria-multiselectable: Space / Enter and clicks toggle, Shift+arrows
     and Shift+click extend from the anchor, Ctrl+Shift+Home/End select to
     an edge, Ctrl+A selects all. The value is an items-ordered array. -->
<oge-list-box
  label="Cities to visit"
  [items]="cities"
  displayExpr="name"
  valueExpr="id"
  disabledExpr="closed"
  selectionMode="multiple"
  [showCheckBoxes]="true"
  [height]="220"
  [(value)]="picked"
/>`,
  body: `${CITY_DATA}
protected readonly picked = signal<unknown>([2, 6]);`,
});

export const GROUPS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeListBox'] },
  before: CITY_TYPE,
  template: `<!-- groupBy renders each group as a role="group" labelled by its
     header; searchEnabled adds a filter field (ArrowDown enters the list). -->
<oge-list-box
  label="Office"
  [items]="cities"
  displayExpr="name"
  valueExpr="id"
  groupBy="country"
  [searchEnabled]="true"
  [height]="260"
  [(value)]="office"
/>`,
  body: `${CITY_DATA}
protected readonly office = signal<unknown>(null);`,
});

export const TEMPLATE_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': [
      'OgeListBox',
      'OgeListBoxItemTemplate',
      'OgeListBoxGroupTemplate',
    ],
  },
  before: CITY_TYPE,
  template: `<!-- The option keeps its role, state and check glyph; only its content
     is yours. The group template gets the label and the option count. -->
<oge-list-box
  label="Cities"
  [items]="cities"
  displayExpr="name"
  valueExpr="id"
  groupBy="country"
  selectionMode="multiple"
  [height]="260"
  [(value)]="templated"
>
  <ng-template ogeListBoxItemTemplate let-city let-selected="selected">
    <span class="demo-city">
      <span class="demo-city-badge">{{ city.name.charAt(0) }}</span>
      {{ city.name }}
      @if (selected) {
        <small>selected</small>
      }
    </span>
  </ng-template>
  <ng-template ogeListBoxGroupTemplate let-label let-count="count">
    {{ label }} · {{ count }}
  </ng-template>
</oge-list-box>`,
  body: `${CITY_DATA}
protected readonly templated = signal<unknown>([1]);`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeListBox'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  before: CITY_TYPE,
  template: `<!-- FormValueControl + ControlValueAccessor: formControl, ngModel and
     [formField] bind it; required means "at least one" in multiple mode. -->
<oge-list-box
  label="Destinations"
  hint="Pick at least one"
  [items]="cities"
  displayExpr="name"
  valueExpr="id"
  selectionMode="multiple"
  [height]="200"
  [formControl]="destinations"
/>`,
  body: `${CITY_DATA}
protected readonly destinations = new FormControl<number[]>([], Validators.required);`,
});
