/**
 * Framework-free half of the `confirm()` / `alert()` / `prompt()` dialog
 * helpers (ADR 0001): option resolution (defaults, localized button labels,
 * severity → icon, danger styling), the default-focus and keyboard decisions,
 * the result mapping and the prompt's validation flow. The render layers open
 * the dialog through their modal service and draw the markup.
 */

import { getOgeLiveAnnouncer } from '../a11y/live-announcer';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import { ogeOverlayMessage, type OgeOverlayMessages } from './overlay-config';

// --- vocabulary -------------------------------------------------------------

/** Which helper opened the dialog. */
export type OgeDialogKind = 'confirm' | 'alert' | 'prompt';

/** Semantic tone of a helper dialog: picks the built-in icon and its colour. */
export type OgeDialogSeverity = 'info' | 'success' | 'warning' | 'danger';

/** Native `type` of the prompt's text field. */
export type OgePromptInputType =
  'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';

/**
 * Prompt validator: return an error message to block the submit, `null` to
 * accept. May be async — the OK button waits for it (latest call wins).
 */
export type OgePromptValidator = (
  value: string,
) => string | null | Promise<string | null>;

/**
 * Options every helper takes. `TIcon` is the render layer's custom-icon type
 * (`TemplateRef` in Angular, `ReactNode` in React).
 */
export interface OgeDialogBaseOptions<TIcon = never> {
  /** Dialog title; defaults to the localized `dialog<Kind>Title` message. */
  title?: string;
  /** Body text, wired to the dialog's `aria-describedby`. */
  message?: string;
  /** Tone: picks the built-in icon. `danger` also implies danger styling on `confirm()`/`prompt()`. */
  severity?: OgeDialogSeverity;
  /** `false` hides the severity icon, a custom icon replaces it. Default: the built-in icon of `severity`. */
  icon?: boolean | TIcon;
  /** Primary button text; defaults to the localized `dialogOk`. */
  okText?: string;
  /** Panel width — number = px, string passed through. Default `400`. */
  width?: number | string;
}

/** Options of `confirm()`. */
export interface OgeConfirmBaseOptions<
  TIcon = never,
> extends OgeDialogBaseOptions<TIcon> {
  /** Destructive styling on the primary button; initial focus moves to Cancel. Default: `severity === 'danger'`. */
  danger?: boolean;
  /** Cancel button text; defaults to the localized `dialogCancel`. */
  cancelText?: string;
}

/** Options of `alert()`. */
export type OgeAlertBaseOptions<TIcon = never> = OgeDialogBaseOptions<TIcon>;

/** Options of `prompt()`. */
export interface OgePromptBaseOptions<
  TIcon = never,
> extends OgeConfirmBaseOptions<TIcon> {
  /** Initial text of the field. Default `''`. */
  defaultValue?: string;
  /** Placeholder of the field. */
  placeholder?: string;
  /** Visible label of the field; without one the field is labelled by the message or title. */
  label?: string;
  /** Native input type. Default `'text'`. */
  inputType?: OgePromptInputType;
  /** Rejects empty (whitespace-only) input with the localized `dialogRequired` message. */
  required?: boolean;
  /** Custom validation, run after `required`; sync or async. */
  validate?: OgePromptValidator;
}

/** Where focus lands when the dialog opens. */
export type OgeDialogInitialFocus = 'ok' | 'cancel' | 'input';

/** The fully resolved model both render layers draw. */
export interface OgeResolvedDialog {
  readonly kind: OgeDialogKind;
  /** `alertdialog` for confirm/alert (APG alert dialog), `dialog` for prompt. */
  readonly role: 'alertdialog' | 'dialog';
  readonly title: string;
  readonly message: string | undefined;
  readonly severity: OgeDialogSeverity | undefined;
  /** What to draw in the icon slot. */
  readonly icon: 'builtin' | 'custom' | 'none';
  /** Destructive primary button. */
  readonly danger: boolean;
  readonly okText: string;
  /** `null` for `alert()`, which has no Cancel button. */
  readonly cancelText: string | null;
  readonly initialFocus: OgeDialogInitialFocus;
  readonly width: number | string;
  /** Prompt field settings; `null` for confirm/alert. */
  readonly prompt: {
    readonly defaultValue: string;
    readonly placeholder: string | undefined;
    readonly label: string | undefined;
    readonly inputType: OgePromptInputType;
    readonly required: boolean;
  } | null;
}

/** Default panel width of a helper dialog. */
export const OGE_DIALOG_DEFAULT_WIDTH = 400;

const TITLE_KEY = {
  confirm: 'dialogConfirmTitle',
  alert: 'dialogAlertTitle',
  prompt: 'dialogPromptTitle',
} as const satisfies Record<OgeDialogKind, keyof OgeOverlayMessages>;

