import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeListView } from './list-view';
import { OgeListViewGroupTemplate, OgeListViewItemTemplate } from './templates';
import type {
  OgeListViewItemAction,
  OgeListViewItemActionClickEvent,
  OgeListViewItemClickEvent,
  OgeListViewKey,
  OgeListViewLoadMoreEvent,
  OgeListViewPageLoadMode,
  OgeListViewSelectionChangedEvent,
  OgeListViewSelectionMode,
} from './list-view-types';

interface Person {
  id: number;
  name: string;
  team: string;
  away?: boolean;
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Ada', team: 'Core' },
  { id: 2, name: 'Grace', team: 'Web' },
  { id: 3, name: 'Alan', team: 'Core', away: true },
  { id: 4, name: 'Linus', team: 'Web' },
  { id: 5, name: 'Barbara', team: 'Core' },
];

@Component({
  imports: [OgeListView, OgeListViewItemTemplate, OgeListViewGroupTemplate],
  template: `
    <oge-list-view
      [items]="items()"
      displayExpr="name"
      disabledExpr="away"
      [groupExpr]="grouped() ? 'team' : undefined"
      [selectionMode]="mode()"
      [(selectedKeys)]="selected"
      [searchEnabled]="search()"
      [virtualScroll]="virtual()"
      [height]="200"
      [pageLoadMode]="loadMode()"
      [hasMore]="hasMore()"
      [itemActions]="actions()"
      ariaLabel="People"
      (selectionChanged)="changes.push($event)"
      (itemClick)="clicks.push($event)"
      (itemActionClick)="actionClicks.push($event)"
      (loadMoreRequested)="loads.push($event)"
    >
      @if (templated()) {
        <ng-template ogeListViewItemTemplate let-person let-selected="selected">
          <b class="tpl">{{ person.name }}{{ selected ? '!' : '' }}</b>
        </ng-template>
        <ng-template ogeListViewGroupTemplate let-group let-count="count">
          <i class="grp">{{ group }}/{{ count }}</i>
        </ng-template>
      }
    </oge-list-view>
  `,
})
class Host {
  readonly items = signal<readonly Person[]>(PEOPLE);
  readonly mode = signal<OgeListViewSelectionMode>('multiple');
  readonly selected = signal<readonly OgeListViewKey[]>([]);
  readonly grouped = signal(false);
  readonly search = signal(false);
  readonly virtual = signal(false);
  readonly templated = signal(false);
  readonly loadMode = signal<OgeListViewPageLoadMode>('none');
  readonly hasMore = signal(false);
  readonly actions = signal<readonly OgeListViewItemAction[]>([]);
  readonly list = viewChild.required(OgeListView);
  readonly changes: OgeListViewSelectionChangedEvent[] = [];
  readonly clicks: OgeListViewItemClickEvent[] = [];
  readonly actionClicks: OgeListViewItemActionClickEvent[] = [];
  readonly loads: OgeListViewLoadMoreEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const viewport = (el: HTMLElement) =>
  el.querySelector('.oge-list-view-viewport') as HTMLElement;
const rows = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>('.oge-list-view-item'));
const key = (target: HTMLElement, k: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }),
  );

function pointer(target: Element, type: string, x: number, y: number): void {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 7 });
  Object.defineProperty(event, 'pointerType', { value: 'touch' });
  target.dispatchEvent(event);
}

