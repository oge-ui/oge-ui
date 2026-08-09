import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import { OgeToolbarItem } from './toolbar-item';
import type {
  OgeToolbarItemData,
  OgeToolbarOverflowChangedEvent,
} from './toolbar-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

/**
 * jsdom performs no layout, so the fitting math would always be handed a
 * zero-width container ("not measured yet") and nothing would ever collapse.
 * These specs install size getters keyed off the class names `measure()` reads,
 * which is the only way to exercise the component's own wiring end to end; the
 * arithmetic itself is covered DOM-free in core's `toolbar-fit.spec.ts`.
 */
const ITEM_SIZE = 50;
const MENU_BUTTON_SIZE = 32;

function installSizes(container: { size: number }): () => void {
  const proto = HTMLElement.prototype;
  const offsetWidth = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
  const clientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  Object.defineProperty(proto, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('oge-toolbar-menu-btn')) {
        return MENU_BUTTON_SIZE;
      }
      return this.classList.contains('oge-toolbar-item') ? ITEM_SIZE : 0;
    },
  });
  Object.defineProperty(proto, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.tagName === 'OGE-TOOLBAR' ? container.size : 0;
    },
  });
  return () => {
    if (offsetWidth) Object.defineProperty(proto, 'offsetWidth', offsetWidth);
    if (clientWidth) Object.defineProperty(proto, 'clientWidth', clientWidth);
  };
}

@Component({
  imports: [OgeToolbar],
  template: `
    <oge-toolbar [items]="items()" (overflowChanged)="overflows.push($event)" />
  `,
})
class PriorityHost {
  readonly bar = viewChild.required(OgeToolbar);
  readonly items = signal<readonly OgeToolbarItemData[]>([]);
  readonly overflows: OgeToolbarOverflowChangedEvent[] = [];
}

@Component({
  imports: [OgeToolbar, OgeToolbarItem],
  template: `
    <oge-toolbar>
      <oge-toolbar-item key="a" text="Alpha" />
      <oge-toolbar-item key="b" text="Beta" />
      <oge-toolbar-item key="c" text="Gamma" [overflowPriority]="5" />
    </oge-toolbar>
  `,
})
class DeclarativePriorityHost {}

describe('OgeToolbar — overflowPriority', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  // Room for two of three items plus the overflow button: 2×50 + 32 = 132.
  async function render(items: readonly OgeToolbarItemData[]) {
    restore = installSizes({ size: 132 });
    const fixture = TestBed.createComponent(PriorityHost);
    fixture.componentInstance.items.set(items);
    await settle(fixture);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      inlineTexts: () =>
        Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
          n.textContent?.trim(),
        ),
    };
  }

  it('collapses the last item when no priority is set', async () => {
    const { inlineTexts } = await render([
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma' },
    ]);
    expect(inlineTexts()).toEqual(['Alpha', 'Beta']);
  });

  it('keeps a high-priority trailing item and collapses a default one instead', async () => {
    const { inlineTexts } = await render([
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma', overflowPriority: 5 },
    ]);
    // Beta yields even though Gamma sits after it on the bar.
    expect(inlineTexts()).toEqual(['Alpha', 'Gamma']);
  });

  it('collapses the lowest priority first even when it leads the row', async () => {
    const { inlineTexts } = await render([
      { key: 'a', text: 'Alpha', overflowPriority: -1 },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma' },
    ]);
    expect(inlineTexts()).toEqual(['Beta', 'Gamma']);
  });

  it('emits overflowChanged when only the container width moved', async () => {
    // Regression: the reporting effect must track the menu contents, not the
    // inputs that usually change them. A resize moves the set without touching
    // `items`, and reporting keyed off `descriptors()` alone stayed silent —
    // the bar visibly collapsed while `overflowChanged` never fired again.
    const container = { size: 300 };
    restore = installSizes(container);
    const fixture = TestBed.createComponent(PriorityHost);
    const host = fixture.componentInstance;
    host.items.set([
      { key: 'a', text: 'Alpha' },
      { key: 'b', text: 'Beta' },
      { key: 'c', text: 'Gamma' },
    ]);
    await settle(fixture);
    await settle(fixture);
    expect(host.overflows.at(-1)?.count ?? 0).toBe(0);

    container.size = 132;
    host.bar().refreshOverflow();
    await settle(fixture);
    await settle(fixture);

    expect(host.overflows.at(-1)?.count).toBe(1);
    expect(host.overflows.at(-1)?.keys).toEqual(['c']);
  });

  it('reads [overflowPriority] from a declarative <oge-toolbar-item>', async () => {
    restore = installSizes({ size: 132 });
    const fixture = TestBed.createComponent(DeclarativePriorityHost);
    await settle(fixture);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(
      Array.from(el.querySelectorAll('.oge-toolbar-btn-text')).map((n) =>
        n.textContent?.trim(),
      ),
    ).toEqual(['Alpha', 'Gamma']);
  });
});
