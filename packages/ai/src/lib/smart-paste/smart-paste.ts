import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
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
 * Fills a form from text the user copied — an email, a signature, a note:
 * one click reads the clipboard, the model maps the text onto the form's
 * fields, every value is checked against the field's type and choices, and
 * the proposed values are shown before they are written (`'preview'`) or
 * written at once (`'apply'`). Undo restores what was there before.
 *
 * ```html
 * <oge-smart-paste [target]="form" />
 * <oge-form #form [(formData)]="customer">…</oge-form>
 * ```
 *
 * The request carries the field catalog and the pasted text — never the
 * form's current values. When the clipboard cannot be read (permission, an
 * insecure origin), a text area takes the paste instead.
 */
@Component({
  selector: 'oge-smart-paste',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'oge-smart-paste',
    role: 'group',
    '[attr.aria-label]': 'msg().label',
    '[class.oge-smart-paste-busy]': 'core.busy()',
    '[attr.aria-busy]': 'core.busy() || null',
  },
  styleUrl: './smart-paste.scss',
  template: `
    <div class="oge-smart-paste-bar">
      <button
        #trigger
        type="button"
        class="oge-smart-paste-button oge-smart-paste-trigger"
        [disabled]="disabled() || core.busy()"
        [attr.aria-describedby]="statusId"
        (click)="paste()"
      >
        <svg
          class="oge-smart-paste-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path [attr.d]="iconPath" />
        </svg>
        {{ msg().label }}
      </button>
      @if (core.busy()) {
        <button
          type="button"
          class="oge-smart-paste-button oge-smart-paste-stop"
          (click)="cancel()"
        >
          {{ msg().stop }}
        </button>
      }
      <button
        type="button"
        class="oge-smart-paste-button oge-smart-paste-toggle"
        [disabled]="disabled()"
        [attr.aria-expanded]="core.textOpen()"
        [attr.aria-controls]="textId"
        (click)="toggleText()"
      >
        {{ msg().pasteText }}
      </button>
      @if (core.canUndo()) {
        <button
          type="button"
          class="oge-smart-paste-button oge-smart-paste-undo"
          [disabled]="disabled() || core.busy()"
          (click)="undo()"
        >
          {{ msg().undo }}
        </button>
      }
    </div>
    @if (core.textOpen()) {
      <div class="oge-smart-paste-text" [id]="textId">
        <label class="oge-smart-paste-text-label" [for]="areaId">
          {{ msg().textLabel }}
        </label>
        <textarea
          #area
          class="oge-smart-paste-area"
          rows="4"
          [id]="areaId"
          [value]="core.text()"
          [placeholder]="msg().textPlaceholder"
          [disabled]="disabled()"
          (input)="core.setText(area.value)"
        ></textarea>
        <div class="oge-smart-paste-actions">
          <button
            type="button"
            class="oge-smart-paste-button oge-smart-paste-fill"
            [disabled]="disabled() || core.busy() || !core.text().trim()"
            (click)="fillFromText()"
          >
            {{ msg().fill }}
          </button>
        </div>
      </div>
    }
    @if (core.proposal(); as proposal) {
      <div
        class="oge-smart-paste-proposal"
        role="group"
        [attr.aria-labelledby]="proposalId"
      >
        <span class="oge-smart-paste-proposal-title" [id]="proposalId">
          {{ msg().proposal }}
        </span>
        <table class="oge-smart-paste-table">
          <thead>
            <tr>
              <th scope="col">{{ msg().field }}</th>
              <th scope="col">{{ msg().current }}</th>
              <th scope="col">{{ msg().next }}</th>
            </tr>
          </thead>
          <tbody>
            @for (change of proposal.changes; track change.field) {
              <tr>
                <th scope="row">{{ change.label }}</th>
                <td class="oge-smart-paste-previous">
                  {{ core.formatValue(change.field, change.previous) }}
                </td>
                <td class="oge-smart-paste-next">
                  {{ core.formatValue(change.field, change.next) }}
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (core.warningText()) {
          <p class="oge-smart-paste-warning">{{ core.warningText() }}</p>
        }
        <div class="oge-smart-paste-actions">
          <button
            type="button"
            class="oge-smart-paste-button oge-smart-paste-apply"
            [disabled]="disabled()"
            (click)="apply()"
          >
            {{ msg().apply }}
          </button>
          <button
            type="button"
            class="oge-smart-paste-button oge-smart-paste-discard"
            [disabled]="disabled()"
            (click)="discard()"
          >
            {{ msg().discard }}
          </button>
        </div>
      </div>
    }
    <p
      class="oge-smart-paste-status"
      role="status"
      [id]="statusId"
      [class.oge-smart-paste-status-error]="isError()"
      [class.oge-smart-paste-status-hidden]="statusHidden()"
    >
      {{ core.statusText() }}
    </p>
  `,
})
export class OgeSmartPaste {
  private readonly config = inject(OGE_AI_CONFIG);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly injector = inject(Injector);
  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly area = viewChild<ElementRef<HTMLTextAreaElement>>('area');

