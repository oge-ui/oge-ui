import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeKanban } from './kanban';
import { OgeKanbanCardTemplate } from './kanban-templates';

interface Task {
  id: number;
  status: string;
  title: string;
  description?: string;
  color?: string;
  lane?: string;
  tags?: string[];
  owner?: string | string[];
  due?: Date;
  priority?: string;
}

@Component({
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="tasks()"
      [columns]="columns()"
      [swimlaneExpr]="swimlaneExpr()"
      [virtualScrolling]="false"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      tagsExpr="tags"
      assigneeExpr="owner"
      dueDateExpr="due"
      priorityExpr="priority"
      [(collapsedColumns)]="collapsedColumns"
      [(selectedCardKey)]="selected"
      locale="en-US"
      style="height: 480px; display: block"
    />
  `,
})
class Host {
  readonly tasks = signal<Task[]>([
    {
      id: 1,
      status: 'todo',
      title: 'Design tokens',
      tags: ['design'],
      priority: 'high',
    },
    { id: 2, status: 'todo', title: 'Write specs', owner: 'Ada Lovelace' },
    {
      id: 3,
      status: 'doing',
      title: 'Build board',
      description: 'Columns and cards',
      due: new Date(2000, 0, 10),
    },
    { id: 4, status: 'done', title: 'Scaffold' },
  ]);
  readonly columns = signal([
    { key: 'todo', title: 'To do', wipLimit: 1 },
    { key: 'doing', title: 'In progress' },
    { key: 'done', title: 'Done' },
  ]);
  readonly swimlaneExpr = signal<string | undefined>(undefined);
  readonly collapsedColumns = signal<readonly string[]>([]);
  readonly selected = signal<unknown>(null);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-kanban>', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  function cards(): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.oge-kanban-card'));
  }

  function cell(column: string): HTMLElement {
    const el = host.querySelector<HTMLElement>(
      `.oge-kanban-cards[data-col="${column}"]`,
    );
    if (el === null) throw new Error(`no cell for ${column}`);
    return el;
  }

  it('renders declared columns with counts and cards', () => {
    const headers = Array.from(
      host.querySelectorAll('.oge-kanban-column-header'),
    );
    expect(headers).toHaveLength(3);
    expect(headers[0].textContent).toContain('To do');
    expect(cards()).toHaveLength(4);
    expect(cell('todo').querySelectorAll('.oge-kanban-card')).toHaveLength(2);
  });

  it('columns are labeled lists of card items (not a listbox)', () => {
    const list = cell('todo');
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toContain('To do');
    const card = cards()[0];
    expect(card.parentElement?.getAttribute('role')).toBe('listitem');
    expect(card.getAttribute('role')).toBe('group');
    expect(card.getAttribute('aria-roledescription')).toBe('card');
    expect(card.getAttribute('aria-label')).toBe('Design tokens, in To do');
    expect(host.querySelector('[role="option"], [role="listbox"]')).toBeNull();
  });

  it('quick actions are labeled buttons, parked outside the column stop', () => {
    const [first, second] = cards();
    const edit = first.querySelector<HTMLButtonElement>(
      'button.oge-kanban-card-action-edit',
    );
    expect(edit?.getAttribute('aria-label')).toBe('Edit Design tokens');
    expect(
      first
        .querySelector('button.oge-kanban-card-action-delete')
        ?.getAttribute('aria-label'),
    ).toBe('Delete Design tokens');
    expect(first.querySelector('[aria-hidden="true"] button')).toBeNull();
    // the column's stop card keeps its buttons in the Tab sequence...
    expect(first.tabIndex).toBe(0);
    expect(edit?.hasAttribute('tabindex')).toBe(false);
    // ...every other card's content waits at -1
    expect(second.tabIndex).toBe(-1);
    expect(
      second
        .querySelector('.oge-kanban-card-action-edit')
        ?.getAttribute('tabindex'),
    ).toBe('-1');
  });

  it('the stop moves with focus and takes the card content along', async () => {
    const [first] = cards();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    const [nowFirst, nowSecond] = cards();
    expect(nowSecond.tabIndex).toBe(0);
    expect(
      nowSecond
        .querySelector('.oge-kanban-card-action-edit')
        ?.hasAttribute('tabindex'),
    ).toBe(false);
    expect(
      nowFirst
        .querySelector('.oge-kanban-card-action-edit')
        ?.getAttribute('tabindex'),
    ).toBe('-1');
  });

  it('keys from a quick action stay with it; Escape returns to the card', async () => {
    const [first] = cards();
    const edit = first.querySelector<HTMLButtonElement>(
      '.oge-kanban-card-action-edit',
    ) as HTMLButtonElement;
    edit.focus();
    edit.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    expect(document.activeElement).toBe(edit);
    edit.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(fixture);
    expect(document.activeElement).toBe(cards()[0]);
  });

  it('a WIP limit overflow turns the count badge to danger', () => {
    // todo has 2 cards, limit 1
    const badge = host.querySelector('.oge-kanban-count-danger');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('2');
    expect(badge?.textContent).toContain('/1');
  });

  it('renders card anatomy: tags, avatars, due badge, priority', () => {
    expect(host.querySelector('.oge-kanban-tag')?.textContent).toBe('design');
    expect(host.querySelector('.oge-kanban-avatar')?.textContent?.trim()).toBe(
      'AL',
    );
    const due = host.querySelector('.oge-kanban-due');
    expect(due?.classList.contains('oge-kanban-due-overdue')).toBe(true);
    expect(
      host.querySelector('.oge-kanban-priority')?.getAttribute('data-priority'),
    ).toBe('high');
  });

  it('click selects the card (two-way selectedCardKey)', async () => {
    cards()[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBe(1);
    expect(cards()[0].getAttribute('aria-current')).toBe('true');
    expect(cards()[1].hasAttribute('aria-current')).toBe(false);
  });

  it('collapsing a column renders the slim pill and hides its cards', async () => {
    fixture.componentInstance.collapsedColumns.set(['todo']);
    await settle(fixture);
    expect(host.querySelector('.oge-kanban-column-collapsed')).not.toBeNull();
    expect(cards()).toHaveLength(2);
    const pill = host.querySelector<HTMLButtonElement>(
      '.oge-kanban-column-collapsed',
    );
    pill?.click();
    await settle(fixture);
    expect(fixture.componentInstance.collapsedColumns()).toEqual([]);
  });

  it('derives columns from the data when none are declared', async () => {
    fixture.componentInstance.columns.set(
      undefined as unknown as { key: string }[],
    );
    await settle(fixture);
    const headers = Array.from(
      host.querySelectorAll('.oge-kanban-column-header'),
    );
    expect(headers.map((h) => h.textContent?.trim().slice(0, 4))).toEqual([
      'todo',
      'doin',
      'done',
    ]);
  });

  it('swimlanes group cards into labeled lanes', async () => {
    fixture.componentInstance.tasks.update((tasks) =>
      tasks.map((task, index) => ({
        ...task,
        lane: index % 2 === 0 ? 'Team A' : 'Team B',
      })),
    );
    fixture.componentInstance.swimlaneExpr.set('lane');
    await settle(fixture);
    const laneHeaders = Array.from(
      host.querySelectorAll('.oge-kanban-lane-header'),
    );
    expect(laneHeaders).toHaveLength(2);
    expect(laneHeaders[0].textContent).toContain('Team A');
    laneHeaders[0].click();
    await settle(fixture);
    // Team A holds cards 1 and 3
    expect(cards()).toHaveLength(2);
  });

  it('arrow keys rove between cards and columns', async () => {
    const [first] = cards();
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(fixture);
    const second = cards()[1];
    expect(document.activeElement).toBe(second);
    second.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    expect(document.activeElement?.textContent).toContain('Build board');
  });

  it('an empty data source renders the friendly empty state', async () => {
    fixture.componentInstance.tasks.set([]);
    await settle(fixture);
    expect(host.querySelector('.oge-kanban-empty')).not.toBeNull();
    expect(host.querySelector('.oge-kanban-empty-title')?.textContent).toBe(
      'No cards yet',
    );
  });
});

describe('<oge-kanban> card template', () => {
  it('replaces the card body with template context', async () => {
    @Component({
      imports: [OgeKanban, OgeKanbanCardTemplate],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        >
          <ng-template ogeKanbanCardTemplate let-card let-column="column">
            <span class="custom-card">{{ card.title }} @ {{ column.key }}</span>
          </ng-template>
        </oge-kanban>
      `,
    })
    class TemplateHost {
      readonly tasks: Task[] = [{ id: 1, status: 'todo', title: 'Custom' }];
    }
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    const custom = (fixture.nativeElement as HTMLElement).querySelector(
      '.custom-card',
    );
    expect(custom?.textContent).toBe('Custom @ todo');
  });

  it('interactive template content is reachable and keeps its own keys', async () => {
    @Component({
      imports: [OgeKanban, OgeKanbanCardTemplate],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
          (cardDblClick)="dblClicks = dblClicks + 1"
        >
          <ng-template ogeKanbanCardTemplate let-card>
            <span>{{ card.title }}</span>
            <button type="button" class="tpl-btn" (click)="pressed = card.key">
              Open {{ card.title }}
            </button>
            <input class="tpl-input" aria-label="note" />
          </ng-template>
        </oge-kanban>
      `,
    })
    class InteractiveHost {
      readonly tasks: Task[] = [
        { id: 1, status: 'todo', title: 'One' },
        { id: 2, status: 'todo', title: 'Two' },
      ];
      pressed: unknown = null;
      dblClicks = 0;
    }
    const fixture = TestBed.createComponent(InteractiveHost);
    await settle(fixture);
    const root = fixture.nativeElement as HTMLElement;
    const cardEls = Array.from(
      root.querySelectorAll<HTMLElement>('.oge-kanban-card'),
    );
    const [btn1, btn2] = Array.from(
      root.querySelectorAll<HTMLButtonElement>('.tpl-btn'),
    );
    expect(btn1.hasAttribute('tabindex')).toBe(false);
    expect(btn2.getAttribute('tabindex')).toBe('-1');

    btn1.click();
    expect(fixture.componentInstance.pressed).toBe(1);

    // a double click on a control does not open the card editor path
    btn1.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(fixture.componentInstance.dblClicks).toBe(0);

    // arrow keys inside the input move its caret, not the board's focus
    const input = root.querySelector<HTMLInputElement>(
      '.tpl-input',
    ) as HTMLInputElement;
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(fixture);
    expect(document.activeElement).toBe(input);

    // the card surface itself still double-clicks as before
    cardEls[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(fixture.componentInstance.dblClicks).toBe(1);
  });
});
