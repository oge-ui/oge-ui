import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React rating page. Pure data — the generator and the
 * compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/rating.ts`.
 */
export const INPUTS_RATING_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'An APG slider: arrows step (RTL-mirrored), PageUp/PageDown by one item, Home/End, digits jump, Delete/Backspace/0 clear. A press on the current value clears it (allowClear); the pointer previews the pick.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRating'] },
      name: 'RatingDemo',
      body: `const [stars, setStars] = useState<number | null>(3);`,
      jsx: `<>
  <OgeRating label="Your rating" value={stars} onValueChange={setStars} />
  <p className="mt-3 text-sm">
    Value: <code>{stars ?? 'null'}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Half and fractional values',
    description:
      'precision 0.5 gives half stars; 0.1 shows an average exactly. readonly stays focusable and announced (aria-readonly) but unchangeable.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRating'] },
      name: 'RatingPrecisionDemo',
      body: `const [half, setHalf] = useState<number | null>(2.5);
const [ten, setTen] = useState<number | null>(7);`,
      jsx: `<div className="flex flex-col items-start gap-3">
  <OgeRating label="Half stars" precision={0.5} value={half} onValueChange={setHalf} />
  <OgeRating label="Average rating" value={4.3} precision={0.1} readonly />
  <OgeRating label="Out of ten" max={10} size="sm" value={ten} onValueChange={setTen} />
</div>`,
    }),
  },
  {
    title: 'Icons and templates',
    description:
      "Built-in glyphs ('star' | 'heart' | 'circle') or any markup through renderItem — called for the empty and the filled layer, so fractional fills still work. selection=\"single\" paints only the item holding the value.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRating'] },
      name: 'RatingIconsDemo',
      body: `const [love, setLove] = useState<number | null>(4);
const [effort, setEffort] = useState<number | null>(3);`,
      jsx: `<div className="flex flex-wrap items-center gap-6">
  <OgeRating label="Love it" icon="heart" size="lg" value={love} onValueChange={setLove} />
  <OgeRating
    label="Effort"
    selection="single"
    allowClear={false}
    value={effort}
    onValueChange={setEffort}
    renderItem={(item) => <span className="text-sm font-bold">{item.itemValue}</span>}
  />
</div>`,
    }),
  },
  {
    title: 'Radio group semantics',
    description:
      'semantics="radiogroup" renders one radio per item with a roving tab stop: arrows move and select (wrapping), Space selects. Whole-item precision only.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRating'] },
      name: 'RatingRadioDemo',
      body: `const [service, setService] = useState<number | null>(4);`,
      jsx: `<OgeRating
  label="Service"
  semantics="radiogroup"
  value={service}
  onValueChange={setService}
/>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The controlled pair is the integration point: pass required, errors and touched from your form layer. Not rated is null.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRating'] },
      name: 'RatingFormDemo',
      body: `const [overall, setOverall] = useState<number | null>(null);
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeRating
  label="Overall"
  required
  value={overall}
  onValueChange={setOverall}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={overall === null ? [{ kind: 'required' }] : []}
/>`,
    }),
  },
];
