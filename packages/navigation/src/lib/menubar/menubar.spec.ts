import { ApplicationRef, Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeMenubar } from './menubar';
import { OgeMenubarItem } from './menubar-item';
import { provideOgeMenubarConfig } from './config';
import type {
  OgeMenubarItemClickEvent,
  OgeMenubarItemData,
  OgeMenubarSubmenuClosedEvent,
  OgeMenubarSubmenuClosingEvent,
  OgeMenubarSubmenuOpenedEvent,
  OgeMenubarSubmenuOpeningEvent,
} from './menubar-types';

const MENU: readonly OgeMenubarItemData[] = [
  {
    text: 'File',
    key: 'file',
    items: [
      { text: 'New', key: 'new' },
      { text: 'Open…', key: 'open' },
      { separator: true, text: '' },
      {
        text: 'Share',
        key: 'share',
        items: [{ text: 'Email', key: 'email' }],
      },
    ],
  },
  { text: 'Edit', key: 'edit', items: [{ text: 'Undo', key: 'undo' }] },
  { text: 'Help', key: 'help' },
];

@Component({
  imports: [OgeMenubar],
  template: `
    <oge-menubar
      [items]="items()"
      (itemClick)="clicks.push($event)"
      (submenuOpening)="openings.push($event)"
      (submenuOpened)="opened.push($event)"
      (submenuClosing)="closings.push($event)"
      (submenuClosed)="closed.push($event)"
    />
  `,
})
class MenubarHost {
  readonly items = signal<readonly OgeMenubarItemData[]>(MENU);
  readonly bar = viewChild.required(OgeMenubar);
  readonly clicks: OgeMenubarItemClickEvent[] = [];
  readonly openings: OgeMenubarSubmenuOpeningEvent[] = [];
  readonly opened: OgeMenubarSubmenuOpenedEvent[] = [];
  readonly closings: OgeMenubarSubmenuClosingEvent[] = [];
  readonly closed: OgeMenubarSubmenuClosedEvent[] = [];
}

describe('OgeMenubar', () => {
  let fixture: ComponentFixture<MenubarHost>;
  let host: MenubarHost;

  const barItems = (): HTMLElement[] =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.oge-menubar-item',
      ),
    );
  const menu = (): HTMLElement | null =>
    document.querySelector('.oge-menu-list');

  function settle(): void {
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    TestBed.inject(ApplicationRef).tick();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
    fixture = TestBed.createComponent(MenubarHost);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
  });

  it('renders the data-driven items as a bar', () => {
    const items = barItems();
    expect(items.map((el) => el.textContent?.trim())).toEqual([
      'File',
      'Edit',
      'Help',
    ]);
  });

  it('clicking a parent item toggles its submenu', () => {
    barItems()[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(menu()).not.toBeNull();
    expect(host.opened).toEqual([{ item: MENU[0], key: 'file', path: [0] }]);
    barItems()[0].dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(menu()).toBeNull();
    expect(host.closed.map((c) => c.reason)).toEqual(['api']);
  });

  it('clicking a leaf item emits itemClick with its path', () => {
    barItems()[2].dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    expect(host.clicks).toHaveLength(1);
    expect(host.clicks[0].key).toBe('help');
    expect(host.clicks[0].path).toEqual([2]);
    expect(host.clicks[0].index).toBe(2);
  });

  it('selecting a nested leaf reports the full hierarchical path', () => {
    host.bar().open('file');
    settle();
    const shareRow = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.oge-menu-item'),
    ).find((el) => el.textContent?.includes('Share')) as HTMLButtonElement;
    shareRow.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    const emailRow = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.oge-menu-item'),
    ).find((el) => el.textContent?.includes('Email')) as HTMLButtonElement;
    emailRow.dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 }),
    );
    settle();
    expect(host.clicks).toHaveLength(1);
    expect(host.clicks[0].key).toBe('email');
    // File (0) → Share (3, after the separator) → Email (0).
    expect(host.clicks[0].path).toEqual([0, 3, 0]);
    expect(host.closed.map((c) => c.reason)).toEqual(['select']);
    expect(menu()).toBeNull();
  });

  it('open() accepts an index or a key; close() closes', () => {
    host.bar().open(1);
    settle();
    expect(menu()?.getAttribute('aria-label')).toBe('Edit');
    host.bar().close();
    settle();
    expect(menu()).toBeNull();

    host.bar().open('file');
    settle();
    expect(menu()?.getAttribute('aria-label')).toBe('File');
  });

  it('cancelling submenuOpening keeps the menu closed', () => {
    const sub = host.bar().submenuOpening.subscribe((e) => (e.cancel = true));
    host.bar().open('file');
    settle();
    expect(menu()).toBeNull();
    expect(host.opened).toHaveLength(0);
    sub.unsubscribe();
  });

  it('cancelling submenuClosing keeps the menu open', () => {
    host.bar().open('file');
    settle();
    const sub = host.bar().submenuClosing.subscribe((e) => (e.cancel = true));
    host.bar().close();
    settle();
    expect(menu()).not.toBeNull();
    expect(host.closed).toHaveLength(0);
    sub.unsubscribe();
  });

  it('switching bar items reports a navigation close of the previous menu', () => {
    host.bar().open('file');
    settle();
    host.bar().open('edit');
    settle();
    expect(menu()?.getAttribute('aria-label')).toBe('Edit');
    expect(host.closed.map((c) => [c.key, c.reason])).toEqual([
      ['file', 'navigation'],
    ]);
    expect(host.opened.map((o) => o.key)).toEqual(['file', 'edit']);
  });

  it('items with visible: false disappear at every depth', () => {
    host.items.set([
      {
        text: 'File',
        items: [{ text: 'Hidden', visible: false }, { text: 'New' }],
      },
      { text: 'Gone', visible: false },
    ]);
    fixture.detectChanges();
    expect(barItems().map((el) => el.textContent?.trim())).toEqual(['File']);
    host.bar().open(0);
    settle();
    const rows = Array.from(document.querySelectorAll('.oge-menu-item'));
    expect(rows.map((el) => el.textContent?.trim())).toEqual(['New']);
  });
});

