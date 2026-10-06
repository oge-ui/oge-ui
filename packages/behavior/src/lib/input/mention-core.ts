import type { OgeReactiveCell, OgeReactivityAdapter } from '../reactivity';
import {
  resolveDisplay,
  resolveValue,
  type OgeSelectDisplayExpr,
  type OgeSelectSearchExpr,
  type OgeSelectSearchMode,
  type OgeSelectValueExpr,
} from './select-expr';
import { OgeSelectListCore } from './select-list-core';

/**
 * The mention editor's framework-free half (ADR 0001): trigger detection at
 * the caret, the suggestion list (filtering and the active option run on the
 * shared `OgeSelectListCore`), remote suggestion loading, insertion of the
 * picked item as a plain-text token and the bookkeeping that keeps the
 * inserted tokens in step with later edits. Both render layers run it; they
 * own only the field, the popup DOM and the caret measurement call.
 */

/** Suggestions of one trigger: a static list or a query function. */
export type OgeMentionItemsSource<T> =
  readonly T[] | ((query: string) => readonly T[] | PromiseLike<readonly T[]>);

/** One trigger character and the items it suggests. */
export interface OgeMentionTrigger<T = unknown> {
  /** The trigger character — `'@'`, `'#'`, `':'`… (one character). */
  readonly char: string;
  /**
   * The suggestions: a list filtered locally by the typed query, or a
   * function called with the query (debounced) that returns — or resolves
   * to — the already-filtered items.
   */
  readonly items: OgeMentionItemsSource<T>;
  /** Item → display text (and the inserted token text). Default: the item stringified. */
  readonly displayExpr?: OgeSelectDisplayExpr<T>;
  /** Item → the value reported in `mentions`. Default: the item itself. */
  readonly valueExpr?: OgeSelectValueExpr<T>;
  /** Which text the local filter matches. Default: the display text. */
  readonly searchExpr?: OgeSelectSearchExpr<T>;
}

/** An inserted mention — where it sits in the text and what it refers to. */
export interface OgeMentionToken<T = unknown> {
  /** The trigger character that produced it. */
  readonly trigger: string;
  /** The picked item. */
  readonly item: T;
  /** `valueExpr` applied to the item. */
  readonly value: unknown;
  /** The display text inserted after the trigger character. */
  readonly text: string;
  /** Index of the trigger character in the text. */
  readonly start: number;
  /** Index after the token's last character (exclusive). */
  readonly end: number;
}

/** The query being typed after a trigger character. */
export interface OgeMentionQuery {
  /** The trigger character. */
  readonly trigger: string;
  /** Index of the trigger character. */
  readonly start: number;
  /** The text typed after it, up to the caret. */
  readonly text: string;
}

/** Payload of `mentionSelected` — a suggestion was inserted. */
export interface OgeMentionSelectedEvent<T = unknown> {
  readonly token: OgeMentionToken<T>;
  readonly item: T;
  readonly event: Event | undefined;
}

/** Payload of `searchChanged` — the query after a trigger changed. */
export interface OgeMentionSearchChangedEvent {
  readonly trigger: string;
  readonly text: string;
}

/** Context of a custom suggestion row (`[ogeMentionItemTemplate]` / `renderItem`). */
export interface OgeMentionItemContext<T = unknown> {
  readonly item: T;
  readonly index: number;
  /** The trigger character the list belongs to. */
  readonly trigger: string;
  /** The typed query. */
  readonly query: string;
  /** The row is the keyboard-active option. */
  readonly active: boolean;
}

/** Options of {@link ogeFindMentionQuery}. */
export interface OgeMentionQueryOptions {
  /** Let a query contain spaces (never line breaks). Default `false`. */
  readonly allowSpaces?: boolean;
  /** Longest query still treated as one. Default 50. */
  readonly maxLength?: number;
}

const isBoundary = (char: string | undefined): boolean =>
  char === undefined || /\s/.test(char);

/**
 * The trigger query ending at `caret`, or `null`. A trigger counts only at
 * the start of the text or after whitespace (so `name@example.com` never
 * opens suggestions), and the query may not contain whitespace unless
 * `allowSpaces` — line breaks always end it.
 */
export function ogeFindMentionQuery(
  text: string,
  caret: number,
  triggers: readonly string[],
  options: OgeMentionQueryOptions = {},
): OgeMentionQuery | null {
  if (triggers.length === 0 || caret < 1 || caret > text.length) return null;
  const maxLength = options.maxLength ?? 50;
  for (let i = caret - 1; i >= 0 && caret - i - 1 <= maxLength; i--) {
    const char = text[i];
    if (char === '\n' || char === '\r') return null;
    if (triggers.includes(char) && isBoundary(text[i - 1])) {
      return { trigger: char, start: i, text: text.slice(i + 1, caret) };
    }
    if (/\s/.test(char) && !options.allowSpaces) return null;
  }
  return null;
}

