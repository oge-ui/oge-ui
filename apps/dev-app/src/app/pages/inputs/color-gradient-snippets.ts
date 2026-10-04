import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorGradient'] },
  template: `<!-- The color box's picker surfaces, inline and always visible: a 2-axis
     role="slider" surface (aria-valuetext names both axes), the APG hue
     slider and hex + R/G/B inputs — each its own Tab stop inside one
     labelled role="group". Dragging commits live and flushes on release;
     Escape mid-drag restores the start color. -->
<oge-color-gradient label="Brand color" [(value)]="brand" />`,
  body: `protected readonly brand = signal<string | null>('#3aa0ff');`,
});

export const ALPHA_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorGradient'] },
  template: `<!-- editAlphaChannel adds the alpha slider + percent input. format fixes
     the committed shape; a translucent color widens it to carry alpha.
     showInputs=false keeps just the surface and sliders. -->
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
/>`,
  body: `protected readonly overlay = signal<string | null>('rgba(58, 160, 255, 0.5)');
protected readonly accent = signal<string | null>('hsl(160, 84%, 39%)');`,
});

export const CONTRAST_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorGradient'] },
  helpers: { '@oge-ui/inputs': ['contrastRatio', 'contrastLevels'] },
  template: `<!-- showContrast renders the WCAG readout — the ratio of the current
     color against contrastBackground (translucent colors are composited over
     it first) and AA (4.5:1) / AAA (7:1) verdicts. The same math is exported:
     contrastRatio() + contrastLevels(). -->
<oge-color-gradient
  label="Text color"
  [showContrast]="true"
  contrastBackground="#ffffff"
  [(value)]="text"
/>`,
  body: `protected readonly text = signal<string | null>('#767676');

/** The same verdict in code — e.g. to block a save. */
protected readonly passesAa = (fg: { r: number; g: number; b: number; a: number }) =>
  contrastLevels(contrastRatio(fg, { r: 255, g: 255, b: 255, a: 1 })).aa;`,
});

export const FORMS_SNIPPET = demoSource({
  use: {
    '@oge-ui/inputs': ['OgeColorGradient'],
    '@angular/forms/signals': ['FormField'],
  },
  helpers: { '@angular/forms/signals': ['form', 'required'] },
  template: `<!-- A FormValueControl and a ControlValueAccessor like every editor:
     [formField], formControl and ngModel all bind it. -->
<oge-color-gradient label="Theme color" [formField]="f.theme" />`,
  body: `protected readonly model = signal<{ theme: string | null }>({ theme: '#7c3aed' });
protected readonly f = form(this.model, (p) => {
  required(p.theme);
});`,
});
