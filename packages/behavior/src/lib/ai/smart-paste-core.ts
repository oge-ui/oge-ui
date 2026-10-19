import { ogeDateTimeFormat, ogeNumberFormat } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  formatOgeAiMessage,
  type OgeGridAssistantMode,
  type OgeSmartPasteMessages,
} from './ai-config';
import { extractOgeAiJson } from './ai-json';
import {
  OgeAiError,
  type OgeAiErrorCode,
  type OgeAiTransport,
} from './ai-transport';
import {
  buildOgeSmartPasteRequest,
  isOgeSmartPasteFillable,
  type OgeAiFormField,
} from './smart-paste-context';
import {
  resolveOgeSmartPasteReply,
  type OgeSmartPasteChange,
  type OgeSmartPasteWarning,
} from './smart-paste-response';

/** A form field as the target reports it: the catalog entry plus its value now. */
export type OgeSmartPasteField = OgeAiFormField & { readonly value?: unknown };

/**
 * What smart paste fills: the form's own API. The Angular `OgeForm` and the
 * React form handle both have exactly these members, so smart paste takes
 * either — or a host object that adapts another form.
 */
export interface OgeSmartPasteTarget {
  describeFields(): readonly OgeSmartPasteField[];
  updateData(values: Record<string, unknown>): void;
}

/**
 * Where smart paste is: `idle`, `reading` (the clipboard), `thinking`,
 * `preview` (values wait for Apply / Discard), `applied`, `unchanged`,
 * `unsupported`, `invalid`, `error`, `aborted`.
 */
export type OgeSmartPasteStatus =
  | 'idle'
  | 'reading'
  | 'thinking'
  | 'preview'
  | 'applied'
  | 'unchanged'
  | 'unsupported'
  | 'invalid'
  | 'error'
  | 'aborted';

/** Values smart paste proposes or applies. */
export interface OgeSmartPasteProposal {
  readonly summary: string;
  readonly values: Readonly<Record<string, unknown>>;
  readonly changes: readonly OgeSmartPasteChange[];
  readonly warnings: readonly OgeSmartPasteWarning[];
}

/** Cancelable pre-event before values reach the form. */
export interface OgeSmartPasteApplyingEvent {
  readonly values: Readonly<Record<string, unknown>>;
  readonly changes: readonly OgeSmartPasteChange[];
  /** Set `true` to keep the form as it is. */
  cancel: boolean;
}

/** Values smart paste wrote into the form. */
export interface OgeSmartPasteAppliedEvent {
  readonly values: Readonly<Record<string, unknown>>;
  readonly changes: readonly OgeSmartPasteChange[];
}

/** Undo restored the values a paste replaced. */
export interface OgeSmartPasteUndoneEvent {
  readonly values: Readonly<Record<string, unknown>>;
}

/** A paste that failed. */
export interface OgeSmartPasteErrorEvent {
  /** `'clipboard'`, `'empty'`, `'no-transport'` and `'invalid-reply'` are smart paste's own codes. */
  readonly code:
    OgeAiErrorCode | 'clipboard' | 'empty' | 'no-transport' | 'invalid-reply';
  readonly error: unknown;
}

/** Inputs of {@link OgeSmartPasteCore}, read lazily on every use. */
export interface OgeSmartPasteCoreOptions {
  readonly adapter: OgeReactivityAdapter;
  readonly target: () => OgeSmartPasteTarget | null | undefined;
  readonly transport: () => OgeAiTransport | null | undefined;
  readonly mode: () => OgeGridAssistantMode;
  readonly instructions: () => string | undefined;
  /**
   * Field descriptions to merge over the target's (by `field`): add a
   * `description`, or set `readOnly: true` to keep a field out of reach.
   */
  readonly fields?: () => readonly OgeAiFormField[] | undefined;
  readonly messages: () => OgeSmartPasteMessages;
  readonly locale: () => string | undefined;
  readonly undoLimit: () => number;
  /** Reads the clipboard; `navigator.clipboard.readText` by default. */
  readonly readClipboard?: () => Promise<string>;
  readonly now?: () => Date;
  readonly applying?: (event: OgeSmartPasteApplyingEvent) => void;
  readonly applied?: (event: OgeSmartPasteAppliedEvent) => void;
  readonly undone?: (event: OgeSmartPasteUndoneEvent) => void;
  readonly errorOccurred?: (event: OgeSmartPasteErrorEvent) => void;
}

