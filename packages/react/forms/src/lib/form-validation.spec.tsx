import { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeForm } from './form';
import type { OgeFormHandle, OgeFormItemDefinition } from './form-types';

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const inputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll('input'));

const errorTexts = (): string[] =>
  Array.from(
    document.querySelectorAll('.oge-input-error, .oge-form-error'),
  ).map((el) => el.textContent?.trim() ?? '');

interface Order extends Record<string, unknown> {
  code: string;
  email: string;
  quantity: number;
  note: string;
}

const order = (): Order => ({
  code: 'AB',
  email: 'nope',
  quantity: 99,
  note: '',
});

const rules: OgeFormItemDefinition[] = [
  {
    field: 'code',
    label: 'Code',
    validationRules: [{ type: 'stringLength', min: 3 }],
  },
  { field: 'email', label: 'Email', validationRules: [{ type: 'email' }] },
  {
    field: 'quantity',
    label: 'Quantity',
    validationRules: [{ type: 'numeric', max: 10 }],
  },
  { field: 'note', label: 'Note' },
];

describe('declarative rules', () => {
  it('reports one entry per failing field, in layout order', () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(<OgeForm ref={ref} defaultFormData={order()} items={rules} />);
    expect(ref.current?.errors.map((e) => e.field)).toEqual([
      'code',
      'email',
      'quantity',
    ]);
    expect(ref.current?.valid).toBe(false);
  });

  it('words the failure the way the inputs package words it', () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(<OgeForm ref={ref} defaultFormData={order()} items={rules} />);
    const messages = ref.current?.errors.map((e) => e.message) ?? [];
    expect(messages[1]).toBe('Enter a valid email address');
    expect(messages[2]).toContain('10');
  });

  it('clears an error once the value satisfies the rule', async () => {
    const ref = createRef<OgeFormHandle<Order>>();
    const { rerender } = render(
      <OgeForm ref={ref} formData={order()} items={rules} />,
    );
    rerender(
      <OgeForm
        ref={ref}
        formData={{ code: 'ABC', email: 'a@b.co', quantity: 5, note: '' }}
        items={rules}
      />,
    );
    await flush();
    expect(ref.current?.valid).toBe(true);
  });

  it('runs a custom rule and surfaces its message', () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={order()}
        items={[
          {
            field: 'note',
            label: 'Note',
            validationRules: [
              {
                type: 'custom',
                validate: ({ value }) =>
                  String(value ?? '').includes('!') ? null : 'Needs a bang',
              },
            ],
          },
        ]}
      />,
    );
    expect(ref.current?.errors[0].message).toBe('Needs a bang');
  });

  it('gives a custom rule the whole model, for cross-field checks', () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ password: 'a', confirm: 'b' }}
        items={[
          { field: 'password' },
          {
            field: 'confirm',
            validationRules: [
              {
                type: 'custom',
                validate: ({ value, data }) =>
                  value === data['password'] ? null : 'Does not match',
              },
            ],
          },
        ]}
      />,
    );
    expect(ref.current?.errors[0]).toMatchObject({
      field: 'confirm',
      message: 'Does not match',
    });
  });

  it('runs an async rule and surfaces its message once it settles', async () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={order()}
        items={[
          {
            field: 'code',
            label: 'Code',
            validationRules: [
              {
                type: 'async',
                validate: async (value) =>
                  String(value ?? '').startsWith('AB') ? 'Already taken' : null,
              },
            ],
          },
        ]}
      />,
    );
    expect(ref.current?.errors).toHaveLength(0); // nothing is known yet
    await flush();
    expect(ref.current?.errors[0]?.message).toBe('Already taken');
  });

  it('drops the async error once the value stops failing', async () => {
    const ref = createRef<OgeFormHandle<Order>>();
    const items: OgeFormItemDefinition[] = [
      {
        field: 'code',
        validationRules: [
          {
            type: 'async',
            validate: async (value) =>
              String(value ?? '').startsWith('AB') ? 'Already taken' : null,
          },
        ],
      },
    ];
    const { rerender } = render(
      <OgeForm ref={ref} formData={order()} items={items} />,
    );
    await flush();
    expect(ref.current?.errors).toHaveLength(1);
    rerender(
      <OgeForm ref={ref} formData={{ ...order(), code: 'ZZ' }} items={items} />,
    );
    await flush();
    expect(ref.current?.errors).toHaveLength(0);
  });

  it('treats isRequired as a required rule', () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ note: '' }}
        items={[{ field: 'note', isRequired: true }]}
      />,
    );
    expect(ref.current?.errors[0]?.message).toBe('This field is required');
  });
});

