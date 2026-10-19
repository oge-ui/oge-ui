import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
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
import { OGE_AI_CONFIG } from '../config';

const SIGNAL_ADAPTER: OgeReactivityAdapter = {
  cell<T>(initial: T): OgeReactiveCell<T> {
    const state = signal(initial);
    const cell = (() => state()) as OgeReactiveCell<T>;
    cell.set = (value) => state.set(value);
    return cell;
  },
  derived: (compute) => computed(compute),
};

/** Send and stop glyphs (24 × 24 view box). */
const SEND_PATH = 'M4 12l16-8-6 16-2.5-6.5L4 12z';
const STOP_PATH = 'M7 7h10v10H7z';

let nextId = 0;

/**
 * A conversation surface: a message log, a composer and — with a transport —
 * replies from the model. Without one it is a plain chat (manual mode): every
 * message is emitted through `sent`, and replies come in through
 * `addMessage()` or the two-way `conversation`.
 *
 * ```html
 * <oge-chat
 *   instructions="You are the support assistant of Acme."
 *   [suggestions]="['Where is my order?', 'Change my plan']"
 *   [(conversation)]="history"
 * />
 * ```
 *
 * Messages render as text — never as HTML — and the log is a polite
 * `role="log"` live region. Enter sends, Shift+Enter adds a line, Escape
 * stops a reply in flight.
 */
@Component({
  selector: 'oge-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-chat',
    role: 'group',
    '[attr.aria-label]': 'msg().label',
    '[class.oge-chat-disabled]': 'disabled()',
  },
  styleUrl: './chat.scss',
  template: `
    <div
      #log
      class="oge-chat-log"
      role="log"
      aria-live="polite"
      tabindex="0"
      [attr.aria-label]="msg().logLabel"
    >
      @if (core.list().length === 0) {
        <p class="oge-chat-empty">{{ msg().empty }}</p>
        @if (resolvedSuggestions().length) {
          <ul
            class="oge-chat-suggestions"
            [attr.aria-label]="msg().suggestions"
          >
            @for (suggestion of resolvedSuggestions(); track suggestion) {
              <li>
                <button
                  type="button"
                  class="oge-chat-chip"
                  [disabled]="disabled()"
                  (click)="send(suggestion)"
                >
                  {{ suggestion }}
                </button>
              </li>
            }
          </ul>
        }
      }
      @for (message of core.list(); track message.id) {
        <div
          class="oge-chat-message"
          [class.oge-chat-message-user]="message.role === 'user'"
          [class.oge-chat-message-assistant]="message.role === 'assistant'"
          [class.oge-chat-message-error]="message.status === 'error'"
        >
          <div class="oge-chat-bubble">
            <span class="oge-sr-only">{{
              message.role === 'user' ? msg().you : msg().assistant
            }}</span>
            {{ message.text }}
          </div>
          @if (message.status === 'error' && $last) {
            <button
              type="button"
              class="oge-chat-button oge-chat-retry"
              [disabled]="disabled()"
              (click)="retry()"
            >
              {{ msg().retry }}
            </button>
          }
        </div>
      }
      @if (core.thinking()) {
        <div
          class="oge-chat-message oge-chat-message-assistant oge-chat-typing"
        >
          <div class="oge-chat-bubble">
            <span class="oge-sr-only">{{ msg().thinking }}</span>
            <span class="oge-chat-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
          </div>
        </div>
      }
    </div>
    <form class="oge-chat-composer" (submit)="onSubmit($event)">
      <textarea
        #field
        class="oge-chat-input"
        rows="1"
        [id]="inputId"
        [value]="core.draft()"
        [placeholder]="msg().placeholder"
        [disabled]="disabled()"
        [attr.aria-label]="msg().composerLabel"
        (input)="core.setDraft(field.value)"
        (keydown)="onKeydown($event)"
      ></textarea>
      @if (core.thinking()) {
        <button
          type="button"
          class="oge-chat-button oge-chat-icon-button oge-chat-stop"
          [attr.aria-label]="msg().stop"
          [attr.title]="msg().stop"
          (click)="stop()"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="stopPath" />
          </svg>
        </button>
      } @else {
        <button
          type="submit"
          class="oge-chat-button oge-chat-icon-button oge-chat-send"
          [disabled]="disabled() || !core.canSend()"
          [attr.aria-label]="msg().send"
          [attr.title]="msg().send"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
          >
            <path [attr.d]="sendPath" />
          </svg>
        </button>
      }
    </form>
  `,
})
export class OgeChat {
  private readonly config = inject(OGE_AI_CONFIG);
  private readonly log = viewChild.required<ElementRef<HTMLElement>>('log');
  private readonly field =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('field');

