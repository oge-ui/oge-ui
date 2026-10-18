import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  mergeOgeGridAssistantMessages,
  OgeGridAssistantCore,
  OGE_GRID_ASSISTANT_ICON_PATH,
  type OgeAiGridColumn,
  type OgeAiTransport,
  type OgeGridAiCapabilities,
  type OgeGridAiSlice,
  type OgeGridAssistantAppliedEvent,
  type OgeGridAssistantApplyingEvent,
  type OgeGridAssistantErrorEvent,
  type OgeGridAssistantMessages,
  type OgeGridAssistantMessagesInput,
  type OgeGridAssistantMode,
  type OgeGridAssistantStatus,
  type OgeGridAssistantTarget,
  type OgeGridAssistantUndoneEvent,
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

let nextId = 0;

/**
 * A natural-language bar for a data grid: the user types what they want to
 * see, the model proposes a sort / filter / grouping / column change, the
 * assistant validates it against the grid's columns and applies it — after
 * Apply in `'preview'` mode, at once in `'apply'` mode. Undo steps back.
 *
 * ```html
 * <oge-grid-assistant [target]="grid" [suggestions]="['Top 10 by revenue']" />
 * <oge-grid #grid [data]="orders">…</oge-grid>
 * ```
 *
 * Requests go to the transport from `provideOgeAiConfig()` (or the
 * `transport` input) — your backend or any OpenAI-compatible / Anthropic
 * endpoint. The model sees column names, types and lookup values, never rows.
 */
@Component({
  selector: 'oge-grid-assistant',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-grid-assistant',
    role: 'region',
    '[attr.aria-label]': 'msg().label',
    '[class.oge-grid-assistant-busy]': 'core.busy()',
    '[class.oge-grid-assistant-disabled]': 'disabled()',
    '[attr.aria-busy]': 'core.busy() || null',
  },
  styleUrl: './grid-assistant.scss',
  template: `
    <form
      class="oge-grid-assistant-bar"
      (submit)="onSubmit($event)"
      (keydown.escape)="onEscape($event)"
    >
      <span class="oge-grid-assistant-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" focusable="false">
          <path [attr.d]="iconPath" />
        </svg>
      </span>
      <input
        #field
        class="oge-grid-assistant-input"
        type="text"
        enterkeyhint="send"
        autocomplete="off"
        [id]="inputId"
        [value]="core.prompt()"
        [placeholder]="msg().placeholder"
        [disabled]="disabled()"
        [attr.aria-label]="msg().label"
        [attr.aria-describedby]="statusId"
        (input)="core.setPrompt(field.value)"
      />
      @if (core.busy()) {
        <button
          type="button"
          class="oge-grid-assistant-button oge-grid-assistant-stop"
          (click)="cancel()"
        >
          {{ msg().stop }}
        </button>
      } @else {
        <button
          type="submit"
          class="oge-grid-assistant-button oge-grid-assistant-submit"
          [disabled]="disabled() || !core.canSubmit()"
        >
          {{ msg().submit }}
        </button>
      }
      @if (core.canUndo()) {
        <button
          type="button"
          class="oge-grid-assistant-button oge-grid-assistant-undo"
          [disabled]="disabled() || core.busy()"
          (click)="undo()"
        >
          {{ msg().undo }}
        </button>
      }
    </form>
    @if (showSuggestions()) {
      <ul
        class="oge-grid-assistant-suggestions"
        [attr.aria-label]="msg().suggestions"
      >
        @for (suggestion of resolvedSuggestions(); track suggestion) {
          <li>
            <button
              type="button"
              class="oge-grid-assistant-chip"
              [disabled]="disabled()"
              (click)="submit(suggestion)"
            >
              {{ suggestion }}
            </button>
          </li>
        }
      </ul>
    }
    @if (core.proposal(); as proposal) {
      <div
        class="oge-grid-assistant-proposal"
        role="group"
        [attr.aria-labelledby]="proposalId"
      >
        <div class="oge-grid-assistant-proposal-head">
          <span class="oge-grid-assistant-proposal-title" [id]="proposalId">
            {{ msg().proposal }}
          </span>
          <ul class="oge-grid-assistant-slices">
            @for (slice of proposal.slices; track slice) {
              <li class="oge-grid-assistant-slice">{{ sliceLabel(slice) }}</li>
            }
          </ul>
        </div>
        @if (proposal.summary) {
          <p class="oge-grid-assistant-summary">{{ proposal.summary }}</p>
        }
        @if (core.warningText()) {
          <p class="oge-grid-assistant-warning">{{ core.warningText() }}</p>
        }
        <div class="oge-grid-assistant-actions">
          <button
            type="button"
            class="oge-grid-assistant-button oge-grid-assistant-apply"
            [disabled]="disabled()"
            (click)="apply()"
          >
            {{ msg().apply }}
          </button>
          <button
            type="button"
            class="oge-grid-assistant-button oge-grid-assistant-discard"
            [disabled]="disabled()"
            (click)="discard()"
          >
            {{ msg().discard }}
          </button>
        </div>
      </div>
    }
    <p
      class="oge-grid-assistant-status"
      role="status"
      [id]="statusId"
      [class.oge-grid-assistant-status-error]="isError()"
      [class.oge-grid-assistant-status-hidden]="statusHidden()"
    >
      {{ core.statusText() }}
    </p>
  `,
})
export class OgeGridAssistant {
  private readonly config = inject(OGE_AI_CONFIG);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly field =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  /**
   * The grid to drive: an `OgeGrid` reference, or any object
   * with `state()`, `applyState()` and `describeColumns()`.
   */
  readonly target = input<OgeGridAssistantTarget | null | undefined>(undefined);
  /** Replaces the configured transport for this assistant. */
  readonly transport = input<OgeAiTransport | null | undefined>(undefined);
  /** `'preview'` asks before applying, `'apply'` applies at once; falls back to the config. */
  readonly mode = input<OgeGridAssistantMode | undefined>(undefined);
  /** One-click prompts shown until the first change; falls back to the config. */
  readonly suggestions = input<readonly string[] | undefined>(undefined);
  /** Turns parts of the grid state off for the assistant; merged over the config. */
  readonly capabilities = input<Partial<OgeGridAiCapabilities> | undefined>(
    undefined,
  );
  /** Domain vocabulary appended to the system prompt; falls back to the config. */
  readonly instructions = input<string | undefined>(undefined);
  /**
   * Column descriptions to send instead of the grid's own — add
   * `description`s, or leave a column out to keep it from the model.
   */
  readonly columns = input<readonly OgeAiGridColumn[] | undefined>(undefined);
  /** BCP 47 locale of plurals and summaries; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance message overrides, merged over the config catalog. */
  readonly messages = input<OgeGridAssistantMessagesInput | undefined>(
    undefined,
  );
  /** Disables the field and every action. */
  readonly disabled = input(false);

