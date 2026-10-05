import {
  isInsideKanbanHost,
  kanbanBoardPeers,
  kanbanPeerAt,
  nextKanbanBoardId,
  registerKanbanBoard,
  type KanbanBoardPeer,
} from './board-registry';

function peer(
  id: string,
  group: string,
  rect: { left: number; top: number; right: number; bottom: number } | null,
): KanbanBoardPeer {
  const host = document.createElement('div');
  host.getBoundingClientRect = () =>
    ({
      left: rect?.left ?? 0,
      top: rect?.top ?? 0,
      right: rect?.right ?? 0,
      bottom: rect?.bottom ?? 0,
      width: rect ? rect.right - rect.left : 0,
      height: rect ? rect.bottom - rect.top : 0,
    }) as DOMRect;
  return {
    id,
    group,
    host,
    targetAt: () => null,
    preview: () => undefined,
    receive: () => null,
    columns: () => [],
  };
}

describe('kanban board registry', () => {
  it('lists the other peers of a group and unregisters', () => {
    const a = peer('a', 'g', null);
    const b = peer('b', 'g', null);
    const c = peer('c', 'other', null);
    const offs = [a, b, c].map(registerKanbanBoard);
    expect(kanbanBoardPeers('g', 'a').map((p) => p.id)).toEqual(['b']);
    expect(kanbanBoardPeers(undefined, 'a')).toEqual([]);
    offs.forEach((off) => off());
    expect(kanbanBoardPeers('g', 'x')).toEqual([]);
  });

  it('hit-tests measured peers only', () => {
    const a = peer('a', 'g', { left: 0, top: 0, right: 100, bottom: 100 });
    const b = peer('b', 'g', { left: 200, top: 0, right: 300, bottom: 100 });
    const ghost = peer('c', 'g', null);
    const offs = [a, b, ghost].map(registerKanbanBoard);
    expect(kanbanPeerAt('g', 'a', 250, 50)?.id).toBe('b');
    expect(kanbanPeerAt('g', 'b', 250, 50)).toBeNull();
    expect(kanbanPeerAt('g', 'z', 150, 50)).toBeNull();
    offs.forEach((off) => off());
  });

  it('treats an unmeasured own host as containing every point', () => {
    expect(isInsideKanbanHost(peer('x', 'g', null).host, 999, 999)).toBe(true);
    const sized = peer('y', 'g', { left: 0, top: 0, right: 10, bottom: 10 });
    expect(isInsideKanbanHost(sized.host, 20, 5)).toBe(false);
    expect(isInsideKanbanHost(sized.host, 5, 5)).toBe(true);
  });

  it('hands out distinct fallback ids', () => {
    expect(nextKanbanBoardId()).not.toBe(nextKanbanBoardId());
  });
});