  /**
   * The form to fill: an `OgeForm` reference, or any object with
   * `describeFields()` and `updateData(values)`.
   */
  readonly target = input<OgeSmartPasteTarget | null | undefined>(undefined);
  /** Replaces the configured transport for this smart paste. */
  readonly transport = input<OgeAiTransport | null | undefined>(undefined);
  /** `'preview'` shows the values before writing them, `'apply'` writes at once; falls back to the config. */
  readonly mode = input<OgeGridAssistantMode | undefined>(undefined);
  /** Domain vocabulary appended to the system prompt; falls back to the config. */
  readonly instructions = input<string | undefined>(undefined);
  /**
   * Field descriptions merged over the form's own (by `field`) — add a
   * `description`, or set `readOnly: true` to keep a field out of reach.
   */
  readonly fields = input<readonly OgeAiFormField[] | undefined>(undefined);
  /** BCP 47 locale of value formatting and the text; falls back to the config, then `LOCALE_ID`. */
  readonly locale = input<string | undefined>(undefined);
  /** Per-instance message overrides, merged over the catalog. */
  readonly messages = input<Partial<OgeSmartPasteMessages> | undefined>(
    undefined,
  );
  /** Disables every control. */
  readonly disabled = input(false);

  /** Values are about to reach the form — set `cancel` to keep it as it is. */
  readonly applying = output<OgeSmartPasteApplyingEvent>();
  /** Values were written into the form. */
  readonly applied = output<OgeSmartPasteAppliedEvent>();
  /** Undo restored the values the latest paste replaced. */
  readonly undone = output<OgeSmartPasteUndoneEvent>();
  /** A paste failed: the clipboard, an empty text, the transport or the reply. */
  readonly errorOccurred = output<OgeSmartPasteErrorEvent>();

  protected readonly iconPath = OGE_GRID_ASSISTANT_ICON_PATH;
  private readonly id = `oge-smart-paste-${nextId++}`;
  protected readonly statusId = `${this.id}-status`;
  protected readonly textId = `${this.id}-text`;
  protected readonly areaId = `${this.id}-area`;
  protected readonly proposalId = `${this.id}-proposal`;

  protected readonly msg = computed<OgeSmartPasteMessages>(() => ({
    ...this.config.messages.smartPaste,
    ...this.messages(),
  }));
  private readonly resolvedLocale = computed(
    () => this.locale() ?? this.config.locale ?? this.appLocale,
  );

  /** The shared machine (`@oge-ui/behavior`), the same one the React smart paste runs. */
  protected readonly core = new OgeSmartPasteCore({
    adapter: SIGNAL_ADAPTER,
    target: () => untracked(this.target),
    transport: () =>
      untracked(this.transport) ?? untracked(() => this.config.transport),
    mode: () =>
      untracked(this.mode) ?? untracked(() => this.config.smartPaste.mode),
    instructions: () =>
      untracked(this.instructions) ??
      untracked(() => this.config.smartPaste.instructions),
    fields: () => untracked(this.fields),
    messages: () => this.msg(),
    locale: () => this.resolvedLocale(),
    undoLimit: () => untracked(() => this.config.smartPaste.undoLimit),
    applying: (event) => this.applying.emit(event),
    applied: (event) => this.applied.emit(event),
    undone: (event) => this.undone.emit(event),
    errorOccurred: (event) => this.errorOccurred.emit(event),
  });

  protected readonly isError = computed(() => {
    const status = this.core.status();
    return status === 'error' || status === 'invalid';
  });
  protected readonly statusHidden = computed(
    () => this.core.status() === 'preview' || !this.core.statusText(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.core.destroy());
  }

  /** Fills the form from `text`, or from the clipboard when called without one. */
  paste(text?: string): Promise<void> {
    return this.core.paste(text);
  }

  /** Fills the form from the text area. */
  fillFromText(): Promise<void> {
    return this.core.fillFromText();
  }

  /** Writes the pending values into the form. */
  apply(): void {
    this.core.apply();
    this.focus();
  }

  /** Drops the pending values. */
  discard(): void {
    this.core.discard();
    this.focus();
  }

  /** Restores the values the latest paste replaced. */
  undo(): void {
    this.core.undo();
    this.focus();
  }

  /** Stops the read or request in flight. */
  cancel(): void {
    this.core.cancel();
    this.focus();
  }

  /** Clears the proposal, the text area and the undo history. */
  reset(): void {
    this.core.reset();
  }

  /** Moves focus to the Smart paste button. */
  focus(): void {
    this.trigger().nativeElement.focus();
  }

  protected toggleText(): void {
    const open = !this.core.textOpen();
    this.core.setTextOpen(open);
    // the area renders on the next pass
    if (open) {
      afterNextRender(() => this.area()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }
}
