import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React input showcase. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/showcase.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom.
 */
export const INPUTS_SHOWCASE_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Character counter',
    description:
      'showCounter renders a live counter in the subscript end slot. It counts what users perceive — grapheme clusters — so a multi-codepoint family emoji or a flag counts as one character, not eight code units. The default limit mode enforces maxLength natively; soft mode lets typing continue past the limit and turns the counter red instead.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextArea', 'OgeTextBox'] },
      name: 'CounterDemo',
      body: `const [bio, setBio] = useState('');`,
      jsx: `<div className="demo-row">
  {/* grapheme-accurate: a family emoji counts as 1 character, not 8 code units */}
  <OgeTextBox
    label="Bio"
    value={bio}
    onValueChange={setBio}
    showCounter
    maxLength={40}
    hint="a family emoji counts as 1"
  />

  {/* soft mode: typing past the limit is allowed, the counter turns red */}
  <OgeTextArea label="Tweet" showCounter maxLength={140} counterMode="soft" rows={2} />
</div>`,
    }),
  },
  {
    title: 'Password reveal & copy',
    description:
      "mode='password' automatically adds a reveal toggle that flips the input type in place — the caret position survives and password managers stay attached. showCopyButton adds one-click copy with a transient confirmation announced to screen readers; ideal for API keys and tokens, especially combined with readonly.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'PasswordDemo',
      body: `const [password, setPassword] = useState('top-secret-42');
const [token] = useState('oge_live_4f8a2b91c3d7');`,
      jsx: `<div className="demo-row">
  <OgeTextBox label="Password" mode="password" value={password} onValueChange={setPassword} />
  <OgeTextBox label="API token" value={token} showCopyButton readonly />
</div>`,
    }),
  },
  {
    title: 'Locale-aware numbers',
    description:
      'format takes standard Intl.NumberFormatOptions (currency, precision, units) and renders it while the field is unfocused; focusing switches to a raw editable number in the locale decimal notation. Parsing understands grouped input like 1.234,56. Spin buttons and arrow keys step by step with hold-to-repeat, and values clamp to min/max on commit.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeNumberBox'] },
      name: 'NumbersDemo',
      body: `const [price, setPrice] = useState<number | null>(1234.5);
const [quantity, setQuantity] = useState<number | null>(10);`,
      jsx: `<div className="demo-row">
  {/* Intl.NumberFormat display on blur, raw editing on focus */}
  <OgeNumberBox
    label="Price (de-DE)"
    locale="de-DE"
    format={{ style: 'currency', currency: 'EUR' }}
    value={price}
    onValueChange={setPrice}
    showSpinButtons
    step={0.5}
  />
  <OgeNumberBox
    label="Quantity"
    value={quantity}
    onValueChange={setQuantity}
    min={0}
    max={100}
    showSpinButtons
    hint="0–100; arrow keys work too"
  />
</div>`,
    }),
  },
  {
    title: 'Debounced commits',
    description:
      'debounce delays the committed value (value, onValueChange and onValueCommitted) until typing pauses — ideal for search fields that trigger requests. Blur and Enter flush immediately so nothing is ever lost, while onInputChange keeps streaming every raw keystroke if you need it.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'DebounceDemo',
      body: `const [query, setQuery] = useState('');
const [keystrokes, setKeystrokes] = useState(0);`,
      jsx: `<div className="demo-row">
  {/* value commits 400ms after the last keystroke; blur/Enter flush instantly */}
  <OgeTextBox
    label="Search"
    value={query}
    onValueChange={setQuery}
    debounce={400}
    onInputChange={() => setKeystrokes((n) => n + 1)}
  />
  <span className="self-center text-sm opacity-70">
    keystrokes: {keystrokes} · committed value: "{query}"
  </span>
</div>`,
    }),
  },
];
