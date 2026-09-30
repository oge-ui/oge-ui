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
  buildSchedulerEditorItems,
  type SchedulerEditorModel,
  type SchedulerEditorResult,
} from '@oge-ui/scheduler-engine';
import type { OgeSchedulerEditorMessages } from '../config';
import type { OgeSchedulerResource } from '../scheduler-types';

/**
 * Internal appointment editor: an `OgeModal` embedding an `OgeForm` in
 * `[(formData)]` mode. The default items cover the standard fields; the
 * shell may hand in replacement items from the `editorShowing` hook.
 */
@Component({
  selector: 'oge-scheduler-appointment-dialog',
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
          class="oge-scheduler-editor-form"
          [formData]="m"
          (formDataChange)="onModelChange($event)"
          [items]="items()"
          [colCount]="2"
          labelLocation="top"
        />
      }
      <div *ogeModalFooter class="oge-scheduler-editor-footer">
        <button type="button" class="oge-scheduler-btn" (click)="cancel()">
          {{ messages().cancel }}
        </button>
        <button
          type="button"
          class="oge-scheduler-btn oge-scheduler-btn-primary"
          (click)="save()"
        >
          {{ messages().save }}
        </button>
      </div>
    </oge-modal>
  `,
})
export class OgeSchedulerAppointmentDialog {
  readonly messages = input.required<OgeSchedulerEditorMessages>();
  readonly locale = input<string | undefined>(undefined);
  readonly resources = input<readonly OgeSchedulerResource[]>([]);

  readonly saved = output<SchedulerEditorResult>();
  readonly cancelled = output<void>();

  private readonly form = viewChild(OgeForm);

  protected readonly opened = signal(false);
  protected readonly isNew = signal(false);
  protected readonly model = signal<SchedulerEditorModel | null>(null);
  private readonly customItems = signal<readonly OgeFormItemData[] | null>(
    null,
  );

  /**
   * The default editor items (`@oge-ui/scheduler-engine`'s
   * `buildSchedulerEditorItems`, shared with the React editor) for `model` —
   * the editor's current model when omitted. Exposed so the shell can pass
   * them to the `editorShowing` hook.
   */
  defaultItems(model?: SchedulerEditorModel): OgeFormItemData[] {
    return buildSchedulerEditorItems(
      this.messages(),
      this.resources(),
      model ?? this.model(),
      this.locale(),
    );
  }

  protected readonly items = computed<readonly OgeFormItemData[]>(
    () => this.customItems() ?? this.defaultItems(),
  );

  /** Opens the editor with `model`; `items` replaces the default form. */
  open(
    model: SchedulerEditorModel,
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

  protected onModelChange(model: SchedulerEditorModel | undefined): void {
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
}
