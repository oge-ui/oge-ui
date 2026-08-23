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

interface Profile extends Record<string, unknown> {
  firstName: string;
  age: number;
  active: boolean;
  tags: string[];
  hired: Date | null;
}

const profile = (): Profile => ({
  firstName: 'Ada',
  age: 41,
  active: true,
  tags: ['a'],
  hired: new Date(2024, 0, 1),
});

const items: OgeFormItemDefinition[] = [
  { field: 'firstName' },
  { field: 'age' },
  { field: 'active' },
  { field: 'tags' },
  { field: 'hired' },
];

describe('the imperative handle', () => {
  it('reports the resolved configuration of one item', () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={profile()}
        items={[{ field: 'age', label: 'Age', colSpan: 2 }]}
      />,
    );
    expect(ref.current?.itemOption('age')).toMatchObject({
      field: 'age',
      label: 'Age',
      dataType: 'number',
      editorType: 'numberBox',
      colSpan: 2,
    });
    expect(ref.current?.itemOption('nope')).toBeUndefined();
  });

  it('patches one field, and a whole object', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(<OgeForm ref={ref} defaultFormData={profile()} items={items} />);
    await act(async () => ref.current?.updateData('firstName', 'Grace'));
    expect(ref.current?.data.firstName).toBe('Grace');
    await act(async () => ref.current?.updateData({ age: 7 }));
    expect(ref.current?.data).toMatchObject({ firstName: 'Grace', age: 7 });
  });

  it('empties every editor by data type', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(<OgeForm ref={ref} defaultFormData={profile()} items={items} />);
    await act(async () => ref.current?.clear());
    expect(ref.current?.data).toEqual({
      firstName: '',
      age: null,
      active: false,
      tags: [],
      hired: null,
    });
  });

  it('resets to the data the form started with, or to a patch', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(<OgeForm ref={ref} defaultFormData={profile()} items={items} />);
    await act(async () => ref.current?.updateData('firstName', 'Grace'));
    await act(async () => ref.current?.reset());
    expect(ref.current?.data.firstName).toBe('Ada');
    await act(async () => ref.current?.reset({ firstName: 'Barbara' }));
    expect(ref.current?.data.firstName).toBe('Barbara');
    expect(ref.current?.data.age).toBe(41);
  });

  it('tracks dirty across an edit and a reset', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(<OgeForm ref={ref} defaultFormData={profile()} items={items} />);
    expect(ref.current?.dirty).toBe(false);
    fireEvent.input(inputs()[0], { target: { value: 'Grace' } });
    await flush();
    expect(ref.current?.dirty).toBe(true);
    await act(async () => ref.current?.reset());
    expect(ref.current?.dirty).toBe(false);
  });

  it('validates without touching focus', async () => {
    const onValidated = vi.fn();
    const ref = createRef<OgeFormHandle<Profile>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ firstName: '' }}
        items={[{ field: 'firstName', isRequired: true }]}
        onValidated={onValidated}
      />,
    );
    const before = document.activeElement;
    let valid: boolean | undefined;
    await act(async () => {
      valid = ref.current?.validate();
    });
    expect(valid).toBe(false);
    expect(onValidated).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(before);
  });

  it('focuses a named field, and the first one by default', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(<OgeForm ref={ref} defaultFormData={profile()} items={items} />);
    await act(async () => ref.current?.focus('age'));
    expect(document.activeElement).toBe(inputs()[1]);
    await act(async () => ref.current?.focus());
    expect(document.activeElement).toBe(inputs()[0]);
  });

  it('focuses the first invalid field and says whether there was one', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ firstName: 'Ada', email: '' }}
        scrollToFirstInvalid={false}
        items={[{ field: 'firstName' }, { field: 'email', isRequired: true }]}
      />,
    );
    let found: boolean | undefined;
    await act(async () => {
      found = ref.current?.focusFirstInvalid();
    });
    expect(found).toBe(true);
    expect(document.activeElement).toBe(inputs()[1]);

    const clean = createRef<OgeFormHandle<Profile>>();
    render(
      <OgeForm
        ref={clean}
        defaultFormData={profile()}
        items={[{ field: 'firstName' }]}
      />,
    );
    expect(clean.current?.focusFirstInvalid()).toBe(false);
  });

  it('exposes the live model, errors and validity', async () => {
    const ref = createRef<OgeFormHandle<Profile>>();
    render(
      <OgeForm
        ref={ref}
        defaultFormData={{ firstName: '' }}
        items={[{ field: 'firstName', isRequired: true }]}
      />,
    );
    expect(ref.current?.valid).toBe(false);
    expect(ref.current?.errors).toHaveLength(1);
    fireEvent.input(inputs()[0], { target: { value: 'Ada' } });
    await flush();
    expect(ref.current?.valid).toBe(true);
    expect(ref.current?.data.firstName).toBe('Ada');
  });
});
