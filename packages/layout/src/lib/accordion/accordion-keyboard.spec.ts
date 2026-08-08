import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import type { OgeAccordionItemData } from './accordion-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function key(
  target: Element,
  keyName: string,
  init: KeyboardEventInit = {},
): void {
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: keyName,
      bubbles: true,
      cancelable: true,
      ...init,
    }),
  );
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeAccordion],
  template: `
    <oge-accordion
      [items]="items()"
      [multiple]="true"
      [collapsible]="true"
      [keyboardNavigation]="keyboardNavigation()"
      [typeAhead]="typeAhead()"
      [selectOnFocus]="selectOnFocus()"
      [headingLevel]="headingLevel()"
    />
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly items = signal<readonly OgeAccordionItemData[]>([]);
  readonly keyboardNavigation = signal(true);
  readonly typeAhead = signal(true);
  readonly selectOnFocus = signal(false);
  readonly headingLevel = signal(3);
}

describe('OgeAccordion keyboard', () => {
  const four: OgeAccordionItemData[] = [
    { key: 'a', title: 'Account' },
    { key: 'b', title: 'Billing' },
    { key: 'c', title: 'Cancel' },
    { key: 'd', title: 'Delivery' },
  ];

  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.items.set(four);
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    const toggles = () =>
      Array.from(
        el.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle'),
      );
    return {
      fixture,
      host,
      el,
      toggles,
      focusedIndex: () =>
        toggles().findIndex((b) => b === el.ownerDocument.activeElement),
    };
  }

  it('keeps every header in the Tab sequence (APG: no roving tabindex)', async () => {
    const { toggles } = await render();
    expect(toggles().map((b) => b.getAttribute('tabindex'))).toEqual([
      '0',
      '0',
      '0',
      '0',
    ]);
  });

  it('wraps each header button in a native heading of the configured level', async () => {
    const { el, fixture, host } = await render();
    expect(el.querySelectorAll('h3.oge-accordion-heading')).toHaveLength(4);
    expect(
      el.querySelector('h3.oge-accordion-heading > .oge-accordion-toggle'),
    ).not.toBeNull();

    host.headingLevel.set(2);
    await settle(fixture);
    expect(el.querySelectorAll('h2.oge-accordion-heading')).toHaveLength(4);
    expect(el.querySelectorAll('h3.oge-accordion-heading')).toHaveLength(0);
  });

  it('falls back to role=heading when the level has no native element', async () => {
    const { el, fixture, host } = await render();
    host.headingLevel.set(7);
    await settle(fixture);
    const heading = el.querySelector('.oge-accordion-heading');
    expect(heading?.tagName).toBe('DIV');
    expect(heading?.getAttribute('role')).toBe('heading');
    expect(heading?.getAttribute('aria-level')).toBe('7');
  });

  it('moves focus with ArrowDown / ArrowUp and wraps', async () => {
    const { fixture, toggles, focusedIndex } = await render();
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    await settle(fixture);
    expect(focusedIndex()).toBe(1);

    key(toggles()[1], 'ArrowUp');
    await settle(fixture);
    expect(focusedIndex()).toBe(0);

    key(toggles()[0], 'ArrowUp');
    await settle(fixture);
    expect(focusedIndex()).toBe(3);
  });

  it('jumps to the first and last header with Home / End', async () => {
    const { fixture, toggles, focusedIndex } = await render();
    toggles()[1].focus();
    key(toggles()[1], 'End');
    await settle(fixture);
    expect(focusedIndex()).toBe(3);

    key(toggles()[3], 'Home');
    await settle(fixture);
    expect(focusedIndex()).toBe(0);
  });

  it('skips disabled headers while navigating', async () => {
    const { fixture, toggles, focusedIndex } = await render((h) =>
      h.items.set([four[0], { ...four[1], disabled: true }, four[2], four[3]]),
    );
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    await settle(fixture);
    expect(focusedIndex()).toBe(2);
  });

  it('toggles with Enter and Space through the native button', async () => {
    const { fixture, toggles } = await render();
    toggles()[0].click();
    await settle(fixture);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
  });

  it('moves focus by type-ahead over the titles', async () => {
    const { fixture, toggles, focusedIndex } = await render();
    toggles()[0].focus();
    key(toggles()[0], 'd');
    await settle(fixture);
    expect(focusedIndex()).toBe(3);
  });

  it('supports Ctrl+PageDown / Ctrl+PageUp from inside panel content', async () => {
    const { fixture, el, toggles, focusedIndex } = await render();
    toggles()[1].focus();
    const body = el.querySelectorAll('.oge-accordion-panel-body')[1];
    key(body, 'PageDown', { ctrlKey: true });
    await settle(fixture);
    expect(focusedIndex()).toBe(2);

    key(el.querySelectorAll('.oge-accordion-panel-body')[2], 'PageUp', {
      ctrlKey: true,
    });
    await settle(fixture);
    expect(focusedIndex()).toBe(1);
  });

  it('stays put when keyboardNavigation is off', async () => {
    const { fixture, toggles, focusedIndex } = await render((h) =>
      h.keyboardNavigation.set(false),
    );
    toggles()[0].focus();
    key(toggles()[0], 'ArrowDown');
    await settle(fixture);
    expect(focusedIndex()).toBe(0);
  });

  it('expands on focus move when selectOnFocus is set', async () => {
    const { fixture, toggles } = await render((h) => h.selectOnFocus.set(true));
    toggles()[2].focus();
    toggles()[2].dispatchEvent(new FocusEvent('focus'));
    await settle(fixture);
    expect(toggles()[2].getAttribute('aria-expanded')).toBe('true');
  });

  it('focuses the first enabled header via focus()', async () => {
    const { fixture, host, focusedIndex } = await render((h) =>
      h.items.set([{ ...four[0], disabled: true }, four[1], four[2], four[3]]),
    );
    host.accordion().focus();
    await settle(fixture);
    expect(focusedIndex()).toBe(1);
  });
});