/** Normalizes the `message | options` argument every helper accepts. */
export function ogeDialogOptions<T extends object>(
  input: string | T | undefined,
): T & { message?: string } {
  return (
    typeof input === 'string' ? { message: input } : (input ?? {})
  ) as T & { message?: string };
}

/**
 * Resolves helper options into the model the render layers draw: defaults,
 * localized labels, the icon decision, danger styling and initial focus
 * (prompt → the field; a danger confirm → the safe Cancel button; otherwise
 * the primary button).
 */
export function resolveOgeDialog<TIcon>(
  kind: OgeDialogKind,
  input: string | OgePromptBaseOptions<TIcon> | undefined,
  messages?: Partial<OgeOverlayMessages>,
): OgeResolvedDialog {
  const options = ogeDialogOptions<OgePromptBaseOptions<TIcon>>(input);
  const severity = options.severity;
  const danger =
    kind === 'alert' ? false : (options.danger ?? severity === 'danger');
  const icon: OgeResolvedDialog['icon'] =
    options.icon === false || options.icon === null
      ? 'none'
      : options.icon !== undefined && options.icon !== true
        ? 'custom'
        : severity
          ? 'builtin'
          : 'none';
  const initialFocus: OgeDialogInitialFocus =
    kind === 'prompt'
      ? 'input'
      : kind === 'confirm' && danger
        ? 'cancel'
        : 'ok';
  return {
    kind,
    role: kind === 'prompt' ? 'dialog' : 'alertdialog',
    title: options.title ?? ogeOverlayMessage(messages, TITLE_KEY[kind]),
    message: options.message,
    severity,
    icon,
    danger,
    okText: options.okText ?? ogeOverlayMessage(messages, 'dialogOk'),
    cancelText:
      kind === 'alert'
        ? null
        : (options.cancelText ?? ogeOverlayMessage(messages, 'dialogCancel')),
    initialFocus,
    width: options.width ?? OGE_DIALOG_DEFAULT_WIDTH,
    prompt:
      kind === 'prompt'
        ? {
            defaultValue: options.defaultValue ?? '',
            placeholder: options.placeholder,
            label: options.label,
            inputType: options.inputType ?? 'text',
            required: options.required ?? false,
          }
        : null,
  };
}

/** CSS selector of the element that receives initial focus (the modal's `autoFocus`). */
export function ogeDialogAutoFocusSelector(
  focus: OgeDialogInitialFocus,
): string {
  return focus === 'input'
    ? '.oge-dialog-input'
    : focus === 'cancel'
      ? '.oge-dialog-cancel'
      : '.oge-dialog-ok';
}

// --- icons ------------------------------------------------------------------

/** Built-in icon of each severity: an outer shape plus stroke paths. */
export interface OgeDialogIcon {
  /** `circle` = r 6.5 at the centre, `triangle` = the warning outline. */
  readonly frame: 'circle' | 'triangle';
  readonly paths: readonly string[];
}

/**
 * The built-in severity icons, single-sourced so both layers draw the same
 * glyphs as the toast (stroke-only, `currentColor`).
 */
export const OGE_DIALOG_ICONS: Readonly<
  Record<OgeDialogSeverity, OgeDialogIcon>
> = {
  info: { frame: 'circle', paths: ['M8 7.4v3.6M8 4.9v.4'] },
  success: { frame: 'circle', paths: ['m5 8 2 2 4-4'] },
  warning: { frame: 'triangle', paths: ['M8 6.5v3.2M8 11.6v.4'] },
  danger: { frame: 'circle', paths: ['m5.8 5.8 4.4 4.4M10.2 5.8l-4.4 4.4'] },
};

/** The warning frame's outline path. */
export const OGE_DIALOG_TRIANGLE_PATH = 'M8 2 15 14H1L8 2z';

// --- keyboard + results -----------------------------------------------------

/** The slice of a keydown the dialog's Enter decision reads. */
export interface OgeDialogKeyInput {
  readonly key: string;
  readonly target: EventTarget | null;
  readonly isComposing?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/**
 * Whether a keydown inside the dialog should run the primary action: a bare
 * Enter anywhere but on a button, link or text area (those keep their native
 * Enter — a focused Cancel still cancels) and never mid-IME composition.
 * Escape is the modal's own (it cancels; on `alert()` it acknowledges).
 */
export function ogeDialogEnterIsPrimary(event: OgeDialogKeyInput): boolean {
  if (event.key !== 'Enter' || event.isComposing) return false;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }
  const target = event.target as Element | null;
  const tag = target?.tagName?.toLowerCase();
  return tag !== 'button' && tag !== 'a' && tag !== 'textarea';
}

/** How a helper dialog ended. */
export type OgeDialogOutcome = 'ok' | 'cancel';