function defaultReadClipboard(): Promise<string> {
  const clipboard = (
    globalThis as {
      navigator?: { clipboard?: { readText?: () => Promise<string> } };
    }
  ).navigator?.clipboard;
  return clipboard?.readText
    ? clipboard.readText()
    : Promise.reject(new Error('Clipboard API unavailable'));
}

/**
 * Smart paste's machine, shared by both render layers: it reads text (the
 * clipboard, or text the user typed), asks the model for field values,
 * validates them against the form's fields, shows or applies them, and keeps
 * an undo stack of the values each paste replaced.
 *
 * The request carries the field catalog and the pasted text — never the
 * form's current values. A newer paste aborts the older one.
 */
export class OgeSmartPasteCore {
  readonly status: OgeReactiveCell<OgeSmartPasteStatus>;
  /** The pending proposal (`status === 'preview'`), else `null`. */
  readonly proposal: OgeReactiveCell<OgeSmartPasteProposal | null>;
  /** The fallback text area's contents. */
  readonly text: OgeReactiveCell<string>;
  /** Whether the fallback text area is shown. */
  readonly textOpen: OgeReactiveCell<boolean>;
  readonly summary: OgeReactiveCell<string>;
  readonly warnings: OgeReactiveCell<readonly OgeSmartPasteWarning[]>;
  readonly errorCode: OgeReactiveCell<OgeSmartPasteErrorEvent['code'] | null>;
  /** How many fields the latest apply wrote. */
  readonly appliedCount: OgeReactiveCell<number>;
  readonly busy: () => boolean;
  readonly canUndo: () => boolean;
  readonly statusText: () => string;
  readonly warningText: () => string;

  private readonly undoStack: OgeReactiveCell<
    readonly Readonly<Record<string, unknown>>[]
  >;
  private controller: AbortController | null = null;
  private requestId = 0;
  private destroyed = false;

  constructor(private readonly options: OgeSmartPasteCoreOptions) {
    const rx = options.adapter;
    this.status = rx.cell<OgeSmartPasteStatus>('idle');
    this.proposal = rx.cell<OgeSmartPasteProposal | null>(null);
    this.text = rx.cell('');
    this.textOpen = rx.cell(false);
    this.summary = rx.cell('');
    this.warnings = rx.cell<readonly OgeSmartPasteWarning[]>([]);
    this.errorCode = rx.cell<OgeSmartPasteErrorEvent['code'] | null>(null);
    this.appliedCount = rx.cell(0);
    this.undoStack = rx.cell<readonly Readonly<Record<string, unknown>>[]>([]);
    this.busy = rx.derived(
      () => this.status() === 'thinking' || this.status() === 'reading',
    );
    this.canUndo = rx.derived(() => this.undoStack().length > 0);
    this.statusText = rx.derived(() => this.describe());
    this.warningText = rx.derived(() => {
      const count = this.warnings().length;
      return count
        ? formatOgeAiMessage(
            this.options.messages().ignored,
            { count },
            this.options.locale(),
          )
        : '';
    });
  }

  /** Replaces the fallback text area's contents. */
  setText(text: string): void {
    this.text.set(text);
  }

  /** Shows or hides the fallback text area. */
  setTextOpen(open: boolean): void {
    this.textOpen.set(open);
  }

  /**
   * Fills the form from `text` — or, without an argument, from the clipboard
   * (falling back to the text area when it cannot be read). Resolves when the
   * reply is handled; never rejects.
   */
  async paste(text?: string): Promise<void> {
    if (this.destroyed) return;
    this.abortInFlight();
    const id = this.requestId;
    let source = text;
    if (source === undefined) {
      this.status.set('reading');
      try {
        source = await (this.options.readClipboard ?? defaultReadClipboard)();
      } catch (error) {
        if (id !== this.requestId) return;
        this.textOpen.set(true);
        this.fail('clipboard', error);
        return;
      }
      if (id !== this.requestId || this.destroyed) return;
    }
    if (!source.trim()) {
      this.fail('empty', null);
      return;
    }
    await this.request(source, id);
  }

