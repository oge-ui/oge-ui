import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { createElement, useState, type ReactNode } from 'react';
import { OgeOtpInput } from '@oge-ui/react-inputs';
import { DemoCard } from '../../shared/demo-card';
import { ReactHost } from '../../shared/react-host';
import { INPUTS_OTP_INPUT_DEMOS } from './otp-input-snippets';

/** TOC of the React view — the same sections as the Angular page. */
export const REACT_INPUTS_OTP_INPUT_SECTIONS = [
  'Getting started',
  'Character types and groups',
  'Masked PIN',
  'Inside a form',
] as const;

function OtpInputDemo(): ReactNode {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('Waiting for the code');
  return createElement(
    'div',
    null,
    createElement(OgeOtpInput, {
      key: 'otp',
      label: 'Verification code',
      hint: 'We sent a 6-digit code to your phone.',
      value: code,
      onValueChange: setCode,
      onCompleted: (event) => setStatus('Verifying ' + event.value),
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'otp-value' }, code),
      ' · ',
      createElement('span', { 'data-testid': 'otp-status' }, status),
    ),
  );
}

function OtpInputTypesDemo(): ReactNode {
  const [key, setKey] = useState('');
  return createElement(
    'div',
    null,
    createElement(OgeOtpInput, {
      key: 'otp',
      label: 'Licence key',
      type: 'alphanumeric',
      letterCase: 'upper',
      length: 8,
      groupSize: 4,
      value: key,
      onValueChange: setKey,
    }),
    createElement(
      'p',
      { key: 'out', className: 'mt-3 text-sm' },
      'Value: ',
      createElement('code', { 'data-testid': 'otp-key' }, key),
    ),
  );
}

function OtpInputMaskedDemo(): ReactNode {
  const [pin, setPin] = useState('');
  return createElement(OgeOtpInput, {
    label: 'PIN',
    length: 4,
    masked: true,
    placeholder: '•',
    size: 'lg',
    value: pin,
    onValueChange: setPin,
  });
}

function OtpInputFormDemo(): ReactNode {
  const [otp, setOtp] = useState('');
  const [touched, setTouched] = useState(false);
  return createElement(OgeOtpInput, {
    label: 'Code',
    length: 6,
    required: true,
    value: otp,
    onValueChange: setOtp,
    touched,
    onBlur: () => setTouched(true),
    errors: otp.length === 6 ? [] : [{ kind: 'required' }],
  });
}

/**
 * The React half of the OTP input page — the same demo sections as the
 * Angular page, rendered as real React trees (ADR 0002).
 */
@Component({
  selector: 'app-react-inputs-otp-input-demos',
  imports: [DemoCard, ReactHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: '../../../../../../packages/react/inputs/src/styles.scss',
  template: `
    <app-demo-card
      [chips]="['value', 'onCompleted', 'autocomplete=one-time-code']"
      heading="Getting started"
      description="Type, paste or let the browser autofill the code. Arrows (RTL-mirrored) and Home/End move between cells, Backspace clears and steps back; <code>onCompleted</code> fires once every cell holds a character."
      [code]="demos[0].source"
      language="tsx"
    >
      <app-react-host [render]="basic" />
    </app-demo-card>

    <app-demo-card
      [chips]="['type', 'letterCase', 'groupSize']"
      heading="Character types and groups"
      description="<code>type</code> accepts <code>'numeric'</code>, <code>'alphanumeric'</code> or <code>'alphabetic'</code>; rejected characters never land. <code>letterCase</code> and <code>groupSize</code> shape the entry."
      [code]="demos[1].source"
      language="tsx"
    >
      <app-react-host [render]="types" />
    </app-demo-card>

    <app-demo-card
      [chips]="['masked', 'placeholder', 'size']"
      heading="Masked PIN"
      description="<code>masked</code> hides the characters like a password field; <code>placeholder</code> marks the empty cells and <code>size</code> picks the cell scale."
      [code]="demos[2].source"
      language="tsx"
    >
      <app-react-host [render]="masked" />
    </app-demo-card>

    <app-demo-card
      [chips]="['controlled pair', 'errors', 'touched']"
      heading="Inside a form"
      description="React has no <code>formControl</code> binding — <strong>the controlled pair is the integration point</strong>; pass <code>required</code>, <code>errors</code> and <code>touched</code> from your form layer."
      [code]="demos[3].source"
      language="tsx"
    >
      <app-react-host [render]="form" />
    </app-demo-card>
  `,
})
export class ReactInputsOtpInputDemos {
  protected readonly demos = INPUTS_OTP_INPUT_DEMOS;

  protected readonly basic = () => createElement(OtpInputDemo);
  protected readonly types = () => createElement(OtpInputTypesDemo);
  protected readonly masked = () => createElement(OtpInputMaskedDemo);
  protected readonly form = () => createElement(OtpInputFormDemo);
}
