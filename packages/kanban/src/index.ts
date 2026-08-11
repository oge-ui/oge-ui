// Explicit named exports only (house rule): the engine stays unexported.
export {
  OGE_DEFAULT_KANBAN_CONFIG,
  OGE_DEFAULT_KANBAN_MESSAGES,
  OGE_KANBAN_CONFIG,
  provideOgeKanbanConfig,
  type OgeKanbanAnnouncementMessages,
  type OgeKanbanBoardMessages,
  type OgeKanbanConfig,
  type OgeKanbanConfigInput,
  type OgeKanbanDialogMessages,
  type OgeKanbanMenuMessages,
  type OgeKanbanMessages,
  type OgeKanbanToolbarMessages,
} from './lib/config';
export { OgeKanban } from './lib/kanban/kanban';
export {
  OgeKanbanCardTemplate,
  OgeKanbanColumnHeaderTemplate,
  type OgeKanbanCardTemplateContext,
  type OgeKanbanColumnHeaderTemplateContext,
} from './lib/kanban/kanban-templates';
export type { KanbanEditorModel as OgeKanbanEditorModel } from './lib/kanban/kanban-card-dialog';
export type {
  OgeKanbanCard,
  OgeKanbanEditDialogShowingEvent,
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
} from './lib/kanban-types';
