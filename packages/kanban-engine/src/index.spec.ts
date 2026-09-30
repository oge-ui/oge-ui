import * as engine from './index';

// The barrel is both render layers' whole import surface: an export that
// quietly disappears breaks the Angular or the React board without failing
// one of its own specs. Guard the values each layer imports.
describe('@oge-ui/kanban-engine barrel', () => {
  it.each([
    'OGE_DEFAULT_KANBAN_CONFIG',
    'OGE_DEFAULT_KANBAN_MESSAGES',
    'KANBAN_CARD_GAP',
    'KANBAN_DEFAULT_CARD_HEIGHT',
    'KANBAN_EMPTY_EDITOR_CHOICES',
    'beginKanbanGesture',
    'buildKanbanEditorChoices',
    'buildKanbanEditorItems',
    'buildKanbanItem',
    'columnReorderIndex',
    'commitKanbanMove',
    'filterCards',
    'findKanbanCard',
    'groupBoard',
    'isKanbanCardShifted',
    'isKanbanLegalTarget',
    'kanbanAutoScrollStep',
    'kanbanCellWindow',
    'kanbanFocusableKeys',
    'kanbanKeyboardMove',
    'kanbanNavigationTarget',
    'measureKanbanCells',
    'measureKanbanDragGeometry',
    'mergeOgeKanbanMessages',
    'normalizeCards',
    'planKanbanMove',
    'resolveKanbanColumns',
    'resolveKanbanDragTarget',
    'resolveKanbanFields',
    'resolveOgeKanbanConfig',
    'startKanbanFrameLoop',
    'toKanbanAccessor',
  ])('exports %s', (name) => {
    expect((engine as Record<string, unknown>)[name]).toBeDefined();
  });
});
