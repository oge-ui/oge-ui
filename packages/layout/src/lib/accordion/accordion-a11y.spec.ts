import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import { OgeAccordionItem } from './accordion-item';
import type { OgeAccordionItemData } from './accordion-types';
import { provideOgeAccordionConfig } from './config';
import {
  OgeAccordionHeaderActionsTemplate,
  OgeAccordionHeaderTemplate,
  OgeAccordionToggleIconTemplate,
} from './templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeAccordion,
    OgeAccordionItem,
    OgeAccordionHeaderTemplate,
    OgeAccordionToggleIconTemplate,
    OgeAccordionHeaderActionsTemplate,
  ],
  template: `
    <oge-accordion
      [items]="items()"
      [multiple]="true"
      [collapsible]="true"
      [useRegionRole]="useRegionRole()"
      [hideToggle]="hideToggle()"
      ariaLabel="Settings"
    >
      <oge-accordion-item key="child" title="Child" [invalid]="true">
        <ng-template ogeAccordionHeaderActionsTemplate let-index="index">
          <button type="button" class="remove" (click)="removed.push(index)">
            Remove
          </button>
        </ng-template>
        body
      </oge-accordion-item>
      <ng-template ogeAccordionHeaderTemplate let-item>
        <span class="custom-header">{{ item.title }}!</span>
      </ng-template>
      <ng-template ogeAccordionToggleIconTemplate let-expanded>
        <span class="custom-icon">{{ expanded ? '-' : '+' }}</span>
      </ng-template>
    </oge-accordion>
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly items = signal<readonly OgeAccordionItemData[]>([
    { key: 'a', title: 'Account' },
  ]);
  readonly useRegionRole = signal(true);
  readonly hideToggle = signal(false);
  readonly removed: number[] = [];
}

describe('OgeAccordion accessibility and templates', () => {
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
    };
  }

  it('never nests a focusable control inside the header button', async () => {
    const { el, toggles } = await render();
    // the header actions button exists…
    const remove = el.querySelector<HTMLButtonElement>('.remove');
    expect(remove).not.toBeNull();
    // …but lives outside the toggle button (no nested-interactive)
    for (const toggle of toggles()) {
      expect(
        toggle.querySelectorAll('button, a[href], input, select, textarea'),
      ).toHaveLength(0);
    }
    expect(remove?.closest('.oge-accordion-toggle')).toBeNull();
    expect(remove?.closest('.oge-accordion-header')).not.toBeNull();
  });

  it('keeps the header actions clickable without toggling the panel', async () => {
    const { fixture, host, el, toggles } = await render();
    el.querySelector<HTMLButtonElement>('.remove')?.click();
    await settle(fixture);
    expect(host.removed).toEqual([0]);
    expect(toggles()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('wires the APG aria contract on every panel', async () => {
    const { el, toggles } = await render();
    const panels = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-accordion-panel'),
    );
    toggles().forEach((toggle, index) => {
      expect(toggle.getAttribute('aria-controls')).toBe(panels[index].id);
      expect(panels[index].getAttribute('aria-labelledby')).toBe(toggle.id);
      expect(panels[index].getAttribute('role')).toBe('region');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.closest('h3.oge-accordion-heading')).not.toBeNull();
    });
    expect(el.querySelector('.oge-accordion')?.getAttribute('aria-label')).toBe(
      'Settings',
    );
  });

  it('drops role=region when useRegionRole is off', async () => {
    const { fixture, host, el } = await render();
    host.useRegionRole.set(false);
    await settle(fixture);
    expect(
      el.querySelector('.oge-accordion-panel')?.getAttribute('role'),
    ).toBeNull();
  });

  it('announces an invalid section with a visually hidden label', async () => {
    const { el } = await render();
    const invalid = el.querySelector('.oge-accordion-item-invalid');
    expect(invalid).not.toBeNull();
    expect(invalid?.querySelector('.oge-accordion-sr')?.textContent).toContain(
      'section has errors',
    );
    expect(
      invalid
        ?.querySelector('.oge-accordion-invalid-dot')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('uses the component-level templates for items-mode panels only', async () => {
    const { el } = await render();
    const headers = Array.from(el.querySelectorAll('.oge-accordion-toggle'));
    // descendants:false — the child keeps its own built-in title
    expect(headers[0].querySelector('.custom-header')).toBeNull();
    expect(headers[0].textContent).toContain('Child');
    // the data-driven item picks up the shared header template
    expect(headers[1].querySelector('.custom-header')?.textContent).toBe(
      'Account!',
    );
  });

  it('replaces the chevron with the toggle-icon template on every panel', async () => {
    const { fixture, el } = await render();
    // the chevron is accordion-level chrome — unlike the header template it
    // also applies to declarative children
    expect(el.querySelectorAll('.custom-icon')).toHaveLength(2);
    expect(el.querySelector('.custom-icon')?.textContent).toBe('+');

    el.querySelectorAll<HTMLButtonElement>('.oge-accordion-toggle')[1].click();
    await settle(fixture);
    expect(el.querySelectorAll('.custom-icon')[1]?.textContent).toBe('-');
  });

  it('hides the toggle icon entirely with hideToggle', async () => {
    const { fixture, host, el } = await render();
    host.hideToggle.set(true);
    await settle(fixture);
    expect(el.querySelectorAll('.oge-accordion-toggle-icon')).toHaveLength(0);
  });

  it('renders an icon path and a badge from the item data', async () => {
    TestBed.resetTestingModule();
    @Component({
      selector: 'oge-icon-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeAccordion],
      template: `
        <oge-accordion
          [items]="[{ key: 'a', title: 'Account', icon: 'M4 4h16', badge: 7 }]"
        />
      `,
    })
    class IconHost {}
    const fixture = TestBed.createComponent(IconHost);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(
      el.querySelector('.oge-accordion-icon path')?.getAttribute('d'),
    ).toBe('M4 4h16');
    expect(el.querySelector('.oge-accordion-badge')?.textContent?.trim()).toBe(
      '7',
    );
  });

  it('shows the empty message when nothing is visible', async () => {
    TestBed.resetTestingModule();
    @Component({
      selector: 'oge-empty-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeAccordion],
      template: `<oge-accordion [items]="[]" />`,
    })
    class EmptyHost {}
    const fixture = TestBed.createComponent(EmptyHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-accordion-empty',
      )?.textContent,
    ).toContain('No sections to display');
  });

  it('honors provideOgeAccordionConfig message overrides', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeAccordionConfig({
          messages: { noData: 'Bölüm yok' },
        }),
      ],
    });
    @Component({
      selector: 'oge-config-host',
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [OgeAccordion],
      template: `<oge-accordion [items]="[]" />`,
    })
    class ConfigHost {}
    const fixture = TestBed.createComponent(ConfigHost);
    await settle(fixture);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-accordion-empty',
      )?.textContent,
    ).toContain('Bölüm yok');
  });
});
