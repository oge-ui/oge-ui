import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { OgeModal, OgeModalFooter } from '@oge-ui/overlay';
import { OgeForm, type OgeFormItemData } from '@oge-ui/forms';
import {
  KANBAN_EMPTY_EDITOR_CHOICES,
  buildKanbanEditorItems,
  type KanbanEditorChoices,
  type KanbanEditorModel,
  type KanbanEditorResult,
  type OgeKanbanDialogMessages,
} from '@oge-ui/kanban-engine';

// The editor model, the choice lists and the default form live in
// `@oge-ui/kanban-engine` (shared with the React dialog, ADR 0003).
export type { KanbanEditorChoices, KanbanEditorModel, KanbanEditorResult };

/**
 * Internal card editor: an `OgeModal` embedding an `OgeForm` in
 * `[(formData)]` mode. The default items cover the standard card fields;
 * the shell may hand in replacement items from the `cardEditDialogShowing`
 * hook.
 */
@Component({
  selector: 'oge-kanban-card-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeForm, OgeModal, OgeModalFooter],
  template: `
    <oge-modal
      [(opened)]="opened"
      [title]="isNew() ? messages().titleNew : messages().titleEdit"
      [width]="560"
    >
      @if (model(); as m) {
        <oge-form
          class="oge-kanban-editor-form"
          [formData]="m"
          (formDataChange)="onModelChange($event)"
          [items]="items()"
          [colCount]="2"
          labelLocation="top"
        />
      }
      <div *ogeModalFooter class="oge-kanban-editor-footer">
        @if (!isNew() && allowDeleting()) {
          <button
            type="button"
            class="oge-kanban-btn oge-kanban-btn-danger"
            (click)="requestDelete()"
          >
            {{ messages().deleteCard }}
          </button>
        }
        <span class="oge-kanban-editor-footer-spacer"></span>
        <button type="button" class="oge-kanban-btn" (click)="cancel()">
          {{ messages().cancel }}
        </button>
        <button
          type="button"
          class="oge-kanban-btn oge-kanban-btn-primary"
          (click)="save()"
        >
          {{ messages().save }}
        </button>
      </div>
    </oge-modal>
  `,
})
export class OgeKanbanCardDialog {
  readonly messages = input.required<OgeKanbanDialogMessages>();
  readonly locale = input<string | undefined>(undefined);
  readonly choices = input<KanbanEditorChoices>(KANBAN_EMPTY_EDITOR_CHOICES);
  readonly allowDeleting = input<boolean>(true);

  readonly saved = output<KanbanEditorResult>();
  readonly cancelled = output<void>();
  /** The footer's Delete button (the shell owns the confirm pipeline). */
  readonly deleteRequested = output<KanbanEditorModel>();

  private readonly form = viewChild(OgeForm);

  protected readonly opened = signal(false);
  protected readonly isNew = signal(false);
  protected readonly model = signal<KanbanEditorModel | null>(null);
  private readonly customItems = signal<readonly OgeFormItemData[] | null>(
    null,
  );

  /**
   * The default editor items; exposed so the shell can pass them to hooks.
   * Only fields the board maps (`has*` flags) render — an editor whose
   * value could never persist back would be a lie.
   */
  defaultItems(): OgeFormItemData[] {
    return buildKanbanEditorItems(this.messages(), this.choices());
  }

  protected readonly items = computed<readonly OgeFormItemData[]>(
    () => this.customItems() ?? this.defaultItems(),
  );

  /** Opens the editor with `model`; `items` replaces the default form. */
  open(
    model: KanbanEditorModel,
    isNew: boolean,
    items?: readonly OgeFormItemData[],
  ): void {
    this.model.set({ ...model });
    this.isNew.set(isNew);
    this.customItems.set(items ?? null);
    this.opened.set(true);
  }

  /** Closes the editor without saving. */
  close(): void {
    this.opened.set(false);
  }

  /** Whether the editor is currently open. */
  isOpen(): boolean {
    return this.opened();
  }

  protected onModelChange(model: KanbanEditorModel | undefined): void {
    if (model !== undefined) this.model.set(model);
  }

  protected save(): void {
    const form = this.form();
    const model = this.model();
    if (model === null) return;
    if (form !== undefined && !form.validate()) {
      form.focusFirstInvalid();
      return;
    }
    this.opened.set(false);
    this.saved.emit({ model, isNew: this.isNew() });
  }

  protected cancel(): void {
    this.opened.set(false);
    this.cancelled.emit();
  }

  protected requestDelete(): void {
    const model = this.model();
    if (model === null) return;
    this.opened.set(false);
    this.deleteRequested.emit(model);
  }
}
