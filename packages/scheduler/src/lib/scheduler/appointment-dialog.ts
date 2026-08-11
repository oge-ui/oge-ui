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
import type { OgeSchedulerEditorMessages } from '../config';
import type { OgeSchedulerResource } from '../scheduler-types';

/** The editor's working model (independent of the user's item shape). */
export interface SchedulerEditorModel {
  text: string;
  allDay: boolean;
  startDate: Date;
  endDate: Date;
  color?: string;
  location?: string;
  description?: string;
  /** Recurrence section (mapped to/from the RRULE by the shell). */
  repeat: 'never' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  /** Weekly BYDAY weekdays (0 = Sunday). */
  byDays: number[];
  endMode: 'never' | 'count' | 'until';
  count: number;
  until?: Date;
  /** Minutes before start a reminder fires; `null` = none. */
  reminder: number | null;
  /** Assigned resource ids, keyed by the resource `fieldExpr`. */
  resourceValues: Record<string, unknown>;
}

/** The dialog's save payload. */
export interface SchedulerEditorResult {
  readonly model: SchedulerEditorModel;
  readonly isNew: boolean;
}

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
        <button
          type="button"
          class="oge-scheduler-btn"
          (click)="cancel()"
        >
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

  /** The default editor items; exposed so the shell can pass them to hooks. */
  defaultItems(): OgeFormItemData[] {
    const messages = this.messages();
    const allDay = this.model()?.allDay === true;
    const repeat = this.model()?.repeat ?? 'never';
    const endMode = this.model()?.endMode ?? 'never';
    return [
      {
        field: 'text',
        label: messages.subjectLabel,
        placeholder: messages.subjectPlaceholder,
        isRequired: true,
        colSpan: 2,
      },
      {
        field: 'location',
        label: messages.locationLabel,
        placeholder: messages.locationPlaceholder,
        colSpan: 2,
      },
      {
        field: 'startDate',
        label: messages.startDateLabel,
        editorType: 'dateBox',
        editorOptions: { type: allDay ? 'date' : 'datetime' },
      },
      {
        field: 'endDate',
        label: messages.endDateLabel,
        editorType: 'dateBox',
        editorOptions: { type: allDay ? 'date' : 'datetime' },
        validationRules: [
          {
            type: 'custom',
            validate: (context) => {
              const data = context.data as unknown as SchedulerEditorModel;
              return data.endDate instanceof Date &&
                data.startDate instanceof Date &&
                data.endDate.getTime() <= data.startDate.getTime()
                ? messages.endBeforeStart
                : null;
            },
          },
        ],
      },
      {
        field: 'allDay',
        label: messages.allDayLabel,
        editorType: 'switch',
      },
      {
        field: 'color',
        label: messages.colorLabel,
        editorType: 'colorBox',
      },
      ...this.resources().map((resource) => ({
        field: `resourceValues.${resource.fieldExpr}`,
        label: resource.label ?? resource.fieldExpr,
        editorType: 'selectBox' as const,
        editorOptions: {
          items: resource.items as unknown as readonly unknown[],
          valueExpr: 'id',
          displayExpr: 'text',
          showClearButton: true,
        },
      })),
      {
        field: 'reminder',
        label: messages.reminderLabel,
        editorType: 'selectBox',
        editorOptions: {
          items: this.reminderItems(),
          valueExpr: 'value',
          displayExpr: 'text',
        },
      },
      {
        field: 'repeat',
        label: messages.repeatLabel,
        editorType: 'selectBox',
        editorOptions: {
          items: (
            ['never', 'daily', 'weekly', 'monthly', 'yearly'] as const
          ).map((value) => ({ value, text: messages.repeatOptions[value] })),
          valueExpr: 'value',
          displayExpr: 'text',
        },
      },
      {
        field: 'interval',
        label: messages.intervalLabel,
        editorType: 'numberBox',
        editorOptions: { min: 1, max: 99, showSpinButtons: true },
        visible: repeat !== 'never',
      },
      {
        field: 'byDays',
        label: messages.repeatOnLabel,
        editorType: 'tagBox',
        editorOptions: {
          items: this.weekdayItems(),
          valueExpr: 'value',
          displayExpr: 'text',
        },
        colSpan: 2,
        visible: repeat === 'weekly',
      },
      {
        field: 'endMode',
        label: messages.endLabel,
        editorType: 'selectBox',
        editorOptions: {
          items: (['never', 'count', 'until'] as const).map((value) => ({
            value,
            text: messages.endOptions[value],
          })),
          valueExpr: 'value',
          displayExpr: 'text',
        },
        visible: repeat !== 'never',
      },
      {
        field: 'count',
        label: messages.countLabel,
        editorType: 'numberBox',
        editorOptions: { min: 1, max: 999, showSpinButtons: true },
        visible: repeat !== 'never' && endMode === 'count',
      },
      {
        field: 'until',
        label: messages.untilLabel,
        editorType: 'dateBox',
        editorOptions: { type: 'date' },
        visible: repeat !== 'never' && endMode === 'until',
      },
      {
        field: 'description',
        label: messages.descriptionLabel,
        placeholder: messages.descriptionPlaceholder,
        editorType: 'textArea',
        editorOptions: { rows: 3, autoResize: true },
        colSpan: 2,
      },
    ];
  }

  /** Reminder lead-time presets. */
  private reminderItems(): { value: number | null; text: string }[] {
    const messages = this.messages();
    return [
      { value: null, text: messages.reminderNone },
      { value: 0, text: messages.reminderAtStart },
      ...[5, 10, 15, 30, 60].map((minutes) => ({
        value: minutes,
        text: messages.reminderBefore.replace('{minutes}', String(minutes)),
      })),
    ];
  }

  /** Localized weekday choices for the weekly BYDAY picker. */
  private weekdayItems(): { value: number; text: string }[] {
    const format = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    // Jan 4–10 2026 is a Sunday-first week
    return Array.from({ length: 7 }, (_, weekday) => ({
      value: weekday,
      text: format.format(new Date(2026, 0, 4 + weekday)),
    }));
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
