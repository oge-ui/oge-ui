import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import { OgeAccordionItem } from './accordion-item';
import type {
  OgeAccordionCollapsedEvent,
  OgeAccordionExpandedEvent,
  OgeAccordionItemData,
} from './accordion-types';
import { provideOgeAccordionConfig } from './config';

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
      [multiple]="multiple()"
      [collapsible]="true"
      [hideToggle]="hideToggle()"
      [togglePosition]="'end'"
      [collapsedHeaderHeight]="collapsedHeaderHeight()"
      [expandedHeaderHeight]="expandedHeaderHeight()"
      (afterExpand)="afterExpand.push($event)"
      (afterCollapse)="afterCollapse.push($event)"
    >
      <oge-accordion-item
        key="a"
        title="Account"
        [(expanded)]="accountExpanded"
        [hideToggle]="itemHideToggle()"
        [togglePosition]="itemTogglePosition()"
        [expandGuard]="guard()"
      >
        <button type="button" class="inside">inside</button>
      </oge-accordion-item>
      <oge-accordion-item key="b" title="Billing">billing</oge-accordion-item>
    </oge-accordion>
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly panels = viewChildren(OgeAccordionItem);
  readonly multiple = signal(true);
  readonly accountExpanded = signal(false);
  readonly hideToggle = signal(false);
  readonly itemHideToggle = signal<boolean | undefined>(undefined);
  readonly itemTogglePosition = signal<'start' | 'end' | undefined>(undefined);
  readonly collapsedHeaderHeight = signal<string | undefined>(undefined);
  readonly expandedHeaderHeight = signal<string | undefined>(undefined);
  readonly guard = signal<(() => boolean) | undefined>(undefined);
  readonly afterExpand: OgeAccordionExpandedEvent[] = [];
  readonly afterCollapse: OgeAccordionCollapsedEvent[] = [];
}

