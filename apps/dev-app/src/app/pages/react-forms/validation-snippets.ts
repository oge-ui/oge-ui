import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React form-validation page. Pure data, no React
 * imports — the `llms.txt` generator and the compile gate load this module in
 * plain Node.
 *
 * Mirror of `../forms/validation.ts` minus its three Angular-binding sections
 * (Signal Forms, reactive forms, schema-carried layout), which document
 * Angular-only engines; the gap is recorded in `docs/REACT-PARITY.md`. The
 * four remaining sections keep their headings, order and example content.
 */
export const FORMS_VALIDATION_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Declarative rules',
    description:
      'Rules are plain objects with a string-union type, evaluated by evaluateOgeValidationRules() in @oge-ui/behavior — the same function the Angular schema calls. Messages come from the @oge-ui/react-inputs message table, so the text under a field is identical whether the editor is used inside a form or on its own.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeValidationRule'] },
      name: 'DeclarativeRulesDemo',
      before: `const usernameRules: OgeValidationRule[] = [
  { type: 'required' },
  { type: 'stringLength', min: 3, max: 20 },
];
const emailRules: OgeValidationRule[] = [
  { type: 'required' },
  { type: 'email' },
];
const ageRules: OgeValidationRule[] = [{ type: 'numeric', min: 18, max: 120 }];`,
      body: `const [signup, setSignup] = useState({ username: '', email: '', age: 0 });`,
      jsx: `<OgeForm
  formData={signup}
  onFormDataChange={setSignup}
  showValidationSummary
  layout={[
    { field: 'username', label: 'Username', validationRules: usernameRules },
    { field: 'email', label: 'E-mail', validationRules: emailRules },
    { field: 'age', label: 'Age', validationRules: ageRules },
  ]}
/>`,
    }),
  },
  {
    title: 'Custom & cross-field rules',
    description:
      'A custom rule receives its own value and the whole model; the declarative compare rule covers the common confirm-password case. An async rule is scheduled by the form and reported when it settles.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm'] },
      types: { '@oge-ui/react-forms': ['OgeValidationRule'] },
      name: 'CustomRulesDemo',
      before: `const matchRule: OgeValidationRule[] = [
  {
    type: 'custom',
    validate: ({ value, data }) =>
      value === data['password'] ? null : 'Passwords do not match',
  },
];`,
      body: `const [account, setAccount] = useState({ password: '', confirm: '' });`,
      jsx: `<OgeForm
  formData={account}
  onFormDataChange={setAccount}
  layout={[
    { field: 'password', label: 'Password', isRequired: true },
    { field: 'confirm', label: 'Confirm', validationRules: matchRule },
  ]}
/>`,
    }),
  },
  {
    title: 'Validation summary',
    description:
      'The summary is a role="alert" list, so a failed submit is announced. Every row is a real button that focuses its field, and a failed submit also moves focus to the first invalid field and scrolls it into view. Let the form render it with showValidationSummary, or render it yourself — Angular reads the live errors() signal off the instance; React has no signal to read, so the rows come from onValidated (fired by every submit and by validate()) or from handle.errors.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-buttons': ['OgeButton'],
        '@oge-ui/react-forms': ['OgeForm', 'OgeValidationSummary'],
      },
      types: { '@oge-ui/react-forms': ['OgeFormHandle'] },
      name: 'ValidationSummaryDemo',
      body: `const [ticket, setTicket] = useState({ title: '', reporter: '' });
const [errors, setErrors] = useState<OgeFormHandle['errors']>([]);
const form = useRef<OgeFormHandle<typeof ticket>>(null);`,
      jsx: `<>
  <OgeValidationSummary
    errors={errors}
    onErrorClick={(entry) => form.current?.focus(entry.field)}
  />
  <OgeForm
    ref={form}
    formData={ticket}
    onFormDataChange={setTicket}
    onValidated={(event) => setErrors(event.errors)}
    layout={[
      { field: 'title', label: 'Title', isRequired: true },
      { field: 'reporter', label: 'Reporter', isRequired: true },
    ]}
    actions={
      <OgeButton text="Save" stylingMode="contained" useSubmitBehavior />
    }
  />
</>`,
    }),
  },
  {
    title: 'Configuration',
    description:
      'Every user-facing string — the required mark, the optional mark, the summary heading — lives in the messages interface, so a translation is one provider. Layout defaults can be set the same way and overridden per instance.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-forms': ['OgeForm', 'OgeFormsConfigProvider'] },
      name: 'FormsConfigDemo',
      body: `const [contact, setContact] = useState({ name: '', phone: '' });`,
      jsx: `<OgeFormsConfigProvider
  config={{
    labelLocation: 'start',
    showOptionalMark: true,
    messages: {
      requiredMark: '•',
      optionalLabel: 'isteğe bağlı',
      validationSummaryTitle: '{count} alan dikkatinizi bekliyor',
      validationSummaryTitleOne: '1 alan dikkatinizi bekliyor',
    },
  }}
>
  <OgeForm
    formData={contact}
    onFormDataChange={setContact}
    layout={[
      { field: 'name', label: 'Ad', isRequired: true },
      { field: 'phone', label: 'Telefon' },
    ]}
  />
</OgeFormsConfigProvider>`,
    }),
  },
  {
    title: 'Server errors & conditional fields',
    description:
      'visibleWhen / requiredWhen / disabledWhen take a predicate over the model or { field, equals }; a hidden item is not validated. setErrors({ email: [...] }) on the handle shows a server message in the field and the summary until the field is edited.',
    source: reactDemoSource({
      react: ['useRef', 'useState'],
      use: {
        '@oge-ui/react-forms': ['OgeForm'],
        '@oge-ui/react-buttons': ['OgeButton'],
      },
      types: {
        '@oge-ui/react-forms': ['OgeFormHandle', 'OgeFormItemDefinition'],
      },
      before: `interface Registration {
  kind: string;
  company: string;
  email: string;
  password: string;
  confirm: string;
}

const items: OgeFormItemDefinition[] = [
  {
    field: 'kind',
    editorType: 'radioGroup',
    editorOptions: {
      items: [{ id: 'person', text: 'Person' }, { id: 'company', text: 'Company' }],
      valueExpr: 'id',
      displayExpr: 'text',
    },
  },
  {
    field: 'company',
    // shown — and required — only for companies; hidden items are not validated
    visibleWhen: { field: 'kind', equals: 'company' },
    requiredWhen: { field: 'kind', equals: 'company' },
  },
  { field: 'email', isRequired: true },
  { field: 'password', isRequired: true },
  { field: 'confirm', validationRules: [{ type: 'compare', comparisonTarget: 'password' }] },
];`,
      name: 'FormServerErrorsDemo',
      body: `const form = useRef<OgeFormHandle<Registration>>(null);
const [data, setData] = useState<Registration>({
  kind: 'person',
  company: '',
  email: '',
  password: '',
  confirm: '',
});`,
      jsx: `<OgeForm
  ref={form}
  formData={data}
  onFormDataChange={setData}
  items={items}
  showValidationSummary
  onSubmitted={async ({ data: submitted }) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(submitted),
    });
    // e.g. { email: ['This email is already registered'] } — shown in the
    // field and the summary, cleared as soon as the user edits the field
    if (!response.ok) form.current?.setErrors(await response.json());
  }}
  actions={<OgeButton text="Register" stylingMode="contained" useSubmitBehavior />}
/>`,
    }),
  },
];
