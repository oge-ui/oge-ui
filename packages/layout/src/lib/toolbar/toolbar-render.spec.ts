import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import { OgeToolbarItem } from './toolbar-item';
import { OgeToolbarItemTemplate } from './templates';
import type { OgeToolbarItemData } from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeToolbar, OgeToolbarItem],
  template: `
    <oge-toolbar [items]="items()">
      @if (withChild()) {
        <oge-toolbar-item key="c1" text="Child" />
      }
      @if (withSlot()) {
        <button ogeToolbarAfter type="button" class="slotted">Slot</button>
      }
    </oge-toolbar>
  `,
})
class RenderHost {
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'Alpha' },
    { key: 'b', text: 'Beta' },
  ]);
  readonly withChild = signal(false);
  readonly withSlot = signal(false);
}

async function render(setup?: (host: RenderHost) => void) {
  const fixture = TestBed.createComponent(RenderHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    items: () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-toolbar-item')),
    texts: () =>
      Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
        n.textContent?.trim(),
      ),
  };
}

describe('OgeToolbar rendering', () => {
  it('renders a role="toolbar" host with the data-driven items', async () => {
    const { el, texts } = await render();
    expect(el.querySelector('.oge-toolbar')?.getAttribute('role')).toBe(
      'toolbar',
    );
    expect(texts()).toEqual(['Alpha', 'Beta']);
  });

  it('merges declarative children before items entries', async () => {
    const { texts } = await render((h) => h.withChild.set(true));
    expect(texts()).toEqual(['Child', 'Alpha', 'Beta']);
  });

  it('drops items whose visible is false', async () => {
    const { texts } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Alpha' },
        { key: 'b', text: 'Beta', visible: false },
      ]),
    );
    expect(texts()).toEqual(['Alpha']);
  });

  it('places items in the before / center / after sections', async () => {
    const { el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'A' },
        { key: 'b', text: 'B', location: 'center' },
        { key: 'c', text: 'C', location: 'after' },
      ]),
    );
    const textIn = (section: string) =>
      Array.from(
        el.querySelectorAll(`.oge-toolbar-section-${section} .oge-toolbar-btn`),
      ).map((n) => n.textContent?.trim());
    expect(textIn('before')).toEqual(['A']);
    expect(textIn('center')).toEqual(['B']);
    expect(textIn('after')).toEqual(['C']);
  });

  it('renders each item type with its own element', async () => {
    const { el } = await render((h) =>
      h.items.set([
        { key: 'b', type: 'button', text: 'Go' },
        { key: 's', type: 'separator' },
        { key: 'g', type: 'spacer' },
        { key: 'l', type: 'label', text: 'Rows' },
      ]),
    );
    expect(el.querySelector('.oge-toolbar-btn')?.textContent?.trim()).toBe(
      'Go',
    );
    expect(el.querySelector('.oge-toolbar-separator')).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-gap')).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-label')?.textContent?.trim()).toBe(
      'Rows',
    );
  });

  it('keeps the item wrapper class alongside a custom cssClass', async () => {
    const { items } = await render((h) =>
      h.items.set([{ key: 'a', text: 'A', cssClass: 'my-tool' }]),
    );
    expect(items()[0].classList.contains('oge-toolbar-item')).toBe(true);
    expect(items()[0].classList.contains('my-tool')).toBe(true);
  });

  it('renders the severity and toggle-state chrome', async () => {
    const { el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Save', severity: 'accent' },
        { key: 'b', text: 'Delete', severity: 'danger' },
        { key: 'c', text: 'Bold', active: true },
      ]),
    );
    expect(el.querySelector('.oge-toolbar-btn-accent')).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-btn-danger')).not.toBeNull();
    expect(
      el.querySelector('[aria-pressed]')?.getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('renders an icon-only item with the text as its accessible name', async () => {
    const { el } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'Columns', icon: 'M2 2h12', showText: 'inMenu' },
      ]),
    );
    const btn = el.querySelector('.oge-toolbar-btn');
    expect(btn?.classList.contains('oge-toolbar-btn-icon-only')).toBe(true);
    expect(btn?.getAttribute('aria-label')).toBe('Columns');
    expect(el.querySelector('.oge-toolbar-btn-text')).toBeNull();
    expect(el.querySelector('svg path')?.getAttribute('d')).toBe('M2 2h12');
  });

  it('shows the empty message only when nothing at all is rendered', async () => {
    const { fixture, host, el } = await render((h) => h.items.set([]));
    expect(el.querySelector('.oge-toolbar-empty')?.textContent?.trim()).toBe(
      'No commands to display',
    );
    host.withSlot.set(true);
    await settle(fixture);
    expect(el.querySelector('.slotted')).not.toBeNull();
    expect(el.querySelector('.oge-toolbar-empty')).toBeNull();
  });

  it('emits itemClick from the toolbar and from the declarative child', async () => {
    const seen: string[] = [];
    @Component({
      imports: [OgeToolbar, OgeToolbarItem],
      template: `
        <oge-toolbar (itemClick)="seen.push('toolbar:' + $event.key)">
          <oge-toolbar-item
            key="c1"
            text="Child"
            (itemClick)="seen.push('item:' + $event.index)"
          />
        </oge-toolbar>
      `,
    })
    class ClickHost {
      readonly seen = seen;
    }
    const fixture = TestBed.createComponent(ClickHost);
    await settle(fixture);
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-toolbar-btn',
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(seen).toEqual(['toolbar:c1', 'item:0']);
  });

  it('does not activate a disabled item', async () => {
    const clicks: number[] = [];
    @Component({
      imports: [OgeToolbar],
      template: `
        <oge-toolbar
          [items]="[{ key: 'a', text: 'A', disabled: true }]"
          (itemClick)="clicks.push($event.index)"
        />
      `,
    })
    class DisabledHost {
      readonly clicks = clicks;
    }
    const fixture = TestBed.createComponent(DisabledHost);
    await settle(fixture);
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      '.oge-toolbar-btn',
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    btn.click();
    await settle(fixture);
    expect(clicks).toEqual([]);
  });

  it('replaces items rendering with [ogeToolbarItemTemplate]', async () => {
    @Component({
      imports: [OgeToolbar, OgeToolbarItemTemplate],
      template: `
        <oge-toolbar [items]="[{ key: 'a', text: 'A' }]">
          <ng-template ogeToolbarItemTemplate let-item let-index="index">
            <span class="custom">{{ index }}:{{ item.text }}</span>
          </ng-template>
        </oge-toolbar>
      `,
    })
    class TemplateHost {}
    const fixture = TestBed.createComponent(TemplateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.custom')?.textContent?.trim()).toBe('0:A');
    expect(el.querySelector('.oge-toolbar-btn')).toBeNull();
  });

  it('projects a conditional group through a single .oge-toolbar-cluster', async () => {
    // Angular projects an `@if` block with more than one root node into the
    // *default* slot, even when every root carries the slot attribute
    // (verified against Angular 22) — one wrapper is what makes it land.
    @Component({
      imports: [OgeToolbar],
      template: `
        <oge-toolbar>
          @if (show()) {
            <span ogeToolbarAfter class="oge-toolbar-cluster">
              <button type="button" class="save">Save</button>
              <button type="button" class="discard">Discard</button>
            </span>
          }
        </oge-toolbar>
      `,
    })
    class ClusterHost {
      readonly show = signal(false);
    }
    const fixture = TestBed.createComponent(ClusterHost);
    await settle(fixture);
    fixture.componentInstance.show.set(true);
    await settle(fixture);

    const el = fixture.nativeElement as HTMLElement;
    const after = '.oge-toolbar-section-after';
    expect(el.querySelector(`${after} .save`)).not.toBeNull();
    expect(el.querySelector(`${after} .discard`)).not.toBeNull();
  });

  it('stamps a declarative child’s own template in place of the button', async () => {
    @Component({
      imports: [OgeToolbar, OgeToolbarItem, OgeToolbarItemTemplate],
      template: `
        <oge-toolbar>
          <oge-toolbar-item key="c" text="Fallback">
            <ng-template ogeToolbarItemTemplate>
              <button type="button" class="projected">Mine</button>
            </ng-template>
          </oge-toolbar-item>
        </oge-toolbar>
      `,
    })
    class ProjectedHost {}
    const fixture = TestBed.createComponent(ProjectedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.projected')?.textContent?.trim()).toBe('Mine');
    expect(el.querySelector('.oge-toolbar-btn')).toBeNull();
  });
});
