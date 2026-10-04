import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React masked text box page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Section-for-section mirror of `../inputs/masked-text-box.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same order, same example
 * content, React idiom.
 */
export const INPUTS_MASKED_TEXT_BOX_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      '0 is a required digit; the parentheses, the space and the dash are literals the caret skips. The value is the raw digits — no literals, no placeholders — and a digit-only mask asks mobile keyboards for the numeric layout.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMaskedTextBox'] },
      name: 'MaskedTextBoxDemo',
      body: `// 0 = a required digit; ( ) - and the space are literals the caret
// skips. The value is the raw digits — no literals, no placeholders.
const [phone, setPhone] = useState('');`,
      jsx: `<>
  <OgeMaskedTextBox
    label="Phone"
    mask="(000) 000-0000"
    value={phone}
    onValueChange={setPhone}
    autocomplete="tel-national"
  />
  <p>
    Value: <code>{phone}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Mask syntax and custom rules',
    description:
      '0 digit, 9 optional digit, # digit/space/sign, L/l letter (required/optional, any script), A/a letter or digit, C/c any character; a backslash makes a rule character literal. maskRules adds single-character keys — a RegExp, a string of allowed characters or a predicate.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMaskedTextBox'] },
      types: { '@oge-ui/react-inputs': ['OgeMaskRules'] },
      name: 'MaskSyntaxDemo',
      before: `// module scope: a stable maskRules object (a new one per render
// would rebuild the mask)
const hexRules: OgeMaskRules = { H: /[0-9a-f]/i };
// a backslash makes a rule character literal: "A" is printed, not typed
const productMask = '\\\\A-000-LL';`,
      body: `const [plate, setPlate] = useState('');
const [hex, setHex] = useState('');
const [extension, setExtension] = useState('');
const [product, setProduct] = useState('');`,
      jsx: `<>
  {/* L = a required letter (any script), 0 = a digit */}
  <OgeMaskedTextBox label="Licence plate" mask="00 LLL 000" value={plate} onValueChange={setPlate} />
  {/* a custom rule: H accepts one hex digit (always a required slot) */}
  <OgeMaskedTextBox
    label="Hex color"
    mask="HHHHHH"
    maskRules={hexRules}
    prefix={<span>#</span>}
    value={hex}
    onValueChange={setHex}
  />
  {/* 9 = an optional digit; "ext. " has no rule characters, so it is literal */}
  <OgeMaskedTextBox label="Extension" mask="ext. 0999" value={extension} onValueChange={setExtension} />
  <OgeMaskedTextBox label="Product code" mask={productMask} value={product} onValueChange={setProduct} />
</>`,
    }),
  },
  {
    title: 'Raw and formatted values',
    description:
      'By default the value is the raw characters; includeLiterals commits the formatted text instead. onMaskCompleted fires once, when the last required slot is filled.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMaskedTextBox'] },
      name: 'MaskValuesDemo',
      body: `const [raw, setRaw] = useState('');
const [formatted, setFormatted] = useState('');
const [status, setStatus] = useState('Type all 16 digits');`,
      jsx: `<>
  <OgeMaskedTextBox label="Card (raw)" mask="0000 0000 0000 0000" value={raw} onValueChange={setRaw} />
  <OgeMaskedTextBox
    label="Card (with literals)"
    mask="0000 0000 0000 0000"
    includeLiterals
    value={formatted}
    onValueChange={setFormatted}
    onMaskCompleted={(event) => setStatus(\`Complete: \${event.maskedValue}\`)}
  />
  <p>
    raw: <code>{raw}</code> · formatted: <code>{formatted}</code>
  </p>
  <p>{status}</p>
</>`,
    }),
  },
  {
    title: 'Mask display',
    description:
      "maskChar sets the placeholder of empty slots. showMaskMode: 'onFocus' keeps the empty mask hidden while blurred so the placeholder shows; a floating label does the same, so the label never sits on top of the mask.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMaskedTextBox'] },
      name: 'MaskDisplayDemo',
      body: `const [code, setCode] = useState('');
const [postal, setPostal] = useState('');
const [pin, setPin] = useState('');`,
      jsx: `<>
  <OgeMaskedTextBox label="Date code" mask="00.00.0000" maskChar="•" value={code} onValueChange={setCode} />
  <OgeMaskedTextBox
    label="Postal code"
    mask="00000"
    showMaskMode="onFocus"
    placeholder="5 digits"
    value={postal}
    onValueChange={setPostal}
  />
  <OgeMaskedTextBox label="PIN" labelMode="floating" mask="0000" value={pin} onValueChange={setPin} />
</>`,
    }),
  },
  {
    title: 'Validation and forms',
    description:
      "An unfinished mask flags the field (after blur, per errorDisplay) with maskInvalidMessage or the catalog's maskInvalidError. Form libraries check the same rule with ogeMaskComplete(), which also runs on a server.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeMaskedTextBox', 'ogeMaskComplete'] },
      name: 'MaskValidationDemo',
      before: `const IBAN_MASK = 'LL00 0000 0000 0000 0000 00';`,
      body: `const [iban, setIban] = useState('');
const [taxNumber, setTaxNumber] = useState('');
// the editor's own check, reusable by any form library or a server
const ibanValid = iban !== '' && ogeMaskComplete(IBAN_MASK, iban);`,
      jsx: `<>
  <OgeMaskedTextBox label="IBAN" mask={IBAN_MASK} required value={iban} onValueChange={setIban} />
  <OgeMaskedTextBox
    label="Tax number"
    mask="000-000-0000"
    maskInvalidMessage="Enter all 10 digits"
    value={taxNumber}
    onValueChange={setTaxNumber}
  />
  <p>
    IBAN valid: <code>{String(ibanValid)}</code>
  </p>
</>`,
    }),
  },
  {
    title: 'Mask on the text box',
    description:
      'The same engine on the plain text box: mask is optional there, so a time field can keep its clear button and prefix/suffix slots. Without a mask it is the ordinary text box.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'TextBoxMaskDemo',
      body: `const [time, setTime] = useState('');`,
      jsx: `<>
  <OgeTextBox label="Time" mask="00:00" includeLiterals showClearButton value={time} onValueChange={setTime} />
  <p>
    Value: <code>{time}</code>
  </p>
</>`,
    }),
  },
];
