import { describe, expect, it, vi } from 'vitest';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  OgeDialogCore,
  ogeConfirmResult,
  ogeDialogAutoFocusSelector,
  ogeDialogEnterIsPrimary,
  ogeDialogOptions,
  ogePromptResult,
  resolveOgeDialog,
  validateOgePromptValue,
  type OgeDialogOutcome,
  type OgePromptValidator,
} from './dialog-helpers';
import { modalPlacementClass } from './modal-core';

/** Plain closures, no memoization — proves the core needs no framework caching. */
const adapter: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    let value = initial;
    const cell = (() => value) as OgeReactiveCell<T>;
    cell.set = (next: T) => {
      value = next;
    };
    return cell;
  },
  derived: <T>(compute: () => T) => compute,
};

describe('resolveOgeDialog', () => {
  it('a string argument is the message; titles and labels are localized defaults', () => {
    const dialog = resolveOgeDialog('confirm', 'Delete the file?');
    expect(dialog.message).toBe('Delete the file?');
    expect(dialog.title).toBe('Confirm');
    expect(dialog.okText).toBe('OK');
    expect(dialog.cancelText).toBe('Cancel');
    expect(dialog.role).toBe('alertdialog');
    expect(dialog.initialFocus).toBe('ok');
    expect(dialog.width).toBe(400);
  });

  it('reads the catalog for the defaults and lets options win', () => {
    const messages = {
      dialogOk: 'Tamam',
      dialogCancel: 'Vazgeç',
      dialogAlertTitle: 'Bilgi',
    };
    expect(resolveOgeDialog('alert', 'x', messages)).toMatchObject({
      title: 'Bilgi',
      okText: 'Tamam',
      cancelText: null,
    });
    expect(
      resolveOgeDialog(
        'confirm',
        { okText: 'Delete', cancelText: 'Keep' },
        messages,
      ),
    ).toMatchObject({ okText: 'Delete', cancelText: 'Keep' });
  });

  it('danger confirms focus the safe button; severity danger implies danger', () => {
    expect(resolveOgeDialog('confirm', { danger: true }).initialFocus).toBe(
      'cancel',
    );
    const bySeverity = resolveOgeDialog('confirm', { severity: 'danger' });
    expect(bySeverity.danger).toBe(true);
    expect(bySeverity.initialFocus).toBe('cancel');
    expect(
      resolveOgeDialog('confirm', { severity: 'danger', danger: false }).danger,
    ).toBe(false);
    // an alert never has a destructive button
    expect(resolveOgeDialog('alert', { severity: 'danger' }).danger).toBe(
      false,
    );
  });

  it('icon: built-in per severity, hidden by false or without severity, custom otherwise', () => {
    expect(resolveOgeDialog('alert', { severity: 'info' }).icon).toBe(
      'builtin',
    );
    expect(resolveOgeDialog('alert', {}).icon).toBe('none');
    expect(
      resolveOgeDialog('alert', { severity: 'info', icon: false }).icon,
    ).toBe('none');
    expect(
      resolveOgeDialog<string>('alert', { icon: 'custom-node' }).icon,
    ).toBe('custom');
    expect(
      resolveOgeDialog('alert', { severity: 'success', icon: true }).icon,
    ).toBe('builtin');
  });

  it('prompt: a plain dialog focused on the field, with field defaults', () => {
    const dialog = resolveOgeDialog('prompt', {
      label: 'Name',
      defaultValue: 'a',
    });
    expect(dialog.role).toBe('dialog');
    expect(dialog.initialFocus).toBe('input');
    expect(dialog.title).toBe('Enter a value');
    expect(dialog.prompt).toEqual({
      defaultValue: 'a',
      placeholder: undefined,
      label: 'Name',
      inputType: 'text',
      required: false,
    });
    expect(resolveOgeDialog('confirm', {}).prompt).toBeNull();
  });

  it('focus selectors and option normalization', () => {
    expect(ogeDialogAutoFocusSelector('input')).toBe('.oge-dialog-input');
    expect(ogeDialogAutoFocusSelector('cancel')).toBe('.oge-dialog-cancel');
    expect(ogeDialogAutoFocusSelector('ok')).toBe('.oge-dialog-ok');
    expect(ogeDialogOptions(undefined)).toEqual({});
    expect(ogeDialogOptions('m')).toEqual({ message: 'm' });
  });
});

describe('keyboard + results', () => {
  const el = (tag: string) => document.createElement(tag);

  it('Enter runs the primary action except on buttons, links and text areas', () => {
    expect(ogeDialogEnterIsPrimary({ key: 'Enter', target: el('input') })).toBe(
      true,
    );
    expect(ogeDialogEnterIsPrimary({ key: 'Enter', target: el('div') })).toBe(
      true,
    );
    expect(
      ogeDialogEnterIsPrimary({ key: 'Enter', target: el('button') }),
    ).toBe(false);
    expect(ogeDialogEnterIsPrimary({ key: 'Enter', target: el('a') })).toBe(
      false,
    );
    expect(
      ogeDialogEnterIsPrimary({ key: 'Enter', target: el('textarea') }),
    ).toBe(false);
    expect(
      ogeDialogEnterIsPrimary({
        key: 'Enter',
        target: el('input'),
        isComposing: true,
      }),
    ).toBe(false);
    expect(
      ogeDialogEnterIsPrimary({
        key: 'Enter',
        target: el('input'),
        shiftKey: true,
      }),
    ).toBe(false);
    expect(ogeDialogEnterIsPrimary({ key: 'a', target: el('input') })).toBe(
      false,
    );
  });

  it('maps outcomes to helper results', () => {
    expect(ogeConfirmResult('ok')).toBe(true);
    expect(ogeConfirmResult('cancel')).toBe(false);
    expect(ogeConfirmResult(undefined)).toBe(false);
    expect(ogePromptResult('ok', 'x')).toBe('x');
    expect(ogePromptResult('cancel', 'x')).toBeNull();
  });
});

