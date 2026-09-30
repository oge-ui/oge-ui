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
  OgeAccordionContentFailedEvent,
  OgeAccordionContentLoadedEvent,
} from './accordion-types';
import { OgeAccordionContentTemplate } from './templates';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  selector: 'oge-test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeAccordion, OgeAccordionItem, OgeAccordionContentTemplate],
  template: `
    <oge-accordion
      [multiple]="true"
      [collapsible]="true"
      (itemContentLoaded)="loaded.push($event)"
      (itemContentFailed)="failed.push($event)"
    >
      <oge-accordion-item key="a" title="Account" [contentLoader]="loader()">
        <ng-template ogeAccordionContentTemplate let-data="data">
          <span class="payload">{{ data }}</span>
        </ng-template>
      </oge-accordion-item>
    </oge-accordion>
  `,
})
class Host {
  readonly accordion = viewChild.required(OgeAccordion);
  readonly loader = signal<(() => Promise<unknown>) | undefined>(undefined);
  readonly loaded: OgeAccordionContentLoadedEvent[] = [];
  readonly failed: OgeAccordionContentFailedEvent[] = [];
}

describe('OgeAccordion content loader', () => {
  async function render(loader: () => Promise<unknown>) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.loader.set(loader);
    await settle(fixture);
    const el: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host,
      el,
      toggle: () =>
        el.querySelector<HTMLButtonElement>(
          '.oge-accordion-toggle',
        ) as HTMLButtonElement,
      skeleton: () => el.querySelector('.oge-accordion-skeleton'),
      error: () => el.querySelector('.oge-accordion-error'),
      retry: () => el.querySelector<HTMLButtonElement>('.oge-accordion-retry'),
      payload: () => el.querySelector('.payload')?.textContent?.trim(),
    };
  }

  it('shows a skeleton while loading, then the resolved content', async () => {
    let resolve!: (value: string) => void;
    const { fixture, host, toggle, skeleton, payload } = await render(
      () => new Promise<string>((r) => (resolve = r)),
    );
    toggle().click();
    await settle(fixture);
    expect(skeleton()).not.toBeNull();
    expect(payload()).toBeUndefined();

    resolve('42 invoices');
    await settle(fixture);
    expect(skeleton()).toBeNull();
    expect(payload()).toBe('42 invoices');
    expect(host.loaded).toHaveLength(1);
    expect(host.loaded[0].data).toBe('42 invoices');
  });

  it('runs the loader only once across collapse and re-expand', async () => {
    let calls = 0;
    const { fixture, toggle } = await render(() => {
      calls++;
      return Promise.resolve('once');
    });
    toggle().click();
    await settle(fixture);
    toggle().click();
    await settle(fixture);
    toggle().click();
    await settle(fixture);
    expect(calls).toBe(1);
  });

  it('renders an error with a working retry button on rejection', async () => {
    let attempt = 0;
    const { fixture, host, toggle, error, retry, payload } = await render(
      () => {
        attempt++;
        return attempt === 1
          ? Promise.reject(new Error('boom'))
          : Promise.resolve('second try');
      },
    );
    toggle().click();
    await settle(fixture);
    expect(error()).not.toBeNull();
    expect(host.failed).toHaveLength(1);

    retry()?.click();
    await settle(fixture);
    expect(error()).toBeNull();
    expect(payload()).toBe('second try');
    expect(host.loaded).toHaveLength(1);
  });

  it('treats a synchronous throw in the loader as a failure', async () => {
    const { fixture, host, toggle, error } = await render(() => {
      throw new Error('sync boom');
    });
    toggle().click();
    await settle(fixture);
    expect(error()).not.toBeNull();
    expect(host.failed).toHaveLength(1);
  });

  it('replays the fade animation when content resolves late', async () => {
    let resolve!: (value: string) => void;
    const { fixture, el, toggle } = await render(
      () => new Promise<string>((r) => (resolve = r)),
    );
    toggle().click();
    await settle(fixture);
    expect(el.querySelector('.oge-accordion-fade-a')).toBeNull();

    resolve('done');
    await settle(fixture);
    expect(el.querySelector('.oge-accordion-fade-a')).not.toBeNull();
  });
});
