import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import { OgeAccordionItem } from './accordion-item';
import type {
  OgeAccordionCollapsedEvent,
  OgeAccordionExpandedEvent,
  OgeAccordionExpandingEvent,
  OgeAccordionItemData,
} from './accordion-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeAccordion, OgeAccordionItem],
  template: `
    <oge-accordion
      [items]="items()"
      [multiple]="multiple()"
      [collapsible]="collapsible()"
      [(expandedKeys)]="expandedKeys"
      [(selectedIndex)]="selectedIndex"
      (itemExpanding)="expanding.push($event)"
      (itemExpanded)="expanded.push($event)"
      (itemCollapsed)="collapsed.push($event)"
    >
      @for (child of children(); track child.key) {
        <oge-accordion-item
          [key]="child.key"
          [title]="child.title ?? ''"
          [disabled]="child.disabled ?? false"
          [expanded]="child.expanded ?? false"
        >
          body of {{ child.key }}
        </oge-accordion-item>
      }
    </oge-accordion>
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly items = signal<readonly OgeAccordionItemData[] | undefined>(
    undefined,
  );
  readonly children = signal<readonly OgeAccordionItemData[]>([]);
  readonly multiple = signal(false);
  readonly collapsible = signal(false);
  readonly expandedKeys = signal<readonly string[]>([]);
  readonly selectedIndex = signal(-1);
  readonly expanding: OgeAccordionExpandingEvent[] = [];
  readonly expanded: OgeAccordionExpandedEvent[] = [];
  readonly collapsed: OgeAccordionCollapsedEvent[] = [];
}

describe('OgeAccordion expansion', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host,
      toggles: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle'),
        ),
      panels: () =>
        Array.from(el.querySelectorAll<HTMLElement>('.oge-accordion-panel')),
      expandedFlags: () =>
        Array.from(
          el.querySelectorAll<HTMLElement>('.oge-accordion-toggle'),
        ).map((b) => b.getAttribute('aria-expanded')),
    };
  }

  const three: OgeAccordionItemData[] = [
    { key: 'a', title: 'Account' },
    { key: 'b', title: 'Billing' },
    { key: 'c', title: 'Cancel' },
  ];

  it('renders projected children first, then data-driven items', async () => {
    const { toggles } = await render((h) => {
      h.children.set([{ key: 'x', title: 'Child' }]);
      h.items.set(three);
    });
    expect(toggles().map((b) => b.textContent?.trim())).toEqual([
      'Child',
      'Account',
      'Billing',
      'Cancel',
    ]);
  });

  it('expands on click and collapses the sibling in single mode', async () => {
    const { fixture, toggles, expandedFlags } = await render((h) =>
      h.items.set(three),
    );
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);

    toggles()[1].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'true', 'false']);
  });

  it('keeps several panels open in multiple mode', async () => {
    const { fixture, toggles, expandedFlags } = await render((h) => {
      h.items.set(three);
      h.multiple.set(true);
    });
    toggles()[0].click();
    toggles()[2].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true', 'false', 'true']);
  });

  it('refuses to collapse the last open panel unless collapsible', async () => {
    const { fixture, host, toggles, expandedFlags } = await render((h) =>
      h.items.set(three),
    );
    toggles()[0].click();
    await settle(fixture);
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true', 'false', 'false']);
    // APG: an expanded panel that cannot be collapsed is aria-disabled
    expect(toggles()[0].getAttribute('aria-disabled')).toBe('true');

    host.collapsible.set(true);
    await settle(fixture);
    expect(toggles()[0].getAttribute('aria-disabled')).toBeNull();
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('honors the cancelable itemExpanding pre-event', async () => {
    const { fixture, host, toggles, expandedFlags } = await render((h) =>
      h.items.set(three),
    );
    host.expanding.length = 0;
    const accordion = host.accordion();
    accordion.itemExpanding.subscribe((e) => (e.cancel = true));
    toggles()[1].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
    expect(host.expanded).toEqual([]);
  });

  it('ignores clicks on a disabled panel', async () => {
    const { fixture, toggles, expandedFlags } = await render((h) =>
      h.items.set([three[0], { key: 'b', title: 'Billing', disabled: true }]),
    );
    toggles()[1].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'false']);
    expect(toggles()[1].getAttribute('tabindex')).toBe('-1');
  });

  it('syncs expandedKeys both ways', async () => {
    const { fixture, host, toggles, expandedFlags } = await render((h) => {
      h.items.set(three);
      h.multiple.set(true);
    });
    host.expandedKeys.set(['a', 'c']);
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true', 'false', 'true']);

    toggles()[1].click();
    await settle(fixture);
    expect([...host.expandedKeys()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('syncs selectedIndex both ways in single mode', async () => {
    const { fixture, host, toggles, expandedFlags } = await render((h) =>
      h.items.set(three),
    );
    host.selectedIndex.set(2);
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'false', 'true']);

    toggles()[0].click();
    await settle(fixture);
    expect(host.selectedIndex()).toBe(0);
  });

  it('seeds the initial expanded state of a declarative child', async () => {
    const { expandedFlags } = await render((h) =>
      h.children.set([
        { key: 'x', title: 'One' },
        { key: 'y', title: 'Two', expanded: true },
      ]),
    );
    expect(expandedFlags()).toEqual(['false', 'true']);
  });

  it('expandAll and collapseAll respect multiple and collapsible', async () => {
    const { fixture, host, expandedFlags } = await render((h) => {
      h.items.set(three);
      h.multiple.set(true);
      h.collapsible.set(true);
    });
    host.accordion().expandAll();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true', 'true', 'true']);

    host.accordion().collapseAll();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('expandInvalid opens every failing section', async () => {
    const { fixture, host, expandedFlags } = await render((h) => {
      h.items.set([
        { key: 'a', title: 'Account' },
        { key: 'b', title: 'Billing', invalid: true },
        { key: 'c', title: 'Cancel', invalid: true },
      ]);
      h.multiple.set(true);
    });
    host.accordion().expandInvalid();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false', 'true', 'true']);
    expect(
      fixture.nativeElement.querySelectorAll('.oge-accordion-item-invalid'),
    ).toHaveLength(2);
  });

  it('prunes state for panels that disappear', async () => {
    const { fixture, host, toggles } = await render((h) => {
      h.items.set(three);
      h.multiple.set(true);
    });
    toggles()[2].click();
    await settle(fixture);
    expect(host.expandedKeys()).toEqual(['c']);

    host.items.set(three.slice(0, 2));
    await settle(fixture);
    expect(host.expandedKeys()).toEqual([]);
  });
});