  /** Fills the form from the fallback text area. */
  fillFromText(): Promise<void> {
    return this.paste(this.text());
  }

  /** Applies the pending proposal. */
  apply(): void {
    const proposal = this.proposal();
    const target = this.options.target();
    if (!proposal || !target) return;
    this.commit(target, proposal);
  }

  /** Drops the pending proposal; the form stays as it is. */
  discard(): void {
    if (!this.proposal()) return;
    this.proposal.set(null);
    this.warnings.set([]);
    this.status.set('idle');
    this.errorCode.set(null);
    this.summary.set(this.options.messages().discarded);
  }

  /** Restores the values the latest applied paste replaced. */
  undo(): void {
    const stack = this.undoStack();
    const previous = stack[stack.length - 1];
    const target = this.options.target();
    if (!previous || !target) return;
    this.undoStack.set(stack.slice(0, -1));
    target.updateData({ ...previous });
    this.proposal.set(null);
    this.warnings.set([]);
    this.summary.set(this.options.messages().undone);
    this.status.set('idle');
    this.options.undone?.({ values: previous });
  }

  /** Aborts the read or request in flight. */
  cancel(): void {
    if (!this.busy()) return;
    this.abortInFlight();
    this.status.set('aborted');
  }

  /** Clears the proposal, the text area and the undo history. */
  reset(): void {
    this.abortInFlight();
    this.proposal.set(null);
    this.text.set('');
    this.textOpen.set(false);
    this.warnings.set([]);
    this.summary.set('');
    this.errorCode.set(null);
    this.undoStack.set([]);
    this.status.set('idle');
  }

  /** Aborts any request; a destroyed machine ignores late replies. */
  destroy(): void {
    this.destroyed = true;
    this.abortInFlight();
  }

  /** Undoes {@link destroy} (React StrictMode remounts the same instance). */
  revive(): void {
    this.destroyed = false;
  }

  /**
   * Display text of a value in a field, for the proposal table: lists join,
   * dates and numbers use the locale, booleans and choices use their words.
   */
  formatValue(field: string, value: unknown): string {
    const m = this.options.messages();
    const locale = this.options.locale();
    const meta = this.fields().find((f) => f.field === field);
    const one = (item: unknown): string => {
      const choice = meta?.values?.find((v) => v.value === item);
      if (choice) return choice.text ?? String(choice.value);
      if (item instanceof Date) {
        return ogeDateTimeFormat(
          locale,
          meta?.dataType === 'datetime'
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { dateStyle: 'medium' },
        ).format(item);
      }
      if (typeof item === 'number') return ogeNumberFormat(locale).format(item);
      if (typeof item === 'boolean') return item ? m.yes : m.no;
      return item == null ? '' : String(item);
    };
    const text = Array.isArray(value) ? value.map(one).join(', ') : one(value);
    return text === '' ? m.emptyValue : text;
  }

  private fields(): OgeSmartPasteField[] {
    const target = this.options.target();
    const own = target?.describeFields() ?? [];
    const overrides = new Map(
      (this.options.fields?.() ?? []).map((f) => [f.field, f]),
    );
    return own.map((f) => {
      const extra = overrides.get(f.field);
      return extra ? { ...f, ...extra, value: f.value } : f;
    });
  }

