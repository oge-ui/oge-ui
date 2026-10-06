/**
 * The rich-text editor's chrome decisions (W8e) — what a toolbar button
 * does, what the counter and the error line say, how the link and image
 * prompts are configured — single-sourced so the Angular and React editors
 * cannot drift. The render layers only draw the result.
 */
import { ogeFormatMessage } from '@oge-ui/core';
import type { OgeFieldError } from '../input/input-types';
import type { OgePromptBaseOptions } from '../overlay/dialog-helpers';
import type { OgeEditorCommand } from './editor-actions';
import type { OgeEditorCounterMode, OgeEditorMessages } from './editor-config';
import {
  ogeEditorNormalizeLinkInput,
  ogeEditorSafeHref,
  ogeEditorSafeImageSrc,
  type OgeEditorUrlOptions,
} from './editor-html';
import type { OgeEditorLink } from './editor-model';
import {
  ogeEditorToolCommand,
  type OgeEditorCustomTool,
  type OgeEditorToolView,
} from './editor-toolbar';
import type { OgeEditorToolName } from './editor-config';

/** A popup the toolbar opens. */
export type OgeEditorPopupKind =
  'blockFormat' | 'textColor' | 'backgroundColor';

/** What activating a toolbar entry does. */
export type OgeEditorToolAction =
  | { readonly type: 'command'; readonly command: OgeEditorCommand }
  | { readonly type: 'popup'; readonly popup: OgeEditorPopupKind }
  | { readonly type: 'dialog'; readonly dialog: 'link' | 'image' }
  | { readonly type: 'custom'; readonly tool: OgeEditorCustomTool };

/** The action behind a toolbar view (`null` for separators and disabled tools). */
export function ogeEditorToolAction(
  view: OgeEditorToolView,
): OgeEditorToolAction | null {
  if (view.kind === 'separator' || view.disabled) return null;
  if (view.custom) return { type: 'custom', tool: view.custom };
  const name = view.key as OgeEditorToolName;
  if (view.kind === 'menu') return { type: 'popup', popup: 'blockFormat' };
  if (view.kind === 'color') {
    return {
      type: 'popup',
      popup: name === 'backgroundColor' ? 'backgroundColor' : 'textColor',
    };
  }
  if (view.kind === 'dialog') {
    return { type: 'dialog', dialog: name === 'image' ? 'image' : 'link' };
  }
  const command = ogeEditorToolCommand(name);
  return command ? { type: 'command', command } : null;
}

/** The counter line, or `null` when nothing is shown. */
export function ogeEditorCounterText(
  mode: OgeEditorCounterMode,
  characters: number,
  words: number,
  maxLength: number | undefined,
  messages: OgeEditorMessages,
  locale?: string,
): string | null {
  const counter = messages.counter;
  const limited = maxLength !== undefined && maxLength >= 0;
  const charText = limited
    ? ogeFormatMessage(
        counter.limit,
        { count: characters, max: maxLength },
        locale,
      )
    : ogeFormatMessage(counter.characters, { count: characters }, locale);
  const wordText = ogeFormatMessage(counter.words, { count: words }, locale);
  switch (mode) {
    case 'characters':
      return charText;
    case 'words':
      return limited ? `${wordText} · ${charText}` : wordText;
    case 'both':
      return `${charText} · ${wordText}`;
    default:
      return limited ? charText : null;
  }
}

