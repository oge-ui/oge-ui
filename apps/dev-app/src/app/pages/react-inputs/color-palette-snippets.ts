import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React color palette page. Pure data — the generator
 * and the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/color-palette.ts`.
 */
export const INPUTS_COLOR_PALETTE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'An APG role="grid" with one roving tab stop: arrows by tile / row (RTL-mirrored, no wrap), Home/End to the row edges, Ctrl+Home/End to the corners; Enter, Space or a click picks the swatch string as listed.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorPalette'] },
      name: 'ColorPaletteDemo',
      body: `const [tag, setTag] = useState<string | null>('#4a86e8');`,
      jsx: `<>
  <OgeColorPalette label="Tag color" value={tag} onValueChange={setTag} />
  <p className="mt-3 text-sm">
    Value: <code>{tag ?? 'null'}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Presets',
    description:
      "palette takes a preset name — 'default' | 'basic' | 'office' | 'material' | 'monochrome' — each with its own column count; OGE_COLOR_PALETTE_PRESETS exports the data.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorPalette'] },
      name: 'ColorPalettePresetsDemo',
      body: `const [office, setOffice] = useState<string | null>('#4472c4');
const [material, setMaterial] = useState<string | null>('#009688');`,
      jsx: `<div className="demo-row demo-row-start">
  <OgeColorPalette label="Office" palette="office" value={office} onValueChange={setOffice} />
  <OgeColorPalette
    label="Material"
    palette="material"
    value={material}
    onValueChange={setMaterial}
  />
</div>`,
    }),
  },
  {
    title: 'Custom swatches',
    description:
      'Your own CSS colors (unparseable entries dropped), a columns count and a fixed tileSize in px.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorPalette'] },
      name: 'ColorPaletteCustomDemo',
      before: `const brand = [
  '#0f172a', '#334155', '#64748b', '#cbd5e1',
  '#4f46e5', '#7c3aed', '#db2777', '#f59e0b',
];`,
      body: `const [swatch, setSwatch] = useState<string | null>('#7c3aed');`,
      jsx: `<OgeColorPalette
  label="Brand swatches"
  palette={brand}
  columns={4}
  tileSize={32}
  value={swatch}
  onValueChange={setSwatch}
/>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The controlled pair is the integration point; pass required, errors and touched from your form layer for the validation state. disabled takes every tile out of the Tab sequence.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorPalette'] },
      name: 'ColorPaletteFormDemo',
      body: `const [color, setColor] = useState<string | null>(null);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeColorPalette
  label="Label color"
  palette="basic"
  required
  value={color}
  onValueChange={setColor}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={color ? [] : [{ kind: 'required' }]}
/>`,
    }),
  },
];
