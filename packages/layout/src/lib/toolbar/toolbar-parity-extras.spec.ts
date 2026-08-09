import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArrayDataSource } from '@oge-ui/core';
import { OgeToolbar } from './toolbar';
import { OgeToolbarItem } from './toolbar-item';
import type {
  OgeToolbarDisplayMode,
  OgeToolbarItemActiveChangedEvent,
  OgeToolbarItemData,
  OgeToolbarOverflow,
} from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar],
  template: `
    <oge-toolbar
      [items]="items()"
      [overflow]="overflow()"
      [showText]="showText()"
      [keyboardNavigation]="keyboardNavigation()"
      [dataSource]="source()"
      (activeChanged)="changes.push($event)"
    />
  `,
})
class ExtrasHost {
  readonly bar = viewChild.required(OgeToolbar);
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'Alpha' },
  ]);
  readonly overflow = signal<OgeToolbarOverflow>('menu');
  readonly showText = signal<OgeToolbarDisplayMode>('always');
  readonly keyboardNavigation = signal(true);
  readonly source = signal<ArrayDataSource<OgeToolbarItemData> | undefined>(
    undefined,
  );
  readonly changes: OgeToolbarItemActiveChangedEvent[] = [];
}

async function render(setup?: (host: ExtrasHost) => void) {
  const fixture = TestBed.createComponent(ExtrasHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, el };
}