/** What the error line under the editor says, or `null`. */
export function ogeEditorErrorText(
  input: {
    /** An explicit `errorText` — always wins. */
    readonly explicit?: string;
    /** Signal Forms errors. */
    readonly errors: readonly OgeFieldError[];
    /** Reactive-forms errors (`control.errors`). */
    readonly controlErrors: Readonly<Record<string, unknown>> | null;
    /** The text is longer than `maxLength`. */
    readonly overLimit: boolean;
    readonly characters: number;
    readonly maxLength: number | undefined;
    /** Any other invalid signal (an `invalid` input). */
    readonly invalid: boolean;
  },
  messages: OgeEditorMessages,
  locale?: string,
): string | null {
  const validation = messages.validation;
  const maxText = (max = input.maxLength ?? 0, count = input.characters) =>
    ogeFormatMessage(validation.maxLength, { max, count }, locale);
  if (input.explicit) return input.explicit;
  const first = input.errors[0];
  if (first) {
    if (first.message) return first.message;
    if (first.kind === 'required') return validation.required;
    if (/max.?length/i.test(first.kind)) return maxText();
    return validation.invalid;
  }
  const control = input.controlErrors;
  if (control && Object.keys(control).length > 0) {
    if ('required' in control) return validation.required;
    // the editor's own validator, then Angular's `Validators.maxLength`
    const own = control['ogeEditorMaxLength'] as
      { max?: number; actual?: number } | undefined;
    if (own) return maxText(own.max, own.actual);
    const native = control['maxlength'] as
      { requiredLength?: number; actualLength?: number } | undefined;
    if (native) return maxText(native.requiredLength, native.actualLength);
    return validation.invalid;
  }
  if (input.overLimit) return maxText();
  return input.invalid ? validation.invalid : null;
}

/** The link prompt: an address field, empty = remove the link. */
export function ogeEditorLinkPrompt(
  link: OgeEditorLink | null,
  messages: OgeEditorMessages,
  urlOptions: OgeEditorUrlOptions = {},
): OgePromptBaseOptions {
  const dialogs = messages.dialogs;
  return {
    title: link ? dialogs.linkEditTitle : dialogs.linkTitle,
    message: dialogs.linkMessage,
    label: dialogs.linkLabel,
    placeholder: dialogs.linkPlaceholder,
    defaultValue: link?.href ?? '',
    inputType: 'url',
    okText: dialogs.linkOk,
    validate: (value) =>
      value.trim() === '' ||
      ogeEditorSafeHref(ogeEditorNormalizeLinkInput(value), urlOptions) !== null
        ? null
        : dialogs.linkInvalid,
  };
}

/** The command a link prompt's answer stands for (`''` removes the link). */
export function ogeEditorLinkCommand(answer: string): OgeEditorCommand {
  const href = ogeEditorNormalizeLinkInput(answer);
  return href === '' ? { type: 'link', href: null } : { type: 'link', href };
}

/** The two image prompts: the address, then the alternative text. */
export function ogeEditorImagePrompts(
  messages: OgeEditorMessages,
  urlOptions: OgeEditorUrlOptions = {},
): {
  readonly source: OgePromptBaseOptions;
  readonly alt: OgePromptBaseOptions;
} {
  const dialogs = messages.dialogs;
  return {
    source: {
      title: dialogs.imageTitle,
      label: dialogs.imageLabel,
      placeholder: dialogs.imagePlaceholder,
      inputType: 'url',
      okText: dialogs.imageOk,
      required: true,
      validate: (value) =>
        ogeEditorSafeImageSrc(value, urlOptions) !== null
          ? null
          : dialogs.imageInvalid,
    },
    alt: {
      title: dialogs.imageAltTitle,
      label: dialogs.imageAltLabel,
      message: dialogs.imageAltMessage,
    },
  };
}

/** `aria-describedby` of the editing surface. */
export function ogeEditorDescribedBy(ids: {
  readonly hint?: string | null;
  readonly error?: string | null;
  readonly counter?: string | null;
}): string | null {
  const list = [ids.error ?? ids.hint, ids.counter].filter(
    (id): id is string => typeof id === 'string' && id !== '',
  );
  return list.length > 0 ? list.join(' ') : null;
}

/** A CSS length from a number (px) or a string; `null` when unset. */
export function ogeEditorCssLength(
  value: number | string | undefined | null,
): string | null {
  if (value === undefined || value === null || value === '') return null;
  return typeof value === 'number' ? `${value}px` : value;
}