  /** The conversation (two-way). Messages are text; HTML is never rendered. */
  readonly conversation = model<readonly OgeChatMessage[]>([]);
  /** Where replies come from; falls back to the config. `null` is manual mode. */
  readonly transport = input<OgeAiTransport | null | undefined>(undefined);
  /** System instructions sent before the conversation; falls back to the config. */
  readonly instructions = input<string | undefined>(undefined);
  /** Prompts offered as chips before the first message; falls back to the config. */
  readonly suggestions = input<readonly string[] | undefined>(undefined);
  /** Per-instance message overrides, merged over the catalog. */
  readonly messages = input<Partial<OgeChatMessages> | undefined>(undefined);
  /** Disables the composer and every action. */
  readonly disabled = input(false);

  /** A user message is about to be sent — set `cancel` to keep it out. */
  readonly sending = output<OgeChatSendingEvent>();
  /** A user message entered the conversation. */
  readonly sent = output<OgeChatSentEvent>();
  /** An assistant reply entered the conversation. */
  readonly replied = output<OgeChatReplyEvent>();
  /** A reply request failed. */
  readonly errorOccurred = output<OgeChatErrorEvent>();

  protected readonly sendPath = SEND_PATH;
  protected readonly stopPath = STOP_PATH;
  private readonly id = `oge-chat-${nextId++}`;
  protected readonly inputId = `${this.id}-input`;

  protected readonly msg = computed<OgeChatMessages>(() => ({
    ...this.config.messages.chat,
    ...this.messages(),
  }));
  protected readonly resolvedSuggestions = computed(
    () => this.suggestions() ?? this.config.chat.suggestions,
  );

  /** The shared machine (`@oge-ui/behavior`), the same one the React chat runs. */
  protected readonly core = new OgeChatCore({
    adapter: SIGNAL_ADAPTER,
    transport: () => {
      const own = untracked(this.transport);
      return own === undefined ? untracked(() => this.config.transport) : own;
    },
    instructions: () =>
      untracked(this.instructions) ??
      untracked(() => this.config.chat.instructions),
    historyLimit: () => untracked(() => this.config.chat.historyLimit),
    messages: () => this.msg(),
    idPrefix: this.id,
    sending: (event) => this.sending.emit(event),
    sent: (event) => this.sent.emit(event),
    replied: (event) => this.replied.emit(event),
    errorOccurred: (event) => this.errorOccurred.emit(event),
    changed: (list) => this.conversation.set(list),
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.core.destroy());
    // an outside conversation value (restored history, a reset) flows in
    effect(() => {
      const list = this.conversation();
      if (untracked(this.core.list) !== list) this.core.setMessages(list);
    });
    // keep the newest message in view while the reader is at the bottom
    afterRenderEffect(() => {
      this.core.list();
      this.core.thinking();
      const log = this.log().nativeElement;
      log.scrollTop = log.scrollHeight;
    });
  }

  /** Sends `text`, or the composer's text. */
  send(text?: string): Promise<void> {
    return this.core.send(text);
  }

  /** Appends a message — a reply in manual mode, or a greeting. */
  addMessage(
    message: Omit<OgeChatMessage, 'id'> & { id?: string },
  ): OgeChatMessage {
    return this.core.addMessage(message);
  }

  /** Resends the last user turn after a failed reply. */
  retry(): Promise<void> {
    return this.core.retry();
  }

  /** Stops the reply in flight. */
  stop(): void {
    this.core.stop();
    this.focus();
  }

  /** Empties the conversation and the composer. */
  clear(): void {
    this.core.clear();
  }

  /** Moves focus to the composer. */
  focus(): void {
    this.field().nativeElement.focus();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.disabled()) return;
    void this.core.send();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.core.thinking()) {
      event.preventDefault();
      this.core.stop();
      return;
    }
    // Enter sends; Shift+Enter (and IME composition) keeps a new line
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (!this.disabled()) void this.core.send();
    }
  }
}
