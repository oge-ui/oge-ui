import type { GridStateSnapshot } from '@oge-ui/core';
import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  formatOgeAiMessage,
  type OgeGridAssistantMessages,
  type OgeGridAssistantMode,
} from './ai-config';
import { extractOgeAiJson } from './ai-json';
import {
  OgeAiError,
  type OgeAiErrorCode,
  type OgeAiTransport,
} from './ai-transport';
import {
  buildOgeGridAiRequest,
  type OgeAiGridColumn,
  type OgeGridAiCapabilities,
  type OgeGridAiTurn,
} from './grid-ai-context';
import {
  resolveOgeGridAiReply,
  type OgeGridAiSlice,
  type OgeGridAiWarning,
} from './grid-ai-response';

/**
 * What the assistant drives: the grid's own state API. The Angular `OgeGrid`
 * and the React grid handle both have exactly these members, so the assistant
 * takes either — or a host object that adapts another component.
 */
export interface OgeGridAssistantTarget {
  state(): GridStateSnapshot;
  applyState(snapshot: GridStateSnapshot): void;
  describeColumns(): readonly OgeAiGridColumn[];
}

/**
 * Where the assistant is:
 * `idle` (nothing pending), `thinking` (a request in flight), `preview` (a
 * proposal waits for Apply / Discard), `applied`, `unchanged` (the grid
 * already matched), `clarify` (the model asked back), `unsupported`,
 * `invalid` (the reply did not fit), `error`, `aborted`.
 */
export type OgeGridAssistantStatus =
  | 'idle'
  | 'thinking'
  | 'preview'
  | 'applied'
  | 'unchanged'
  | 'clarify'
  | 'unsupported'
  | 'invalid'
  | 'error'
  | 'aborted';

/** A change the assistant proposes or applies. */
export interface OgeGridAssistantProposal {
  readonly prompt: string;
  readonly summary: string;
  readonly snapshot: GridStateSnapshot;
  readonly slices: readonly OgeGridAiSlice[];
  readonly warnings: readonly OgeGridAiWarning[];
}

/** Cancelable pre-event before a change reaches the grid. */
export interface OgeGridAssistantApplyingEvent {
  readonly prompt: string;
  readonly summary: string;
  readonly snapshot: GridStateSnapshot;
  readonly slices: readonly OgeGridAiSlice[];
  /** Set `true` to keep the grid as it is. */
  cancel: boolean;
}

/** A change the assistant applied. */
export interface OgeGridAssistantAppliedEvent {
  readonly prompt: string;
  readonly summary: string;
  readonly snapshot: GridStateSnapshot;
  readonly previousSnapshot: GridStateSnapshot;
  readonly slices: readonly OgeGridAiSlice[];
}

/** A change Undo reverted. */
export interface OgeGridAssistantUndoneEvent {
  readonly summary: string;
  readonly snapshot: GridStateSnapshot;
}

/** A request that failed (transport error or an unusable reply). */
export interface OgeGridAssistantErrorEvent {
  readonly prompt: string;
  /** `'no-transport'` and `'invalid-reply'` are the assistant's own codes. */
  readonly code: OgeAiErrorCode | 'no-transport' | 'invalid-reply';
  readonly error: unknown;
}

/** Inputs of {@link OgeGridAssistantCore}, read lazily on every use. */
export interface OgeGridAssistantCoreOptions {
  readonly adapter: OgeReactivityAdapter;
  readonly target: () => OgeGridAssistantTarget | null | undefined;
  readonly transport: () => OgeAiTransport | null | undefined;
  readonly mode: () => OgeGridAssistantMode;
  readonly capabilities: () => OgeGridAiCapabilities;
  readonly instructions: () => string | undefined;
  /**
   * Overrides the column descriptions the target reports (adds
   * `description`s, hides a column from the model). Return `undefined` to
   * use the target's.
   */
  readonly columns?: () => readonly OgeAiGridColumn[] | undefined;
  readonly messages: () => OgeGridAssistantMessages;
  readonly locale: () => string | undefined;
  readonly historyLimit: () => number;
  readonly undoLimit: () => number;
  /** "Today" for relative dates; the clock by default. */
  readonly now?: () => Date;
  readonly applying?: (event: OgeGridAssistantApplyingEvent) => void;
  readonly applied?: (event: OgeGridAssistantAppliedEvent) => void;
  readonly undone?: (event: OgeGridAssistantUndoneEvent) => void;
  readonly errorOccurred?: (event: OgeGridAssistantErrorEvent) => void;
}

interface UndoEntry {
  readonly summary: string;
  readonly previous: GridStateSnapshot;
}