describe('the display gate', () => {
  it('keeps the error out of the DOM until the field is touched', async () => {
    render(<OgeForm defaultFormData={order()} items={rules} />);
    expect(errorTexts()).toEqual([]);
    fireEvent.blur(inputs()[1]);
    await flush();
    expect(errorTexts().join(' ')).toContain('Enter a valid email address');
  });

  it('shows every error after a failed submit, touched or not', async () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(<OgeForm ref={ref} defaultFormData={order()} items={rules} />);
    await act(async () => {
      await ref.current?.submit();
    });
    expect(errorTexts().filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });

  it('marks the field invalid so the layout can style it', async () => {
    render(
      <OgeForm
        defaultFormData={{ active: false }}
        items={[{ field: 'active', isRequired: true }]}
      />,
    );
    const ref = createRef<OgeFormHandle>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ note: '' }}
        items={[{ field: 'note', isRequired: true, editorType: 'checkBox' }]}
      />,
    );
    await act(async () => {
      await ref.current?.submit();
    });
    expect(document.querySelector('.oge-form-field-invalid')).toBeTruthy();
  });
});

describe('the submit pipeline', () => {
  const valid = { code: 'ABC', email: 'a@b.co', quantity: 5, note: '' };

  it('emits submitting then submitted for a valid form', async () => {
    const onSubmitting = vi.fn();
    const onSubmitted = vi.fn();
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={valid}
        items={rules}
        onSubmitting={onSubmitting}
        onSubmitted={onSubmitted}
      />,
    );
    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current?.submit();
    });
    expect(result).toBe(true);
    expect(onSubmitting).toHaveBeenCalledWith(
      expect.objectContaining({ valid: true }),
    );
    expect(onSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({ data: valid }),
    );
  });

  it('honours a canceled submitting event', async () => {
    const onSubmitted = vi.fn();
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={valid}
        items={rules}
        onSubmitting={(event) => (event.cancel = true)}
        onSubmitted={onSubmitted}
      />,
    );
    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current?.submit();
    });
    expect(result).toBe(false);
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('reports validity to the handler without suppressing it', async () => {
    const onSubmitting = vi.fn();
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={order()}
        items={rules}
        onSubmitting={onSubmitting}
      />,
    );
    let result: boolean | undefined;
    await act(async () => {
      result = await ref.current?.submit();
    });
    expect(result).toBe(false);
    expect(onSubmitting).toHaveBeenCalledWith(
      expect.objectContaining({ valid: false }),
    );
  });

  it('emits validated with the error list', async () => {
    const onValidated = vi.fn();
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={order()}
        items={rules}
        onValidated={onValidated}
      />,
    );
    await act(async () => {
      await ref.current?.submit();
    });
    expect(onValidated).toHaveBeenCalledWith(
      expect.objectContaining({ valid: false }),
    );
    expect(onValidated.mock.calls[0][0].errors).toHaveLength(3);
  });

  it('runs the same pipeline from a native form submit', async () => {
    const onSubmitted = vi.fn();
    render(
      <OgeForm
        defaultFormData={valid}
        items={rules}
        onSubmitted={onSubmitted}
        actions={<button type="submit">Save</button>}
      />,
    );
    await act(async () => {
      fireEvent.submit(document.querySelector('form') as HTMLFormElement);
    });
    expect(onSubmitted).toHaveBeenCalled();
  });

  it('renders the validation summary only after a failed submit', async () => {
    const ref = createRef<OgeFormHandle<Order>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={order()}
        items={rules}
        showValidationSummary
      />,
    );
    expect(document.querySelector('.oge-validation-summary')).toBeNull();
    await act(async () => {
      await ref.current?.submit();
    });
    const summary = document.querySelector('.oge-validation-summary');
    expect(summary).toBeTruthy();
    expect(
      summary?.querySelectorAll('.oge-validation-summary-item'),
    ).toHaveLength(3);
  });
});