describe('OgeListView', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    await settle(fixture);
  });

  afterEach(() => getOgeLiveAnnouncer().clear());

  it('renders a labelled listbox with an active descendant on first paint', () => {
    const vp = viewport(el);
    expect(vp.getAttribute('role')).toBe('listbox');
    expect(vp.getAttribute('aria-label')).toBe('People');
    expect(vp.getAttribute('aria-multiselectable')).toBe('true');
    expect(vp.tabIndex).toBe(0);
    const options = rows(el);
    expect(options).toHaveLength(5);
    expect(options[0].getAttribute('role')).toBe('option');
    expect(vp.getAttribute('aria-activedescendant')).toBe(options[0].id);
    expect(options[2].getAttribute('aria-disabled')).toBe('true');
    expect(options[1].getAttribute('aria-posinset')).toBe('2');
    expect(options[1].getAttribute('aria-setsize')).toBe('5');
    expect(options[0].textContent?.trim()).toBe('Ada');
  });

  it('renders a list with a roving tab stop when not selectable', async () => {
    host.mode.set('none');
    await settle(fixture);
    const vp = viewport(el);
    expect(vp.getAttribute('role')).toBe('list');
    expect(vp.getAttribute('aria-activedescendant')).toBeNull();
    const items = rows(el);
    expect(items[0].getAttribute('role')).toBe('listitem');
    expect(items[0].getAttribute('tabindex')).toBe('0');
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    items[0].focus();
    key(items[0], 'ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(rows(el)[1]);
    key(rows(el)[1], 'Enter');
    expect(host.clicks.map((c) => c.key)).toEqual([2]);
  });

  it('moves the active option, skips disabled ones and toggles with Space', async () => {
    const vp = viewport(el);
    key(vp, 'ArrowDown');
    key(vp, 'ArrowDown');
    await settle(fixture);
    // Alan is disabled: the second ArrowDown lands on Linus
    expect(vp.getAttribute('aria-activedescendant')).toBe(rows(el)[3].id);
    key(vp, ' ');
    await settle(fixture);
    expect(host.selected()).toEqual([4]);
    expect(rows(el)[3].getAttribute('aria-selected')).toBe('true');
    expect(host.changes[0]).toMatchObject({ addedKeys: [4], previousKeys: [] });
    key(vp, 'ArrowUp', { shiftKey: true });
    await settle(fixture);
    expect(host.selected()).toEqual([4, 2]);
  });

  it('selects all with Ctrl+A and announces the count', async () => {
    vi.useFakeTimers();
    try {
      key(viewport(el), 'a', { ctrlKey: true });
      await settle(fixture);
      expect(host.selected()).toEqual([1, 2, 4, 5]);
      vi.advanceTimersByTime(500);
      expect(
        document.querySelector('[data-oge-live-announcer="polite"]')
          ?.textContent,
      ).toContain('4 items selected');
    } finally {
      vi.useRealTimers();
    }
  });

  it('selects on click in single mode and reports itemClick', async () => {
    host.mode.set('single');
    await settle(fixture);
    rows(el)[1].click();
    await settle(fixture);
    expect(host.selected()).toEqual([2]);
    expect(host.clicks[0]).toMatchObject({ key: 2, index: 1 });
    rows(el)[2].click(); // disabled
    expect(host.selected()).toEqual([2]);
  });

  it('type-aheads to the next match', async () => {
    const vp = viewport(el);
    key(vp, 'l');
    await settle(fixture);
    expect(vp.getAttribute('aria-activedescendant')).toBe(rows(el)[3].id);
  });

  it('groups items under aria-hidden sticky headers in labelled groups', async () => {
    host.grouped.set(true);
    host.templated.set(true);
    await settle(fixture);
    const groups = el.querySelectorAll('.oge-list-view-group');
    expect(groups).toHaveLength(2);
    expect(groups[0].getAttribute('role')).toBe('group');
    expect(groups[0].getAttribute('aria-label')).toBe('Core');
    const header = groups[0].querySelector('.oge-list-view-group-header')!;
    expect(header.getAttribute('aria-hidden')).toBe('true');
    expect(header.textContent?.trim()).toBe('Core/3');
    expect(rows(el).map((r) => r.textContent?.trim())).toEqual([
      'Ada',
      'Alan',
      'Barbara',
      'Grace',
      'Linus',
    ]);
    // plain list: a listitem segment holding a labelled nested list
    host.mode.set('none');
    await settle(fixture);
    const seg = el.querySelector('.oge-list-view-group')!;
    expect(seg.getAttribute('role')).toBe('listitem');
    const inner = seg.querySelector('.oge-list-view-group-items')!;
    expect(inner.getAttribute('role')).toBe('list');
    expect(inner.getAttribute('aria-label')).toBe('Core');
  });

  it('renders only a window of a virtualized list and follows the keyboard', async () => {
    host.items.set(
      Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Person ${i}`,
        team: 'All',
      })),
    );
    host.virtual.set(true);
    await settle(fixture);
    const rendered = rows(el).length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(30);
    const vp = viewport(el);
    expect(
      (el.querySelector('.oge-list-view-canvas') as HTMLElement).style.height,
    ).toBe('44000px');
    key(vp, 'End');
    await settle(fixture);
    expect(vp.scrollTop).toBeGreaterThan(40000);
    const active = vp.getAttribute('aria-activedescendant')!;
    expect(el.querySelector(`#${active}`)?.textContent?.trim()).toBe(
      'Person 999',
    );
  });

  it('filters through the search field and announces the results', async () => {
    vi.useFakeTimers();
    try {
      host.search.set(true);
      await settle(fixture);
      const input = el.querySelector(
        '.oge-list-view-search-input',
      ) as HTMLInputElement;
      expect(input.getAttribute('aria-label')).toBe('Search');
      input.value = 'a';
      input.dispatchEvent(new Event('input'));
      await settle(fixture);
      // Ada, Grace, Alan, Barbara
      expect(rows(el)).toHaveLength(4);
      vi.advanceTimersByTime(500);
      expect(
        document.querySelector('[data-oge-live-announcer="polite"]')
          ?.textContent,
      ).toContain('4 results');
      input.value = 'zzz';
      input.dispatchEvent(new Event('input'));
      await settle(fixture);
      expect(el.querySelector('.oge-list-view-empty')?.textContent).toContain(
        'No matching items',
      );
      (el.querySelector('.oge-list-view-search-clear') as HTMLElement).click();
      await settle(fixture);
      expect(rows(el)).toHaveLength(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('requests more through the button, once per page', async () => {
    host.loadMode.set('button');
    host.hasMore.set(true);
    await settle(fixture);
    const button = el.querySelector(
      '.oge-list-view-load-more',
    ) as HTMLButtonElement;
    expect(button.textContent?.trim()).toBe('Load more');
    button.click();
    expect(host.loads).toEqual([{ reason: 'button', itemCount: 5 }]);
  });

  it('runs item actions by shortcut and by clicking their glyph', async () => {
    host.actions.set([
      {
        key: 'delete',
        label: 'Delete',
        severity: 'danger',
        shortcut: 'Delete',
      },
      { key: 'pin', label: 'Pin' },
    ]);
    await settle(fixture);
    const first = rows(el)[0];
    expect(first.getAttribute('aria-keyshortcuts')).toBe('Delete');
    const desc = first.getAttribute('aria-describedby')!;
    expect(el.querySelector(`#${desc}`)?.textContent).toBe(
      'Actions: Delete (Delete), Pin',
    );
    expect(
      first
        .querySelector('.oge-list-view-actions')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    key(viewport(el), 'Delete');
    expect(host.actionClicks[0]).toMatchObject({ key: 1, index: 0 });
    expect(host.actionClicks[0].action.key).toBe('delete');
    (
      rows(el)[1].querySelector('[data-oge-list-action="pin"]') as HTMLElement
    ).click();
    expect(host.actionClicks[1]).toMatchObject({ key: 2 });
    // the glyph click did not select
    expect(host.selected()).toEqual([]);
  });

  it('reveals the action tray with a touch swipe', async () => {
    host.actions.set([{ key: 'delete', label: 'Delete', severity: 'danger' }]);
    await settle(fixture);
    const main = rows(el)[0].querySelector('.oge-list-view-item-main')!;
    pointer(main, 'pointerdown', 200, 10);
    pointer(main, 'pointermove', 150, 12);
    pointer(main, 'pointermove', 60, 12);
    await settle(fixture);
    expect(rows(el)[0].classList).toContain('oge-list-view-item-swiped');
    pointer(main, 'pointerup', 60, 12);
    await settle(fixture);
    expect(rows(el)[0].classList).toContain('oge-list-view-item-swiped');
    expect(
      (rows(el)[0].querySelector('.oge-list-view-item-main') as HTMLElement)
        .style.translate,
    ).toBe('-120px 0');
  });

  it('exposes imperative selection methods', async () => {
    host.list().selectAll();
    expect(host.selected()).toEqual([1, 2, 4, 5]);
    host.list().clearSelection();
    expect(host.selected()).toEqual([]);
    expect(host.changes).toHaveLength(2);
  });
});