/** Result of {@link ogeInsertMention}. */
export interface OgeMentionInsertion {
  /** The new full text. */
  readonly text: string;
  /** Where the caret goes (after the token and its space). */
  readonly caret: number;
  /** The inserted token's `[start, end)` range. */
  readonly start: number;
  readonly end: number;
}

/**
 * Replaces the query (trigger through `caret`) with `trigger + display`,
 * followed by a space unless `insertSpace` is off or one already follows.
 */
export function ogeInsertMention(
  text: string,
  query: OgeMentionQuery,
  caret: number,
  display: string,
  insertSpace = true,
): OgeMentionInsertion {
  const token = `${query.trigger}${display}`;
  const before = text.slice(0, query.start);
  const after = text.slice(caret);
  const space = insertSpace && !/^\s/.test(after) ? ' ' : '';
  const next = `${before}${token}${space}${after}`;
  const end = query.start + token.length;
  const caretAfter = end + (insertSpace ? 1 : 0);
  return { text: next, caret: caretAfter, start: query.start, end };
}

/**
 * Keeps the tokens in step with an edit from `previous` to `next`: the edit
 * is the span between the common prefix and suffix; tokens wholly before it
 * stay, tokens wholly after it shift by the length change, and a token the
 * edit touched is dropped (its text no longer is the inserted mention).
 * Works for keystrokes, pastes and whole-value replacements alike.
 */
