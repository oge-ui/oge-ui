import {
  reactDemoSource,
  type ReactDemo,
} from '../../shared/react-demo-source';

/**
 * Demo sources for the React OTP input page. Pure data — the generator and
 * the compile gate load it in plain Node. Section-for-section mirror of
 * `../inputs/otp-input.ts`.
 */
export const INPUTS_OTP_INPUT_DEMOS: readonly ReactDemo[] = [
  {
    title: 'Getting started',
    description:
      'One labelled role="group" with one Tab stop (the caret cell). Typing fills and advances, Backspace steps back, a paste or the SMS autofill fills every cell; onCompleted fires once the code is whole.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeOtpInput'] },
      name: 'OtpInputDemo',
      body: `const [code, setCode] = useState('');
const [status, setStatus] = useState('Waiting for the code');`,
      jsx: `<>
  <OgeOtpInput
    label="Verification code"
    hint="We sent a 6-digit code to your phone."
    value={code}
    onValueChange={setCode}
    onCompleted={(event) => setStatus('Verifying ' + event.value)}
  />
  <p className="mt-3 text-sm">
    Value: <code>{code}</code> · {status}
  </p>
</>`,
    }),
  },
  {
    title: 'Character types and groups',
    description:
      "type: 'numeric' (script and full-width digits fold to ASCII) | 'alphanumeric' | 'alphabetic'; letterCase upper-cases letters; groupSize draws a decorative separator.",
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeOtpInput'] },
      name: 'OtpInputTypesDemo',
      body: `const [key, setKey] = useState('');`,
      jsx: `<OgeOtpInput
  label="Licence key"
  type="alphanumeric"
  letterCase="upper"
  length={8}
  groupSize={4}
  value={key}
  onValueChange={setKey}
/>`,
    }),
  },
  {
    title: 'Masked PIN',
    description:
      'masked hides the characters like a password field; placeholder marks the empty cells; size picks the cell scale.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeOtpInput'] },
      name: 'OtpInputMaskedDemo',
      body: `const [pin, setPin] = useState('');`,
      jsx: `<OgeOtpInput
  label="PIN"
  length={4}
  masked
  placeholder="•"
  size="lg"
  value={pin}
  onValueChange={setPin}
/>`,
    }),
  },
  {
    title: 'Inside a form',
    description:
      'The controlled pair is the integration point: pass required, errors and touched from your form layer. A complete code is value.length === length.',
    source: reactDemoSource({
      react: ['useState'],
      use: { '@oge-ui/react-inputs': ['OgeOtpInput'] },
      name: 'OtpInputFormDemo',
      body: `const [otp, setOtp] = useState('');
const [touched, setTouched] = useState(false);`,
      jsx: `<OgeOtpInput
  label="Code"
  length={6}
  required
  value={otp}
  onValueChange={setOtp}
  touched={touched}
  onBlur={() => setTouched(true)}
  errors={otp.length === 6 ? [] : [{ kind: 'required' }]}
/>`,
    }),
  },
];
