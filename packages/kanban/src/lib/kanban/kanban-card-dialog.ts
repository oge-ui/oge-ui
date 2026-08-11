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
import type { OgeKanbanDialogMessages } from '../config';

/** The editor's working model (independent of the user's item shape). */
export interface KanbanEditorModel {
  title: string;
  description: string;
  column: string;
  swimlane: string | null;
  color: string | undefined;
  tags: string[];
  assignees: string[];
  dueDate: Date | null;
  priority: string | null;
}

/** The dialog's save payload. */
export interface KanbanEditorResult {
  readonly model: KanbanEditorModel;
  readonly isNew: boolean;
}

/**
 * Choice lists the default form offers (built by the shell from the board).
 * The `has*` flags mirror which `*Expr` inputs are actually configured —
 * the default form only renders editors for fields the board can persist.
 */
export interface KanbanEditorChoices {
  readonly columns: readonly { value: string; text: string }[];
  readonly swimlanes: readonly string[];
  readonly tags: readonly string[];
  readonly assignees: readonly string[];
  readonly priorities: readonly string[];
  readonly hasSwimlanes: boolean;
  readonly hasTags: boolean;
  readonly hasAssignees: boolean;
  readonly hasDueDate: boolean;
  readonly hasPriority: boolean;
  readonly hasColor: boolean;
  readonly hasDescription: boolean;
}

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
  readonly choices = input<KanbanEditorChoices>({
    columns: [],
    swimlanes: [],
    tags: [],
    assignees: [],
    priorities: [],
    hasSwimlanes: false,
    hasTags: false,
    hasAssignees: false,
    hasDueDate: false,
    hasPriority: false,
    hasColor: true,
    hasDescription: true,
  });
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
    const messages = this.messages();
    const choices = this.choices();
    const items: OgeFormItemData[] = [
      {
        field: 'title',
        label: messages.titleLabel,
        placeholder: messages.titlePlaceholder,
        isRequired: true,
        colSpan: 2,
        validationRules: [
          {
            type: 'custom',
            validate: (context) => {
              const data = context.data as unknown as KanbanEditorModel;
              return data.title.trim() === '' ? messages.titleRequired : null;
            },
          },
        ],
      },
    ];
    if (choices.hasDescription) {
      items.push({
        field: 'description',
        label: messages.descriptionLabel,
        editorType: 'textArea',
        editorOptions: { rows: 3, autoResize: true },
        colSpan: 2,
      });
    }
    items.push({
      field: 'column',
      label: messages.columnLabel,
      editorType: 'selectBox',
      editorOptions: {
        items: choices.columns as unknown as readonly unknown[],
        valueExpr: 'value',
        displayExpr: 'text',
      },
      colSpan: choices.hasSwimlanes ? 1 : 2,
    });
    if (choices.hasSwimlanes) {
      items.push({
        field: 'swimlane',
        label: messages.swimlaneLabel,
        editorType: 'selectBox',
        editorOptions: {
          items: choices.swimlanes as readonly unknown[],
          acceptCustomValue: true,
        },
      });
    }
    if (choices.hasDueDate) {
      items.push({
        field: 'dueDate',
        label: messages.dueDateLabel,
        editorType: 'dateBox',
        editorOptions: { type: 'date', showClearButton: true },
      });
    }
    if (choices.hasPriority) {
      items.push({
        field: 'priority',
        label: messages.priorityLabel,
        editorType: 'selectBox',
        editorOptions: {
          items: choices.priorities as readonly unknown[],
          showClearButton: true,
          acceptCustomValue: true,
        },
      });
    }
    if (choices.hasTags) {
      items.push({
        field: 'tags',
        label: messages.tagsLabel,
        editorType: 'tagBox',
        editorOptions: {
          items: choices.tags as readonly unknown[],
          acceptCustomValue: true,
        },
        colSpan: 2,
      });
    }
    if (choices.hasAssignees) {
      items.push({
        field: 'assignees',
        label: messages.assigneesLabel,
        editorType: 'tagBox',
        editorOptions: {
          items: choices.assignees as readonly unknown[],
          acceptCustomValue: true,
        },
        colSpan: 2,
      });
    }
    if (choices.hasColor) {
      items.push({
        field: 'color',
        label: messages.colorLabel,
        editorType: 'colorBox',
        colSpan: 2,
      });
    }
    return items;
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