  private async request(text: string, id: number): Promise<void> {
    const target = this.options.target();
    const transport = this.options.transport();
    if (!target || !transport) {
      this.fail('no-transport', null);
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.proposal.set(null);
    this.warnings.set([]);
    this.summary.set('');
    this.errorCode.set(null);
    this.status.set('thinking');

    const fields = this.fields();
    let replyText: string;
    try {
      const response = await transport.complete(
        buildOgeSmartPasteRequest(text, {
          // the catalog only — current values never leave the page
          fields: fields.map(({ value: _value, ...field }) => field),
          instructions: this.options.instructions(),
          locale: this.options.locale(),
          now: this.options.now?.(),
        }),
        { signal: controller.signal },
      );
      replyText = response.text;
    } catch (error) {
      if (id !== this.requestId) return;
      this.controller = null;
      const code = error instanceof OgeAiError ? error.code : 'network';
      if (code === 'aborted') {
        this.status.set('aborted');
        return;
      }
      this.fail(code, error);
      return;
    }
    if (id !== this.requestId || this.destroyed) return;
    this.controller = null;

    // re-read the values: the user may have typed while the model answered
    const result = resolveOgeSmartPasteReply(
      extractOgeAiJson(replyText),
      this.fields(),
    );
    if (result.kind === 'invalid') {
      this.fail('invalid-reply', null);
      return;
    }
    this.summary.set(result.summary);
    if (result.kind === 'unsupported') {
      this.status.set('unsupported');
      return;
    }
    this.warnings.set(result.warnings);
    if (result.changes.length === 0) {
      this.status.set('unchanged');
      return;
    }
    const proposal: OgeSmartPasteProposal = {
      summary: result.summary,
      values: result.values,
      changes: result.changes,
      warnings: result.warnings,
    };
    if (this.options.mode() === 'apply') {
      this.commit(target, proposal);
    } else {
      this.proposal.set(proposal);
      this.status.set('preview');
    }
  }

  private commit(
    target: OgeSmartPasteTarget,
    proposal: OgeSmartPasteProposal,
  ): void {
    const applying: OgeSmartPasteApplyingEvent = {
      values: proposal.values,
      changes: proposal.changes,
      cancel: false,
    };
    this.options.applying?.(applying);
    if (applying.cancel) {
      this.proposal.set(null);
      this.status.set('idle');
      return;
    }
    const writable = new Set(
      this.fields()
        .filter(isOgeSmartPasteFillable)
        .map((f) => f.field),
    );
    const values: Record<string, unknown> = {};
    const previous: Record<string, unknown> = {};
    const current = new Map(this.fields().map((f) => [f.field, f.value]));
    for (const change of proposal.changes) {
      if (!writable.has(change.field)) continue;
      values[change.field] = proposal.values[change.field];
      previous[change.field] = current.get(change.field) ?? null;
    }
    target.updateData(values);
    this.undoStack.set(
      [...this.undoStack(), previous].slice(
        -Math.max(1, this.options.undoLimit()),
      ),
    );
    this.appliedCount.set(Object.keys(values).length);
    this.proposal.set(null);
    this.text.set('');
    this.textOpen.set(false);
    this.status.set('applied');
    this.options.applied?.({ values, changes: proposal.changes });
  }

  private fail(code: OgeSmartPasteErrorEvent['code'], error: unknown): void {
    this.controller = null;
    this.proposal.set(null);
    this.status.set(code === 'invalid-reply' ? 'invalid' : 'error');
    this.summary.set('');
    this.errorCode.set(code);
    this.options.errorOccurred?.({ code, error });
  }

  private abortInFlight(): void {
    this.requestId++;
    const controller = this.controller;
    this.controller = null;
    controller?.abort();
  }

  private describe(): string {
    const m = this.options.messages();
    const locale = this.options.locale();
    const fill = (template: string, tokens: Record<string, string | number>) =>
      formatOgeAiMessage(template, tokens, locale).trim();
    switch (this.status()) {
      case 'reading':
        return m.reading;
      case 'thinking':
        return m.thinking;
      case 'preview':
        return fill(m.proposed, {
          count: this.proposal()?.changes.length ?? 0,
        });
      case 'applied':
        return fill(m.applied, { count: this.appliedCount() });
      case 'unchanged':
        return m.unchanged;
      case 'unsupported':
        return fill(m.unsupported, { summary: this.summary() });
      case 'invalid':
        return m.invalid;
      case 'error':
        switch (this.errorCode()) {
          case 'no-transport':
            return m.noTransport;
          case 'clipboard':
            return m.clipboardDenied;
          case 'empty':
            return m.empty;
          default:
            return m.error;
        }
      case 'aborted':
        return m.aborted;
      default:
        return this.summary();
    }
  }
}
