import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeAccordion } from './accordion';
import { OgeAccordionItem } from './accordion-item';
import { OgeAccordionContentTemplate } from './templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-spy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `spy`,
})
class SpyComp {
  static instances = 0;
  constructor() {
    SpyComp.instances++;
  }
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OgeAccordion,
    OgeAccordionItem,
    OgeAccordionContentTemplate,
    SpyComp,
  ],
  template: `
    <oge-accordion
      [multiple]="true"
      [collapsible]="true"
      [deferRendering]="deferRendering()"
      [keepAlive]="keepAlive()"
    >
      <oge-accordion-item key="a" title="Account">plain</oge-accordion-item>
      <oge-accordion-item key="b" title="Billing">
        <ng-template ogeAccordionContentTemplate>
          <oge-spy />
        </ng-template>
      </oge-accordion-item>
    </oge-accordion>
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly deferRendering = signal(true);
  readonly keepAlive = signal(true);
}

describe('OgeAccordion rendering', () => {
  beforeEach(() => (SpyComp.instances = 0));

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
      spies: () => el.querySelectorAll('oge-spy').length,
    };
  }

  it('defers lazy content until the panel first expands', async () => {
    const { fixture, toggles, spies } = await render();
    expect(spies()).toBe(0);
    expect(SpyComp.instances).toBe(0);

    toggles()[1].click();
    await settle(fixture);
    expect(spies()).toBe(1);
    expect(SpyComp.instances).toBe(1);
  });

  it('keeps content mounted after collapse with keepAlive', async () => {
    const { fixture, toggles, spies } = await render();
    toggles()[1].click();
    await settle(fixture);
    toggles()[1].click();
    await settle(fixture);
    expect(spies()).toBe(1);
    expect(SpyComp.instances).toBe(1);

    toggles()[1].click();
    await settle(fixture);
    expect(SpyComp.instances).toBe(1);
  });

  it('destroys and re-creates content when keepAlive is off', async () => {
    const { fixture, toggles, spies } = await render((h) =>
      h.keepAlive.set(false),
    );
    toggles()[1].click();
    await settle(fixture);
    expect(SpyComp.instances).toBe(1);

    toggles()[1].click();
    await settle(fixture);
    expect(spies()).toBe(0);

    toggles()[1].click();
    await settle(fixture);
    expect(SpyComp.instances).toBe(2);
  });

  it('renders everything up front when deferRendering is off', async () => {
    const { spies } = await render((h) => h.deferRendering.set(false));
    expect(spies()).toBe(1);
  });

  it('keeps the panel element mounted so the aria id pair survives', async () => {
    const { el, toggles } = await render();
    const panels = el.querySelectorAll('.oge-accordion-panel');
    expect(panels).toHaveLength(2);
    expect(panels[1].getAttribute('aria-labelledby')).toBe(
      toggles()[1].getAttribute('id'),
    );
    expect(toggles()[1].getAttribute('aria-controls')).toBe(panels[1].id);
    // collapsed panels are inert so their content is not tabbable
    expect(panels[1].hasAttribute('inert')).toBe(true);
  });
});
