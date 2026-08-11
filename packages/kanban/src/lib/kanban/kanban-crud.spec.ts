import { Component, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeKanban } from './kanban';
import type {
  OgeKanbanCardDeletingEvent,
  OgeKanbanCardMovedEvent,
  OgeKanbanCardMovingEvent,
  OgeKanbanEditDialogShowingEvent,
} from '../kanban-types';

interface Task {
  id: number;
  status: string;
  title: string;
  rank?: number;
}

@Component({
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="tasks()"
      [columns]="columns"
      [orderExpr]="orderExpr()"
      [virtualScrolling]="false"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      locale="en-US"
      (cardDeleting)="deleting.push($event)"
      (cardDeleted)="deleted.push($event)"
      (cardMoving)="moving.push($event)"
      (cardMoved)="moved.push($event)"
      (cardEditDialogShowing)="showing.push($event)"
      style="height: 480px; display: block"
    />
  `,
})
class Host {
  readonly kanban = viewChild.required(OgeKanban<Task>);
  readonly tasks = signal<Task[]>([
    { id: 1, status: 'todo', title: 'One' },
    { id: 2, status: 'todo', title: 'Two' },
    { id: 3, status: 'doing', title: 'Three' },
  ]);
  readonly columns = [{ key: 'todo' }, { key: 'doing' }, { key: 'done' }];
  readonly orderExpr = signal<string | undefined>(undefined);
  readonly deleting: OgeKanbanCardDeletingEvent<Task>[] = [];
  readonly deleted: unknown[] = [];
  readonly moving: OgeKanbanCardMovingEvent<Task>[] = [];
  readonly moved: OgeKanbanCardMovedEvent<Task>[] = [];
  readonly showing: OgeKanbanEditDialogShowingEvent<Task>[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-kanban> CRUD + interactions', () => {
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

  function titlesIn(column: string): string[] {
    return Array.from(
      host.querySelectorAll(
        `.oge-kanban-cards[data-col="${column}"] .oge-kanban-card-title`,
      ),
    ).map((el) => el.textContent ?? '');
  }

  it('renders the toolbar: add, collapse pill, search', () => {
    expect(host.querySelector('.oge-kanban-toolbar')).not.toBeNull();
    expect(host.querySelector('.oge-kanban-btn-add')?.textContent).toContain(
      'New card',
    );
    expect(host.querySelector('.oge-kanban-search-input')).not.toBeNull();
  });

  it('search filters cards fold-insensitively and clears', async () => {
    const input = host.querySelector<HTMLInputElement>(
      '.oge-kanban-search-input',
    );
    input!.value = 'THREE';
    input!.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(cards()).toHaveLength(1);
    expect(cards()[0].textContent).toContain('Three');

    input!.value = 'no such card';
    input!.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(
      host.querySelector('.oge-kanban-empty-title')?.textContent?.trim(),
    ).toBe('No cards match your search');

    host.querySelector<HTMLButtonElement>('.oge-kanban-search-clear')?.click();
    await settle(fixture);
    expect(cards()).toHaveLength(3);
  });

  it('dblclick opens the edit dialog through cardEditDialogShowing', async () => {
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    const { showing } = fixture.componentInstance;
    expect(showing).toHaveLength(1);
    expect(showing[0].isNew).toBe(false);
    expect(showing[0].card?.id).toBe(1);
    expect(showing[0].formItems.length).toBeGreaterThan(3);
    expect(document.querySelector('.oge-modal')).not.toBeNull();
  });

  it('cancelling cardEditDialogShowing keeps the dialog closed', async () => {
    const kanban = fixture.componentInstance.kanban();
    const sub = kanban.cardEditDialogShowing.subscribe((event) => {
      event.cancel = true;
    });
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(document.querySelector('.oge-modal')).toBeNull();
    sub.unsubscribe();
  });

  it('Delete key runs the cancelable delete pipeline', async () => {
    cards()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.deleting).toHaveLength(1);
    expect(fixture.componentInstance.deleted).toHaveLength(1);
    expect(cards()).toHaveLength(2);
    // the input array was never mutated
    expect(fixture.componentInstance.tasks()).toHaveLength(3);
  });

  it('a cancelled cardDeleting leaves the board unchanged', async () => {
    const kanban = fixture.componentInstance.kanban();
    const sub = kanban.cardDeleting.subscribe((event) => {
      event.cancel = true;
    });
    cards()[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
    );
    await settle(fixture);
    expect(cards()).toHaveLength(3);
    expect(fixture.componentInstance.deleted).toHaveLength(0);
    sub.unsubscribe();
  });

  it('moveCard commits through cardMoving → cardMoved and reorders the store', async () => {
    fixture.componentInstance.kanban().moveCard(1, 'doing', 0);
    await settle(fixture);
    const { moving, moved } = fixture.componentInstance;
    expect(moving).toHaveLength(1);
    expect(moving[0].fromColumn).toBe('todo');
    expect(moving[0].toColumn).toBe('doing');
    expect(moved).toHaveLength(1);
    expect(titlesIn('doing')).toEqual(['One', 'Three']);
    expect(titlesIn('todo')).toEqual(['Two']);
  });

  it('a cancelled cardMoving leaves every column unchanged', async () => {
    const kanban = fixture.componentInstance.kanban();
    const sub = kanban.cardMoving.subscribe((event) => {
      event.cancel = true;
    });
    kanban.moveCard(1, 'doing', 0);
    await settle(fixture);
    expect(titlesIn('todo')).toEqual(['One', 'Two']);
    expect(fixture.componentInstance.moved).toHaveLength(0);
    sub.unsubscribe();
  });

  it('moveCard with an orderExpr writes a midpoint order instead of reordering', async () => {
    fixture.componentInstance.tasks.set([
      { id: 1, status: 'todo', title: 'One', rank: 0 },
      { id: 2, status: 'todo', title: 'Two', rank: 1 },
      { id: 3, status: 'todo', title: 'Three', rank: 2 },
    ]);
    fixture.componentInstance.orderExpr.set('rank');
    await settle(fixture);
    // move Three between One and Two
    fixture.componentInstance.kanban().moveCard(3, 'todo', 1);
    await settle(fixture);
    expect(titlesIn('todo')).toEqual(['One', 'Three', 'Two']);
    const movedItem = fixture.componentInstance.moved[0]?.card as Task;
    expect(movedItem.rank).toBe(0.5);
  });

  it('right-click opens the built-in card menu; move-to entry moves', async () => {
    cards()[0].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const menu = host.querySelector('.oge-kanban-menu');
    expect(menu).not.toBeNull();
    const items = Array.from(
      menu!.querySelectorAll<HTMLButtonElement>('.oge-kanban-menu-item'),
    );
    expect(items[0].textContent).toContain('Edit');
    const moveToDone = items.find((item) => item.textContent?.includes('done'));
    moveToDone!.click();
    await settle(fixture);
    expect(host.querySelector('.oge-kanban-menu')).toBeNull();
    expect(titlesIn('done')).toEqual(['One']);
  });

  it('an available action preventDefaults the native menu', async () => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    cards()[0].dispatchEvent(event);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
  });

  it('the per-column add button and empty-column affordances render', () => {
    const addButtons = host.querySelectorAll('.oge-kanban-add-card');
    expect(addButtons.length).toBe(3);
    expect(host.querySelector('.oge-kanban-column-add')).not.toBeNull();
    // 'done' has no cards → empty hint
    expect(
      host.querySelector(
        '.oge-kanban-cards[data-col="done"] .oge-kanban-cell-empty',
      ),
    ).not.toBeNull();
  });

  it('readOnly keeps the native context menu (no built-in menu)', async () => {
    @Component({
      imports: [OgeKanban],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          [readOnly]="true"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        />
      `,
    })
    class ReadOnlyHost {
      readonly tasks: Task[] = [{ id: 1, status: 'todo', title: 'One' }];
    }
    const roFixture = TestBed.createComponent(ReadOnlyHost);
    await settle(roFixture);
    const roHost = roFixture.nativeElement as HTMLElement;
    const card = roHost.querySelector<HTMLElement>('.oge-kanban-card');
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    card!.dispatchEvent(event);
    await settle(roFixture);
    expect(event.defaultPrevented).toBe(false);
    expect(roHost.querySelector('.oge-kanban-menu')).toBeNull();
    // read-only also hides toolbar add and hover actions
    expect(roHost.querySelector('.oge-kanban-btn-add')).toBeNull();
    expect(roHost.querySelector('.oge-kanban-card-actions')).toBeNull();
  });

  it('minCount renders the warning badge; transitionColumns/allowDrop gate the menu', async () => {
    @Component({
      imports: [OgeKanban],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          [columns]="columns"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        />
      `,
    })
    class GatedHost {
      readonly tasks: Task[] = [
        { id: 1, status: 'todo', title: 'One' },
        { id: 2, status: 'done', title: 'Two' },
      ];
      readonly columns = [
        { key: 'todo', transitionColumns: ['doing'] },
        { key: 'doing', minCount: 2 },
        { key: 'done', allowDrop: false },
      ];
    }
    const gatedFixture = TestBed.createComponent(GatedHost);
    await settle(gatedFixture);
    const gatedHost = gatedFixture.nativeElement as HTMLElement;
    // doing has 0 cards, minCount 2 → warning badge
    expect(gatedHost.querySelector('.oge-kanban-count-warn')).not.toBeNull();
    // card in todo: menu move-to lists only 'doing' (transitionColumns), and
    // 'done' (allowDrop:false) never appears
    gatedHost
      .querySelector<HTMLElement>('.oge-kanban-card')!
      .dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      );
    await settle(gatedFixture);
    const moveItems = Array.from(
      gatedHost.querySelectorAll('.oge-kanban-menu-item-move'),
    ).map((el) => el.textContent?.trim());
    expect(moveItems).toEqual(['doing']);
  });

  it('closeDialog() closes programmatically and cardEditDialogHidden fires', async () => {
    const kanban = fixture.componentInstance.kanban();
    let hidden = 0;
    const sub = kanban.cardEditDialogHidden.subscribe(() => hidden++);
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(document.querySelector('.oge-modal')).not.toBeNull();
    kanban.closeDialog();
    await settle(fixture);
    expect(document.querySelector('.oge-modal')).toBeNull();
    expect(hidden).toBe(1);
    sub.unsubscribe();
  });

  it('a derived column survives its last card leaving it', async () => {
    @Component({
      imports: [OgeKanban],
      template: `
        <oge-kanban
          [dataSource]="tasks()"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        />
      `,
    })
    class DerivedHost {
      readonly tasks = signal<Task[]>([
        { id: 1, status: 'todo', title: 'One' },
        { id: 2, status: 'doing', title: 'Two' },
      ]);
    }
    const derivedFixture = TestBed.createComponent(DerivedHost);
    await settle(derivedFixture);
    const derivedHost = derivedFixture.nativeElement as HTMLElement;
    expect(
      derivedHost.querySelectorAll('.oge-kanban-column-header'),
    ).toHaveLength(2);
    // empty 'doing' — the column must stay
    derivedFixture.componentInstance.tasks.set([
      { id: 1, status: 'todo', title: 'One' },
    ]);
    await settle(derivedFixture);
    expect(
      derivedHost.querySelectorAll('.oge-kanban-column-header'),
    ).toHaveLength(2);
  });

  it('the "+ Add column" composer creates a runtime column through columnAdding', async () => {
    @Component({
      imports: [OgeKanban],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          [allowColumnAdding]="true"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        />
      `,
    })
    class AddColumnHost {
      readonly tasks: Task[] = [{ id: 1, status: 'todo', title: 'One' }];
    }
    const addFixture = TestBed.createComponent(AddColumnHost);
    await settle(addFixture);
    const addHost = addFixture.nativeElement as HTMLElement;
    addHost.querySelector<HTMLButtonElement>('.oge-kanban-add-column')?.click();
    await settle(addFixture);
    const input = addHost.querySelector<HTMLInputElement>(
      '.oge-kanban-add-column-input',
    );
    expect(input).not.toBeNull();
    input!.value = 'Review';
    input!.dispatchEvent(new Event('input'));
    input!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await settle(addFixture);
    const headers = Array.from(
      addHost.querySelectorAll('.oge-kanban-column-header'),
    ).map((el) => el.textContent?.trim().slice(0, 6));
    expect(headers).toContain('Review');
  });

  it("cardColorMode 'surface' tints the card instead of the stripe", async () => {
    @Component({
      imports: [OgeKanban],
      template: `
        <oge-kanban
          [dataSource]="tasks"
          cardColorMode="surface"
          [virtualScrolling]="false"
          keyExpr="id"
          columnExpr="status"
          titleExpr="title"
        />
      `,
    })
    class TintHost {
      readonly tasks = [
        {
          id: 1,
          status: 'todo',
          title: 'One',
          color: '#f00',
        } as unknown as Task,
      ];
    }
    const tintFixture = TestBed.createComponent(TintHost);
    await settle(tintFixture);
    const tintHost = tintFixture.nativeElement as HTMLElement;
    const card = tintHost.querySelector('.oge-kanban-card');
    expect(card?.classList.contains('oge-kanban-card-tinted')).toBe(true);
    expect(tintHost.querySelector('.oge-kanban-card-stripe')).toBeNull();
  });

  it('the default dialog renders only mapped fields', async () => {
    // the outer host maps no tagsExpr/assigneeExpr/dueDateExpr/priorityExpr
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    const labels = Array.from(
      document.querySelectorAll('.oge-kanban-editor-form label'),
    ).map((el) => el.textContent?.trim());
    expect(labels.some((label) => label?.startsWith('Title'))).toBe(true);
    expect(labels).toContain('Column');
    expect(labels).not.toContain('Tags');
    expect(labels).not.toContain('Assigned to');
    expect(labels).not.toContain('Due date');
    expect(labels).not.toContain('Priority');
    expect(labels).not.toContain('Swimlane');
  });

  it('saving the dialog updates the card through the update pipeline', async () => {
    cards()[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    const titleInput = document.querySelector<HTMLInputElement>(
      '.oge-modal .oge-kanban-editor-form input',
    );
    expect(titleInput).not.toBeNull();
    titleInput!.value = 'One renamed';
    titleInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const save = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.oge-kanban-editor-footer .oge-kanban-btn-primary',
      ),
    )[0];
    save.click();
    await settle(fixture);
    expect(titlesIn('todo')[0]).toBe('One renamed');
  });
});