describe('OgeAccordion reference parity', () => {
  async function render(setup?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    setup?.(host);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host,
      el,
      toggles: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle'),
        ),
      flags: () =>
        Array.from(
          el.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle'),
        ).map((b) => b.getAttribute('aria-expanded')),
    };
  }

  describe('per-panel two-way [(expanded)]', () => {
    it('expands from an initial binding', async () => {
      const { flags } = await render((h) => h.accountExpanded.set(true));
      expect(flags()).toEqual(['true', 'false']);
    });

    it('follows outside writes in both directions', async () => {
      const { fixture, host, flags } = await render();
      host.accountExpanded.set(true);
      await settle(fixture);
      expect(flags()).toEqual(['true', 'false']);

      host.accountExpanded.set(false);
      await settle(fixture);
      expect(flags()).toEqual(['false', 'false']);
    });

    it('writes back when the user toggles', async () => {
      const { fixture, host, toggles } = await render();
      toggles()[0].click();
      await settle(fixture);
      expect(host.accountExpanded()).toBe(true);

      toggles()[0].click();
      await settle(fixture);
      expect(host.accountExpanded()).toBe(false);
    });

    it('reverts the binding when a guard vetoes the write', async () => {
      const { fixture, host, flags } = await render((h) =>
        h.guard.set(() => false),
      );
      host.accountExpanded.set(true);
      await settle(fixture);
      expect(flags()).toEqual(['false', 'false']);
      expect(host.accountExpanded()).toBe(false);
    });

    it('exposes open/close/toggle on the panel itself', async () => {
      const { fixture, host, flags } = await render();
      host.panels()[1].open();
      await settle(fixture);
      expect(flags()).toEqual(['false', 'true']);

      host.panels()[1].toggle();
      await settle(fixture);
      expect(flags()).toEqual(['false', 'false']);

      host.panels()[1].open();
      await settle(fixture);
      host.panels()[1].close();
      await settle(fixture);
      expect(flags()).toEqual(['false', 'false']);
    });
  });

  describe('focus restoration', () => {
    it('moves focus to the header when the collapsing panel holds it', async () => {
      const { fixture, host, el, toggles } = await render();
      host.accountExpanded.set(true);
      await settle(fixture);

      const inside = el.querySelector<HTMLButtonElement>('.inside');
      inside?.focus();
      expect(el.ownerDocument.activeElement).toBe(inside);

      host.accountExpanded.set(false);
      await settle(fixture);
      // without this the panel turns inert and focus would fall to <body>
      expect(el.ownerDocument.activeElement).toBe(toggles()[0]);
    });

    it('leaves focus alone when it is outside the collapsing panel', async () => {
      const { fixture, host, el, toggles } = await render();
      host.accountExpanded.set(true);
      await settle(fixture);

      toggles()[1].focus();
      host.accountExpanded.set(false);
      await settle(fixture);
      expect(el.ownerDocument.activeElement).toBe(toggles()[1]);
    });
  });

  describe('afterExpand / afterCollapse', () => {
    it('fires immediately when the panel does not animate', async () => {
      // jsdom reports a 0s transition-duration, i.e. the reduced-motion path
      const { fixture, host, toggles } = await render();
      toggles()[0].click();
      await settle(fixture);
      expect(host.afterExpand).toHaveLength(1);
      expect(host.afterExpand[0].key).toBe('a');

      toggles()[0].click();
      await settle(fixture);
      expect(host.afterCollapse).toHaveLength(1);
    });
  });

  describe('per-panel toggle overrides', () => {
    it('hides only the overriding panel’s chevron', async () => {
      const { fixture, host, el } = await render();
      expect(el.querySelectorAll('.oge-accordion-toggle-icon')).toHaveLength(2);

      host.itemHideToggle.set(true);
      await settle(fixture);
      expect(el.querySelectorAll('.oge-accordion-toggle-icon')).toHaveLength(1);
    });

    it('overrides the toggle position per panel', async () => {
      const { fixture, host, el } = await render();
      const wraps = () =>
        Array.from(el.querySelectorAll('.oge-accordion-toggle')).map((b) =>
          b.getAttribute('data-toggle-position'),
        );
      expect(wraps()).toEqual(['end', 'end']);

      host.itemTogglePosition.set('start');
      await settle(fixture);
      expect(wraps()).toEqual(['start', 'end']);
    });
  });

  describe('header heights', () => {
    it('applies the collapsed and expanded heights', async () => {
      const { fixture, host, toggles } = await render((h) => {
        h.collapsedHeaderHeight.set('48px');
        h.expandedHeaderHeight.set('64px');
      });
      expect(
        toggles()[0].style.getPropertyValue('--oge-accordion-header-height'),
      ).toBe('48px');

      host.accountExpanded.set(true);
      await settle(fixture);
      expect(
        toggles()[0].style.getPropertyValue('--oge-accordion-header-height'),
      ).toBe('64px');
    });
  });

  describe('promise-returning methods', () => {
    it('resolves true on commit and false on veto', async () => {
      const { fixture, host } = await render();
      await expect(host.accordion().expand('b')).resolves.toBe(true);
      await settle(fixture);

      host.guard.set(() => false);
      await settle(fixture);
      await expect(host.accordion().expand('a')).resolves.toBe(false);
      await expect(host.accordion().expand('missing')).resolves.toBe(false);
    });

    it('resolves once an async guard settles', async () => {
      let allow!: (value: boolean) => void;
      const { fixture, host } = await render();
      host.guard.set(() => new Promise<boolean>((r) => (allow = r)));
      await settle(fixture);

      const verdict = host.accordion().expand('a');
      await settle(fixture);
      allow(true);
      await expect(verdict).resolves.toBe(true);
    });
  });

  describe('plain-text panel body (dx item.text)', () => {
    it('renders text when there is no content template', async () => {
      TestBed.resetTestingModule();
      @Component({
        selector: 'oge-text-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [OgeAccordion],
        template: `<oge-accordion [items]="items" [multiple]="true" />`,
      })
      class TextHost {
        readonly items: OgeAccordionItemData[] = [
          {
            key: 'a',
            title: 'Account',
            text: 'Plain body text',
            expanded: true,
          },
        ];
      }
      const fixture = TestBed.createComponent(TextHost);
      await settle(fixture);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.oge-accordion-panel-body',
        )?.textContent,
      ).toContain('Plain body text');
    });
  });

  describe('config defaults', () => {
    it('seeds hideToggle and the header heights from the provider', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideOgeAccordionConfig({
            hideToggle: true,
            collapsedHeaderHeight: '56px',
          }),
        ],
      });
      @Component({
        selector: 'oge-config-host',
        changeDetection: ChangeDetectionStrategy.OnPush,
        imports: [OgeAccordion],
        template: `<oge-accordion [items]="[{ key: 'a', title: 'A' }]" />`,
      })
      class ConfigHost {}
      const fixture = TestBed.createComponent(ConfigHost);
      await settle(fixture);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelectorAll('.oge-accordion-toggle-icon')).toHaveLength(0);
      expect(
        el
          .querySelector<HTMLElement>('.oge-accordion-toggle')
          ?.style.getPropertyValue('--oge-accordion-header-height'),
      ).toBe('56px');
    });
  });
});
