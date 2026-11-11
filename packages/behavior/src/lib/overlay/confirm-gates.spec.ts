import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeDialogCore,
  ogeConfirmAccepts,
  ogeDialogDescribedBy,
  resolveOgeDialog,
} from './dialog-helpers';
import { resolveModalInitialFocus } from './modal-core';

const rx: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: (compute) => compute,
};

describe('confirm gates', () => {
  const dialog = resolveOgeDialog('confirm', {
    message: 'Delete the project?',
    details: ['12 files', '3 shared links'],
    typeToConfirm: 'acme-web',
    acknowledgeLabel: 'I understand this cannot be undone',
    severity: 'danger',
  });

  it('resolves details, the typed text and the checkbox', () => {
    expect(dialog.details).toEqual(['12 files', '3 shared links']);
    expect(dialog.typeToConfirm).toEqual({
      text: 'acme-web',
      label: 'Type acme-web to confirm',
    });
    expect(dialog.acknowledgeLabel).toBe('I understand this cannot be undone');
    expect(dialog.initialFocus).toBe('input');
    expect(ogeDialogDescribedBy(dialog, 'd1')).toBe('d1-message d1-details');
    // the gates belong to confirm() only
    const prompt = resolveOgeDialog('prompt', { typeToConfirm: 'x' });
    expect(prompt.typeToConfirm).toBeNull();
    expect(resolveOgeDialog('confirm', { details: '  ' }).details).toBeNull();
  });

  it('localizes the field label', () => {
    const tr = resolveOgeDialog(
      'confirm',
      { typeToConfirm: 'SİL' },
      { dialogTypeToConfirm: 'Onaylamak için {text} yazın' },
    );
    expect(tr.typeToConfirm?.label).toBe('Onaylamak için SİL yazın');
  });

  it('accepts only when every gate passes', () => {
    const state = { typed: 'acme-web', acknowledged: true };
    expect(ogeConfirmAccepts(dialog, state)).toBe(true);
    expect(ogeConfirmAccepts(dialog, { ...state, typed: 'acme-we' })).toBe(
      false,
    );
    expect(ogeConfirmAccepts(dialog, { ...state, typed: 'ACME-WEB' })).toBe(
      false,
    );
    expect(ogeConfirmAccepts(dialog, { ...state, acknowledged: false })).toBe(
      false,
    );
    expect(ogeConfirmAccepts(dialog, state, () => false)).toBe(false);
  });

  it('holds the primary action until the gates pass', () => {
    const settle = vi.fn();
    const core = new OgeDialogCore({
      adapter: rx,
      dialog,
      settle,
      canAccept: ({ typed }) => typed.length > 0,
    });
    core.submit();
    expect(settle).not.toHaveBeenCalled();
    core.typed.set('acme-web');
    core.submit();
    expect(settle).not.toHaveBeenCalled();
    core.acknowledged.set(true);
    expect(core.accepts()).toBe(true);
    core.submit();
    expect(settle).toHaveBeenCalledWith('ok', '');
  });
});

describe('modal autoFocus: false', () => {
  it('focuses the panel, never a control', () => {
    const panel = document.createElement('div');
    panel.innerHTML = '<input autofocus /><button>OK</button>';
    expect(resolveModalInitialFocus(panel, false)).toBe(panel);
    expect(resolveModalInitialFocus(panel, 'first-tabbable')).not.toBe(panel);
  });
});
