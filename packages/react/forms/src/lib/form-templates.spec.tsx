import { act, fireEvent, render } from '@testing-library/react';
import { OgeForm } from './form';
import { OgeValidationSummary } from './validation-summary';
import { OgeFormsConfigProvider } from './forms-config';

/**
 * The four render props — React's counterpart of the Angular package's
 * `ogeFormItemTemplate` / `ogeFormEditorTemplate` / `ogeFormLabelTemplate` /
 * `ogeFormGroupCaptionTemplate` slots, per item and form-wide.
 */

const data = () => ({ firstName: 'Ada', email: '' });

describe('render props', () => {
  it('replaces the whole field with renderItem', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        items={[
          {
            field: 'firstName',
            renderItem: ({ item, value }) => (
              <p className="custom-item">
                {item.label}: {String(value)}
              </p>
            ),
          },
        ]}
      />,
    );
    expect(document.querySelector('.custom-item')?.textContent).toBe(
      'First name: Ada',
    );
    expect(document.querySelector('input')).toBeNull();
  });

  it('replaces only the editor with renderEditor, keeping the chrome', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        labelLocation="start"
        items={[
          {
            field: 'firstName',
            renderEditor: ({ editorId, value, setValue }) => (
              <input
                id={editorId}
                className="custom-editor"
                value={String(value ?? '')}
                onChange={(event) => setValue(event.target.value)}
              />
            ),
          },
        ]}
      />,
    );
    const label = document.querySelector<HTMLLabelElement>('.oge-form-label');
    const editor = document.querySelector<HTMLInputElement>('.custom-editor');
    expect(label).toBeTruthy();
    // the label still points at the custom editor
    expect(label?.htmlFor).toBe(editor?.id);
  });

  it('writes the model back through the render prop’s setValue', async () => {
    const onFieldChanged = vi.fn();
    render(
      <OgeForm
        defaultFormData={data()}
        onFieldChanged={onFieldChanged}
        items={[
          {
            field: 'firstName',
            renderEditor: ({ setValue }) => (
              <button type="button" onClick={() => setValue('Grace')}>
                set
              </button>
            ),
          },
        ]}
      />,
    );
    await act(async () => {
      fireEvent.click(document.querySelector('button') as HTMLButtonElement);
    });
    expect(onFieldChanged).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'firstName', value: 'Grace' }),
    );
  });

  it('replaces the label content with renderLabel', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        labelLocation="start"
        items={[
          {
            field: 'firstName',
            renderLabel: ({ label, required }) => (
              <span className="custom-label">
                {label}
                {required ? ' (must)' : ''}
              </span>
            ),
            isRequired: true,
          },
        ]}
      />,
    );
    expect(document.querySelector('.custom-label')?.textContent).toBe(
      'First name (must)',
    );
    // the required mark still comes from the form, not from the slot
    expect(document.querySelector('.oge-form-required-mark')).toBeTruthy();
  });

  it('replaces a group caption with renderGroupCaption', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        renderGroupCaption={({ caption }) => (
          <span className="custom-caption">{caption.toUpperCase()}</span>
        )}
        layout={[{ caption: 'Personal', children: [{ field: 'firstName' }] }]}
      />,
    );
    expect(document.querySelector('.custom-caption')?.textContent).toBe(
      'PERSONAL',
    );
  });

  it('lets a per-item slot win over the form-level one', () => {
    render(
      <OgeForm
        defaultFormData={data()}
        renderItem={() => <p className="form-level">form</p>}
        items={[
          {
            field: 'firstName',
            renderItem: () => <p className="item-level">item</p>,
          },
          { field: 'email' },
        ]}
      />,
    );
    expect(document.querySelector('.item-level')).toBeTruthy();
    expect(document.querySelectorAll('.form-level')).toHaveLength(1);
  });

  it('draws the subscript itself for a templated editor', async () => {
    render(
      <OgeForm
        defaultFormData={{ email: '' }}
        items={[
          {
            field: 'email',
            hint: 'Work address',
            renderEditor: ({ editorId }) => <input id={editorId} />,
          },
        ]}
      />,
    );
    // a custom editor has no chrome of its own, so the form supplies the hint
    expect(document.querySelector('.oge-form-hint')?.textContent).toBe(
      'Work address',
    );
  });
});

describe('<OgeValidationSummary> on its own', () => {
  const errors = [
    { field: 'email', label: 'Email', message: 'Enter a valid email address' },
    { field: 'code', label: 'Code', message: 'Too short' },
  ];

  it('announces itself and lists one row per error', () => {
    render(<OgeValidationSummary errors={errors} />);
    const summary = document.querySelector('.oge-validation-summary');
    expect(summary?.getAttribute('role')).toBe('alert');
    expect(summary?.getAttribute('aria-label')).toBe('Validation summary');
    expect(
      document.querySelectorAll('.oge-validation-summary-item'),
    ).toHaveLength(2);
  });

  it('titles itself with the count, singular and plural', () => {
    const { rerender } = render(<OgeValidationSummary errors={errors} />);
    expect(
      document.querySelector('.oge-validation-summary-title')?.textContent,
    ).toBe('2 fields need your attention');
    rerender(<OgeValidationSummary errors={errors.slice(0, 1)} />);
    expect(
      document.querySelector('.oge-validation-summary-title')?.textContent,
    ).toBe('1 field needs your attention');
  });

  it('hides itself when there is nothing to report', () => {
    render(<OgeValidationSummary errors={[]} />);
    expect(
      document.querySelector<HTMLElement>('.oge-validation-summary')?.hidden,
    ).toBe(true);
  });

  it('reports the row a reader activated', () => {
    const onErrorClick = vi.fn();
    render(
      <OgeValidationSummary errors={errors} onErrorClick={onErrorClick} />,
    );
    fireEvent.click(
      document.querySelector('.oge-validation-summary-link') as HTMLElement,
    );
    expect(onErrorClick).toHaveBeenCalledWith(errors[0]);
  });

  it('follows the config provider’s strings', () => {
    render(
      <OgeFormsConfigProvider
        config={{ messages: { validationSummaryLabel: 'Hata özeti' } }}
      >
        <OgeValidationSummary errors={errors} />
      </OgeFormsConfigProvider>,
    );
    expect(
      document
        .querySelector('.oge-validation-summary')
        ?.getAttribute('aria-label'),
    ).toBe('Hata özeti');
  });

  it('focuses the field a summary row names, inside a form', async () => {
    const { container } = render(
      <OgeForm
        defaultFormData={{ email: '' }}
        showValidationSummary
        scrollToFirstInvalid={false}
        items={[{ field: 'email', isRequired: true }]}
      />,
    );
    await act(async () => {
      fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    });
    const input = document.querySelector('input');
    input?.blur();
    fireEvent.click(
      document.querySelector('.oge-validation-summary-link') as HTMLElement,
    );
    expect(document.activeElement).toBe(input);
  });
});
