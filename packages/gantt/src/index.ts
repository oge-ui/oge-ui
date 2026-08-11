// Public API of @oge-ui/gantt (commercial — see LICENSE).
// Explicit named exports only (house rule): internal panes and the engine
// stay unexported.

export {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
  OGE_GANTT_CONFIG,
  provideOgeGanttConfig,
  type OgeGanttAnnouncementMessages,
  type OgeGanttColumnMessages,
  type OgeGanttConfig,
  type OgeGanttConfigInput,
  type OgeGanttDialogMessages,
  type OgeGanttGridMessages,
  type OgeGanttMessages,
  type OgeGanttToolbarMessages,
} from './lib/config';
