'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  OgeChatCore,
  type OgeAiTransport,
  type OgeChatErrorEvent,
  type OgeChatMessage,
  type OgeChatMessages,
  type OgeChatReplyEvent,
  type OgeChatSendingEvent,
  type OgeChatSentEvent,
  type OgeReactiveCell,
  type OgeReactivityAdapter,
} from '@oge-ui/behavior';
import { useOgeAiConfig } from './ai-config';

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const SEND_PATH = 'M4 12l16-8-6 16-2.5-6.5L4 12z';
const STOP_PATH = 'M7 7h10v10H7z';

/** Props of {@link OgeChat}. */
export interface OgeChatProps {
  /** The conversation (controlled). Messages are text; HTML is never rendered. */
  conversation?: readonly OgeChatMessage[];
  /** The initial conversation when uncontrolled. */
  defaultConversation?: readonly OgeChatMessage[];
  /** Every change of the conversation — the controlled half of `conversation`. */
  onConversationChange?: (conversation: readonly OgeChatMessage[]) => void;
  /** Where replies come from; falls back to the config. `null` is manual mode. */
  transport?: OgeAiTransport | null;
  /** System instructions sent before the conversation; falls back to the config. */
  instructions?: string;
  /** Prompts offered as chips before the first message; falls back to the config. */
  suggestions?: readonly string[];
  /** Per-instance message overrides, merged over the catalog. */
  messages?: Partial<OgeChatMessages>;
  /** Disables the composer and every action. */
  disabled?: boolean;
  /** A user message is about to be sent — set `cancel` to keep it out. */
  onSending?: (event: OgeChatSendingEvent) => void;
  /** A user message entered the conversation. */
  onSent?: (event: OgeChatSentEvent) => void;
  /** An assistant reply entered the conversation. */
  onReplied?: (event: OgeChatReplyEvent) => void;
  /** A reply request failed. */
  onErrorOccurred?: (event: OgeChatErrorEvent) => void;
  className?: string;
  style?: CSSProperties;
}

