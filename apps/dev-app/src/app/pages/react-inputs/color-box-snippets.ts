import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React color box page. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/color-box.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom (`value` + `onValueChange` instead of `[(value)]`).
 */
export const INPUTS_COLOR_BOX_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'The committed value is a CSS color string — bind it straight to styles. Opening moves DOM focus onto the gradient surface; Escape restores it to the input. In Chromium the panel also offers an eyedropper (the EyeDropper API — progressive enhancement, no polyfill). onValueCommitted reports every change with previousValue.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'ColorBoxDemo',
      body: `const [brand, setBrand] = useState<string | null>('#3aa0ff');`,
      jsx: `<div>
  {/* A dropdown color editor: the field shows a swatch + the committed
      string; the popup is a role="dialog" that takes real DOM focus (no APG
      color-picker pattern exists — it is composed from dialog, sliders and
      grid primitives). ArrowDown opens; Escape restores focus to the input. */}
  <OgeColorBox
    label="Brand color"
    value={brand}
    onValueChange={setBrand}
    showClearButton
  />
  <p>
    Value: <code>{brand ?? 'null'}</code>
  </p>
</div>`,
    }),
  },
  {
    title: 'Formats and alpha',
    description:
      "format: 'hex' | 'rgb' | 'rgba' | 'hsl' fixes the committed shape (hex default — the DevExtreme choice). editAlphaChannel adds the alpha slider and input; translucent colors widen the output to carry alpha, opaque ones stay compact. Without it alpha is coerced to 1 on commit.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'FormatsDemo',
      body: `const [overlay, setOverlay] = useState<string | null>(
  'rgba(58, 160, 255, 0.5)',
);
const [accent, setAccent] = useState<string | null>('hsl(210, 100%, 61%)');`,
      jsx: `<div>
  {/* format controls the committed string shape ('hex' default — the
      DevExtreme choice; Kendo defaults to rgba). editAlphaChannel adds the
      alpha slider + input; a translucent color then WIDENS the output
      (#rrggbbaa / rgba() / hsla()), while opaque colors stay compact. */}
  <div className="demo-row">
    <OgeColorBox
      label="Overlay"
      format="rgba"
      editAlphaChannel
      value={overlay}
      onValueChange={setOverlay}
    />
    <OgeColorBox
      label="Accent (hsl)"
      format="hsl"
      value={accent}
      onValueChange={setAccent}
    />
  </div>
  <p>
    Overlay: <code>{overlay}</code> — Accent: <code>{accent}</code>
  </p>
</div>`,
    }),
  },
  {
    title: 'Palette view',
    description:
      "view: 'gradient' | 'palette' | 'both'. The palette is an APG grid — roving tabindex, arrow/Home/End/Ctrl+Home navigation, Enter/Space picks and closes. The selected cell's checkmark picks black or white by WCAG contrast against the swatch.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'PaletteDemo',
      before: `const swatches: readonly string[] = [
  '#dc2626', '#ea580c', '#d97706', '#16a34a', '#0d9488',
  '#2563eb', '#7c3aed', '#c026d3', '#475569', '#111827',
];`,
      body: `const [tag, setTag] = useState<string | null>('#16a34a');`,
      jsx: `<>
  {/* The palette is an APG grid: roving tabindex, arrows move by cell/row,
      Home/End row edges, Ctrl+Home/End grid corners, Enter/Space picks (and
      closes — a swatch is a final choice). Cells announce their color string;
      the selected checkmark picks black or white by WCAG contrast. */}
  <OgeColorBox
    label="Tag color"
    view="palette"
    palette={swatches}
    paletteColumns={5}
    value={tag}
    onValueChange={setTag}
  />
</>`,
    }),
  },
  {
    title: 'Apply with buttons',
    description:
      "applyValueMode: 'useButtons' collects panel interactions in a draft and commits only on OK; Cancel, Escape or an outside click discards — the date box's exact contract, with Kendo's committed | draft preview pair in the footer. The default 'instantly' commits live while dragging.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'ButtonsDemo',
      body: `const [theme, setTheme] = useState<string | null>('#7c3aed');`,
      jsx: `<>
  {/* applyValueMode: 'instantly' (default) commits every panel interaction
      live — dragging streams through onValueCommitted. 'useButtons' collects
      interactions in a draft, shows a committed | draft preview pair in the
      footer and commits only on OK; Cancel (or Escape / outside click)
      discards. The date box's exact contract, applied to color. */}
  <OgeColorBox
    label="Theme color"
    view="both"
    applyValueMode="useButtons"
    value={theme}
    onValueChange={setTheme}
  />
</>`,
    }),
  },
  {
    title: 'Typed colors',
    description:
      'Typed text parses any CSS color — hex in all four lengths, rgb()/rgba() in comma and space/slash syntax, hsl(), the named colors, transparent. Commits normalize to format; unparseable text shows the invalid state while typing and reverts on blur. acceptCustomValue={false} makes the text read-only.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'TypedDemo',
      body: `const [typed, setTyped] = useState<string | null>('rebeccapurple');`,
      jsx: `<div className="demo-row">
  {/* Typed text parses ANY CSS color — #rgb/#rrggbb/#rrggbbaa,
      rgb()/rgba() (comma and space/slash syntax), hsl(), the 148 named
      colors, 'transparent'. Commits normalize to format; unparseable text
      shows the invalid state while typing and REVERTS on blur — a wrong
      color is never committed. acceptCustomValue makes the text read-only. */}
  <OgeColorBox label="Any CSS color" value={typed} onValueChange={setTyped} />
  <OgeColorBox
    label="Picker only"
    acceptCustomValue={false}
    value={typed}
    onValueChange={setTyped}
  />
</div>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The forms family has no React render layer yet, so a React form composes the editor directly: one state object, one controlled OgeColorBox per field. Everything the Angular editorType: "colorBox" options configure (format, editAlphaChannel, view, palette) is a plain prop here.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorBox'] },
      name: 'FormDemo',
      body: `const [branding, setBranding] = useState({ primary: '#3aa0ff' });`,
      jsx: `<div>
  <OgeColorBox
    label="Primary color"
    format="hex"
    showClearButton
    value={branding.primary}
    onValueChange={(primary) =>
      setBranding((current) => ({ ...current, primary: primary ?? '' }))
    }
  />
  <p>
    Model: <code>{branding.primary}</code>
  </p>
</div>`,
    }),
  },
];
