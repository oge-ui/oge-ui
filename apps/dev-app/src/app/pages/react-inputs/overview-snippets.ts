import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React inputs overview. Pure data, no React imports —
 * the `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../inputs/overview.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same example content,
 * React idiom.
 */
export const INPUTS_OVERVIEW_DEMOS: readonly ReactDemo[] = [
  {
    title: 'The three editors',
    description:
      'OgeTextBox, OgeTextArea and OgeNumberBox share one field chrome, so labels, hints, errors and adornments behave identically. All three are controlled/uncontrolled React pairs: pass value + onValueChange, or defaultValue alone. The number editor treats empty as null — never 0.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeNumberBox', 'OgeTextArea', 'OgeTextBox'],
      },
      name: 'EditorsDemo',
      body: `const [name, setName] = useState('');
const [amount, setAmount] = useState<number | null>(null);
const [notes, setNotes] = useState('');`,
      jsx: `<div className="demo-row">
  <OgeTextBox label="Name" value={name} onValueChange={setName} placeholder="Jane Doe" />
  <OgeTextBox label="E-mail" mode="email" hint="We never share it" showClearButton />
  <OgeNumberBox label="Amount" value={amount} onValueChange={setAmount} min={0} showSpinButtons />
  <OgeTextArea label="Notes" value={notes} onValueChange={setNotes} autoResize maxRows={6} />
</div>`,
    }),
  },
  {
    title: 'Styling modes & sizes',
    description:
      'outlined (default), filled and underlined cover the common form aesthetics; all derive from the design tokens and adapt to every theme. Sizes sm/md/lg (28/34/42px) match the button scale exactly.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'StylingDemo',
      jsx: `<div className="demo-row">
  <OgeTextBox label="Outlined" stylingMode="outlined" />
  <OgeTextBox label="Filled" stylingMode="filled" />
  <OgeTextBox label="Underlined" stylingMode="underlined" />
  <OgeTextBox label="Small" size="sm" />
  <OgeTextBox label="Large" size="lg" />
</div>`,
    }),
  },
  {
    title: 'Label modes',
    description:
      'Four placements: static renders a compact caption above the field, outside a conventional block label, floating starts in the placeholder position and lifts on focus or content, and hidden keeps the field visually clean while exposing the label to screen readers via aria-label.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'LabelModesDemo',
      jsx: `<div className="demo-row">
  <OgeTextBox label="Static (default)" labelMode="static" />
  <OgeTextBox label="Floating" labelMode="floating" />
  <OgeTextBox label="Outside" labelMode="outside" />
  <OgeTextBox label="Hidden (aria-label)" labelMode="hidden" placeholder="Search…" />
</div>`,
    }),
  },
  {
    title: 'Prefix & suffix slots',
    description:
      'Pass any node — symbols, icons, units — as the prefix or suffix prop. Custom suffixes render at the end of the built-in rail, after the clear, reveal and copy buttons, so the ordering stays predictable.',
    source: reactDemoSource({
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'AdornmentsDemo',
      jsx: `<div className="demo-row">
  <OgeTextBox label="Price" prefix={<span>€</span>} />
  <OgeTextBox label="Website" placeholder="example.com" prefix={<span>https://</span>} />
</div>`,
    }),
  },
];
