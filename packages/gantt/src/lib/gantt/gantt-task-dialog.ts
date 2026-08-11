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
import type { OgeGanttDialogMessages } from '../config';

/** The dialog's working model (independent of the user's item shape). */
export interface GanttEditorModel {
  title: string;
  start: Date;
  end: Date;
  progress: number;
  color?: string;
  /** Present only when resources are configured — enables the tag editor. */
  resourceIds?: readonly unknown[];
}

export interface GanttEditorResult {
  readonly model: GanttEditorModel;
  readonly isNew: boolean;
}

/**
 * Internal task editor: an `OgeModal` embedding an `OgeForm` in
 * `[(formData)]` mode; the shell may replace the items from the
 * `taskEditDialogShowing` hook.
 */
@Component({
  selector: 'oge-gantt-task-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OgeForm, OgeModal, OgeModalFooter],
  template: `
    <oge-modal
      [(opened)]="opened"
      [title]="isNew() ? messages().titleNew : messages().titleEdit"
      [width]="520"
    >
      @if (model(); as m) {
        <oge-form
          class="oge-gantt-dialog-form"
          [formData]="m"
          (formDataChange)="onModelChange($event)"
          [items]="items()"
          [colCount]="2"
          labelLocation="top"
        />
      }
      <div *ogeModalFooter class="oge-gantt-dialog-footer">
        @if (!isNew() && allowDeleting()) {
          <button
            type="button"
            class="oge-gantt-btn oge-gantt-btn-danger"
            (click)="requestDelete()"
          >
            {{ messages().deleteTask }}
          </button>
        }
        <span class="oge-gantt-dialog-spacer"></span>
        <button type="button" class="oge-gantt-btn" (click)="cancel()">
          {{ messages().cancel }}
        </button>
        <button
          type="button"
          class="oge-gantt-btn oge-gantt-btn-primary"
          (click)="save()"
        >
          {{ messages().save }}
        </button>
      </div>
    </oge-modal>
  `,
})
export class OgeGanttTaskDialog {
  readonly messages = input.required<OgeGanttDialogMessages>();
  readonly locale = input<string | undefined>(undefined);
  readonly allowDeleting = input(true);
  /** Resource choices; non-empty adds the multi-assignment tag editor. */
  readonly resources = input<
    readonly { id: unknown; text: string; color?: string }[]
  >([]);

  readonly saved = output<GanttEditorResult>();
  readonly deleteRequested = output<void>();
  readonly cancelled = output<void>();

  private readonly form = viewChild(OgeForm);

  protected readonly opened = signal(false);
  protected readonly isNew = signal(false);
  protected readonly model = signal<GanttEditorModel | null>(null);
  private readonly customItems = signal<readonly OgeFormItemData[] | null>(
    null,
  );

  /** The default items; exposed so the shell can pass them to hooks. */
  defaultItems(): OgeFormItemData[] {
    const messages = this.messages();
    return [
      {
        field: 'title',
        label: messages.titleLabel,
        placeholder: messages.titlePlaceholder,
        isRequired: true,
        colSpan: 2,
      },
      {
        field: 'start',
        label: messages.startLabel,
        editorType: 'dateBox',
        editorOptions: { type: 'date' },
      },
      {
        field: 'end',
        label: messages.endLabel,
        editorType: 'dateBox',
        editorOptions: { type: 'date' },
        validationRules: [
          {
            type: 'custom',
            validate: (context) => {
              const data = context.data as unknown as GanttEditorModel;
              return data.end instanceof Date &&
                data.start instanceof Date &&
                data.end.getTime() < data.start.getTime()
                ? messages.endBeforeStart
                : null;
            },
          },
        ],
      },
      {
        field: 'progress',
        label: messages.progressLabel,
        editorType: 'slider',
        editorOptions: { min: 0, max: 100, step: 5 },
      },
      {
        field: 'color',
        label: messages.colorLabel,
        editorType: 'colorBox',
      },
      ...(this.resources().length > 0
        ? [
            {
              field: 'resourceIds',
              label: messages.resourcesLabel,
              editorType: 'tagBox',
              editorOptions: {
                items: [...this.resources()],
                valueExpr: 'id',
                displayExpr: 'text',
              },
              colSpan: 2,
            } satisfies OgeFormItemData,
          ]
        : []),
    ];
  }

  protected readonly items = computed<readonly OgeFormItemData[]>(
    () => this.customItems() ?? this.defaultItems(),
  );

  open(
    model: GanttEditorModel,
    isNew: boolean,
    items?: readonly OgeFormItemData[],
  ): void {
    this.model.set({ ...model });
    this.isNew.set(isNew);
    this.customItems.set(items ?? null);
    this.opened.set(true);
  }

  close(): void {
    this.opened.set(false);
  }

  protected onModelChange(model: GanttEditorModel | undefined): void {
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

  protected requestDelete(): void {
    this.opened.set(false);
    this.deleteRequested.emit();
  }

  protected cancel(): void {
    this.opened.set(false);
    this.cancelled.emit();
  }
}
