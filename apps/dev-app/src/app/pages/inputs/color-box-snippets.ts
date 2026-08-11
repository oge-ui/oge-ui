import { demoSource } from '../../shared/demo-source';

export const BASIC_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorBox'] },
  template: `<!-- A dropdown color editor: the field shows a swatch + the committed
     string; the popup is a role="dialog" that takes real DOM focus (no APG
     color-picker pattern exists — it is composed from dialog, sliders and
     grid primitives). ArrowDown opens; Escape restores focus to the input. -->
<oge-color-box label="Brand color" [(value)]="brand" [showClearButton]="true" />`,
  body: `protected readonly brand = signal<string | null>('#3aa0ff');`,
});

export const FORMATS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorBox'] },
  template: `<!-- format controls the committed string shape ('hex' default —
     the DevExtreme choice; Kendo defaults to rgba). editAlphaChannel adds the
     alpha slider + input; a translucent color then WIDENS the output
     (#rrggbbaa / rgba() / hsla()), while opaque colors stay compact. Without
     it, alpha is coerced to 1 on commit — rgba() text still parses. -->
<oge-color-box label="Overlay" format="rgba" [editAlphaChannel]="true" [(value)]="overlay" />
<oge-color-box label="Accent (hsl)" format="hsl" [(value)]="accent" />`,
  body: `protected readonly overlay = signal<string | null>('rgba(58, 160, 255, 0.5)');
protected readonly accent = signal<string | null>('hsl(210, 100%, 61%)');`,
});

export const PALETTE_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorBox'] },
  template: `<!-- view: 'gradient' | 'palette' | 'both'. The palette is an APG
     grid: roving tabindex, arrows move by cell/row, Home/End row edges,
     Ctrl+Home/End grid corners, Enter/Space picks (and closes — a swatch is a
     final choice). Cells announce their color string; the selected checkmark
     picks black or white by WCAG contrast. -->
<oge-color-box
  label="Tag color"
  view="palette"
  [palette]="swatches"
  [paletteColumns]="5"
  [(value)]="tag"
/>`,
  body: `protected readonly tag = signal<string | null>('#16a34a');
protected readonly swatches: readonly string[] = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488',
  '#2563eb', '#7c3aed', '#c026d3', '#475569', '#111827',
];`,
});

export const BUTTONS_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorBox'] },
  template: `<!-- applyValueMode: 'instantly' (default) commits every panel
     interaction live — dragging streams through valueCommitted and [debounce]
     throttles it. 'useButtons' collects interactions in a draft, shows a
     committed | draft preview pair in the footer and commits only on OK;
     Cancel (or Escape / outside click) discards. The date box's exact
     contract, applied to color. -->
<oge-color-box
  label="Theme color"
  view="both"
  applyValueMode="useButtons"
  [(value)]="theme"
/>`,
  body: `protected readonly theme = signal<string | null>('#7c3aed');`,
});

export const TYPED_SNIPPET = demoSource({
  use: { '@oge-ui/inputs': ['OgeColorBox'] },
  template: `<!-- Typed text parses ANY CSS color — #rgb/#rrggbb/#rrggbbaa,
     rgb()/rgba() (comma and space/slash syntax), hsl(), the 148 named colors,
     'transparent'. Commits normalize to format; unparseable text shows the
     invalid state while typing and REVERTS on blur — a wrong color is never
     committed. acceptCustomValue=false makes the text read-only. -->
<oge-color-box label="Any CSS color" [(value)]="typed" />
<oge-color-box label="Picker only" [acceptCustomValue]="false" [(value)]="typed" />`,
  body: `protected readonly typed = signal<string | null>('rebeccapurple');`,
});

export const FORMS_SNIPPET = demoSource({
  use: { '@oge-ui/forms': ['OgeForm'] },
  types: { '@oge-ui/forms': ['OgeFormItemData'] },
  template: `<oge-form [(formData)]="branding" [items]="items" />`,
  body: `protected readonly branding = signal({ primary: '#3aa0ff' });
protected readonly items: OgeFormItemData[] = [
  {
    field: 'primary',
    label: 'Primary color',
    editorType: 'colorBox',
    editorOptions: { colorFormat: 'hex', showClearButton: true },
  },
];`,
});
