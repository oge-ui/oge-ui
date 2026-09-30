/**
 * Public option and event types of the Kanban. The shapes live in
 * `@oge-ui/kanban-engine` (shared with the React layer, ADR 0003); this file
 * binds the one layer-specific parameter — the form item type the edit
 * dialog's `formItems` carries.
 */
import type { OgeFormItemData } from '@oge-ui/forms';
import type { OgeKanbanEditDialogShowingEventBase } from '@oge-ui/kanban-engine';

export type {
  OgeKanbanCard,
  OgeKanbanCardAddedEvent,
  OgeKanbanCardAddingEvent,
  OgeKanbanCardDeletedEvent,
  OgeKanbanCardDeletingEvent,
  OgeKanbanCardEvent,
  OgeKanbanCardMovedEvent,
  OgeKanbanCardMovingEvent,
  OgeKanbanCardUpdatedEvent,
  OgeKanbanCardUpdatingEvent,
  OgeKanbanColumn,
  OgeKanbanColumnAddedEvent,
  OgeKanbanColumnAddingEvent,
  OgeKanbanColumnReorderedEvent,
  OgeKanbanFieldExpr,
} from '@oge-ui/kanban-engine';

/**
 * Cancelable `cardEditDialogShowing` payload — one event that is both the
 * veto and the customization point: `formItems` arrives pre-populated with
 * the default form and the handler may mutate or replace it.
 */
export type OgeKanbanEditDialogShowingEvent<T = unknown> =
  OgeKanbanEditDialogShowingEventBase<T, OgeFormItemData>;
