import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSlider'] },
  template: `<!-- The WAI-ARIA APG slider: a focusable role="slider" thumb —
     arrows ±step (RTL-aware), PageUp/PageDown ±largeStep, Home/End to the
     ends. Dragging commits live; [debounce] throttles it; Escape cancels the
     gesture and restores the start value. -->
<oge-slider [(value)]="volume" [min]="0" [max]="100" ariaLabel="Volume" />`,
  body: `protected readonly volume = signal(40);`,
});

export const RANGE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeRangeSlider'] },
  template: `<!-- APG multi-thumb: two focusable thumbs, each one's
     aria-valuemin/max dynamically constrained by the other (plus minRange).
     Clicking the track moves the NEAREST thumb. -->
<oge-range-slider
  [(value)]="price"
  [min]="0"
  [max]="1000"
  [step]="10"
  [minRange]="50"
/>`,
  body: `protected readonly price = signal<readonly [number, number]>([200, 600]);`,
});

export const TICKS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSlider'] },
  template: `<!-- Ticks sit on the tickStep grid (falling back to largeStep,
     then step). showTickLabels renders a formatted label under each tick
     (Kendo's tick title callback, fed by formatValue); showLabels renders
     just the min/max ends instead. -->
<oge-slider
  [(value)]="rating"
  [min]="0"
  [max]="10"
  [largeStep]="2"
  [showTicks]="true"
  [showTickLabels]="true"
/>`,
  body: `protected readonly rating = signal(6);`,
});

export const INDICATOR_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSlider'] },
  template: `<!-- valueIndicator: 'active' shows the bubble while focused or
     dragging (Material's discrete), 'always' keeps it up (DevExtreme's
     tooltip.showMode). formatValue feeds the bubble, the end labels AND
     aria-valuetext — one input, display and announcement never diverge. -->
<oge-slider
  [(value)]="volume"
  valueIndicator="active"
  [formatValue]="asDecibels"
  [showLabels]="true"
  ariaLabel="Volume"
/>`,
  body: `protected readonly volume = signal(40);
protected readonly asDecibels = (value: number): string => \`\${value} dB\`;`,
});

export const BUTTONS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeSlider'] },
  template: `<!-- showButtons adds Kendo-style increment/decrement buttons
     with press-and-hold repeat (the number box's spin timing config).
     orientation="vertical" keeps role and keys per the APG — Up increases. -->
<oge-slider [(value)]="volume" [showButtons]="true" ariaLabel="Volume" />

<div style="height: 200px">
  <oge-slider
    [(value)]="volume"
    orientation="vertical"
    ariaLabel="Volume (vertical)"
  />
</div>`,
  body: `protected readonly volume = signal(40);`,
});

export const FORMS_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<!-- Inside <oge-form>: a bare editor — the form renders the
     label/hint/error chrome around it. dataType 'number' still defaults to
     the number box; the slider is an explicit editorType choice. -->
<oge-form [(formData)]="settings" [items]="items" />`,
  body: `protected readonly settings = signal({ brightness: 70 });
protected readonly items: OgeFormItemData[] = [
  {
    field: 'brightness',
    label: 'Brightness',
    editorType: 'slider',
    editorOptions: { min: 0, max: 100, step: 5 },
  },
];`,
});
