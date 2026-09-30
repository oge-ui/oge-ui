'use client';

import { useRef } from 'react';
import type {
  GanttEditorModel,
  OgeGanttDialogMessages,
} from '@oge-ui/gantt-engine';
import {
  OgeForm,
  type OgeFormHandle,
  type OgeFormItemDefinition,
} from '@oge-ui/react-forms';
import { OgeModal } from '@oge-ui/react-overlay';

/** What the Gantt hands its dialog: the working model and the form items. */
export interface GanttDialogState {
  readonly model: GanttEditorModel;
  readonly isNew: boolean;
  readonly items: readonly OgeFormItemDefinition[];
}

/**
 * Internal task editor: an `<OgeModal>` embedding an `<OgeForm>` over the
 * working model — the React twin of Angular's `oge-gantt-task-dialog`, with
 * the same markup classes, the same items (built by the engine) and the same
 * validate-then-save flow.
 */
export function GanttTaskDialog({
  state,
  opened,
  messages,
  allowDeleting,
  onModelChange,
  onSave,
  onDelete,
  onClose,
}: {
  state: GanttDialogState | null;
  opened: boolean;
  messages: OgeGanttDialogMessages;
  allowDeleting: boolean;
  onModelChange: (model: GanttEditorModel) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const form = useRef<OgeFormHandle<GanttEditorModel>>(null);
  if (state === null) return null;

  const save = (): void => {
    const handle = form.current;
    if (handle !== null && !handle.validate()) {
      handle.focusFirstInvalid();
      return;
    }
    onSave();
  };

  return (
    <OgeModal
      opened={opened}
      onOpenedChange={(next) => {
        if (!next) onClose();
      }}
      title={state.isNew ? messages.titleNew : messages.titleEdit}
      width={520}
      renderFooter={() => (
        <div className="oge-gantt-dialog-footer">
          {!state.isNew && allowDeleting ? (
            <button
              type="button"
              className="oge-gantt-btn oge-gantt-btn-danger"
              onClick={onDelete}
            >
              {messages.deleteTask}
            </button>
          ) : null}
          <span className="oge-gantt-dialog-spacer" />
          <button type="button" className="oge-gantt-btn" onClick={onClose}>
            {messages.cancel}
          </button>
          <button
            type="button"
            className="oge-gantt-btn oge-gantt-btn-primary"
            onClick={save}
          >
            {messages.save}
          </button>
        </div>
      )}
    >
      <OgeForm<GanttEditorModel>
        ref={form}
        className="oge-gantt-dialog-form"
        formData={state.model}
        onFormDataChange={onModelChange}
        items={state.items}
        colCount={2}
        labelLocation="top"
      />
    </OgeModal>
  );
}
