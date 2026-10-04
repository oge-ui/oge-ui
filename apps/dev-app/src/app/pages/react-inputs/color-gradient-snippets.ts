import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React color gradient page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node. Section-for-section mirror of `../inputs/color-gradient.ts`.
 */
export const INPUTS_COLOR_GRADIENT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'Surface, hue slider and channel inputs, each its own Tab stop inside one labelled role="group". Dragging commits live and flushes on release; Escape mid-drag restores the start color.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorGradient'] },
      name: 'ColorGradientDemo',
      body: `const [brand, setBrand] = useState<string | null>('#3aa0ff');`,
      jsx: `<>
  <OgeColorGradient label="Brand color" value={brand} onValueChange={setBrand} />
  <p className="mt-3 text-sm">
    Value: <code>{brand ?? 'null'}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Alpha and formats',
    description:
      "editAlphaChannel adds the alpha slider and percent input; format ('hex' | 'rgb' | 'rgba' | 'hsl') fixes the committed string. showInputs={false} keeps only the surface and sliders.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorGradient'] },
      name: 'ColorGradientAlphaDemo',
      body: `const [overlay, setOverlay] = useState<string | null>(
  'rgba(58, 160, 255, 0.5)',
);
const [accent, setAccent] = useState<string | null>('hsl(160, 84%, 39%)');`,
      jsx: `<div className="demo-row demo-row-start">
  <OgeColorGradient
    label="Overlay"
    format="rgba"
    editAlphaChannel
    value={overlay}
    onValueChange={setOverlay}
  />
  <OgeColorGradient
    label="Compact (hsl)"
    format="hsl"
    showInputs={false}
    value={accent}
    onValueChange={setAccent}
  />
</div>`,
    }),
  },
  {
    title: 'Contrast checker',
    description:
      'showContrast renders the WCAG readout — the ratio against contrastBackground (translucent colors composited over it first) with AA (4.5:1) and AAA (7:1) verdicts. The math is exported as contrastRatio() / contrastLevels().',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': [
          'OgeColorGradient',
          'contrastRatio',
          'contrastLevels',
        ],
      },
      name: 'ColorGradientContrastDemo',
      body: `const [text, setText] = useState<string | null>('#767676');
// the same verdict in code — e.g. to block a save
const white = { r: 255, g: 255, b: 255, a: 1 };
const aa = contrastLevels(contrastRatio({ r: 118, g: 118, b: 118, a: 1 }, white)).aa;`,
      jsx: `<>
  <OgeColorGradient
    label="Text on white"
    showContrast
    contrastBackground="#ffffff"
    value={text}
    onValueChange={setText}
  />
  <p className="mt-3 text-sm">#767676 passes AA: {String(aa)}</p>
</>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'React has no formField binding — the controlled pair is the integration point: hold the value in useState, React Hook Form, Formik or TanStack Form. onValueCommitted carries previousValue and the originating event.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeColorGradient'] },
      name: 'ColorGradientFormDemo',
      body: `const [model, setModel] = useState({ theme: '#7c3aed' as string | null });`,
      jsx: `<>
  <OgeColorGradient
    label="Theme color"
    required
    value={model.theme}
    onValueChange={(theme) => setModel({ ...model, theme })}
  />
  <p className="mt-3 text-sm">
    Model: <code>{model.theme}</code>
  </p>
</>`,
    }),
  },
];
