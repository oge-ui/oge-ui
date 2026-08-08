import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import type {
  OgeAccordionCollapsedEvent,
  OgeAccordionExpandedEvent,
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
  imports: [OgeAccordion],
  template: `
    <oge-accordion
      [items]="items()"
      [multiple]="true"
      [collapsible]="true"
      (itemExpanded)="expanded.push($event)"
      (itemCollapsed)="collapsed.push($event)"
    />
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly items = signal<readonly OgeAccordionItemData[]>([]);
  readonly expanded: OgeAccordionExpandedEvent[] = [];
  readonly collapsed: OgeAccordionCollapsedEvent[] = [];
}

describe('OgeAccordion expandGuard', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  async function render(items: readonly OgeAccordionItemData[]) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.items.set(items);
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
      expandedFlags: () =>
        toggles().map((b) => b.getAttribute('aria-expanded')),
      pending: () => el.querySelectorAll('.oge-accordion-item-pending').length,
    };
  }

  it('vetoes the expand when a sync guard returns false', async () => {
    const { fixture, toggles, expandedFlags } = await render([
      { key: 'a', title: 'Account', expandGuard: () => false },
    ]);
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false']);
  });

  it('marks the panel pending while an async guard is in flight', async () => {
    let allow!: (value: boolean) => void;
    const { fixture, toggles, expandedFlags, pending } = await render([
      {
        key: 'a',
        title: 'Account',
        expandGuard: () => new Promise<boolean>((r) => (allow = r)),
      },
    ]);
    toggles()[0].click();
    await settle(fixture);
    expect(pending()).toBe(1);
    expect(expandedFlags()).toEqual(['false']);

    allow(true);
    await settle(fixture);
    expect(pending()).toBe(0);
    expect(expandedFlags()).toEqual(['true']);
  });

  it('is single-flight — a second click while pending is ignored', async () => {
    let calls = 0;
    let allow!: (value: boolean) => void;
    const { fixture, toggles } = await render([
      {
        key: 'a',
        title: 'Account',
        expandGuard: () => {
          calls++;
          return new Promise<boolean>((r) => (allow = r));
        },
      },
    ]);
    toggles()[0].click();
    await settle(fixture);
    toggles()[0].click();
    toggles()[0].click();
    await settle(fixture);
    expect(calls).toBe(1);

    allow(false);
    await settle(fixture);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('treats a rejection as a veto, clears pending and warns', async () => {
    const { fixture, host, toggles, expandedFlags, pending } = await render([
      {
        key: 'a',
        title: 'Account',
        expandGuard: () => Promise.reject(new Error('nope')),
      },
    ]);
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false']);
    expect(pending()).toBe(0);
    expect(host.expanded).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('treats a throw as a veto', async () => {
    const { fixture, toggles, expandedFlags } = await render([
      {
        key: 'a',
        title: 'Account',
        expandGuard: () => {
          throw new Error('nope');
        },
      },
    ]);
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false']);
    expect(warn).toHaveBeenCalled();
  });

  it('runs the guard on collapse too', async () => {
    let verdict = true;
    const { fixture, toggles, expandedFlags } = await render([
      { key: 'a', title: 'Account', expandGuard: () => verdict },
    ]);
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true']);

    verdict = false;
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['true']);

    verdict = true;
    toggles()[0].click();
    await settle(fixture);
    expect(expandedFlags()).toEqual(['false']);
  });
});