  /** A change is about to reach the grid — set `cancel` to keep the grid as it is. */
  readonly applying = output<OgeGridAssistantApplyingEvent>();
  /** A change was applied to the grid. */
  readonly applied = output<OgeGridAssistantAppliedEvent>();
  /** Undo reverted the latest applied change. */
  readonly undone = output<OgeGridAssistantUndoneEvent>();
  /** A request failed: no transport, a transport error or an unusable reply. */
  readonly errorOccurred = output<OgeGridAssistantErrorEvent>();

  protected readonly iconPath = OGE_GRID_ASSISTANT_ICON_PATH;
  private readonly id = `oge-grid-assistant-${nextId++}`;
  protected readonly inputId = `${this.id}-input`;
  protected readonly statusId = `${this.id}-status`;
  protected readonly proposalId = `${this.id}-proposal`;

  protected readonly msg = computed<OgeGridAssistantMessages>(() =>
    mergeOgeGridAssistantMessages(
      this.config.messages.gridAssistant,
      this.messages(),
    ),
  );
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.appLocale,
  );
  protected readonly resolvedSuggestions = computed(
    () => this.suggestions() ?? this.config.gridAssistant.suggestions,
  );

  /** The shared machine (`@oge-ui/behavior`), the same one the React assistant runs. */
  protected readonly core = new OgeGridAssistantCore({
    adapter: SIGNAL_ADAPTER,
    target: () => untracked(this.target),
    transport: () =>
      untracked(this.transport) ?? untracked(() => this.config.transport),
    mode: () =>
      untracked(this.mode) ?? untracked(() => this.config.gridAssistant.mode),
    capabilities: () =>
      untracked(() => ({
        ...this.config.gridAssistant.capabilities,
        ...this.capabilities(),
      })),
    instructions: () =>
      untracked(this.instructions) ??
      untracked(() => this.config.gridAssistant.instructions),
    columns: () => untracked(this.columns),
    messages: () => this.msg(),
    locale: () => this.resolvedLocale(),
    historyLimit: () => untracked(() => this.config.gridAssistant.historyLimit),
    undoLimit: () => untracked(() => this.config.gridAssistant.undoLimit),
    applying: (event) => this.applying.emit(event),
    applied: (event) => this.applied.emit(event),
    undone: (event) => this.undone.emit(event),
    errorOccurred: (event) => this.errorOccurred.emit(event),
  });

  protected readonly showSuggestions = computed(
    () =>
      this.resolvedSuggestions().length > 0 &&
      !this.core.canUndo() &&
      !this.core.proposal() &&
      !this.core.busy(),
  );
  protected readonly isError = computed(() => {
    const status: OgeGridAssistantStatus = this.core.status();
    return status === 'error' || status === 'invalid';
  });
  /** The proposal panel says it all while a proposal is open. */
  protected readonly statusHidden = computed(
    () => this.core.status() === 'preview' || !this.core.statusText(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }

  /** Sends the prompt — or `text`, which also becomes the prompt. */
  submit(text?: string): Promise<void> {
    return this.core.submit(text);
  }

  /** Applies the pending proposal. */
  apply(): void {
    this.core.apply();
    this.focus();
  }

  /** Drops the pending proposal. */
  discard(): void {
    this.core.discard();
    this.focus();
  }

  /** Reverts the latest applied change. */
  undo(): void {
    this.core.undo();
    this.focus();
  }

  /** Stops the request in flight. */
  cancel(): void {
    this.core.cancel();
    this.focus();
  }

  /** Clears the prompt, proposal, conversation and undo history. */
  reset(): void {
    this.core.reset();
  }

  /** Moves focus to the prompt field. */
  focus(): void {
    this.field().nativeElement.focus();
  }

  protected sliceLabel(slice: OgeGridAiSlice): string {
    return this.msg().slices[slice];
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (this.disabled()) return;
    void this.core.submit();
  }

  protected onEscape(event: Event): void {
    if (this.core.busy()) this.core.cancel();
    else if (this.core.proposal()) this.core.discard();
    else return;
    event.preventDefault();
    event.stopPropagation();
  }
}
