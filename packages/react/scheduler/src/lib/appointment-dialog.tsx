'use client';

import { useRef } from 'react';
import {
  OgeForm,
  type OgeFormHandle,
  type OgeFormItemDefinition,
} from '@oge-ui/react-forms';
import { OgeModal } from '@oge-ui/react-overlay';
import {
  OGE_DEFAULT_SCHEDULER_MESSAGES,
  schedulerRecurrenceSummary,
  type OgeSchedulerEditorMessages,
  type SchedulerEditorModel,
  type SchedulerEditorResult,
} from '@oge-ui/scheduler-engine';

/** The open editor's state, owned by the shell. */
export interface SchedulerEditorState {
  readonly opened: boolean;
  readonly isNew: boolean;
  readonly model: SchedulerEditorModel | null;
  readonly items: readonly OgeFormItemDefinition[];
}

export interface AppointmentDialogProps {
  readonly state: SchedulerEditorState;
  readonly messages: OgeSchedulerEditorMessages;
  readonly locale?: string;
  readonly onModelChange: (model: SchedulerEditorModel) => void;
  readonly onOpenedChange: (opened: boolean) => void;
  readonly onSaved: (result: SchedulerEditorResult) => void;
}

/**
 * Internal appointment editor: an `<OgeModal>` embedding an `<OgeForm>`
 * over the editor model — the React render of the Angular
 * `<oge-scheduler-appointment-dialog>`. The default items come from the
 * engine's `buildSchedulerEditorItems`, the same objects the Angular dialog
 * hands to `<oge-form>`; the shell may replace them from `onEditorShowing`.
 */
export function SchedulerAppointmentDialog({
  state,
  messages,
  locale,
  onModelChange,
  onOpenedChange,
  onSaved,
}: AppointmentDialogProps) {
  const formRef = useRef<OgeFormHandle<SchedulerEditorModel>>(null);
  // the live recurrence summary ("Every 2 weeks on Monday, 10 times")
  const summary =
    state.model === null
      ? ''
      : schedulerRecurrenceSummary(state.model, messages, locale);

  const save = (): void => {
    const model = state.model;
    if (model === null) return;
    const form = formRef.current;
    if (form !== null && !form.validate()) {
      form.focusFirstInvalid();
      return;
    }
    onOpenedChange(false);
    onSaved({ model, isNew: state.isNew });
  };

  return (
    <OgeModal
      opened={state.opened}
      onOpenedChange={onOpenedChange}
      title={state.isNew ? messages.titleNew : messages.titleEdit}
      width={560}
      renderFooter={() => (
        <div className="oge-scheduler-editor-footer">
          <button
            type="button"
            className="oge-scheduler-btn"
            onClick={() => onOpenedChange(false)}
          >
            {messages.cancel}
          </button>
          <button
            type="button"
            className="oge-scheduler-btn oge-scheduler-btn-primary"
            onClick={save}
          >
            {messages.save}
          </button>
        </div>
      )}
    >
      {state.model !== null && (
        <OgeForm<SchedulerEditorModel>
          ref={formRef}
          className="oge-scheduler-editor-form"
          formData={state.model}
          onFormDataChange={onModelChange}
          items={state.items}
          colCount={2}
          labelLocation="top"
        />
      )}
      {state.model !== null && summary !== '' && (
        <p
          className="oge-scheduler-recurrence-summary"
          aria-live="polite"
          aria-label={
            messages.summaryLabel ??
            OGE_DEFAULT_SCHEDULER_MESSAGES.editor.summaryLabel
          }
        >
          {summary}
        </p>
      )}
    </OgeModal>
  );
}
