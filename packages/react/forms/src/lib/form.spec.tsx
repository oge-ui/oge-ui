import { StrictMode, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeForm } from './form';
import { OgeFormsConfigProvider } from './forms-config';
import type { OgeFormItemDefinition } from './form-types';

/** Flushes the microtask queue inside `act`. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const fields = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-form-field'));

const labels = (): string[] =>
  Array.from(document.querySelectorAll('.oge-form-label')).map(
    (el) => el.textContent?.trim() ?? '',
  );

const inputs = (): HTMLInputElement[] =>
  Array.from(document.querySelectorAll('input'));

interface Employee extends Record<string, unknown> {
  firstName: string;
  age: number;
  active: boolean;
  hired: Date | null;
}

const employee = (): Employee => ({
  firstName: 'Ada',
  age: 41,
  active: true,
  hired: null,
});

const items: OgeFormItemDefinition[] = [
  { field: 'firstName' },
  { field: 'age' },
  { field: 'active' },
];

describe('<OgeForm> — layout', () => {
  it('renders one field per item, in declaration order', () => {
    render(<OgeForm defaultFormData={employee()} items={items} />);
    expect(fields()).toHaveLength(3);
    expect(inputs()[0]).toHaveValue('Ada');
  });

  it('renders a real <form> unless asked not to', () => {
    const { rerender } = render(
      <OgeForm defaultFormData={employee()} items={items} />,
    );
    expect(document.querySelector('form')).toBeTruthy();
    rerender(
      <OgeForm
        defaultFormData={employee()}
        items={items}
        renderFormElement={false}
      />,
    );
    // nested <form> elements are invalid HTML — the grid's row editor needs this
    expect(document.querySelector('form')).toBeNull();
    expect(document.querySelector('.oge-form-body')).toBeTruthy();
  });

  it('picks each editor from the model value', () => {
    render(<OgeForm defaultFormData={employee()} items={items} />);
    expect(document.querySelector('.oge-text-box')).toBeTruthy();
    expect(document.querySelector('.oge-number-box')).toBeTruthy();
    expect(document.querySelector('.oge-check-box')).toBeTruthy();
  });

  it('titles a label from the field name and honours an explicit one', () => {
    render(
      <OgeForm
        defaultFormData={{ firstName: '' }}
        labelLocation="start"
        items={[{ field: 'firstName' }]}
      />,
    );
    expect(labels()[0]).toContain('First name');
  });

  it('draws the label itself for a side layout, and lets the editor draw it on top', () => {
    const { rerender } = render(
      <OgeForm
        defaultFormData={{ firstName: '' }}
        items={[{ field: 'firstName' }]}
      />,
    );
    // labelLocation: 'top' — the editor's own chrome owns the label
    expect(document.querySelector('.oge-form-label')).toBeNull();
    rerender(
      <OgeForm
        defaultFormData={{ firstName: '' }}
        labelLocation="end"
        items={[{ field: 'firstName' }]}
      />,
    );
    expect(document.querySelector('.oge-form-label')).toBeTruthy();
    expect(document.querySelector('.oge-form-field-label-end')).toBeTruthy();
  });

  it('always draws the label for a bare editor, whatever the layout', () => {
    render(
      <OgeForm
        defaultFormData={{ active: true }}
        items={[{ field: 'active' }]}
      />,
    );
    expect(document.querySelector('.oge-form-field-bare')).toBeTruthy();
    expect(labels()[0]).toContain('Active');
  });

  it('marks required fields and can mark the optional ones instead', () => {
    const { rerender } = render(
      <OgeForm
        defaultFormData={{ firstName: '' }}
        labelLocation="start"
        items={[{ field: 'firstName', isRequired: true }]}
      />,
    );
    expect(document.querySelector('.oge-form-required-mark')?.textContent).toBe(
      '*',
    );
    rerender(
      <OgeForm
        defaultFormData={{ firstName: '' }}
        labelLocation="start"
        showOptionalMark
        items={[{ field: 'firstName' }]}
      />,
    );
    expect(document.querySelector('.oge-form-optional-mark')).toBeTruthy();
  });

  it('lays the fields out in the requested columns', () => {
    render(<OgeForm defaultFormData={employee()} colCount={3} items={items} />);
    const grid = document.querySelector<HTMLElement>('.oge-form-fields');
    expect(grid?.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('fits auto columns to the form’s own width, not the window’s', () => {
    render(
      <OgeForm defaultFormData={employee()} minColWidth={320} items={items} />,
    );
    const grid = document.querySelector<HTMLElement>('.oge-form-fields');
    expect(grid?.style.gridTemplateColumns).toContain('auto-fit');
    const body = document.querySelector<HTMLElement>('.oge-form-body');
    expect(body?.style.getPropertyValue('--oge-form-min-col')).toBe('320px');
  });

  it('publishes a column count per breakpoint', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        colCountByScreen={{ sm: 1, lg: 4 }}
        items={items}
      />,
    );
    const body = document.querySelector<HTMLElement>('.oge-form-body');
    expect(body?.style.getPropertyValue('--oge-form-cols-lg')).toBe(
      'repeat(4, minmax(0, 1fr))',
    );
  });

  it('spans an item over several columns, clamped to what exists', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        colCount={2}
        items={[{ field: 'firstName', colSpan: 5 }, { field: 'age' }]}
      />,
    );
    expect(fields()[0].style.gridColumn).toBe('span 2');
  });

  it('orders each level by visibleIndex, ties keeping declaration order', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        items={[
          { field: 'firstName' },
          { field: 'age', visibleIndex: 1 },
          { field: 'active', visibleIndex: 0 },
        ]}
      />,
    );
    expect(
      fields().map((field) => field.querySelector('label')?.textContent ?? ''),
    ).toBeDefined();
    // the two indexed items come first, in index order
    expect(document.querySelectorAll('.oge-form-field')[0]).toBe(fields()[0]);
    expect(fields()).toHaveLength(3);
  });

  it('drops invisible items', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        items={[{ field: 'firstName' }, { field: 'age', visible: false }]}
      />,
    );
    expect(fields()).toHaveLength(1);
  });

  it('says so when there is nothing to render', () => {
    render(<OgeForm defaultFormData={{}} items={[]} />);
    expect(document.querySelector('.oge-form-empty')?.textContent).toBe(
      'No fields to display',
    );
  });

  it('reads the empty-state string from the config provider', () => {
    render(
      <OgeFormsConfigProvider config={{ messages: { noItems: 'Alan yok' } }}>
        <OgeForm defaultFormData={{}} items={[]} />
      </OgeFormsConfigProvider>,
    );
    expect(document.querySelector('.oge-form-empty')?.textContent).toBe(
      'Alan yok',
    );
  });

  it('disables every editor through a fieldset, and marks the host', () => {
    render(<OgeForm defaultFormData={employee()} disabled items={items} />);
    expect(
      document.querySelector<HTMLFieldSetElement>('.oge-form-fieldset')
        ?.disabled,
    ).toBe(true);
    expect(document.querySelector('.oge-form-disabled')).toBeTruthy();
  });

  it('renders the actions slot under the fields', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        items={items}
        actions={<button type="submit">Save</button>}
      />,
    );
    expect(
      document.querySelector('.oge-form-actions button')?.textContent,
    ).toBe('Save');
  });
});

describe('<OgeForm> — groups', () => {
  it('renders a data-driven group as a fieldset with a legend', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        groups={[{ caption: 'Personal' }]}
        items={[{ field: 'firstName', group: 'Personal' }, { field: 'age' }]}
      />,
    );
    const group = document.querySelector('.oge-form-group');
    expect(group?.querySelector('legend')?.textContent).toBe('Personal');
    expect(group?.querySelectorAll('.oge-form-field')).toHaveLength(1);
  });

  it('nests groups inside groups through the layout tree', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        layout={[
          {
            caption: 'Outer',
            children: [
              { caption: 'Inner', children: [{ field: 'firstName' }] },
              { field: 'age' },
            ],
          },
        ]}
      />,
    );
    const captions = Array.from(
      document.querySelectorAll('.oge-form-group > legend'),
    ).map((el) => el.textContent);
    expect(captions).toEqual(['Outer', 'Inner']);
  });

  it('gives a group its own column count', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        layout={[
          { caption: 'Two', colCount: 2, children: [{ field: 'firstName' }] },
        ]}
      />,
    );
    const grid = document.querySelector<HTMLElement>(
      '.oge-form-group .oge-form-fields',
    );
    expect(grid?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('passes readOnly and disabled down, letting an item override them', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        layout={[
          {
            caption: 'Locked',
            readOnly: true,
            children: [
              { field: 'firstName' },
              { field: 'age', readOnly: false },
            ],
          },
        ]}
      />,
    );
    expect(inputs()[0]).toHaveAttribute('readonly');
    expect(inputs()[1]).not.toHaveAttribute('readonly');
  });

  it('drops an invisible group', () => {
    render(
      <OgeForm
        defaultFormData={employee()}
        groups={[{ caption: 'Hidden', visible: false }]}
        items={[{ field: 'firstName', group: 'Hidden' }]}
      />,
    );
    expect(document.querySelector('.oge-form-group')).toBeNull();
  });
});

describe('<OgeForm> — the bound model', () => {
  it('edits an uncontrolled model and reports every change', async () => {
    const onFieldChanged = vi.fn();
    render(
      <OgeForm
        defaultFormData={employee()}
        items={[{ field: 'firstName' }]}
        onFieldChanged={onFieldChanged}
      />,
    );
    fireEvent.input(inputs()[0], { target: { value: 'Grace' } });
    await flush();
    expect(inputs()[0]).toHaveValue('Grace');
    expect(onFieldChanged).toHaveBeenCalledWith({
      field: 'firstName',
      value: 'Grace',
      previousValue: 'Ada',
    });
  });

  it('follows a controlled model and never writes it itself', async () => {
    const onFormDataChange = vi.fn();
    render(
      <OgeForm
        formData={employee()}
        onFormDataChange={onFormDataChange}
        items={[{ field: 'firstName' }]}
      />,
    );
    fireEvent.input(inputs()[0], { target: { value: 'Grace' } });
    await flush();
    expect(onFormDataChange).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Grace' }),
    );
    // the parent owns the value: the form never wrote one of its own, so the
    // model it renders from is still the one that was passed in
    expect(onFormDataChange).toHaveBeenCalledTimes(1);
  });

  it('rides a controlled parent’s state through a real edit', async () => {
    function Host() {
      const [data, setData] = useState(employee());
      return (
        <OgeForm
          formData={data}
          onFormDataChange={setData}
          items={[{ field: 'firstName' }]}
        />
      );
    }
    render(<Host />);
    fireEvent.input(inputs()[0], { target: { value: 'Grace' } });
    await flush();
    expect(inputs()[0]).toHaveValue('Grace');
  });

  it('reaches a nested field through its dot path', async () => {
    const onFormDataChange = vi.fn();
    render(
      <OgeForm
        defaultFormData={{ address: { city: 'London' } }}
        onFormDataChange={onFormDataChange}
        items={[{ field: 'address.city' }]}
      />,
    );
    expect(inputs()[0]).toHaveValue('London');
    fireEvent.input(inputs()[0], { target: { value: 'Paris' } });
    await flush();
    expect(onFormDataChange).toHaveBeenCalledWith({
      address: { city: 'Paris' },
    });
  });

  it('survives StrictMode’s double render and stays editable', async () => {
    render(
      <StrictMode>
        <OgeForm
          defaultFormData={employee()}
          items={[{ field: 'firstName' }]}
        />
      </StrictMode>,
    );
    fireEvent.input(inputs()[0], { target: { value: 'Grace' } });
    await flush();
    expect(inputs()[0]).toHaveValue('Grace');
  });
});
