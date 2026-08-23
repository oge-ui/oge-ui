import { act, fireEvent, render } from '@testing-library/react';
import { OgeForm } from './form';
import type { OgeFormItemDefinition } from './form-types';

/**
 * Which editor an item gets is decided by the shared `pickEditorType`; what
 * this spec pins is that every editor type actually renders, and that the
 * curated `editorOptions` reach it.
 */

const renderItem = (item: OgeFormItemDefinition, data: object = {}) =>
  render(<OgeForm defaultFormData={data} items={[item]} />);

describe('the editor switch', () => {
  it('renders a text box by default, honouring its mode', () => {
    renderItem({ field: 'name', editorOptions: { mode: 'password' } });
    expect(document.querySelector('input')?.getAttribute('type')).toBe(
      'password',
    );
  });

  it('renders a text area with its rows', () => {
    renderItem({
      field: 'bio',
      editorType: 'textArea',
      editorOptions: { rows: 5 },
    });
    expect(document.querySelector('textarea')?.getAttribute('rows')).toBe('5');
  });

  it('renders a number box with its bounds and spin buttons', () => {
    renderItem(
      {
        field: 'qty',
        editorOptions: { min: 1, max: 9, step: 2, showSpinButtons: true },
      },
      { qty: 3 },
    );
    expect(document.querySelector('.oge-number-box')).toBeTruthy();
    expect(document.querySelectorAll('.oge-input-spin-btn').length).toBe(2);
  });

  it('renders a select box from an options list', () => {
    renderItem({
      field: 'city',
      editorOptions: { items: ['London', 'Paris'] },
    });
    expect(document.querySelector('[role="combobox"]')).toBeTruthy();
  });

  it('renders a tag box for an array value', () => {
    renderItem(
      { field: 'tags', editorOptions: { items: ['a', 'b'] } },
      { tags: [] },
    );
    expect(document.querySelector('.oge-tag-box')).toBeTruthy();
  });

  it('renders the remaining editors on request', () => {
    const cases: [OgeFormItemDefinition['editorType'], string][] = [
      ['autocomplete', '.oge-autocomplete'],
      ['dateBox', '.oge-date-box'],
      ['dateRangeBox', '.oge-date-range-box'],
      ['colorBox', '.oge-color-box'],
      ['checkBox', '.oge-check-box'],
      ['switch', '.oge-switch'],
      ['radioGroup', '.oge-radio-group'],
      ['slider', '.oge-slider'],
      ['calendar', '.oge-calendar'],
      ['treeSelect', '.oge-tree-select'],
    ];
    for (const [editorType, selector] of cases) {
      const view = renderItem({ field: 'value', editorType });
      expect(document.querySelector(selector), editorType).toBeTruthy();
      view.unmount();
    }
  });

  it('commits an edit through the form’s model', async () => {
    const onFieldChanged = vi.fn();
    render(
      <OgeForm
        defaultFormData={{ active: false }}
        items={[{ field: 'active' }]}
        onFieldChanged={onFieldChanged}
      />,
    );
    await act(async () => {
      fireEvent.click(document.querySelector('input') as HTMLInputElement);
    });
    expect(onFieldChanged).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'active', value: true }),
    );
  });

  it('reports Enter from inside an editor', async () => {
    const onEditorEnterKey = vi.fn();
    render(
      <OgeForm
        defaultFormData={{ name: '' }}
        items={[{ field: 'name' }]}
        onEditorEnterKey={onEditorEnterKey}
      />,
    );
    await act(async () => {
      fireEvent.keyDown(document.querySelector('input') as HTMLInputElement, {
        key: 'Enter',
      });
    });
    expect(onEditorEnterKey).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name' }),
    );
  });

  it('forwards the form’s appearance to the editor chrome', () => {
    render(
      <OgeForm
        defaultFormData={{ name: '' }}
        size="lg"
        stylingMode="filled"
        items={[{ field: 'name' }]}
      />,
    );
    const host = document.querySelector('.oge-text-box');
    expect(host?.className).toContain('oge-input-lg');
    expect(host?.className).toContain('oge-input-filled');
  });

  it('hides the editor’s own label when the form draws one beside it', () => {
    render(
      <OgeForm
        defaultFormData={{ name: '' }}
        labelLocation="start"
        items={[{ field: 'name' }]}
      />,
    );
    // exactly one label on screen: the form's own
    expect(document.querySelectorAll('label')).toHaveLength(1);
    expect(document.querySelector('label')?.className).toBe('oge-form-label');
  });
});
