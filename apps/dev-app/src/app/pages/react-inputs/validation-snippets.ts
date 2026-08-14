import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React input validation page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Position-for-position mirror of `../inputs/validation.ts`
 * (`docs/REACT-PARITY.md`). Angular's two form-library sections name
 * Angular-only APIs (`formControl`, `[formField]`), so the React view keeps
 * their place and their outcome — externally supplied errors, touched-gated
 * display, schema constraints — under honest React headings: any form library
 * (React Hook Form, Formik, TanStack Form) or plain state drives the same
 * props.
 */
export const INPUTS_VALIDATION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Standalone validation',
    description:
      'No forms library required: drive the error state yourself with the invalid flag and an explicit errorText message. errorDisplay chooses when errors surface — after the first blur (touched, the default), after the first edit (dirty), or immediately (always).',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'StandaloneDemo',
      body: `const [username, setUsername] = useState('');`,
      jsx: `<div className="demo-row">
  {/* no forms library: drive state via props */}
  <OgeTextBox
    label="Username"
    value={username}
    onValueChange={setUsername}
    invalid={username.length > 0 && username.length < 3}
    errorText="At least 3 characters"
    errorDisplay="always"
  />
</div>`,
    }),
  },
  {
    title: 'Form library integration',
    description:
      'The React counterpart of the Angular formControl binding: the editors take errors (an OgeFieldError[]), plus invalid, touched, dirty and pending, so React Hook Form, Formik, TanStack Form or plain state all drive the same subscript. Error kinds resolve to localized messages from the config (required, email, minLength, min/max…), and the default errorDisplay="touched" gates them on the first blur — the field tracks its own touched state, so nothing extra is wired for that.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeNumberBox', 'OgeTextBox'] },
      types: { '@oge-ui/react-inputs': ['OgeFieldError'] },
      name: 'FormLibraryDemo',
      before: `// Whatever produces them — a resolver, a schema, a reducer — the editor
// only needs the shared \`OgeFieldError\` shape.
function emailErrors(value: string): OgeFieldError[] {
  if (value === '') return [{ kind: 'required' }];
  return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(value) ? [] : [{ kind: 'email' }];
}`,
      body: `const [email, setEmail] = useState('');
const [quantity, setQuantity] = useState<number | null>(null);
const [touched, setTouched] = useState(false);
const errors = emailErrors(email);`,
      jsx: `<div className="demo-row">
  <OgeTextBox
    label="E-mail"
    mode="email"
    value={email}
    onValueChange={setEmail}
    errors={errors}
    onBlur={() => setTouched(true)}
    hint="required + email"
  />
  <OgeNumberBox
    label="Quantity (1–10)"
    value={quantity}
    onValueChange={setQuantity}
    errors={quantity === null ? [{ kind: 'required' }] : []}
    min={1}
    max={10}
    showSpinButtons
  />
  <span className="self-center text-sm opacity-70">
    status: {errors.length ? 'INVALID' : 'VALID'} · touched: {String(touched)}
  </span>
</div>`,
    }),
  },
  {
    title: 'Schema-driven errors',
    description:
      'The React counterpart of the Angular [formField] schema binding: a schema (Zod, Valibot, Yup, or a hand-written rule set) validates the model and its rules land in the editor twice — as errors for the message, and as the matching constraint props (required, minLength, min/max) for the native attributes and the number clamping bounds. Blur marks the field touched, so messages appear exactly when Signal Forms would show them.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeNumberBox', 'OgeTextBox'] },
      types: { '@oge-ui/react-inputs': ['OgeFieldError'] },
      name: 'SchemaDemo',
      before: `// One rule set, read by both the messages and the constraint props.
const schema = { username: { required: true, minLength: 3 } };

function usernameErrors(value: string): OgeFieldError[] {
  if (value === '') return [{ kind: 'required' }];
  if (value.length < schema.username.minLength) {
    return [{ kind: 'minLength', message: 'At least 3 characters' }];
  }
  return [];
}`,
      body: `const [username, setUsername] = useState('');
const [age, setAge] = useState<number | null>(null);
const errors = usernameErrors(username);`,
      jsx: `<div className="demo-row">
  <OgeTextBox
    label="Username"
    value={username}
    onValueChange={setUsername}
    errors={errors}
    required={schema.username.required}
    minLength={schema.username.minLength}
  />
  <OgeNumberBox label="Age" value={age} onValueChange={setAge} />
  <span className="self-center text-sm opacity-70">
    value: {username} · valid: {String(errors.length === 0)}
  </span>
</div>`,
    }),
  },
  {
    title: 'Linked fields',
    description:
      'Cross-field rules need no event wiring: derive one field props from another piece of state (disabled, min…) and the relationship stays live. When you do want an imperative hook, onValueCommitted delivers value, previousValue and the originating DOM event — an undefined event means the change was programmatic, not typed.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton', 'OgeButtonGroup'],
        '@oge-ui/react-inputs': ['OgeNumberBox', 'OgeTextBox'],
      },
      name: 'LinkedDemo',
      body: `const [invoiceType, setInvoiceType] = useState<readonly string[]>(['personal']);
const [taxId, setTaxId] = useState('');
const [minValue, setMinValue] = useState<number | null>(0);
const [maxValue, setMaxValue] = useState<number | null>(10);
const [lastChange, setLastChange] = useState('Change Max…');`,
      jsx: `<div className="demo-row">
  {/* cross-field rules: bind state to state — no callbacks needed */}
  <OgeButtonGroup
    selectionMode="single"
    selectedKeys={invoiceType}
    onSelectionChange={(change) => setInvoiceType(change.selectedKeys)}
    ariaLabel="Invoice type"
  >
    <OgeButton value="personal" text="Personal" />
    <OgeButton value="company" text="Company" />
  </OgeButtonGroup>
  <OgeTextBox
    label="Tax ID"
    value={taxId}
    onValueChange={setTaxId}
    disabled={!invoiceType.includes('company')}
    hint="enabled for Company only"
  />

  {/* Max takes its lower bound from Min */}
  <OgeNumberBox label="Min" value={minValue} onValueChange={setMinValue} showSpinButtons />
  <OgeNumberBox
    label="Max"
    value={maxValue}
    onValueChange={setMaxValue}
    min={minValue ?? undefined}
    showSpinButtons
    hint="lower bound follows Min"
    onValueCommitted={(e) =>
      // rich change payload: { value, previousValue, event }
      setLastChange(
        \`last change: \${e.previousValue ?? 'empty'} → \${e.value ?? 'empty'} \` +
          \`(\${e.event ? 'user' : 'programmatic'})\`,
      )
    }
  />
  <span className="self-center text-sm opacity-70">{lastChange}</span>
</div>`,
    }),
  },
  {
    title: 'Async validation indicator',
    description:
      'While a server-side check runs, set pending and a spinner appears in the suffix rail (with screen-reader text). Pair it with showSuccessIcon to confirm a passing value — the success mark hides automatically whenever the field is empty, invalid or pending.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-inputs': ['OgeTextBox'] },
      name: 'PendingDemo',
      body: `const [apiKey, setApiKey] = useState('');
const [checking, setChecking] = useState(false);
const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

// \`pending\` shows a rail spinner; pair it with your async validation
const simulateCheck = () => {
  setChecking(true);
  clearTimeout(timer.current);
  timer.current = setTimeout(() => setChecking(false), 900);
};`,
      jsx: `<div className="demo-row">
  <OgeTextBox
    label="API key"
    value={apiKey}
    onValueChange={setApiKey}
    pending={checking}
    showSuccessIcon="always"
    hint="type to trigger a fake async check"
    onInputChange={simulateCheck}
  />
</div>`,
    }),
  },
];
