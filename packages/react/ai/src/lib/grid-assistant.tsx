'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import {
  mergeOgeGridAssistantMessages,
  OgeGridAssistantCore,
  OGE_GRID_ASSISTANT_ICON_PATH,
  type OgeAiGridColumn,
  type OgeAiTransport,
  type OgeGridAiCapabilities,
  type OgeGridAssistantAppliedEvent,
  type OgeGridAssistantApplyingEvent,
  type OgeGridAssistantErrorEvent,
  type OgeGridAssistantMessagesInput,
  type OgeGridAssistantMode,
  type OgeGridAssistantTarget,
  type OgeGridAssistantUndoneEvent,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import { useOgeAiConfig } from './ai-config';

/** Props of {@link OgeGridAssistant}. */
export interface OgeGridAssistantProps {
  /**
   * The grid to drive: the `<OgeGrid>` ref (or its handle), or any object
   * with `state()`, `applyState()` and `describeColumns()`.
   */
  target?:
    OgeGridAssistantTarget | RefObject<OgeGridAssistantTarget | null> | null;
  /** Replaces the configured transport for this assistant. */
  transport?: OgeAiTransport | null;
  /** `'preview'` asks before applying, `'apply'` applies at once; falls back to the config. */
  mode?: OgeGridAssistantMode;
  /** One-click prompts shown until the first change; falls back to the config. */
  suggestions?: readonly string[];
  /** Turns parts of the grid state off for the assistant; merged over the config. */
  capabilities?: Partial<OgeGridAiCapabilities>;
  /** Domain vocabulary appended to the system prompt; falls back to the config. */
  instructions?: string;
  /**
   * Column descriptions to send instead of the grid's own — add
   * `description`s, or leave a column out to keep it from the model.
   */
  columns?: readonly OgeAiGridColumn[];
  /** BCP 47 locale of plurals and summaries; falls back to the config, then the runtime. */
  locale?: string;
  /** Per-instance message overrides, merged over the config catalog. */
  messages?: OgeGridAssistantMessagesInput;
  /** Disables the field and every action. */
  disabled?: boolean;
  /** A change is about to reach the grid — set `cancel` to keep the grid as it is. */
  onApplying?: (event: OgeGridAssistantApplyingEvent) => void;
  /** A change was applied to the grid. */
  onApplied?: (event: OgeGridAssistantAppliedEvent) => void;
  /** Undo reverted the latest applied change. */
  onUndone?: (event: OgeGridAssistantUndoneEvent) => void;
  /** A request failed: no transport, a transport error or an unusable reply. */
  onErrorOccurred?: (event: OgeGridAssistantErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeGridAssistant>`. */
export interface OgeGridAssistantHandle {
  /** Sends the prompt — or `text`, which also becomes the prompt. */
  submit(text?: string): Promise<void>;
  /** Applies the pending proposal. */
  apply(): void;
  /** Drops the pending proposal. */
  discard(): void;
  /** Reverts the latest applied change. */
  undo(): void;
  /** Stops the request in flight. */
  cancel(): void;
  /** Clears the prompt, proposal, conversation and undo history. */
  reset(): void;
  /** Moves focus to the prompt field. */
  focus(): void;
}

/**
 * React's face of the reactivity contract: every cell write re-renders; derived
 * values are recomputed on read (they are cheap, and some read props).
 */
function createAdapter(bump: () => void): OgeReactivityAdapter {
  return {
    cell<T>(initial: T): OgeReactiveCell<T> {
      let value = initial;
      const cell = (() => value) as OgeReactiveCell<T>;
      cell.set = (next) => {
        if (Object.is(next, value)) return;
        value = next;
        bump();
      };
      return cell;
    },
    derived: (compute) => compute,
  };
}

function resolveTarget(
  target: OgeGridAssistantProps['target'],
): OgeGridAssistantTarget | null {
  if (!target) return null;
  return 'current' in target && !('state' in target)
    ? target.current
    : (target as OgeGridAssistantTarget);
}

/**
 * A natural-language bar for a data grid — the React render of the Angular
 * `<oge-grid-assistant>`: same markup, same stylesheet, the same
 * `OgeGridAssistantCore` machine.
 *
 * ```tsx
 * const grid = useRef<OgeGridHandle<Order>>(null);
 * <OgeGridAssistant target={grid} suggestions={['Top 10 by revenue']} />
 * <OgeGrid ref={grid} data={orders} columns={columns} />
 * ```
 */
export const OgeGridAssistant = forwardRef<
  OgeGridAssistantHandle,
  OgeGridAssistantProps
>(function OgeGridAssistant(props, ref) {
  const config = useOgeAiConfig();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const fieldRef = useRef<HTMLInputElement>(null);
  const id = `oge-grid-assistant-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const inputId = `${id}-input`;
  const statusId = `${id}-status`;
  const proposalId = `${id}-proposal`;

  const msg = mergeOgeGridAssistantMessages(
    config.messages.gridAssistant,
    props.messages,
  );
  const latest = useRef({ props, config, msg });
  latest.current = { props, config, msg };

  const coreRef = useRef<OgeGridAssistantCore | null>(null);
  if (coreRef.current === null) {
    let live = false;
    coreRef.current = new OgeGridAssistantCore({
      adapter: createAdapter(() => {
        if (live) bump();
      }),
      target: () => resolveTarget(latest.current.props.target),
      transport: () =>
        latest.current.props.transport ?? latest.current.config.transport,
      mode: () =>
        latest.current.props.mode ?? latest.current.config.gridAssistant.mode,
      capabilities: () => ({
        ...latest.current.config.gridAssistant.capabilities,
        ...latest.current.props.capabilities,
      }),
      instructions: () =>
        latest.current.props.instructions ??
        latest.current.config.gridAssistant.instructions,
      columns: () => latest.current.props.columns,
      messages: () => latest.current.msg,
      locale: () => latest.current.props.locale ?? latest.current.config.locale,
      historyLimit: () => latest.current.config.gridAssistant.historyLimit,
      undoLimit: () => latest.current.config.gridAssistant.undoLimit,
      applying: (event) => latest.current.props.onApplying?.(event),
      applied: (event) => latest.current.props.onApplied?.(event),
      undone: (event) => latest.current.props.onUndone?.(event),
      errorOccurred: (event) => latest.current.props.onErrorOccurred?.(event),
    });
    live = true;
  }
  const core = coreRef.current;

  // StrictMode-safe lifetime: cleanup destroys, the mount side revives.
  useEffect(() => {
    core.revive();
    return () => core.destroy();
  }, [core]);

  const focus = () => fieldRef.current?.focus();
  const handle: OgeGridAssistantHandle = {
    submit: (text) => core.submit(text),
    apply: () => {
      core.apply();
      focus();
    },
    discard: () => {
      core.discard();
      focus();
    },
    undo: () => {
      core.undo();
      focus();
    },
    cancel: () => {
      core.cancel();
      focus();
    },
    reset: () => core.reset(),
    focus,
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useImperativeHandle(
    ref,
    () => ({
      submit: (text) => handleRef.current.submit(text),
      apply: () => handleRef.current.apply(),
      discard: () => handleRef.current.discard(),
      undo: () => handleRef.current.undo(),
      cancel: () => handleRef.current.cancel(),
      reset: () => handleRef.current.reset(),
      focus: () => handleRef.current.focus(),
    }),
    [],
  );

  const disabled = props.disabled ?? false;
  const busy = core.busy();
  const proposal = core.proposal();
  const suggestions = props.suggestions ?? config.gridAssistant.suggestions;
  const showSuggestions =
    suggestions.length > 0 && !core.canUndo() && !proposal && !busy;
  const status = core.status();
  const statusText = core.statusText();
  const isError = status === 'error' || status === 'invalid';
  const statusHidden = status === 'preview' || !statusText;
  const warningText = core.warningText();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled) return;
    void core.submit();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (core.busy()) core.cancel();
    else if (core.proposal()) core.discard();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const className = [
    'oge-grid-assistant',
    busy && 'oge-grid-assistant-busy',
    disabled && 'oge-grid-assistant-disabled',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={props.style}
      role="region"
      aria-label={msg.label}
      aria-busy={busy || undefined}
    >
      <form
        className="oge-grid-assistant-bar"
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
      >
        <span className="oge-grid-assistant-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
            <path d={OGE_GRID_ASSISTANT_ICON_PATH} />
          </svg>
        </span>
        <input
          ref={fieldRef}
          className="oge-grid-assistant-input"
          type="text"
          enterKeyHint="send"
          autoComplete="off"
          id={inputId}
          value={core.prompt()}
          placeholder={msg.placeholder}
          disabled={disabled}
          aria-label={msg.label}
          aria-describedby={statusId}
          onChange={(event) => core.setPrompt(event.currentTarget.value)}
        />
        {busy ? (
          <button
            type="button"
            className="oge-grid-assistant-button oge-grid-assistant-stop"
            onClick={() => handle.cancel()}
          >
            {msg.stop}
          </button>
        ) : (
          <button
            type="submit"
            className="oge-grid-assistant-button oge-grid-assistant-submit"
            disabled={disabled || !core.canSubmit()}
          >
            {msg.submit}
          </button>
        )}
        {core.canUndo() && (
          <button
            type="button"
            className="oge-grid-assistant-button oge-grid-assistant-undo"
            disabled={disabled || busy}
            onClick={() => handle.undo()}
          >
            {msg.undo}
          </button>
        )}
      </form>
      {showSuggestions && (
        <ul
          className="oge-grid-assistant-suggestions"
          aria-label={msg.suggestions}
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className="oge-grid-assistant-chip"
                disabled={disabled}
                onClick={() => void core.submit(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
      {proposal && (
        <div
          className="oge-grid-assistant-proposal"
          role="group"
          aria-labelledby={proposalId}
        >
          <div className="oge-grid-assistant-proposal-head">
            <span className="oge-grid-assistant-proposal-title" id={proposalId}>
              {msg.proposal}
            </span>
            <ul className="oge-grid-assistant-slices">
              {proposal.slices.map((slice) => (
                <li key={slice} className="oge-grid-assistant-slice">
                  {msg.slices[slice]}
                </li>
              ))}
            </ul>
          </div>
          {proposal.summary && (
            <p className="oge-grid-assistant-summary">{proposal.summary}</p>
          )}
          {warningText && (
            <p className="oge-grid-assistant-warning">{warningText}</p>
          )}
          <div className="oge-grid-assistant-actions">
            <button
              type="button"
              className="oge-grid-assistant-button oge-grid-assistant-apply"
              disabled={disabled}
              onClick={() => handle.apply()}
            >
              {msg.apply}
            </button>
            <button
              type="button"
              className="oge-grid-assistant-button oge-grid-assistant-discard"
              disabled={disabled}
              onClick={() => handle.discard()}
            >
              {msg.discard}
            </button>
          </div>
        </div>
      )}
      <p
        className={[
          'oge-grid-assistant-status',
          isError && 'oge-grid-assistant-status-error',
          statusHidden && 'oge-grid-assistant-status-hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        role="status"
        id={statusId}
      >
        {statusText}
      </p>
    </div>
  );
});