describe('validateOgePromptValue', () => {
  it('required rejects whitespace, then the custom rule runs', () => {
    expect(validateOgePromptValue('  ', { required: true })).toBe(
      'This field is required.',
    );
    expect(
      validateOgePromptValue(
        '  ',
        { required: true },
        { dialogRequired: 'Gerekli' },
      ),
    ).toBe('Gerekli');
    expect(validateOgePromptValue('ok', { required: true })).toBeNull();
    expect(
      validateOgePromptValue('ab', {
        validate: (v) => (v.length < 3 ? 'Too short' : null),
      }),
    ).toBe('Too short');
  });
});

describe('OgeDialogCore', () => {
  function make(
    kind: 'confirm' | 'alert' | 'prompt',
    options: Parameters<typeof resolveOgeDialog>[1] = {},
    validate?: OgePromptValidator,
  ) {
    const settle = vi.fn<(outcome: OgeDialogOutcome, value: string) => void>();
    const announce = vi.fn<(message: string) => void>();
    const core = new OgeDialogCore({
      adapter,
      dialog: resolveOgeDialog(kind, options),
      validate,
      settle,
      announce,
    });
    return { core, settle, announce };
  }

  it('confirm settles once', () => {
    const { core, settle } = make('confirm');
    core.submit();
    core.cancel();
    core.submit();
    expect(settle).toHaveBeenCalledTimes(1);
    expect(settle).toHaveBeenCalledWith('ok', '');
    expect(core.isSettled).toBe(true);
  });

  it('prompt starts from defaultValue and submits the edited text', () => {
    const { core, settle } = make('prompt', { defaultValue: 'draft' });
    expect(core.value()).toBe('draft');
    core.input('final');
    core.submit();
    expect(settle).toHaveBeenCalledWith('ok', 'final');
  });

  it('a failed submit shows + announces the error, and edits re-validate live', () => {
    const { core, settle, announce } = make('prompt', { required: true });
    core.input('x'); // not attempted yet: no validation
    expect(core.error()).toBeNull();
    core.input('');
    core.submit();
    expect(settle).not.toHaveBeenCalled();
    expect(core.error()).toBe('This field is required.');
    expect(announce).toHaveBeenCalledWith('This field is required.');
    core.input('y');
    expect(core.error()).toBeNull();
    expect(settle).not.toHaveBeenCalled(); // editing never submits
    core.submit();
    expect(settle).toHaveBeenCalledWith('ok', 'y');
  });

  it('async validation: pending blocks the submit and only the latest answer counts', async () => {
    const resolvers: Array<(error: string | null) => void> = [];
    const validate: OgePromptValidator = () =>
      new Promise<string | null>((resolve) => resolvers.push(resolve));
    const { core, settle } = make('prompt', {}, validate);
    core.input('taken');
    core.submit();
    expect(core.pending()).toBe(true);
    core.submit(); // ignored while pending
    expect(resolvers).toHaveLength(1);
    core.input('free'); // re-validates (attempted), superseding the first run
    expect(resolvers).toHaveLength(2);
    resolvers[0]('Name taken');
    await Promise.resolve();
    expect(core.error()).toBeNull(); // stale answer dropped
    resolvers[1](null);
    await Promise.resolve();
    expect(core.pending()).toBe(false);
    expect(core.error()).toBeNull();
    // the live re-validation does not submit by itself
    expect(settle).not.toHaveBeenCalled();
    core.submit();
    resolvers[2](null);
    await Promise.resolve();
    expect(settle).toHaveBeenCalledWith('ok', 'free');
  });

  it('a rejecting validator blocks the submit without an error message', async () => {
    const { core, settle } = make('prompt', {}, () =>
      Promise.reject(new Error('down')),
    );
    core.submit();
    await Promise.resolve();
    await Promise.resolve();
    expect(core.pending()).toBe(false);
    expect(settle).not.toHaveBeenCalled();
  });

  it('cancel settles a prompt without validating', () => {
    const { core, settle } = make('prompt', { required: true });
    core.cancel();
    expect(settle).toHaveBeenCalledWith('cancel', '');
  });
});

describe('modalPlacementClass', () => {
  it('maps every non-centre placement to a layer class, never while full screen', () => {
    expect(modalPlacementClass('center', false)).toBeNull();
    expect(modalPlacementClass(undefined, false)).toBeNull();
    expect(modalPlacementClass('top', false)).toBe('oge-modal-layer-top');
    expect(modalPlacementClass('bottom-end', false)).toBe(
      'oge-modal-layer-bottom-end',
    );
    expect(modalPlacementClass('start', true)).toBeNull();
  });
});
