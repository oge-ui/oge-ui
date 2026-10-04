import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorPalette'] },
  template: `<!-- An APG role="grid" of swatches with ONE roving tab stop (the
     selected tile, else the first). Arrows move by tile / row (RTL-mirrored,
     no wrap), Home/End to the row edges, Ctrl+Home/End to the corners,
     Enter/Space or a click picks. The value is the swatch string as listed. -->
<oge-color-palette label="Tag color" [(value)]="tag" />`,
  body: `protected readonly tag = signal<string | null>('#4a86e8');`,
});

export const PRESETS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorPalette'] },
  template: `<!-- Built-in presets: 'default' | 'basic' | 'office' | 'material' |
     'monochrome' — each brings its own column count. -->
<oge-color-palette label="Office" palette="office" [(value)]="office" />
<oge-color-palette label="Material" palette="material" [(value)]="material" />`,
  body: `protected readonly office = signal<string | null>('#4472c4');
protected readonly material = signal<string | null>('#009688');`,
});

export const CUSTOM_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorPalette'] },
  template: `<!-- Your own list (any CSS color text; unparseable entries are
     dropped), an explicit column count and a fixed tile size in px. -->
<oge-color-palette
  label="Brand swatches"
  [palette]="brand"
  [columns]="4"
  [tileSize]="32"
  [(value)]="swatch"
/>`,
  body: `protected readonly brand = [
  '#0f172a', '#334155', '#64748b', '#cbd5e1',
  '#4f46e5', '#7c3aed', '#db2777', '#f59e0b',
];
protected readonly swatch = signal<string | null>('#7c3aed');`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeColorPalette'],
    '@angular/forms': ['ReactiveFormsModule'],
  },
  helpers: { '@angular/forms': ['FormControl', 'Validators'] },
  template: `<!-- FormValueControl + ControlValueAccessor: formControl, ngModel
     and [formField] all bind it; disabling the control takes every tile out
     of the Tab sequence. -->
<oge-color-palette label="Label color" palette="basic" [formControl]="color" />`,
  body: `protected readonly color = new FormControl<string | null>(null, [
  Validators.required,
]);`,
});
