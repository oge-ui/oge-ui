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
  buildGanttDialogItems,
  type GanttEditorModel,
  type GanttEditorResult,
  type OgeGanttResource,
} from '@oge-ui/gantt-engine';
import type { OgeGanttDialogMessages } from '../config';

export type { GanttEditorModel, GanttEditorResult };

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
  readonly resources = input<readonly OgeGanttResource[]>([]);

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
    // single-sourced in the engine: the React dialog renders the same form
    return buildGanttDialogItems(this.messages(), this.resources());
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