/**
 * The grid assistant's machine, shared by both render layers: it turns a
 * prompt into a validated state change, holds the proposal, applies it, and
 * keeps an undo stack and a short conversation for follow-ups.
 *
 * It never reads row data and never writes to the grid without validation
 * (`resolveOgeGridAiReply`). Requests are abortable; a newer prompt aborts the
 * older one, and a late reply of an aborted request is ignored.
 */
export class OgeGridAssistantCore {
  /** The prompt field's text. */
  readonly prompt: OgeReactiveCell<string>;
  readonly status: OgeReactiveCell<OgeGridAssistantStatus>;
  /** The pending proposal (`status === 'preview'`), else `null`. */
  readonly proposal: OgeReactiveCell<OgeGridAssistantProposal | null>;
  /** Summary or question text of the latest reply. */
  readonly summary: OgeReactiveCell<string>;
  /** Parts of the latest reply that were dropped. */
  readonly warnings: OgeReactiveCell<readonly OgeGridAiWarning[]>;
  /** Why the latest request failed (`status === 'error' | 'invalid'`). */
  readonly errorCode: OgeReactiveCell<
    OgeGridAssistantErrorEvent['code'] | null
  >;
  /** Whether a request is in flight. */
  readonly busy: () => boolean;
  /** Whether Undo has something to revert. */
  readonly canUndo: () => boolean;
  /** Whether the prompt holds text to send. */
  readonly canSubmit: () => boolean;
  /** One line describing the state, for the status region and screen readers. */
  readonly statusText: () => string;
  /** The ignored-parts note under a proposal; `''` when nothing was dropped. */
  readonly warningText: () => string;

  private readonly undoStack: OgeReactiveCell<readonly UndoEntry[]>;
  private turns: OgeGridAiTurn[] = [];
  private controller: AbortController | null = null;
  private requestId = 0;
  private destroyed = false;

