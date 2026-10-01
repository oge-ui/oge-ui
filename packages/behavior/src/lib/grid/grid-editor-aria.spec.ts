import { syncOgeEditorErrorAria } from './grid-editor-aria';

function editor(inner: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = inner;
  return host;
}

describe('syncOgeEditorErrorAria', () => {
  it('wires aria-invalid, aria-errormessage and aria-describedby to the error id', () => {
    const host = editor('<input type="text" />');
    syncOgeEditorErrorAria(host, 'e1');
    const input = host.querySelector('input') as HTMLInputElement;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-errormessage')).toBe('e1');
    expect(input.getAttribute('aria-describedby')).toBe('e1');
  });

  it('keeps the editor’s own describedby ids and restores them when valid', () => {
    const host = editor('<input aria-describedby="hint" />');
    const input = host.querySelector('input') as HTMLInputElement;
    syncOgeEditorErrorAria(host, 'e1');
    expect(input.getAttribute('aria-describedby')).toBe('hint e1');
    syncOgeEditorErrorAria(host, 'e2');
    expect(input.getAttribute('aria-describedby')).toBe('hint e2');
    syncOgeEditorErrorAria(host, null);
    expect(input.getAttribute('aria-describedby')).toBe('hint');
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
  });

  it('leaves an aria-invalid the editor set itself in place', () => {
    const host = editor('<input aria-invalid="true" />');
    const input = host.querySelector('input') as HTMLInputElement;
    syncOgeEditorErrorAria(host, 'e1');
    syncOgeEditorErrorAria(host, null);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('is a no-op on a valid editor it never touched', () => {
    const host = editor('<input aria-describedby="hint" />');
    syncOgeEditorErrorAria(host, null);
    expect(host.querySelector('input')?.getAttribute('aria-describedby')).toBe(
      'hint',
    );
  });

  it('covers comboboxes and checkboxes, skipping hidden inputs and buttons', () => {
    const host = editor(
      '<div role="combobox"></div><input type="checkbox" /><input type="hidden" /><button></button>',
    );
    syncOgeEditorErrorAria(host, 'e');
    expect(
      host.querySelector('[role="combobox"]')?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      host.querySelector('[type="checkbox"]')?.getAttribute('aria-invalid'),
    ).toBe('true');
    expect(
      host.querySelector('[type="hidden"]')?.hasAttribute('aria-invalid'),
    ).toBe(false);
    expect(host.querySelector('button')?.hasAttribute('aria-invalid')).toBe(
      false,
    );
  });
});
