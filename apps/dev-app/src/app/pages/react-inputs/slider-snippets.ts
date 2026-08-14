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
      "React has no formField/formControl binding — the controlled pair IS the integration point. Hold the value in your form state (useState, React Hook Form, Formik, TanStack Form) and feed it back through value + onValueChange; the slider stays a bare editor, so the label/hint/error chrome is your form layer's job.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSlider'] },
      name: 'SliderFormDemo',
      body: `// A bare editor: the slider renders no label/hint/error chrome of its own.
// Any form library binds it the same way — read the value from your form
// state, write it back from onValueChange.
const [settings, setSettings] = useState({ brightness: 70 });`,
      jsx: `<form onSubmit={(event) => event.preventDefault()}>
  <span className="text-sm">Brightness</span>
  <OgeSlider
    value={settings.brightness}
    onValueChange={(brightness) => setSettings({ brightness })}
    min={0}
    max={100}
    step={5}
    ariaLabel="Brightness"
  />
  <p className="mt-3 text-sm">
    Model: <code>{settings.brightness}</code>
  </p>
</form>`,
    }),
  },
];
