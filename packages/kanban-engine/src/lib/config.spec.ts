import {
  OGE_DEFAULT_KANBAN_CONFIG,
  OGE_DEFAULT_KANBAN_MESSAGES,
  mergeOgeKanbanMessages,
  resolveOgeKanbanConfig,
} from './config';

describe('kanban config', () => {
  it('returns the base when there is no input', () => {
    expect(resolveOgeKanbanConfig(undefined)).toBe(OGE_DEFAULT_KANBAN_CONFIG);
  });

  it('merges scalars and replaces whole message blocks', () => {
    const toolbar = {
      ...OGE_DEFAULT_KANBAN_MESSAGES.toolbar,
      addCard: 'Neue Karte',
    };
    const config = resolveOgeKanbanConfig({
      locale: 'de-DE',
      cardHeight: 96,
      messages: { toolbar },
    });
    expect(config.locale).toBe('de-DE');
    expect(config.cardHeight).toBe(96);
    expect(config.messages.toolbar.addCard).toBe('Neue Karte');
    expect(config.messages.menu).toBe(OGE_DEFAULT_KANBAN_MESSAGES.menu);
  });

  it('merges over an enclosing resolved config (nested providers)', () => {
    const outer = resolveOgeKanbanConfig({ locale: 'tr-TR' });
    const inner = resolveOgeKanbanConfig({ cardHeight: 80 }, outer);
    expect(inner.locale).toBe('tr-TR');
    expect(inner.cardHeight).toBe(80);
  });

  it('overlays per-instance messages block by block', () => {
    const board = { ...OGE_DEFAULT_KANBAN_MESSAGES.board, noCards: 'Leer' };
    const merged = mergeOgeKanbanMessages(OGE_DEFAULT_KANBAN_CONFIG, {
      board,
    });
    expect(merged.board.noCards).toBe('Leer');
    expect(merged.toolbar).toBe(OGE_DEFAULT_KANBAN_MESSAGES.toolbar);
  });
});
