import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React stepper page. Pure data, no React imports — the
 * `llms.txt` generator and the compile gate load this module in plain Node.
 *
 * Section-for-section mirror of `../navigation/stepper-snippets.ts`, per the
 * parity standard (`docs/REACT-PARITY.md`): the same eight sections, in the
 * same order, with the same example content — translated to React idiom. The
 * declarative `<oge-step>` children arrive here as `steps` entries carrying a
 * `content` node, the `[(activeIndex)]` model as the controlled
 * `activeIndex` + `onActiveIndexChange` pair, and the `[ogeStepperNext]` /
 * `[ogeStepperPrevious]` directives as the imperative handle's `next()` /
 * `previous()`.
 */
export const NAVIGATION_STEPPER_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Commands',
    description:
      'The built-in Back / Next bar becomes Finish on the last step. None of Angular Material, Kendo or PrimeNG ships navigation buttons at all — every one of them makes you hand-roll a wizard’s most predictable part. icon takes SVG path data and replaces the step number.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      types: { '@oge-ui/react-navigation': ['OgeStepDefinition'] },
      name: 'StepperBasicsDemo',
      before: `// A React step is a \`steps\` entry: the shared step data plus the content
// node the Angular <oge-step> would have projected. The built-in Back /
// Next bar is opt-in — none of the reference steppers ships one at all.
// icon takes SVG path data and replaces the step number in the indicator.
const userIcon =
  'M8 7.5A2.75 2.75 0 1 0 8 2a2.75 2.75 0 0 0 0 5.5ZM2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5Z';

const steps: readonly OgeStepDefinition[] = [
  {
    key: 'account',
    label: 'Account',
    description: 'Who you are',
    icon: userIcon,
    content: <p>Account fields…</p>,
  },
  {
    key: 'shipping',
    label: 'Shipping',
    description: 'Where it goes',
    optional: true,
    content: <p>Shipping fields…</p>,
  },
  {
    key: 'review',
    label: 'Review',
    description: 'One last look',
    content: <p>Confirm and submit…</p>,
  },
];`,
      body: `const [step, setStep] = useState(0);`,
      jsx: `<OgeStepper
  steps={steps}
  activeIndex={step}
  onActiveIndexChange={setStep}
  showNavigation
/>`,
    }),
  },
  {
    title: 'Linear flow',
    description:
      'linear blocks moving past a step that is neither completed nor optional; editable: false blocks coming back. Every refusal emits onStepBlocked with the reason — Material refuses silently and its own docs tell you to add a live region yourself.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      types: { '@oge-ui/react-navigation': ['OgeStepBlockedEvent'] },
      name: 'StepperLinearDemo',
      before: `// linear blocks moving past a step that is neither completed nor optional,
// and editable:false blocks coming back. Every refusal says WHY — Angular
// Material refuses silently and tells you to add your own live region.`,
      body: `const [step, setStep] = useState(0);
const [accountDone, setAccountDone] = useState(false);
const [paymentDone, setPaymentDone] = useState(false);

const onStepBlocked = (event: OgeStepBlockedEvent): void => {
  console.log('refused because', event.reason);
};`,
      jsx: `<OgeStepper
  linear
  showNavigation
  activeIndex={step}
  onActiveIndexChange={setStep}
  onStepBlocked={onStepBlocked}
  steps={[
    { label: 'Account', completed: accountDone, editable: false },
    { label: 'Payment', completed: paymentDone },
    { label: 'Review' },
  ]}
/>`,
    }),
  },
  {
    title: 'Step states',
    description:
      'The indicator state is derived from the step’s own flags. error outranks done, so a completed step that later fails still reads as needing attention. The glyph is aria-hidden, so the state is announced in text as well.',
    source: reactDemoSource({
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      name: 'StepperStateDemo',
      before: `// The indicator state is derived: error outranks done, so a completed step
// that later fails still reads as needing attention. The glyph is
// aria-hidden, so the state is also announced in text.`,
      jsx: `<OgeStepper
  activeIndex={0}
  display="full"
  steps={[
    { label: 'Active', description: 'the current step' },
    { label: 'Done', completed: true },
    { label: 'Error', completed: true, invalid: true },
    { label: 'Upcoming' },
  ]}
/>`,
    }),
  },
  {
    title: 'Leave guard',
    description:
      'stepGuard runs when the user leaves a step, inside the same pipeline the headers use. false, a throw and a rejection all veto; a promise reports changePending and a second gesture meanwhile is dropped. It gates the finish on the last step too.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      name: 'StepperGuardDemo',
      before: `// stepGuard runs when the user LEAVES a step, inside the same pipeline the
// headers use. false, a throw and a rejection all veto; a promise reports
// changePending (and onChangePendingChange) and a second gesture meanwhile
// is dropped. It gates the finish on the last step too.`,
      body: `const [step, setStep] = useState(0);
const [dirty, setDirty] = useState(true);

const confirmLeave = (): boolean =>
  !dirty || confirm('Discard your changes?');`,
      jsx: `<OgeStepper
  showNavigation
  activeIndex={step}
  onActiveIndexChange={setStep}
  steps={[
    { label: 'Details', stepGuard: confirmLeave, content: <p>Details…</p> },
    { label: 'Done', content: <p>Done…</p> },
  ]}
/>`,
    }),
  },
  {
    title: 'Orientation',
    description:
      'Vertical stacks the bodies under their own headers. The ARIA model is identical either way — the headers stay buttons with aria-current="step", so a screen reader hears the same widget.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      types: { '@oge-ui/react-navigation': ['OgeStepperOrientation'] },
      name: 'StepperVerticalDemo',
      before: `// The ARIA semantics do NOT change with the orientation: it is an ordered
// list of buttons with aria-current="step" either way. Angular Material
// swaps to tab semantics when horizontal, so the same widget reads as two
// different things to a screen reader.`,
      body: `const [step, setStep] = useState(0);
const [orientation, setOrientation] =
  useState<OgeStepperOrientation>('vertical');`,
      jsx: `<OgeStepper
  orientation={orientation}
  activeIndex={step}
  onActiveIndexChange={setStep}
  steps={[
    { label: 'One', content: <p>First body…</p> },
    { label: 'Two', content: <p>Second body…</p> },
  ]}
/>`,
    }),
  },
  {
    title: 'Navigation buttons',
    description:
      'Angular turns any button into a control with [ogeStepperNext] / [ogeStepperPrevious]; React has no directives, so the same pipeline is addressed through the imperative handle — next() and previous() run linear and stepGuard exactly as the headers do, from inside a step body or from anywhere outside.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: { '@oge-ui/react-navigation': ['OgeStepper'] },
      types: { '@oge-ui/react-navigation': ['OgeStepperHandle'] },
      name: 'StepperNavDemo',
      before: `// The handle routes through the same pipeline the headers use, so linear
// and stepGuard still apply. A button inside a step body and a button
// outside the stepper drive it identically — which Material's directives
// cannot do from outside.`,
      body: `const wizard = useRef<OgeStepperHandle>(null);
const [step, setStep] = useState(0);`,
      jsx: `<>
  <OgeStepper
    ref={wizard}
    activeIndex={step}
    onActiveIndexChange={setStep}
    steps={[
      {
        label: 'One',
        content: (
          <>
            <p>First body…</p>
            <button type="button" onClick={() => wizard.current?.next()}>
              Continue
            </button>
          </>
        ),
      },
      { label: 'Two', content: <p>Second body…</p> },
    ]}
  />

  <button type="button" onClick={() => wizard.current?.previous()}>
    Back
  </button>
</>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'Angular wraps the stepper in <oge-form-steps> and reads step completion from the form’s own per-step error rollup. @oge-ui/forms has no React layer yet (docs/REACT-PARITY.md), so the honest React idiom is the same shape one level down: @oge-ui/react-inputs editors bound to your own state, and completed computed from that state — the linear gate, the per-step error display and the “steps ahead stay quiet” behaviour are all the stepper’s, not the form’s.',
    source: reactDemoSource({
      react: ['useState'],
      use: {
        '@oge-ui/react-inputs': ['OgeTextBox'],
        '@oge-ui/react-navigation': ['OgeStepper'],
      },
      name: 'StepperFormDemo',
      before: `// @oge-ui/forms has no React layer yet (docs/REACT-PARITY.md), so the
// editors hold their value in your own state — useState here, but React
// Hook Form, Formik or TanStack Form bind exactly the same way. Step
// completion is a plain derivation of that state, which is what the Angular
// <oge-form-steps> wrapper computes from the form's per-step error rollup.`,
      body: `const [order, setOrder] = useState({ email: '', card: '' });`,
      jsx: `<OgeStepper
  linear
  showNavigation
  ariaLabel="Order"
  steps={[
    {
      key: 'account',
      label: 'Account',
      completed: order.email !== '',
      content: (
        <OgeTextBox
          label="E-mail"
          required
          value={order.email}
          onValueChange={(email) => setOrder((o) => ({ ...o, email }))}
        />
      ),
    },
    {
      key: 'payment',
      label: 'Payment',
      completed: order.card !== '',
      content: (
        <OgeTextBox
          label="Card"
          required
          value={order.card}
          onValueChange={(card) => setOrder((o) => ({ ...o, card }))}
        />
      ),
    },
  ]}
/>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Every user-facing string — including the two announced only to screen readers, because the indicator glyph is aria-hidden — lives in the messages interface, overridable app-wide with <OgeStepperConfigProvider> or per instance with the messages prop.',
    source: reactDemoSource({
      use: {
        '@oge-ui/react-navigation': ['OgeStepper', 'OgeStepperConfigProvider'],
      },
      name: 'StepperConfigDemo',
      jsx: `<OgeStepperConfigProvider
  config={{
    linear: true,
    messages: { next: 'İleri', previous: 'Geri', finish: 'Bitir' },
  }}
>
  {/* A single instance can still override the strings with the messages prop. */}
  <OgeStepper
    activeIndex={1}
    showNavigation
    messages={{ stepper: 'Adımlar' }}
    steps={[
      { label: 'Hesap', completed: true },
      { label: 'Ödeme' },
    ]}
  />
</OgeStepperConfigProvider>`,
    }),
  },
];
