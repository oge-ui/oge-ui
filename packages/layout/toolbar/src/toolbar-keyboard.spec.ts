import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeToolbar } from './toolbar';
import type {
  OgeToolbarItemData,
  OgeToolbarOrientation,
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
      [orientation]="orientation()"
      [wrap]="wrap()"
      [disabled]="disabled()"
    >
      @if (withInput()) {
        <input ogeToolbarAfter class="search" type="search" />
      }
    </oge-toolbar>
  `,
})
class KeyboardHost {
  readonly items = signal<readonly OgeToolbarItemData[]>([
    { key: 'a', text: 'A' },
    { key: 'b', text: 'B' },
    { key: 'c', text: 'C' },
  ]);
  readonly orientation = signal<OgeToolbarOrientation>('horizontal');
  readonly wrap = signal(true);
  readonly disabled = signal(false);
  readonly withInput = signal(false);
}

async function render(setup?: (host: KeyboardHost) => void) {
  const fixture = TestBed.createComponent(KeyboardHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  const bar = el.querySelector('.oge-toolbar') as HTMLElement;
  const buttons = () =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-toolbar-btn'));
  const press = (key: string, from?: HTMLElement) => {
    const target = from ?? (document.activeElement as HTMLElement) ?? bar;
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
  };
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    bar,
    buttons,
    press,
    tabindexes: () => buttons().map((b) => b.getAttribute('tabindex')),
  };
}

describe('OgeToolbar keyboard (APG toolbar)', () => {
  it('puts exactly one control in the Tab sequence', async () => {
    const { tabindexes } = await render();
    expect(tabindexes()).toEqual(['0', '-1', '-1']);
  });

  it('moves focus with Right/Left and follows the roving anchor', async () => {
    const { buttons, press, tabindexes, fixture } = await render();
    buttons()[0].focus();
    press('ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[1]);
    expect(tabindexes()).toEqual(['-1', '0', '-1']);

    press('ArrowLeft');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('wraps by default and stops at the ends when wrap is off', async () => {
    const { buttons, press, fixture, host } = await render();
    buttons()[2].focus();
    press('ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[0]);

    host.wrap.set(false);
    await settle(fixture);
    buttons()[2].focus();
    press('ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[2]);
  });

  it('jumps to the first and last enabled control with Home/End', async () => {
    const { buttons, press, fixture } = await render();
    buttons()[1].focus();
    press('End');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[2]);
    press('Home');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[0]);
  });

  it('skips disabled controls', async () => {
    const { buttons, press, fixture } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'A' },
        { key: 'b', text: 'B', disabled: true },
        { key: 'c', text: 'C' },
      ]),
    );
    buttons()[0].focus();
    press('ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[2]);
  });

  it('anchors the Tab stop on the first enabled control', async () => {
    const { tabindexes } = await render((h) =>
      h.items.set([
        { key: 'a', text: 'A', disabled: true },
        { key: 'b', text: 'B' },
      ]),
    );
    expect(tabindexes()).toEqual(['-1', '0']);
  });

  it('uses Up/Down when the toolbar is vertical', async () => {
    const { buttons, press, fixture, bar } = await render((h) =>
      h.orientation.set('vertical'),
    );
    expect(bar.getAttribute('aria-orientation')).toBe('vertical');
    buttons()[0].focus();
    press('ArrowDown');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[1]);
    // the horizontal keys are inert on a vertical toolbar
    press('ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('leaves the arrow keys to a text-entry control', async () => {
    const { el, press, fixture } = await render((h) => h.withInput.set(true));
    const input = el.querySelector('.search') as HTMLInputElement;
    input.focus();
    press('ArrowLeft', input);
    await settle(fixture);
    expect(document.activeElement).toBe(input);
  });

  it('takes the whole toolbar out of the Tab sequence when disabled', async () => {
    const { tabindexes } = await render((h) => h.disabled.set(true));
    expect(tabindexes()).toEqual(['-1', '-1', '-1']);
  });
});
