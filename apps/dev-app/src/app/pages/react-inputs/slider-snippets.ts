import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React slider page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/slider.ts`, per the parity standard
 * (`docs/REACT-PARITY.md`): same headings, same order, same example content,
 * React idiom.
 */
export const INPUTS_SLIDER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'One thumb, the full APG key set, live commits while dragging. onValueChange reports every committed change; onSlideEnded fires once per gesture at release — the DevExtreme onHandleRelease timing without a mode switch.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSlider'] },
      name: 'SliderDemo',
      body: `// The WAI-ARIA APG slider: a focusable role="slider" thumb —
// arrows ±step (RTL-aware), PageUp/PageDown ±largeStep, Home/End to the
// ends. Dragging commits live; debounce throttles it; Escape cancels the
// gesture and restores the start value.
const [volume, setVolume] = useState(40);`,
      jsx: `<>
  <OgeSlider
    value={volume}
    onValueChange={setVolume}
    min={0}
    max={100}
    ariaLabel="Volume"
  />
  <p className="mt-3 text-sm">
    Value: <code>{volume}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Range slider',
    description:
      "Two thumbs selecting a [start, end] pair. Each thumb's aria-valuemin/aria-valuemax is dynamically constrained by the other — the APG multi-thumb rule — and minRange keeps a minimum gap. Clicking the track moves the nearest thumb.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRangeSlider'] },
      name: 'RangeSliderDemo',
      body: `// APG multi-thumb: two focusable thumbs, each one's aria-valuemin/max
// dynamically constrained by the other (plus minRange). Clicking the
// track moves the NEAREST thumb.
const [price, setPrice] = useState<readonly [number, number]>([200, 600]);`,
      jsx: `<>
  <OgeRangeSlider
    value={price}
    onValueChange={setPrice}
    min={0}
    max={1000}
    step={10}
    minRange={50}
  />
  <p className="mt-3 text-sm">
    Range:{' '}
    <code>
      {price[0]} – {price[1]}
    </code>
  </p>
</>`,
    }),
  },
  {
    title: 'Ticks and labels',
    description:
      "Ticks sit on the tickStep grid (falling back to largeStep, then step). showTickLabels renders a formatted label under each tick — Kendo's tick title callback, fed by formatValue; showLabels renders just the min/max ends instead.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSlider'] },
      name: 'SliderTicksDemo',
      body: `const [rating, setRating] = useState(6);`,
      jsx: `<OgeSlider
  value={rating}
  onValueChange={setRating}
  min={0}
  max={10}
  largeStep={2}
  showTicks
  showTickLabels
  ariaLabel="Rating"
/>`,
    }),
  },
  {
    title: 'Value indicator',
    description:
      "valueIndicator: 'active' shows the bubble while focused or dragging; 'always' keeps it up. formatValue feeds the bubble, the end labels AND aria-valuetext — display and screen-reader announcement can never diverge.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSlider'] },
      name: 'SliderIndicatorDemo',
      before: `const asDecibels = (value: number): string => \`\${value} dB\`;`,
      body: `const [decibels, setDecibels] = useState(40);`,
      jsx: `<OgeSlider
  value={decibels}
  onValueChange={setDecibels}
  valueIndicator="active"
  formatValue={asDecibels}
  showLabels
  ariaLabel="Volume"
/>`,
    }),
  },
  {
    title: 'Buttons and vertical',
    description:
      "showButtons adds Kendo-style increment/decrement buttons with press-and-hold repeat (the number box's spin timing). A vertical slider keeps the same role with aria-orientation — Up still increases, per the APG.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSlider'] },
      name: 'SliderButtonsDemo',
      body: `const [level, setLevel] = useState(30);`,
      jsx: `<>
  <OgeSlider
    value={level}
    onValueChange={setLevel}
    showButtons
    ariaLabel="With buttons"
  />
  <div style={{ height: 180 }}>
    <OgeSlider
      value={level}
      onValueChange={setLevel}
      orientation="vertical"
      ariaLabel="Vertical"
    />
  </div>
</>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      "Inside <OgeForm> the slider is a bare editor — the form renders the label/hint/error chrome around it. dataType 'number' still defaults to the number box; the slider is an explicit editorType choice.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeFormItemDefinition'] },
      name: 'SliderFormDemo',
      before: `const items: OgeFormItemDefinition[] = [
  {
    field: 'brightness',
    label: 'Brightness',
    editorType: 'slider',
    editorOptions: { min: 0, max: 100, step: 5 },
  },
];`,
      body: `const [settings, setSettings] = useState({ brightness: 70 });`,
      jsx: `<div>
  <OgeForm formData={settings} onFormDataChange={setSettings} items={items} />
  <p className="mt-3 text-sm">
    Model: <code>{settings.brightness}</code>
  </p>
</div>`,
    }),
  },
];
