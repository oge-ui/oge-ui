import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OgeForm } from './form';
import type { OgeFormHandle, OgeFormItemDefinition } from './form-types';

interface Account extends Record<string, unknown> {
  kind: string;
  vat: string;
  email: string;
  password: string;
  confirm: string;
}

const account = (): Account => ({
  kind: 'person',
  vat: '',
  email: 'taken@example.com',
  password: 'secret',
  confirm: 'secret',
});

const items: OgeFormItemDefinition[] = [
  { field: 'kind', label: 'Kind' },
  {
    field: 'vat',
    label: 'VAT number',
    visibleWhen: { field: 'kind', equals: 'company' },
    requiredWhen: { field: 'kind', equals: 'company' },
  },
  { field: 'email', label: 'Email' },
  { field: 'password', label: 'Password' },
  {
    field: 'confirm',
    label: 'Confirm',
    validationRules: [{ type: 'compare', comparisonTarget: 'password' }],
  },
];

describe('<OgeForm> conditions, compare rule and server errors', () => {
  it('visibleWhen / requiredWhen follow the model', () => {
    const ref = createRef<OgeFormHandle<Account>>();
    render(<OgeForm ref={ref} defaultFormData={account()} items={items} />);
    expect(screen.queryByText('VAT number')).toBeNull();
    expect(ref.current?.valid).toBe(true);
    act(() => ref.current?.updateData('kind', 'company'));
    expect(screen.getAllByText('VAT number').length).toBeGreaterThan(0);
    expect(ref.current?.errors.map((e) => e.field)).toEqual(['vat']);
    expect(ref.current?.itemOption('vat')?.required).toBe(true);
  });

  it('the compare rule fails a mismatching confirmation', () => {
    const ref = createRef<OgeFormHandle<Account>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ ...account(), confirm: 'nope' }}
        items={items}
      />,
    );
    expect(ref.current?.errors).toEqual([
      {
        field: 'confirm',
        label: 'Confirm',
        message: 'The values do not match',
      },
    ]);
  });

  it('setErrors shows in the field and summary at once; an edit clears it', () => {
    const ref = createRef<OgeFormHandle<Account>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={account()}
        items={items}
        showValidationSummary
      />,
    );
    act(() => ref.current?.setErrors({ email: 'Email is already registered' }));
    expect(ref.current?.valid).toBe(false);
    expect(
      screen.getAllByText('Email is already registered').length,
    ).toBeGreaterThan(0);
    const email = document.querySelector<HTMLInputElement>(
      'input[value="taken@example.com"]',
    ) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'fresh@example.com' } });
    fireEvent.blur(email);
    expect(screen.queryByText('Email is already registered')).toBeNull();
    act(() => ref.current?.setFieldErrors('password', ['Too weak']));
    expect(ref.current?.errors.map((e) => e.field)).toEqual(['password']);
    act(() => ref.current?.clearErrors());
    expect(ref.current?.valid).toBe(true);
  });
});
