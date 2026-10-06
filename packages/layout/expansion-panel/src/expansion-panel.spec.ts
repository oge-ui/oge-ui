import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OgeAccordionExpandGuard,
  OgeExpansionPanelExpandingEvent,
} from '@oge-ui/behavior';
import { OgeExpansionPanel, OgeExpansionPanelContent } from './expansion-panel';

@Component({ selector: 'oge-test-lazy-probe', template: 'lazy body' })
class LazyProbe {
  static created = 0;
  constructor() {
    LazyProbe.created++;
  }
}

@Component({
  imports: [OgeExpansionPanel, OgeExpansionPanelContent, LazyProbe],
  template: `
    <oge-expansion-panel
      title="Shipping"
      subtitle="2 addresses"
      [(expanded)]="expanded"
      [disabled]="disabled()"
      [expandGuard]="guard()"
      (expanding)="onExpanding($event)"
      (collapsing)="log.push('collapsing')"
      (opened)="log.push('opened')"
      (closed)="log.push('closed')"
    >
      <button ogeExpansionPanelActions type="button" class="edit">Edit</button>
      <input class="inside" />
      <ng-template ogeExpansionPanelContent
        ><oge-test-lazy-probe
      /></ng-template>
    </oge-expansion-panel>
  `,
})
class PanelHost {
  readonly expanded = signal(false);
  readonly disabled = signal(false);
  readonly guard = signal<OgeAccordionExpandGuard | undefined>(undefined);
  readonly panel = viewChild.required(OgeExpansionPanel);
  readonly log: string[] = [];
  cancelNext = false;

  onExpanding(event: OgeExpansionPanelExpandingEvent): void {
    this.log.push('expanding');
    if (this.cancelNext) event.cancel = true;
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeExpansionPanel', () => {
  let fixture: ComponentFixture<PanelHost>;
  let host: PanelHost;
  let el: HTMLElement;

  const toggle = () =>
    el.querySelector('.oge-expansion-panel-toggle') as HTMLButtonElement;
  const region = () =>
    el.querySelector('.oge-expansion-panel-region') as HTMLElement;

  beforeEach(async () => {
    LazyProbe.created = 0;
    fixture = TestBed.createComponent(PanelHost);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    await settle(fixture);
  });

  afterEach(() => {
    fixture.destroy();
    el.remove();
  });

  it('follows the APG disclosure contract', () => {
    const button = toggle();
    expect(button.tagName).toBe('BUTTON');
    expect(button.closest('h3')).not.toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(region().id);
    expect(region().getAttribute('role')).toBe('region');
    expect(region().getAttribute('aria-labelledby')).toBe(button.id);
    expect(region().hasAttribute('inert')).toBe(true);
    // `title` is an input — never the host's native tooltip
    expect(el.querySelector('oge-expansion-panel')?.hasAttribute('title')).toBe(
      false,
    );
    expect(el.querySelector('.oge-expansion-panel-title')?.textContent).toBe(
      'Shipping',
    );
    expect(el.querySelector('.oge-expansion-panel-subtitle')?.textContent).toBe(
      '2 addresses',
    );
  });

  it('toggles on click with the pre-event and past-tense events', async () => {
    toggle().click();
    await settle(fixture);
    expect(host.expanded()).toBe(true);
    expect(host.panel().isExpanded()).toBe(true);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(region().hasAttribute('inert')).toBe(false);
    toggle().click();
    await settle(fixture);
    expect(host.expanded()).toBe(false);
    expect(host.log).toEqual(['expanding', 'opened', 'collapsing', 'closed']);
  });

  it('a canceled expanding keeps it collapsed', async () => {
    host.cancelNext = true;
    toggle().click();
    await settle(fixture);
    expect(host.expanded()).toBe(false);
    expect(host.log).toEqual(['expanding']);
  });

  it('a guard vetoes; an async one shows the pending state', async () => {
    host.guard.set(() => false);
    await settle(fixture);
    toggle().click();
    await settle(fixture);
    expect(host.expanded()).toBe(false);

    let allow!: (value: boolean) => void;
    host.guard.set(
      () =>
        new Promise<boolean>((resolve) => {
          allow = resolve;
        }),
    );
    await settle(fixture);
    toggle().click();
    fixture.detectChanges();
    expect(el.querySelector('oge-expansion-panel')?.classList).toContain(
      'oge-expansion-panel-pending',
    );
    expect(el.querySelector('.oge-expansion-panel-sr')?.textContent).toBe(
      'working',
    );
    allow(true);
    await settle(fixture);
    expect(host.expanded()).toBe(true);
  });

  it('disabled refuses and leaves the Tab sequence', async () => {
    host.disabled.set(true);
    await settle(fixture);
    expect(toggle().getAttribute('aria-disabled')).toBe('true');
    expect(toggle().getAttribute('tabindex')).toBe('-1');
    toggle().click();
    await settle(fixture);
    expect(host.expanded()).toBe(false);
    expect(host.log).toEqual([]);
  });

  it('a two-way write applies directly, without events', async () => {
    host.expanded.set(true);
    await settle(fixture);
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(host.log).toEqual([]);
  });

  it('renders the lazy template on first expand and keeps it', async () => {
    expect(LazyProbe.created).toBe(0);
    await host.panel().expand();
    await settle(fixture);
    expect(LazyProbe.created).toBe(1);
    await host.panel().collapse();
    await settle(fixture);
    expect(el.querySelector('oge-test-lazy-probe')).not.toBeNull();
    expect(LazyProbe.created).toBe(1);
  });

  it('projects header actions beside the toggle, not inside it', () => {
    const edit = el.querySelector('.edit') as HTMLElement;
    expect(edit.closest('.oge-expansion-panel-actions')).not.toBeNull();
    expect(edit.closest('button.oge-expansion-panel-toggle')).toBeNull();
  });

  it('hands focus back to the header when collapsing from inside', async () => {
    await host.panel().expand();
    await settle(fixture);
    (el.querySelector('.inside') as HTMLInputElement).focus();
    await host.panel().collapse();
    await settle(fixture);
    expect(document.activeElement).toBe(toggle());
  });
});