export function ogeShiftMentions<T>(
  tokens: readonly OgeMentionToken<T>[],
  previous: string,
  next: string,
): OgeMentionToken<T>[] {
  if (previous === next) return [...tokens];
  let prefix = 0;
  const max = Math.min(previous.length, next.length);
  while (prefix < max && previous[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < max - prefix &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix++;
  }
  const changeStart = prefix;
  const changeEnd = previous.length - suffix;
  const delta = next.length - previous.length;
  const kept: OgeMentionToken<T>[] = [];
  for (const token of tokens) {
    if (token.end <= changeStart) kept.push(token);
    else if (token.start >= changeEnd) {
      kept.push({
        ...token,
        start: token.start + delta,
        end: token.end + delta,
      });
    }
    // a token the edit touched is no longer the inserted mention
  }
  // every survivor must still read exactly as inserted, delimited on both
  // sides (typing straight after "@Ada" makes it "@Adax" — not a mention)
  return kept.filter(
    (token) =>
      next.slice(token.start, token.end) === `${token.trigger}${token.text}` &&
      !WORD_CHAR.test(next[token.start - 1] ?? '') &&
      !WORD_CHAR.test(next[token.end] ?? ''),
  );
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/** Reactive getters the owning component wires into the machine. */
export interface OgeMentionCoreDeps<T> {
  /** The field's id — listbox/option ids derive from it. */
  inputId: () => string;
  triggers: () => readonly OgeMentionTrigger<T>[];
  /** Characters required after the trigger before suggestions show. */
  minSearchLength: () => number;
  /** Caps the suggestion list. */
  maxSuggestions: () => number;
  allowSpaces: () => boolean;
  insertSpace: () => boolean;
  searchMode: () => OgeSelectSearchMode;
  /** Debounce (ms) before a query function is called. */
  searchDebounceMs: () => number;
  /** Notified whenever the query text changes. */
  onSearchChanged?: (event: OgeMentionSearchChangedEvent) => void;
  /** Overrides how the active option is scrolled into view. */
  scrollActiveIntoView?: (index: number) => void;
}

type RemoteState<T> =
  | { status: 'idle' }
  | { status: 'loading'; runId: number }
  | { status: 'ready'; items: readonly T[] }
  | { status: 'error' };

/** What a key press means while suggestions are open. */
export type OgeMentionKeyCommand =
  'next' | 'previous' | 'first' | 'last' | 'select';

/**
 * Maps a key to a list command while suggestions show; `null` = let the
 * field handle it. Escape is the anchored panel's (the shared overlay
 * Escape stack), not this map's.
 */
export function ogeMentionKeyCommand(key: string): OgeMentionKeyCommand | null {
  switch (key) {
    case 'ArrowDown':
      return 'next';
    case 'ArrowUp':
      return 'previous';
    case 'PageDown':
      return 'last';
    case 'PageUp':
      return 'first';
    case 'Enter':
    case 'Tab':
      return 'select';
    default:
      return null;
  }
}

/**
 * The mention machine. Call {@link update} with the field's text and caret
 * after every input / caret move, {@link noteTextChange} with the old and
 * new text after every value change, and {@link select} to insert a
 * suggestion — it returns the new text and caret for the layer to apply.
 */
export class OgeMentionCore<T> {
  /** The active query; `null` = suggestions closed. */
  readonly query: OgeReactiveCell<OgeMentionQuery | null>;
  /** The inserted mentions, in text order. */
  readonly tokens: OgeReactiveCell<readonly OgeMentionToken<T>[]>;
  /** The list machine over the active trigger's items. */
  readonly list: OgeSelectListCore<T>;
  /** Suggestions are visible. */
  readonly opened: () => boolean;
  /** The active trigger's definition. */
  readonly activeTrigger: () => OgeMentionTrigger<T> | null;
  /** A query function is pending. */
  readonly loading: () => boolean;
  /** The last query function call rejected. */
  readonly failed: () => boolean;

  private readonly remote: OgeReactiveCell<RemoteState<T>>;
  private remoteSeq = 0;
  private remoteTimer: ReturnType<typeof setTimeout> | null = null;
  /** Start index of a query the user dismissed with Escape. */
  private dismissedStart: number | null = null;

  constructor(
    private readonly deps: OgeMentionCoreDeps<T>,
    rx: OgeReactivityAdapter,
  ) {
    this.query = rx.cell<OgeMentionQuery | null>(null);
    this.tokens = rx.cell<readonly OgeMentionToken<T>[]>([]);
    this.remote = rx.cell<RemoteState<T>>({ status: 'idle' });
    this.activeTrigger = rx.derived(() => {
      const query = this.query();
      if (!query) return null;
      return this.deps.triggers().find((t) => t.char === query.trigger) ?? null;
    });
    const isRemote = (): boolean =>
      typeof this.activeTrigger()?.items === 'function';
    this.opened = rx.derived(() => {
      const query = this.query();
      if (query === null || query.text.length < this.deps.minSearchLength()) {
        return false;
      }
      // a spaced query that matches nothing is just text being typed on —
      // a "no data" row there would follow every word after the trigger
      return !(
        /s/.test(query.text) &&
        this.remote().status !== 'loading' &&
        this.list.visibleItems().length === 0
      );
    });
    this.loading = rx.derived(() => this.remote().status === 'loading');
    this.failed = rx.derived(() => this.remote().status === 'error');
    this.list = new OgeSelectListCore<T>(
      {
        inputId: () => this.deps.inputId(),
        opened: () => this.opened(),
        items: () => {
          const trigger = this.activeTrigger();
          if (!trigger) return [];
          if (typeof trigger.items !== 'function') return trigger.items;
          const state = this.remote();
          return state.status === 'ready' ? state.items : [];
        },
        serverFiltering: isRemote,
        displayExpr: () => this.activeTrigger()?.displayExpr,
        valueExpr: () => this.activeTrigger()?.valueExpr,
        disabledExpr: () => undefined,
        imageExpr: () => undefined,
        searchExpr: () => this.activeTrigger()?.searchExpr,
        searchEnabled: () => true,
        searchMode: () => this.deps.searchMode(),
        searchDebounceMs: () => 0,
        maxItems: () => this.deps.maxSuggestions(),
        scrollActiveIntoView: deps.scrollActiveIntoView,
      },
      rx,
    );
  }

  /** The suggestions currently listed. */
  visibleItems(): readonly T[] {
    return this.list.visibleItems();
  }

  /** Display text of an item under the active trigger. */
  displayOf(item: T): string {
    return resolveDisplay(this.activeTrigger()?.displayExpr, item);
  }

  /**
   * Re-reads the query at the caret. Opens, retargets or closes the
   * suggestions; returns whether they are open.
   */
  update(text: string, caret: number): boolean {
    const triggers = this.deps.triggers().map((t) => t.char);
    const found = ogeFindMentionQuery(text, caret, triggers, {
      allowSpaces: this.deps.allowSpaces(),
    });
    // a finished mention is not a query: the caret right after "@Ada" (or,
    // with allowSpaces, after "@Ada Lovelace ") must not reopen the list
    const isToken =
      found !== null &&
      this.tokens().some(
        (token) => token.start === found.start && caret >= token.end,
      );
    if (found && (this.dismissedStart === found.start || isToken)) {
      this.setQuery(null);
      return false;
    }
    if (!found || found.start !== this.dismissedStart)
      this.dismissedStart = null;
    this.setQuery(found);
    return this.opened();
  }

  /** Closes the suggestions until a new trigger is typed (Escape). */
  dismiss(): void {
    const query = this.query();
    if (query) this.dismissedStart = query.start;
    this.setQuery(null);
  }

  /** Closes the suggestions (blur, outside click) without remembering it. */
  close(): void {
    this.setQuery(null);
  }

  /** Moves the active option; opens nothing. */
  move(command: Exclude<OgeMentionKeyCommand, 'select'>): void {
    switch (command) {
      case 'next':
        this.list.moveActive(1);
        break;
      case 'previous':
        this.list.moveActive(-1);
        break;
      case 'first':
        this.list.setActive(this.list.edgeEnabledIndex(1));
        break;
      case 'last':
        this.list.setActive(this.list.edgeEnabledIndex(-1));
        break;
    }
  }

  /** The keyboard-active suggestion, if any. */
  activeItem(): T | null {
    const index = this.list.activeIndex();
    const items = this.list.visibleItems();
    return index >= 0 && index < items.length ? items[index] : null;
  }

  /**
   * Inserts `item` for the active query. Returns the new text and caret and
   * the created token, or `null` when no query is active. The token joins
   * {@link tokens}; the suggestions close.
   */
  select(
    item: T,
    text: string,
    caret: number,
  ): { insertion: OgeMentionInsertion; token: OgeMentionToken<T> } | null {
    const query = this.query();
    const trigger = this.activeTrigger();
    if (!query || !trigger) return null;
    const display = resolveDisplay(trigger.displayExpr, item);
    const insertion = ogeInsertMention(
      text,
      query,
      Math.max(caret, query.start + 1 + query.text.length),
      display,
      this.deps.insertSpace(),
    );
    const shifted = ogeShiftMentions(this.tokens(), text, insertion.text);
    const token: OgeMentionToken<T> = {
      trigger: query.trigger,
      item,
      value: resolveValue(trigger.valueExpr, item),
      text: display,
      start: insertion.start,
      end: insertion.end,
    };
    const tokens = [...shifted, token].sort((a, b) => a.start - b.start);
    this.tokens.set(tokens);
    this.setQuery(null);
    return { insertion, token };
  }

  /**
   * Re-aligns the tokens after the text changed from `previous` to `next`;
   * returns `true` when the token list changed.
   */
  noteTextChange(previous: string, next: string): boolean {
    const current = this.tokens();
    const shifted = ogeShiftMentions(current, previous, next);
    const changed =
      shifted.length !== current.length ||
      shifted.some((token, i) => token.start !== current[i].start);
    if (changed) this.tokens.set(shifted);
    return changed;
  }

  /** Clears pending timers — call from the owner's destroy hook. */
  destroy(): void {
    if (this.remoteTimer !== null) clearTimeout(this.remoteTimer);
    this.remoteTimer = null;
    this.remoteSeq++;
    this.list.destroy();
  }

  private setQuery(next: OgeMentionQuery | null): void {
    const current = this.query();
    const same =
      current === next ||
      (current !== null &&
        next !== null &&
        current.start === next.start &&
        current.trigger === next.trigger &&
        current.text === next.text);
    if (same) return;
    const retargeted =
      next === null ||
      current === null ||
      current.start !== next.start ||
      current.trigger !== next.trigger;
    this.query.set(next);
    if (next === null) {
      this.list.resetSearch();
      this.list.activeIndex.set(-1);
      this.cancelRemote();
      return;
    }
    if (retargeted) this.remote.set({ status: 'idle' });
    this.list.setSearch(next.text);
    this.deps.onSearchChanged?.({ trigger: next.trigger, text: next.text });
    const trigger = this.activeTrigger();
    if (trigger && typeof trigger.items === 'function') {
      this.scheduleRemote(trigger.items, next.text);
    }
    // the first suggestion is active so Enter inserts without arrowing
    this.list.setActive(this.opened() ? this.list.edgeEnabledIndex(1) : -1);
  }

  private cancelRemote(): void {
    if (this.remoteTimer !== null) clearTimeout(this.remoteTimer);
    this.remoteTimer = null;
    this.remoteSeq++;
    if (this.remote().status !== 'idle') this.remote.set({ status: 'idle' });
  }

  private scheduleRemote(
    source: (query: string) => readonly T[] | PromiseLike<readonly T[]>,
    text: string,
  ): void {
    if (this.remoteTimer !== null) clearTimeout(this.remoteTimer);
    this.remoteTimer = null;
    const runId = ++this.remoteSeq;
    this.remote.set({ status: 'loading', runId });
    const run = (): void => {
      this.remoteTimer = null;
      let result: readonly T[] | PromiseLike<readonly T[]>;
      try {
        result = source(text);
      } catch {
        this.remote.set({ status: 'error' });
        return;
      }
      const settle = (items: readonly T[]): void => {
        if (this.remoteSeq !== runId) return;
        this.remote.set({ status: 'ready', items });
        this.list.setActive(this.opened() ? this.list.edgeEnabledIndex(1) : -1);
      };
      if (
        result &&
        typeof (result as PromiseLike<unknown>).then === 'function'
      ) {
        (result as PromiseLike<readonly T[]>).then(settle, () => {
          if (this.remoteSeq === runId) this.remote.set({ status: 'error' });
        });
      } else {
        settle(result as readonly T[]);
      }
    };
    const ms = this.deps.searchDebounceMs();
    if (ms > 0) this.remoteTimer = setTimeout(run, ms);
    else run();
  }
}