@Component({
  imports: [OgeMenubar, OgeMenubarItem],
  template: `
    <oge-menubar [items]="items">
      <oge-menubar-item text="Home" key="home" />
      <oge-menubar-item text="View" key="view">
        <oge-menubar-item text="Zoom in" key="zoom-in" />
        <oge-menubar-item text="Hidden" [visible]="false" />
      </oge-menubar-item>
    </oge-menubar>
  `,
})
class DeclarativeHost {
  readonly items: readonly OgeMenubarItemData[] = [{ text: 'Data', key: 'd' }];
  readonly bar = viewChild.required(OgeMenubar);
}

describe('OgeMenubar — declarative children', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('merges declarative children first, then the items input', () => {
    const fixture = TestBed.createComponent(DeclarativeHost);
    fixture.detectChanges();
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-menubar-item-text',
      ),
    ).map((el) => el.textContent?.trim());
    expect(labels).toEqual(['Home', 'View', 'Data']);
    fixture.destroy();
  });

  it('nested declarative children become the submenu tree', () => {
    const fixture = TestBed.createComponent(DeclarativeHost);
    fixture.detectChanges();
    fixture.componentInstance.bar().open('view');
    for (let i = 0; i < 3; i++) {
      TestBed.inject(ApplicationRef).tick();
      fixture.detectChanges();
      vi.advanceTimersByTime(500);
    }
    fixture.detectChanges();
    const rows = Array.from(document.querySelectorAll('.oge-menu-item'));
    expect(rows.map((el) => el.textContent?.trim())).toEqual(['Zoom in']);
    fixture.destroy();
  });
});

@Component({
  imports: [OgeMenubar],
  template: `<oge-menubar [items]="items" [disabled]="disabled()" />`,
})
class DisabledHost {
  readonly items: readonly OgeMenubarItemData[] = [
    { text: 'File', key: 'file', items: [{ text: 'New' }] },
    { text: 'Inbox', key: 'inbox', badge: 3 },
  ];
  readonly disabled = signal(true);
  readonly bar = viewChild.required(OgeMenubar);
}

describe('OgeMenubar — disabled and badges', () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame'],
    });
  });
  afterEach(() => vi.useRealTimers());

  it('a disabled bar is inert and leaves the Tab sequence', () => {
    const fixture = TestBed.createComponent(DisabledHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const items = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-menubar-item'),
    );
    expect(el.querySelector('.oge-menubar-disabled')).not.toBeNull();
    expect(items.every((item) => item.tabIndex === -1)).toBe(true);
    expect(items[0].disabled).toBe(true);

    fixture.componentInstance.bar().open('file');
    fixture.detectChanges();
    expect(document.querySelector('.oge-menu-list')).toBeNull();

    fixture.componentInstance.disabled.set(false);
    fixture.detectChanges();
    expect(items.some((item) => item.tabIndex === 0)).toBe(true);
    fixture.destroy();
  });

  it('renders an item badge on the bar', () => {
    const fixture = TestBed.createComponent(DisabledHost);
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-menubar-item-badge',
    );
    expect(badge?.textContent?.trim()).toBe('3');
    fixture.destroy();
  });
});

describe('OgeMenubar — config', () => {
  it('provideOgeMenubarConfig overrides messages and defaults', () => {
    TestBed.configureTestingModule({
      providers: [
        provideOgeMenubarConfig({
          messages: { menubar: 'Ana menü', hamburger: 'Menü' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(MenubarHost);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="menubar"]',
    );
    expect(bar?.getAttribute('aria-label')).toBe('Ana menü');
    fixture.destroy();
  });
});