  constructor(private readonly options: OgeGridAssistantCoreOptions) {
    const rx = options.adapter;
    this.prompt = rx.cell('');
    this.status = rx.cell<OgeGridAssistantStatus>('idle');
    this.proposal = rx.cell<OgeGridAssistantProposal | null>(null);
    this.summary = rx.cell('');
    this.warnings = rx.cell<readonly OgeGridAiWarning[]>([]);
    this.errorCode = rx.cell<OgeGridAssistantErrorEvent['code'] | null>(null);
    this.undoStack = rx.cell<readonly UndoEntry[]>([]);
    this.busy = rx.derived(() => this.status() === 'thinking');
    this.canUndo = rx.derived(() => this.undoStack().length > 0);
    this.canSubmit = rx.derived(() => this.prompt().trim().length > 0);
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

  /** Replaces the prompt text. */
  setPrompt(text: string): void {
    this.prompt.set(text);
  }

  /**
   * Sends the prompt (or `text`, which also becomes the prompt). Resolves when
   * the reply is handled; never rejects — failures land in `status`.
   */
  async submit(text?: string): Promise<void> {
    if (text !== undefined) this.prompt.set(text);
    const prompt = this.prompt().trim();
    if (!prompt || this.destroyed) return;
    this.abortInFlight();
    const target = this.options.target();
    const transport = this.options.transport();
    if (!target || !transport) {
      this.fail(prompt, 'no-transport', null);
      return;
    }
    const id = ++this.requestId;
    const controller = new AbortController();
    this.controller = controller;
    this.proposal.set(null);
    this.warnings.set([]);
    this.summary.set('');
    this.errorCode.set(null);
    this.status.set('thinking');

    const columns = this.options.columns?.() ?? target.describeColumns();
    const capabilities = this.options.capabilities();
    let replyText: string;
    try {
      const response = await transport.complete(
        buildOgeGridAiRequest(prompt, {
          columns,
          state: target.state(),
          capabilities,
          history: this.turns.slice(-this.options.historyLimit()),
          instructions: this.options.instructions(),
          locale: this.options.locale(),
          now: this.options.now?.(),
        }),
        { signal: controller.signal },
      );
      replyText = response.text;
    } catch (error) {
      if (id !== this.requestId) return; // superseded or cancelled
      this.controller = null;
      const code = error instanceof OgeAiError ? error.code : 'network';
      if (code === 'aborted') {
        this.status.set('aborted');
        return;
      }
      this.fail(prompt, code, error);
      return;
    }
    if (id !== this.requestId || this.destroyed) return;
    this.controller = null;

    const result = resolveOgeGridAiReply(
      extractOgeAiJson(replyText),
      columns,
      target.state(),
      capabilities,
    );
    if (result.kind === 'invalid') {
      this.warnings.set(result.warnings);
      this.fail(prompt, 'invalid-reply', null);
      return;
    }
    this.summary.set(result.summary);
    if (result.kind === 'clarify' || result.kind === 'unsupported') {
      this.status.set(result.kind);
      return;
    }
    this.warnings.set(result.warnings);
    if (result.slices.length === 0) {
      this.status.set('unchanged');
      return;
    }
    const proposal: OgeGridAssistantProposal = {
      prompt,
      summary: result.summary,
      snapshot: result.snapshot,
      slices: result.slices,
      warnings: result.warnings,
    };
    if (this.options.mode() === 'apply') {
      this.commit(target, proposal);
    } else {
      this.proposal.set(proposal);
      this.status.set('preview');
    }
  }

  /** Applies the pending proposal. */
  apply(): void {
    const proposal = this.proposal();
    const target = this.options.target();
    if (!proposal || !target) return;
    this.commit(target, proposal);
  }

  /** Drops the pending proposal; the grid stays as it is. */
  discard(): void {
    if (!this.proposal()) return;
    this.proposal.set(null);
    this.warnings.set([]);
    this.status.set('idle');
    this.summary.set(this.options.messages().discarded);
  }

  /** Reverts the most recent applied change. */
  undo(): void {
    const stack = this.undoStack();
    const entry = stack[stack.length - 1];
    const target = this.options.target();
    if (!entry || !target) return;
    this.undoStack.set(stack.slice(0, -1));
    this.turns = this.turns.slice(0, -1);
    target.applyState(entry.previous);
    this.proposal.set(null);
    this.warnings.set([]);
    this.summary.set(this.options.messages().undone);
    this.status.set('idle');
    this.options.undone?.({ summary: entry.summary, snapshot: entry.previous });
  }

  /** Aborts the request in flight. */
  cancel(): void {
    if (!this.controller) return;
    this.abortInFlight();
    this.status.set('aborted');
  }

  /** Clears the prompt, the proposal, the conversation and the undo stack. */
  reset(): void {
    this.abortInFlight();
    this.prompt.set('');
    this.proposal.set(null);
    this.warnings.set([]);
    this.summary.set('');
    this.undoStack.set([]);
    this.errorCode.set(null);
    this.turns = [];
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

  private commit(
    target: OgeGridAssistantTarget,
    proposal: OgeGridAssistantProposal,
  ): void {
    const applying: OgeGridAssistantApplyingEvent = {
      prompt: proposal.prompt,
      summary: proposal.summary,
      snapshot: proposal.snapshot,
      slices: proposal.slices,
      cancel: false,
    };
    this.options.applying?.(applying);
    if (applying.cancel) {
      this.proposal.set(null);
      this.status.set('idle');
      return;
    }
    const previous = target.state();
    target.applyState(proposal.snapshot);
    const stack = [
      ...this.undoStack(),
      { summary: proposal.summary, previous },
    ];
    this.undoStack.set(stack.slice(-Math.max(1, this.options.undoLimit())));
    this.turns = [
      ...this.turns,
      { prompt: proposal.prompt, summary: proposal.summary },
    ].slice(-Math.max(0, this.options.historyLimit()));
    this.proposal.set(null);
    this.status.set('applied');
    this.prompt.set('');
    this.options.applied?.({
      prompt: proposal.prompt,
      summary: proposal.summary,
      snapshot: proposal.snapshot,
      previousSnapshot: previous,
      slices: proposal.slices,
    });
  }

  private fail(
    prompt: string,
    code: OgeGridAssistantErrorEvent['code'],
    error: unknown,
  ): void {
    this.controller = null;
    this.proposal.set(null);
    this.status.set(code === 'invalid-reply' ? 'invalid' : 'error');
    this.summary.set('');
    this.errorCode.set(code);
    this.options.errorOccurred?.({ prompt, code, error });
  }

  private abortInFlight(): void {
    this.requestId++;
    const controller = this.controller;
    this.controller = null;
    controller?.abort();
  }

  private describe(): string {
    const m = this.options.messages();
    const summary = this.summary();
    const fill = (template: string) =>
      formatOgeAiMessage(template, { summary }, this.options.locale()).trim();
    switch (this.status()) {
      case 'thinking':
        return m.thinking;
      case 'preview':
        return fill(m.proposed);
      case 'applied':
        return fill(m.applied);
      case 'unchanged':
        return m.unchanged;
      case 'clarify':
        return fill(m.clarify);
      case 'unsupported':
        return fill(m.unsupported);
      case 'invalid':
        return m.invalid;
      case 'error':
        return this.errorCode() === 'no-transport' ? m.noTransport : m.error;
      case 'aborted':
        return m.aborted;
      default:
        return summary;
    }
  }
}