/** Imperative handle of `<OgeChat>`. */
export interface OgeChatHandle {
  /** Sends `text`, or the composer's text. */
  send(text?: string): Promise<void>;
  /** Appends a message — a reply in manual mode, or a greeting. */
  addMessage(
    message: Omit<OgeChatMessage, 'id'> & { id?: string },
  ): OgeChatMessage;
  /** Resends the last user turn after a failed reply. */
  retry(): Promise<void>;
  /** Stops the reply in flight. */
  stop(): void;
  /** Empties the conversation and the composer. */
  clear(): void;
  /** Moves focus to the composer. */
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

/**
 * A conversation surface — the React render of the Angular `<oge-chat>`:
 * same markup, same stylesheet, the same `OgeChatCore` machine.
 *
 * ```tsx
 * <OgeChat instructions="You are the support assistant of Acme." suggestions={['Where is my order?']} />
 * ```
 */
export const OgeChat = forwardRef<OgeChatHandle, OgeChatProps>(
  function OgeChat(props, ref) {
    const config = useOgeAiConfig();
    const [, bump] = useReducer((n: number) => n + 1, 0);
    const id = `oge-chat-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const logRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLTextAreaElement>(null);
    const msg: OgeChatMessages = { ...config.messages.chat, ...props.messages };
    const latest = useRef({ props, config, msg });
    latest.current = { props, config, msg };

    const coreRef = useRef<OgeChatCore | null>(null);
    if (coreRef.current === null) {
      let live = false;
      coreRef.current = new OgeChatCore({
        adapter: createAdapter(() => {
          if (live) bump();
        }),
        transport: () =>
          latest.current.props.transport === undefined
            ? latest.current.config.transport
            : latest.current.props.transport,
        instructions: () =>
          latest.current.props.instructions ??
          latest.current.config.chat.instructions,
        historyLimit: () => latest.current.config.chat.historyLimit,
        messages: () => latest.current.msg,
        idPrefix: id,
        sending: (event) => latest.current.props.onSending?.(event),
        sent: (event) => latest.current.props.onSent?.(event),
        replied: (event) => latest.current.props.onReplied?.(event),
        errorOccurred: (event) => latest.current.props.onErrorOccurred?.(event),
        changed: (list) => latest.current.props.onConversationChange?.(list),
      });
      coreRef.current.setMessages(
        props.conversation ?? props.defaultConversation ?? [],
      );
      live = true;
    }
    const core = coreRef.current;

    // StrictMode-safe lifetime: cleanup destroys, the mount side revives.
    useEffect(() => {
      core.revive();
      return () => core.destroy();
    }, [core]);

    // a controlled conversation flows in
    const controlled = props.conversation;
    if (controlled !== undefined && controlled !== core.list()) {
      core.setMessages(controlled);
    }

    const list = core.list();
    const thinking = core.thinking();
    useIsomorphicLayoutEffect(() => {
      const log = logRef.current;
      if (log) log.scrollTop = log.scrollHeight;
    }, [list, thinking]);

    const focus = () => fieldRef.current?.focus();
    const handleRef = useRef<OgeChatHandle>(null as never);
    handleRef.current = {
      send: (text) => core.send(text),
      addMessage: (message) => core.addMessage(message),
      retry: () => core.retry(),
      stop: () => {
        core.stop();
        focus();
      },
      clear: () => core.clear(),
      focus,
    };
    useImperativeHandle(
      ref,
      () => ({
        send: (text) => handleRef.current.send(text),
        addMessage: (message) => handleRef.current.addMessage(message),
        retry: () => handleRef.current.retry(),
        stop: () => handleRef.current.stop(),
        clear: () => handleRef.current.clear(),
        focus: () => handleRef.current.focus(),
      }),
      [],
    );

    const disabled = props.disabled ?? false;
    const suggestions = props.suggestions ?? config.chat.suggestions;
    const onSubmit = (event: FormEvent) => {
      event.preventDefault();
      if (!disabled) void core.send();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape' && core.thinking()) {
        event.preventDefault();
        core.stop();
        return;
      }
      if (
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing
      ) {
        event.preventDefault();
        if (!disabled) void core.send();
      }
    };

    return (
      <div
        className={[
          'oge-chat',
          disabled && 'oge-chat-disabled',
          props.className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={props.style}
        role="group"
        aria-label={msg.label}
      >
        <div
          ref={logRef}
          className="oge-chat-log"
          role="log"
          aria-live="polite"
          tabIndex={0}
          aria-label={msg.logLabel}
        >
          {list.length === 0 && (
            <>
              <p className="oge-chat-empty">{msg.empty}</p>
              {suggestions.length > 0 && (
                <ul
                  className="oge-chat-suggestions"
                  aria-label={msg.suggestions}
                >
                  {suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        className="oge-chat-chip"
                        disabled={disabled}
                        onClick={() => void core.send(suggestion)}
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {list.map((message, index) => (
            <div
              key={message.id}
              className={[
                'oge-chat-message',
                message.role === 'user'
                  ? 'oge-chat-message-user'
                  : 'oge-chat-message-assistant',
                message.status === 'error' && 'oge-chat-message-error',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="oge-chat-bubble">
                <span className="oge-sr-only">
                  {message.role === 'user' ? msg.you : msg.assistant}
                </span>{' '}
                {message.text}
              </div>
              {message.status === 'error' && index === list.length - 1 && (
                <button
                  type="button"
                  className="oge-chat-button oge-chat-retry"
                  disabled={disabled}
                  onClick={() => void core.retry()}
                >
                  {msg.retry}
                </button>
              )}
            </div>
          ))}
          {thinking && (
            <div className="oge-chat-message oge-chat-message-assistant oge-chat-typing">
              <div className="oge-chat-bubble">
                <span className="oge-sr-only">{msg.thinking}</span>
                <span className="oge-chat-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            </div>
          )}
        </div>
        <form className="oge-chat-composer" onSubmit={onSubmit}>
          <textarea
            ref={fieldRef}
            className="oge-chat-input"
            rows={1}
            id={`${id}-input`}
            value={core.draft()}
            placeholder={msg.placeholder}
            disabled={disabled}
            aria-label={msg.composerLabel}
            onChange={(event) => core.setDraft(event.currentTarget.value)}
            onKeyDown={onKeyDown}
          />
          {thinking ? (
            <button
              type="button"
              className="oge-chat-button oge-chat-icon-button oge-chat-stop"
              aria-label={msg.stop}
              title={msg.stop}
              onClick={() => handleRef.current.stop()}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path d={STOP_PATH} />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              className="oge-chat-button oge-chat-icon-button oge-chat-send"
              disabled={disabled || !core.canSend()}
              aria-label={msg.send}
              title={msg.send}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path d={SEND_PATH} />
              </svg>
            </button>
          )}
        </form>
      </div>
    );
  },
);