describe('OgeToolbar — reference-parity extras', () => {
  it("overflow: 'scroll' and 'extended' each render their own chrome", async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha' },
        { key: 'b', text: 'Beta', locateInMenu: 'always' },
      ]),
    );
    // 'menu' — the overflow button
    expect(el.querySelector('.oge-toolbar-menu-btn')).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-extend-btn')).toBeNull();

    // 'extended' — a toggle plus a second row, no menu
    host.overflow.set('extended');
    await settle(fixture);
    const toggle = el.querySelector<HTMLButtonElement>(
      '.oge-toolbar-extend-btn',
    );
    expect(toggle).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-menu-btn')).toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.oge-toolbar-extended-row')).toBeNull();

    toggle?.click();
    await settle(fixture);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    const row = el.querySelector('.oge-toolbar-extended-row');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Beta');
    // the toggle names the row it controls
    expect(toggle?.getAttribute('aria-controls')).toBe(row?.id);

    // 'scroll' — no collapsing at all; jsdom reports no overflow, so the
    // arrows stay hidden, which is the documented unmeasured behaviour
    host.overflow.set('scroll');
    await settle(fixture);
    expect(el.querySelector('.oge-toolbar-extend-btn')).toBeNull();
    expect(el.querySelector('.oge-toolbar-menu-btn')).toBeNull();
    expect(el.querySelector('.oge-toolbar')?.classList).toContain(
      'oge-toolbar-scroll',
    );
  });

  it("showText: 'onBar' keeps the label off the menu row", async () => {
    const { fixture, host, el } = await render((h) => {
      h.items.set([{ key: 'b', text: 'Beta', locateInMenu: 'always' }]);
      h.showText.set('onBar');
    });
    el.querySelector<HTMLButtonElement>('.oge-toolbar-menu-btn')?.click();
    await settle(fixture);
    expect(el.querySelector('.oge-menu-item-text')?.textContent?.trim()).toBe(
      '',
    );

    host.showText.set('always');
    await settle(fixture);
    expect(el.querySelector('.oge-menu-item-text')?.textContent?.trim()).toBe(
      'Beta',
    );
  });

  it('renders prefix and suffix icons, from path data or a class', async () => {
    const { el } = await render((h) =>
      h.items.set([
        {
          key: 'a',
          text: 'A',
          icon: 'M2 2h12',
          suffixIcon: 'M3 3h10',
        },
        {
          key: 'b',
          text: 'B',
          iconClass: 'fa fa-save',
          suffixIconClass: 'fa-x',
        },
      ]),
    );
    const paths = Array.from(el.querySelectorAll('svg.oge-toolbar-icon path'));
    expect(paths.map((p) => p.getAttribute('d'))).toEqual([
      'M2 2h12',
      'M3 3h10',
    ]);
    expect(el.querySelectorAll('svg.oge-toolbar-icon-suffix').length).toBe(1);
    const classIcons = Array.from(el.querySelectorAll('i.oge-toolbar-icon'));
    expect(classIcons[0].classList.contains('fa-save')).toBe(true);
    expect(classIcons[1].classList.contains('oge-toolbar-icon-suffix')).toBe(
      true,
    );
  });

  it('applies item width and the htmlAttributes bag', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([
        {
          key: 'a',
          text: 'A',
          width: 140,
          htmlAttributes: { 'data-role': 'primary', 'data-tour': '1' },
        },
        { key: 'b', text: 'B', width: '8rem' },
      ]),
    );
    const items = el.querySelectorAll<HTMLElement>('.oge-toolbar-item');
    expect(items[0].style.inlineSize).toBe('140px');
    expect(items[1].style.inlineSize).toBe('8rem');
    expect(items[0].getAttribute('data-role')).toBe('primary');
    expect(items[0].getAttribute('data-tour')).toBe('1');

    // clearing a key removes the attribute rather than leaving it stale
    host.items.set([
      { key: 'a', text: 'A', width: 140, htmlAttributes: { 'data-role': 'x' } },
      { key: 'b', text: 'B', width: '8rem' },
    ]);
    await settle(fixture);
    expect(items[0].getAttribute('data-role')).toBe('x');
    expect(items[0].hasAttribute('data-tour')).toBe(false);
  });

  it('flips a toggle item and reports it, two-way on a declarative child', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([{ key: 'bold', text: 'Bold', active: false }]),
    );
    const btn = el.querySelector<HTMLButtonElement>('.oge-toolbar-btn');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    btn?.click();
    await settle(fixture);
    // `items` entries are data the toolbar must not mutate — it reports instead
    expect(host.changes.map((c) => [c.key, c.active])).toEqual([
      ['bold', true],
    ]);
    expect(btn?.getAttribute('aria-pressed')).toBe('false');

    // a declarative child owns a two-way model, so it flips itself
    @Component({
      imports: [OgeToolbar, OgeToolbarItem],
      template: `
        <oge-toolbar>
          <oge-toolbar-item key="b" text="Bold" [(active)]="bold" />
        </oge-toolbar>
      `,
    })
    class ToggleHost {
      readonly bold = signal(false);
    }
    const toggleFixture = TestBed.createComponent(ToggleHost);
    await settle(toggleFixture);
    const toggleEl = toggleFixture.nativeElement as HTMLElement;
    toggleEl.querySelector<HTMLButtonElement>('.oge-toolbar-btn')?.click();
    await settle(toggleFixture);
    expect(toggleFixture.componentInstance.bold()).toBe(true);
    expect(
      toggleEl.querySelector('.oge-toolbar-btn')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('keyboardNavigation off restores the natural Tab order', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'A' },
        { key: 'b', text: 'B' },
      ]),
    );
    const tabindexes = () =>
      Array.from(el.querySelectorAll('.oge-toolbar-btn')).map((b) =>
        b.getAttribute('tabindex'),
      );
    expect(tabindexes()).toEqual(['0', '-1']);

    host.keyboardNavigation.set(false);
    await settle(fixture);
    expect(tabindexes()).toEqual([null, null]);

    // and the arrow keys are inert
    const first = el.querySelector<HTMLButtonElement>('.oge-toolbar-btn');
    first?.focus();
    first?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await settle(fixture);
    expect(document.activeElement).toBe(first);
  });

  it('addItem / removeItem / hideItem / enableItem layer over items', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha' },
        { key: 'b', text: 'Beta' },
      ]),
    );
    const texts = () =>
      Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
        n.textContent?.trim(),
      );
    expect(texts()).toEqual(['Alpha', 'Beta']);

    host.bar().addItem({ key: 'c', text: 'Gamma' });
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Beta', 'Gamma']);

    host.bar().hideItem('b');
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Gamma']);

    // the override survives a re-supplied items array — that is the point
    host.items.set([
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
    ]);
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Gamma']);

    host.bar().hideItem('b', false);
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Beta', 'Gamma']);

    host.bar().enableItem('a', false);
    await settle(fixture);
    expect(
      el.querySelector<HTMLButtonElement>('.oge-toolbar-btn')?.disabled,
    ).toBe(true);

    // removeItem drops an added entry outright, and hides an `items` one
    host.bar().removeItem('c');
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Beta']);
    host.bar().removeItem('b');
    await settle(fixture);
    expect(texts()).toEqual(['Alpha']);

    host.bar().clearItemOverrides();
    await settle(fixture);
    expect(texts()).toEqual(['Alpha', 'Beta']);
  });

  it('loads a remote command list through dataSource', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([{ key: 'local', text: 'Local' }]),
    );
    host.source.set(
      new ArrayDataSource<OgeToolbarItemData>(
        [
          { key: 'r1', text: 'Remote one' },
          { key: 'r2', text: 'Remote two' },
        ],
        { key: 'key' },
      ),
    );
    await settle(fixture);
    await settle(fixture);
    const texts = Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map(
      (n) => n.textContent?.trim(),
    );
    expect(texts).toEqual(['Local', 'Remote one', 'Remote two']);
  });

  it('refreshOverflow() re-measures without changing the item list', async () => {
    const { fixture, host, el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha' },
        { key: 'b', text: 'Beta' },
      ]),
    );
    host.bar().refreshOverflow();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-toolbar-item').length).toBe(2);
  });
});

