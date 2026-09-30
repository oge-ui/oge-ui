import {
  OGE_DEFAULT_GANTT_CONFIG,
  OGE_DEFAULT_GANTT_MESSAGES,
  resolveGanttConfig,
} from './gantt-config';

describe('resolveGanttConfig', () => {
  it('returns the base unchanged without an input', () => {
    expect(resolveGanttConfig(undefined)).toBe(OGE_DEFAULT_GANTT_CONFIG);
  });

  it('merges top-level keys and whole message blocks', () => {
    const toolbar = { ...OGE_DEFAULT_GANTT_MESSAGES.toolbar, today: 'Heute' };
    const resolved = resolveGanttConfig({
      locale: 'de',
      rowHeight: 32,
      messages: { toolbar },
    });
    expect(resolved.locale).toBe('de');
    expect(resolved.rowHeight).toBe(32);
    expect(resolved.undoLimit).toBe(50);
    expect(resolved.messages.toolbar.today).toBe('Heute');
    expect(resolved.messages.menu).toBe(OGE_DEFAULT_GANTT_MESSAGES.menu);
  });

  it('layers over an enclosing config (nested providers)', () => {
    const outer = resolveGanttConfig({ locale: 'de', undoLimit: 5 });
    const inner = resolveGanttConfig({ rowHeight: 40 }, outer);
    expect(inner).toMatchObject({ locale: 'de', undoLimit: 5, rowHeight: 40 });
  });
});
