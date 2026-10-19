'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useReducer,
  useRef,
  type CSSProperties,
  type RefObject,
} from 'react';
import {
  OgeSmartPasteCore,
  OGE_GRID_ASSISTANT_ICON_PATH,
  type OgeAiFormField,
  type OgeAiTransport,
  type OgeGridAssistantMode,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
  type OgeSmartPasteAppliedEvent,
  type OgeSmartPasteApplyingEvent,
  type OgeSmartPasteErrorEvent,
  type OgeSmartPasteMessages,
  type OgeSmartPasteTarget,
  type OgeSmartPasteUndoneEvent,
} from '@oge-ui/behavior';
import { useOgeAiConfig } from './ai-config';

/** Props of {@link OgeSmartPaste}. */
export interface OgeSmartPasteProps {
  /**
   * The form to fill: the `<OgeForm>` ref (or its handle), or any object with
   * `describeFields()` and `updateData(values)`.
   */
  target?: OgeSmartPasteTarget | RefObject<OgeSmartPasteTarget | null> | null;
  /** Replaces the configured transport for this smart paste. */
  transport?: OgeAiTransport | null;
  /** `'preview'` shows the values before writing them, `'apply'` writes at once; falls back to the config. */
  mode?: OgeGridAssistantMode;
  /** Domain vocabulary appended to the system prompt; falls back to the config. */
  instructions?: string;
  /**
   * Field descriptions merged over the form's own (by `field`) — add a
   * `description`, or set `readOnly: true` to keep a field out of reach.
   */
  fields?: readonly OgeAiFormField[];
  /** BCP 47 locale of value formatting and the text; falls back to the config, then the runtime. */
  locale?: string;
  /** Per-instance message overrides, merged over the catalog. */
  messages?: Partial<OgeSmartPasteMessages>;
  /** Disables every control. */
  disabled?: boolean;
  /** Values are about to reach the form — set `cancel` to keep it as it is. */
  onApplying?: (event: OgeSmartPasteApplyingEvent) => void;
  /** Values were written into the form. */
  onApplied?: (event: OgeSmartPasteAppliedEvent) => void;
  /** Undo restored the values the latest paste replaced. */
  onUndone?: (event: OgeSmartPasteUndoneEvent) => void;
  /** A paste failed: the clipboard, an empty text, the transport or the reply. */
  onErrorOccurred?: (event: OgeSmartPasteErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeSmartPaste>`. */
export interface OgeSmartPasteHandle {
  /** Fills the form from `text`, or from the clipboard when called without one. */
  paste(text?: string): Promise<void>;
  /** Fills the form from the text area. */
  fillFromText(): Promise<void>;
  /** Writes the pending values into the form. */
  apply(): void;
  /** Drops the pending values. */
  discard(): void;
  /** Restores the values the latest paste replaced. */
  undo(): void;
  /** Stops the read or request in flight. */
  cancel(): void;
  /** Clears the proposal, the text area and the undo history. */
  reset(): void;
  /** Moves focus to the Smart paste button. */
  focus(): void;
}

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
  target: OgeSmartPasteProps['target'],
): OgeSmartPasteTarget | null {
  if (!target) return null;
  return 'current' in target && !('describeFields' in target)
    ? target.current
    : (target as OgeSmartPasteTarget);
}

/**
 * Fills a form from text the user copied — the React render of the Angular
 * `<oge-smart-paste>`: same markup, same stylesheet, the same
 * `OgeSmartPasteCore` machine.
 *
 * ```tsx
 * const form = useRef<OgeFormHandle<Customer>>(null);
 * <OgeSmartPaste target={form} />
 * <OgeForm ref={form} formData={customer} onFormDataChange={setCustomer} layout={layout} />
 * ```
 */
export const OgeSmartPaste = forwardRef<
  OgeSmartPasteHandle,
  OgeSmartPasteProps
>(function OgeSmartPaste(props, ref) {
  const config = useOgeAiConfig();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const focusArea = useRef(false);
  const id = `oge-smart-paste-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const statusId = `${id}-status`;
  const textId = `${id}-text`;
  const areaId = `${id}-area`;
  const proposalId = `${id}-proposal`;

  const msg: OgeSmartPasteMessages = {
    ...config.messages.smartPaste,
    ...props.messages,
  };
  const latest = useRef({ props, config, msg });
  latest.current = { props, config, msg };

  const coreRef = useRef<OgeSmartPasteCore | null>(null);
  if (coreRef.current === null) {
    let live = false;
    coreRef.current = new OgeSmartPasteCore({
      adapter: createAdapter(() => {
        if (live) bump();
      }),
      target: () => resolveTarget(latest.current.props.target),
      transport: () =>
        latest.current.props.transport ?? latest.current.config.transport,
      mode: () =>
        latest.current.props.mode ?? latest.current.config.smartPaste.mode,
      instructions: () =>
        latest.current.props.instructions ??
        latest.current.config.smartPaste.instructions,
      fields: () => latest.current.props.fields,
      messages: () => latest.current.msg,
      locale: () => latest.current.props.locale ?? latest.current.config.locale,
      undoLimit: () => latest.current.config.smartPaste.undoLimit,
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

  const textOpen = core.textOpen();
  useEffect(() => {
    if (textOpen && focusArea.current) {
      focusArea.current = false;
      areaRef.current?.focus();
    }
  }, [textOpen]);

  const focus = () => triggerRef.current?.focus();
  const handle: OgeSmartPasteHandle = {
    paste: (text) => core.paste(text),
    fillFromText: () => core.fillFromText(),
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
      paste: (text) => handleRef.current.paste(text),
      fillFromText: () => handleRef.current.fillFromText(),
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
  const status = core.status();
  const statusText = core.statusText();
  const warningText = core.warningText();
  const text = core.text();

  const className = [
    'oge-smart-paste',
    busy && 'oge-smart-paste-busy',
    props.className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={className}
      style={props.style}
      role="group"
      aria-label={msg.label}
      aria-busy={busy || undefined}
    >
      <div className="oge-smart-paste-bar">
        <button
          ref={triggerRef}
          type="button"
          className="oge-smart-paste-button oge-smart-paste-trigger"
          disabled={disabled || busy}
          aria-describedby={statusId}
          onClick={() => void core.paste()}
        >
          <svg
            className="oge-smart-paste-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path d={OGE_GRID_ASSISTANT_ICON_PATH} />
          </svg>
          {msg.label}
        </button>
        {busy && (
          <button
            type="button"
            className="oge-smart-paste-button oge-smart-paste-stop"
            onClick={() => handle.cancel()}
          >
            {msg.stop}
          </button>
        )}
        <button
          type="button"
          className="oge-smart-paste-button oge-smart-paste-toggle"
          disabled={disabled}
          aria-expanded={textOpen}
          aria-controls={textId}
          onClick={() => {
            focusArea.current = !textOpen;
            core.setTextOpen(!textOpen);
          }}
        >
          {msg.pasteText}
        </button>
        {core.canUndo() && (
          <button
            type="button"
            className="oge-smart-paste-button oge-smart-paste-undo"
            disabled={disabled || busy}
            onClick={() => handle.undo()}
          >
            {msg.undo}
          </button>
        )}
      </div>
      {textOpen && (
        <div className="oge-smart-paste-text" id={textId}>
          <label className="oge-smart-paste-text-label" htmlFor={areaId}>
            {msg.textLabel}
          </label>
          <textarea
            ref={areaRef}
            className="oge-smart-paste-area"
            rows={4}
            id={areaId}
            value={text}
            placeholder={msg.textPlaceholder}
            disabled={disabled}
            onChange={(event) => core.setText(event.currentTarget.value)}
          />
          <div className="oge-smart-paste-actions">
            <button
              type="button"
              className="oge-smart-paste-button oge-smart-paste-fill"
              disabled={disabled || busy || !text.trim()}
              onClick={() => void core.fillFromText()}
            >
              {msg.fill}
            </button>
          </div>
        </div>
      )}
      {proposal && (
        <div
          className="oge-smart-paste-proposal"
          role="group"
          aria-labelledby={proposalId}
        >
          <span className="oge-smart-paste-proposal-title" id={proposalId}>
            {msg.proposal}
          </span>
          <table className="oge-smart-paste-table">
            <thead>
              <tr>
                <th scope="col">{msg.field}</th>
                <th scope="col">{msg.current}</th>
                <th scope="col">{msg.next}</th>
              </tr>
            </thead>
            <tbody>
              {proposal.changes.map((change) => (
                <tr key={change.field}>
                  <th scope="row">{change.label}</th>
                  <td className="oge-smart-paste-previous">
                    {core.formatValue(change.field, change.previous)}
                  </td>
                  <td className="oge-smart-paste-next">
                    {core.formatValue(change.field, change.next)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {warningText && (
            <p className="oge-smart-paste-warning">{warningText}</p>
          )}
          <div className="oge-smart-paste-actions">
            <button
              type="button"
              className="oge-smart-paste-button oge-smart-paste-apply"
              disabled={disabled}
              onClick={() => handle.apply()}
            >
              {msg.apply}
            </button>
            <button
              type="button"
              className="oge-smart-paste-button oge-smart-paste-discard"
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
          'oge-smart-paste-status',
          (status === 'error' || status === 'invalid') &&
            'oge-smart-paste-status-error',
          (status === 'preview' || !statusText) &&
            'oge-smart-paste-status-hidden',
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