describe('OgeToolbar — hold and context menu', () => {
  @Component({
    imports: [OgeToolbar],
    template: `
      <oge-toolbar
        [items]="[{ key: 'a', text: 'Alpha' }]"
        [itemHoldTimeout]="20"
        (itemHold)="held.push($event.key ?? '')"
        (itemContextMenu)="menued.push($event.key ?? '')"
      />
    `,
  })
  class HoldHost {
    readonly held: string[] = [];
    readonly menued: string[] = [];
  }

  it('fires itemHold after itemHoldTimeout and cancels on pointerup', async () => {
    const fixture = TestBed.createComponent(HoldHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const item = el.querySelector('.oge-toolbar-item') as HTMLElement;

    item.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(fixture.componentInstance.held).toEqual(['a']);

    // a release before the timeout cancels it
    fixture.componentInstance.held.length = 0;
    item.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    item.dispatchEvent(new Event('pointerup', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(fixture.componentInstance.held).toEqual([]);
  });

  it('fires itemContextMenu on right click', async () => {
    const fixture = TestBed.createComponent(HoldHost);
    await settle(fixture);
    const item = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-toolbar-item',
    ) as HTMLElement;
    item.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    await settle(fixture);
    expect(fixture.componentInstance.menued).toEqual(['a']);
  });
});

@Component({
  imports: [OgeToolbar, OgeToolbarItem],
  template: `
    <oge-toolbar>
      <oge-toolbar-item key="save" text="Save" />
      <oge-toolbar-item key="undo" text="Undo" />
    </oge-toolbar>
  `,
})
class DeclarativeOverrideHost {
  readonly bar = viewChild.required(OgeToolbar);
}

describe('OgeToolbar — imperative overrides reach declarative children', () => {
  async function render() {
    const fixture = TestBed.createComponent(DeclarativeOverrideHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      texts: () =>
        Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
          n.textContent?.trim(),
        ),
      buttons: () =>
        Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-toolbar-btn')),
    };
  }

  it('hideItem hides a keyed <oge-toolbar-item>', async () => {
    const { fixture, host, texts } = await render();
    expect(texts()).toEqual(['Save', 'Undo']);

    host.bar().hideItem('undo');
    await settle(fixture);
    expect(texts()).toEqual(['Save']);

    host.bar().hideItem('undo', false);
    await settle(fixture);
    expect(texts()).toEqual(['Save', 'Undo']);
  });

  it('enableItem disables a keyed <oge-toolbar-item>', async () => {
    const { fixture, host, buttons } = await render();
    expect(buttons()[0].disabled).toBe(false);

    host.bar().enableItem('save', false);
    await settle(fixture);
    expect(buttons()[0].disabled).toBe(true);

    host.bar().enableItem('save', true);
    await settle(fixture);
    expect(buttons()[0].disabled).toBe(false);
  });

  it('removeItem falls back to hiding a declarative child, and clearItemOverrides restores it', async () => {
    const { fixture, host, texts } = await render();
    host.bar().removeItem('save');
    await settle(fixture);
    expect(texts()).toEqual(['Undo']);

    host.bar().clearItemOverrides();
    await settle(fixture);
    expect(texts()).toEqual(['Save', 'Undo']);
  });
});
