import { kanbanCardActionLabel } from './board-view';
import { OGE_DEFAULT_KANBAN_MESSAGES } from './config';
import {
  focusOwningKanbanCard,
  isKanbanCardContentTarget,
  syncKanbanCardTabStops,
} from './dom';
import { kanbanCardKeyRoute } from './interaction';
import type { KanbanCard } from './board-model';

function board(): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <div class="oge-kanban-cards" role="list">
      <div role="listitem">
        <div class="oge-kanban-card" data-key="a" tabindex="0">
          <span class="title">A</span>
          <button type="button" class="act">Edit</button>
          <a href="#x" class="link">Open</a>
        </div>
      </div>
      <div role="listitem">
        <div class="oge-kanban-card" data-key="b" tabindex="-1">
          <button type="button" class="act">Edit</button>
          <input class="field" tabindex="2" />
          <span class="custom" tabindex="-1">x</span>
        </div>
      </div>
    </div>`;
  document.body.appendChild(host);
  return host;
}

describe('kanban card semantics', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('parks the content of non-stop cards at tabindex -1 and restores it', () => {
    const host = board();
    syncKanbanCardTabStops(host);
    const a = host.querySelector('[data-key="a"]') as HTMLElement;
    const b = host.querySelector('[data-key="b"]') as HTMLElement;
    expect(a.querySelector('.act')?.hasAttribute('tabindex')).toBe(false);
    expect(a.querySelector('.link')?.hasAttribute('tabindex')).toBe(false);
    expect(b.querySelector('.act')?.getAttribute('tabindex')).toBe('-1');
    expect(b.querySelector('.field')?.getAttribute('tabindex')).toBe('-1');

    // idempotent: a second pass does not stash the parked value
    syncKanbanCardTabStops(host);
    expect(
      b.querySelector('.field')?.getAttribute('data-oge-kanban-tabindex'),
    ).toBe('2');

    // the stop moves to b: its content comes back exactly as authored
    a.setAttribute('tabindex', '-1');
    b.setAttribute('tabindex', '0');
    syncKanbanCardTabStops(host);
    expect(b.querySelector('.act')?.hasAttribute('tabindex')).toBe(false);
    expect(b.querySelector('.field')?.getAttribute('tabindex')).toBe('2');
    expect(b.querySelector('.custom')?.getAttribute('tabindex')).toBe('-1');
    expect(a.querySelector('.act')?.getAttribute('tabindex')).toBe('-1');
  });

  it('tells interactive card content from the card surface', () => {
    const host = board();
    const a = host.querySelector('[data-key="a"]') as HTMLElement;
    expect(isKanbanCardContentTarget(a, a)).toBe(false);
    expect(isKanbanCardContentTarget(a.querySelector('.title'), a)).toBe(false);
    expect(isKanbanCardContentTarget(a.querySelector('.act'), a)).toBe(true);
    expect(isKanbanCardContentTarget(a.querySelector('.link'), a)).toBe(true);
    // content of another card is not this card's
    const other = host.querySelector('[data-key="b"] .act');
    expect(isKanbanCardContentTarget(other, a)).toBe(false);
    expect(isKanbanCardContentTarget(null, a)).toBe(false);
  });

  it('routes keys between the card and its content', () => {
    const card = {} as EventTarget;
    const inner = {} as EventTarget;
    const base = { currentTarget: card, defaultPrevented: false };
    expect(kanbanCardKeyRoute({ ...base, key: 'Enter', target: card })).toBe(
      'card',
    );
    expect(
      kanbanCardKeyRoute({ ...base, key: 'ArrowLeft', target: inner }),
    ).toBe('content');
    expect(kanbanCardKeyRoute({ ...base, key: 'Escape', target: inner })).toBe(
      'return',
    );
    expect(
      kanbanCardKeyRoute({
        ...base,
        key: 'Escape',
        target: inner,
        defaultPrevented: true,
      }),
    ).toBe('content');
  });

  it('returns focus to the owning card', () => {
    const host = board();
    const b = host.querySelector('[data-key="b"]') as HTMLElement;
    expect(focusOwningKanbanCard(b.querySelector('.act') as Element)).toBe(
      true,
    );
    expect(document.activeElement).toBe(b);
    expect(focusOwningKanbanCard(host)).toBe(false);
  });

  it('labels the quick actions from the catalog', () => {
    const card = { title: 'Ship it' } as KanbanCard<unknown>;
    const messages = OGE_DEFAULT_KANBAN_MESSAGES.board;
    expect(kanbanCardActionLabel(messages, 'edit', card)).toBe('Edit Ship it');
    expect(kanbanCardActionLabel(messages, 'delete', card)).toBe(
      'Delete Ship it',
    );
    expect(messages.cardRoleDescription).toBe('card');
  });
});