/** `confirm()` → boolean: only the primary button is `true`. */
export function ogeConfirmResult(
  outcome: OgeDialogOutcome | undefined,
): boolean {
  return outcome === 'ok';
}

/** `prompt()` → the submitted text, or `null` for Cancel / Escape. */
export function ogePromptResult(
  outcome: OgeDialogOutcome | undefined,
  value: string,
): string | null {
  return outcome === 'ok' ? value : null;
}

// --- validation flow --------------------------------------------------------

/**
 * Runs `required` then the custom validator. Returns the error (or `null`)
 * synchronously when it can, a promise only when the validator is async.
 */
export function validateOgePromptValue(
  value: string,
  rules: { required?: boolean; validate?: OgePromptValidator },
  messages?: Partial<OgeOverlayMessages>,
): string | null | Promise<string | null> {
  if (rules.required && value.trim() === '') {
    return ogeOverlayMessage(messages, 'dialogRequired');
  }
  return rules.validate ? rules.validate(value) : null;
}

const isPromise = (value: unknown): value is Promise<string | null> =>
  typeof (value as Promise<unknown> | null)?.then === 'function';

/** Options of {@link OgeDialogCore}. */
export interface OgeDialogCoreOptions {
  readonly adapter: OgeReactivityAdapter;
  readonly dialog: OgeResolvedDialog;
  readonly validate?: OgePromptValidator;
  readonly messages?: Partial<OgeOverlayMessages>;
  /** Called exactly once, with the outcome and the field value. */
  readonly settle: (outcome: OgeDialogOutcome, value: string) => void;
  /** Announces validation errors; default: the document's shared live announcer. */
  readonly announce?: (message: string) => void;
}

/**
 * State of one helper dialog: the prompt value, its error and the pending
 * flag of an async validator, plus the single-settle OK/Cancel pipeline.
 *
 * Validation runs on submit; after the first failed submit it re-runs on
 * every edit so the error clears as soon as the value is fixed. An async
 * validator keeps `pending` set (the OK button is disabled) and only the
 * latest call's answer counts.
 */
export class OgeDialogCore {
  /** Current prompt text. */
  readonly value: OgeReactiveCell<string>;
  /** Current validation error, `null` when valid or not validated yet. */
  readonly error: OgeReactiveCell<string | null>;
  /** `true` while an async validator runs. */
  readonly pending: OgeReactiveCell<boolean>;

  private settled = false;
  private attempted = false;
  private run = 0;

  constructor(private readonly options: OgeDialogCoreOptions) {
    const { adapter, dialog } = options;
    this.value = adapter.cell(dialog.prompt?.defaultValue ?? '');
    this.error = adapter.cell<string | null>(null);
    this.pending = adapter.cell(false);
  }

  /** `true` once OK or Cancel ended the dialog. */
  get isSettled(): boolean {
    return this.settled;
  }

  /** The field changed; re-validates once a submit was attempted. */
  input(value: string): void {
    this.value.set(value);
    if (this.attempted) void this.check(false);
  }

  /** The primary action: validates a prompt first, then settles `'ok'`. */
  submit(): void {
    if (this.settled || this.pending()) return;
    if (this.options.dialog.kind !== 'prompt') {
      this.finish('ok');
      return;
    }
    this.attempted = true;
    void this.check(true);
  }

  /** Cancel / Escape / ✕ — settles `'cancel'` (alert: the caller maps it to "acknowledged"). */
  cancel(): void {
    if (!this.settled) this.finish('cancel');
  }

  private check(thenSubmit: boolean): Promise<void> | void {
    const ticket = ++this.run;
    const result = validateOgePromptValue(
      this.value(),
      {
        required: this.options.dialog.prompt?.required,
        validate: this.options.validate,
      },
      this.options.messages,
    );
    if (!isPromise(result)) {
      this.pending.set(false);
      this.apply(result, thenSubmit);
      return;
    }
    this.pending.set(true);
    return result.then(
      (error) => {
        if (ticket !== this.run || this.settled) return;
        this.pending.set(false);
        this.apply(error, thenSubmit);
      },
      () => {
        // a throwing validator blocks the submit, like a veto guard
        if (ticket !== this.run || this.settled) return;
        this.pending.set(false);
      },
    );
  }

  private apply(error: string | null, thenSubmit: boolean): void {
    const previous = this.error();
    this.error.set(error);
    if (error) {
      if (thenSubmit || error !== previous) this.say(error);
      return;
    }
    if (thenSubmit) this.finish('ok');
  }

  private say(message: string): void {
    if (this.options.announce) this.options.announce(message);
    else getOgeLiveAnnouncer().announce(message);
  }

  private finish(outcome: OgeDialogOutcome): void {
    this.settled = true;
    this.run++;
    this.options.settle(outcome, this.value());
  }
}
