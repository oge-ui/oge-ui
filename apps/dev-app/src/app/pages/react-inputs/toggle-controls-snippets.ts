import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React toggle-controls page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Section-for-section mirror of `../inputs/toggle-controls.ts`, per the parity
 * standard (`docs/REACT-PARITY.md`): same headings, same order, same example
 * content, React idiom.
 */
export const INPUTS_TOGGLE_CONTROLS_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Check Box',
    description:
      "A real (visually hidden) native checkbox drives semantics — label clicks, Space and aria-checked='mixed' come for free. value is boolean | null: null always renders the indeterminate dash, and threeState lets users cycle into it.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeCheckBox'] },
      name: 'CheckBoxDemo',
      body: `const [agreed, setAgreed] = useState<boolean | null>(false);
const [all, setAll] = useState<boolean | null>(null);`,
      jsx: `<div className="demo-row">
  <OgeCheckBox value={agreed} onValueChange={setAgreed}>
    I agree to the terms
  </OgeCheckBox>

  {/* tri-state: null renders the indeterminate dash;
      threeState lets USERS cycle null → true → false → null */}
  <OgeCheckBox threeState text="Select all" value={all} onValueChange={setAll} />

  <div className="text-sm">
    select all: <code>{all === null ? 'null (indeterminate)' : String(all)}</code>
  </div>
</div>`,
    }),
  },
  {
    title: 'Switch',
    description:
      "A native <button role='switch'> with aria-checked and a sliding thumb. Track texts default to the localized switchOn/switchOff messages ('ON'/'OFF'); override per instance or pass empty strings to hide them. The reference swipe gesture is deliberately not replicated.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeSwitch'] },
      name: 'SwitchDemo',
      body: `const [notify, setNotify] = useState(true);
const [enabled, setEnabled] = useState(false);
const [plain, setPlain] = useState(false);
const [small, setSmall] = useState(true);`,
      jsx: `<div className="demo-row">
  {/* label feeds aria-label — always name your switch */}
  <OgeSwitch label="Notifications" value={notify} onValueChange={setNotify} />

  {/* track texts come from the localized messages (ON/OFF);
      override per instance, empty string hides them */}
  <OgeSwitch
    label="Localized"
    onText="AÇIK"
    offText="KAPALI"
    value={enabled}
    onValueChange={setEnabled}
  />
  <OgeSwitch
    label="Plain"
    onText=""
    offText=""
    value={plain}
    onValueChange={setPlain}
  />
  <OgeSwitch label="Small" size="sm" value={small} onValueChange={setSmall} />
  <OgeSwitch label="Disabled" disabled value={true} />
</div>`,
    }),
  },
  {
    title: 'Radio Group',
    description:
      'Flat items with displayExpr/valueExpr/disabledExpr; layout switches column/row. Arrows move focus and selection (wrapping, disabled skipped, RTL-aware) per the WAI-ARIA radio-group pattern.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeRadioGroup'] },
      name: 'RadioGroupDemo',
      before: `const plans = [
  { id: 'starter', name: 'Starter' },
  { id: 'team', name: 'Team' },
  { id: 'scale', name: 'Scale (sold out)', soldOut: true },
  { id: 'enterprise', name: 'Enterprise' },
];`,
      body: `const [planId, setPlanId] = useState<unknown>('team');
const [priority, setPriority] = useState<unknown>('Normal');`,
      jsx: `<div className="demo-row demo-row-start">
  <OgeRadioGroup
    label="Plan"
    items={plans}
    displayExpr="name"
    valueExpr="id"
    disabledExpr="soldOut"
    value={planId}
    onValueChange={setPlanId}
  />

  <OgeRadioGroup
    label="Priority"
    layout="horizontal"
    items={['Low', 'Normal', 'High']}
    value={priority}
    onValueChange={setPriority}
  />

  <div className="text-sm">
    plan: <code>{String(planId ?? 'null')}</code>
  </div>
</div>`,
    }),
  },
  {
    title: 'Forms integration',
    description:
      'React has no formField/formControl binding — the controlled pair IS the integration point. All three controls are the same controlled/uncontrolled pair (value + onValueChange, or defaultValue alone), so any form library binds them by holding the value: useState here, a field object with React Hook Form, Formik or TanStack Form elsewhere. onValueCommitted adds previousValue and the originating DOM event for cross-field rules.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeCheckBox', 'OgeRadioGroup', 'OgeSwitch'],
      },
      name: 'ToggleFormDemo',
      before: `const plans = [
  { id: 'free', name: 'Free' },
  { id: 'pro', name: 'Pro' },
];`,
      body: `// The form state lives here — with a form library it would live in the
// field object instead. Either way the binding is the same controlled pair.
const [model, setModel] = useState<{
  terms: boolean;
  marketing: boolean;
  plan: unknown;
}>({ terms: false, marketing: false, plan: 'free' });`,
      jsx: `<form className="demo-row demo-row-start" onSubmit={(event) => event.preventDefault()}>
  <OgeCheckBox
    value={model.terms}
    onValueChange={(value) => setModel({ ...model, terms: value === true })}
  >
    Accept terms
  </OgeCheckBox>

  <OgeSwitch
    label="Marketing"
    value={model.marketing}
    onValueChange={(marketing) => setModel({ ...model, marketing })}
  />

  <OgeRadioGroup
    label="Plan"
    items={plans}
    displayExpr="name"
    valueExpr="id"
    value={model.plan}
    onValueChange={(plan) => setModel({ ...model, plan })}
  />

  <div className="text-sm">
    model: <code>{JSON.stringify(model)}</code>
  </div>
</form>`,
    }),
  },
];
