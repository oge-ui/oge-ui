'use client';

import { useRef } from 'react';
import type {
  KanbanEditorModel,
  OgeKanbanDialogMessages,
} from '@oge-ui/kanban-engine';
import {
  OgeForm,
  type OgeFormHandle,
  type OgeFormItemDefinition,
} from '@oge-ui/react-forms';
import { OgeModal } from '@oge-ui/react-overlay';

/** What the board holds for its (single) edit dialog. */
export interface KanbanDialogState {
  readonly opened: boolean;
  readonly isNew: boolean;
  readonly model: KanbanEditorModel | null;
  readonly items: readonly OgeFormItemDefinition[];
}

export const KANBAN_CLOSED_DIALOG: KanbanDialogState = {
  opened: false,
  isNew: false,
  model: null,
  items: [],
};

/**
 * Internal card editor: an `<OgeModal>` embedding an `<OgeForm>` over the
 * editor model — the React face of the Angular package's
 * `oge-kanban-card-dialog`, with the same markup, the same default items
 * (built by `@oge-ui/kanban-engine`) and the same footer. The board owns the
 * state; this component only renders it and reports what the user did.
 */
export function OgeKanbanCardDialog({
  state,
  messages,
  allowDeleting,
  onModelChange,
  onOpenedChange,
  onSaved,
  onCancelled,
  onDeleteRequested,
}: {
  state: KanbanDialogState;
  messages: OgeKanbanDialogMessages;
  allowDeleting: boolean;
  onModelChange: (model: KanbanEditorModel) => void;
  onOpenedChange: (opened: boolean) => void;
  onSaved: (model: KanbanEditorModel, isNew: boolean) => void;
  onCancelled: () => void;
  onDeleteRequested: (model: KanbanEditorModel) => void;
}) {
  const form = useRef<OgeFormHandle<KanbanEditorModel>>(null);
  const { model, isNew } = state;

  const save = (): void => {
    if (model === null) return;
    const handle = form.current;
    if (handle !== null && !handle.validate()) {
      handle.focusFirstInvalid();
      return;
    }
    onSaved(model, isNew);
  };

  return (
    <OgeModal
      opened={state.opened}
      onOpenedChange={onOpenedChange}
      title={isNew ? messages.titleNew : messages.titleEdit}
      width={560}
      renderFooter={() => (
        <div className="oge-kanban-editor-footer">
          {!isNew && allowDeleting && (
            <button
              type="button"
              className="oge-kanban-btn oge-kanban-btn-danger"
              onClick={() => {
                if (model !== null) onDeleteRequested(model);
              }}
            >
              {messages.deleteCard}
            </button>
          )}
          <span className="oge-kanban-editor-footer-spacer"></span>
          <button
            type="button"
            className="oge-kanban-btn"
            onClick={onCancelled}
          >
            {messages.cancel}
          </button>
          <button
            type="button"
            className="oge-kanban-btn oge-kanban-btn-primary"
            onClick={save}
          >
            {messages.save}
          </button>
        </div>
      )}
    >
      {model !== null && (
        <OgeForm<KanbanEditorModel>
          ref={form}
          className="oge-kanban-editor-form"
          formData={model}
          onFormDataChange={onModelChange}
          items={state.items}
          colCount={2}
          labelLocation="top"
        />
      )}
    </OgeModal>
  );
}
