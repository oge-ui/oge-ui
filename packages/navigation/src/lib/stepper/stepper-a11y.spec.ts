import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeStep } from './step';
import { OgeStepper } from './stepper';
import { provideOgeStepperConfig } from './config';
import type { OgeStepperDisplay, OgeStepperOrientation } from './stepper-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeStepper, OgeStep],
  template: `
    <oge-stepper
      [(activeIndex)]="active"
      [orientation]="orientation()"
      [display]="display()"
    >
      <oge-step key="a" label="Account" description="Who you are" />
      <oge-step key="b" label="Shipping" [optional]="true" />
      <oge-step key="c" label="Review" />
    </oge-stepper>
  `,
})
class A11yHost {
  readonly stepper = viewChild.required(OgeStepper);
  readonly active = signal(0);
  readonly orientation = signal<OgeStepperOrientation>('horizontal');
  readonly display = signal<OgeStepperDisplay>('full');
}

async function render(setup?: (host: A11yHost) => void) {
  const fixture = TestBed.createComponent(A11yHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    list: () => el.querySelector('.oge-stepper-list') as HTMLElement,
    headers: () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-stepper-header')),
    panels: () =>
      Array.from(el.querySelectorAll<HTMLElement>('.oge-stepper-panel')),
  };
}

describe('OgeStepper — the ARIA model', () => {
  it('is an ordered list of buttons, not a tablist', async () => {
    const { el, list, headers } = await render();
    // The deliberate divergence from Material: a stepper is a process, not a
    // strip of freely browsable panels, so no tab semantics appear at all.
    expect(list().tagName).toBe('OL');
    expect(el.querySelectorAll('[role="tablist"]').length).toBe(0);
    expect(el.querySelectorAll('[role="tab"]').length).toBe(0);
    expect(el.querySelectorAll('[role="tabpanel"]').length).toBe(0);
    expect(el.querySelectorAll('[aria-selected]').length).toBe(0);
    expect(headers().every((h) => h.tagName === 'BUTTON')).toBe(true);
    expect(el.querySelectorAll('.oge-stepper-item').length).toBe(3);
  });

  it('marks exactly one header aria-current="step"', async () => {
    const { fixture, host, el, headers } = await render();
    const current = () =>
      Array.from(el.querySelectorAll('[aria-current]')).map((n) =>
        n.getAttribute('aria-current'),
      );
    expect(current()).toEqual(['step']);
    expect(headers()[0].getAttribute('aria-current')).toBe('step');

    host.active.set(2);
    await settle(fixture);
    expect(current()).toEqual(['step']);
    expect(headers()[2].getAttribute('aria-current')).toBe('step');
  });

  it('labels each panel by its header and hides the inactive ones', async () => {
    const { headers, panels } = await render();
    const shown = panels().filter((p) => !p.hasAttribute('hidden'));
    expect(shown.length).toBe(1);
    // `group`, not `region`: a region is a landmark, and one per step would
    // flood a page the APG asks to keep under seven
    expect(shown[0].getAttribute('role')).toBe('group');
    expect(shown[0].getAttribute('aria-labelledby')).toBe(headers()[0].id);
    expect(headers()[0].getAttribute('aria-controls')).toBe(shown[0].id);
    // hidden panels are also inert, so Tab cannot reach a step you are not on
    const others = panels().filter((p) => p.hasAttribute('hidden'));
    expect(others.every((p) => p.hasAttribute('inert'))).toBe(true);
  });

  it('keeps every header in the Tab sequence — this is not a roving tabindex', async () => {
    const { headers } = await render();
    // The accordion precedent: buttons in a list are natively Tab-reachable,
    // so a roving anchor would remove reachable controls for no benefit.
    expect(headers().some((h) => h.hasAttribute('tabindex'))).toBe(false);
  });

  it('names the list, and describes an optional step in text', async () => {
    const { el, list, headers } = await render();
    expect(list().getAttribute('aria-label')).toBe('Steps');
    const optionalId = headers()[1].getAttribute('aria-describedby');
    expect(optionalId).toBeTruthy();
    expect(el.querySelector(`#${optionalId}`)?.textContent?.trim()).toBe(
      'Optional',
    );
    expect(headers()[0].getAttribute('aria-describedby')).toBeNull();
  });

  it('announces done and error states in text, since the glyph is aria-hidden', async () => {
    const fixture = TestBed.createComponent(StateHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-stepper-header'),
    );
    expect(
      el.querySelector('.oge-stepper-indicator')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(headers[1].querySelector('.oge-sr-only')?.textContent?.trim()).toBe(
      'Completed',
    );
    expect(headers[2].querySelector('.oge-sr-only')?.textContent?.trim()).toBe(
      'Has errors',
    );
  });

  it('renders every orientation and display value it advertises', async () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { fixture, el } = await render((h) =>
        h.orientation.set(orientation),
      );
      expect(
        el.querySelector('oge-stepper')?.getAttribute('data-orientation'),
      ).toBe(orientation);
      fixture.destroy();
    }
    for (const display of ['full', 'label', 'indicator'] as const) {
      const { fixture, el } = await render((h) => h.display.set(display));
      expect(
        el.querySelector('oge-stepper')?.getAttribute('data-display'),
      ).toBe(display);
      const hasText = el.querySelector('.oge-stepper-text') !== null;
      expect(hasText).toBe(display !== 'indicator');
      const hasDescription =
        el.querySelector('.oge-stepper-description') !== null;
      expect(hasDescription).toBe(display === 'full');
      fixture.destroy();
    }
  });

  it('shows a step error message in place of its description', async () => {
    const fixture = TestBed.createComponent(ErrorMessageHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.oge-stepper-error')?.textContent?.trim()).toBe(
      'Card declined',
    );
    // the description is replaced, not stacked underneath it
    expect(el.querySelectorAll('.oge-stepper-description').length).toBe(0);
  });

  it('renders every step state it advertises', async () => {
    const fixture = TestBed.createComponent(StateHost);
    await settle(fixture);
    const states = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        '.oge-stepper-header',
      ),
    ).map((n) => n.getAttribute('data-state'));
    expect(states).toEqual(['active', 'done', 'error', 'number']);
  });

  it('overrides every message through provideOgeStepperConfig', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideOgeStepperConfig({
          messages: { stepper: 'Adımlar', optional: 'İsteğe bağlı' },
        }),
      ],
    });
    const fixture = TestBed.createComponent(A11yHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(
      el.querySelector('.oge-stepper-list')?.getAttribute('aria-label'),
    ).toBe('Adımlar');
    expect(el.querySelector('.oge-stepper-optional')?.textContent?.trim()).toBe(
      'İsteğe bağlı',
    );
  });
});

@Component({
  imports: [OgeStepper, OgeStep],
  template: `
    <oge-stepper [activeIndex]="0">
      <oge-step label="Active" />
      <oge-step label="Done" [completed]="true" />
      <oge-step label="Error" [invalid]="true" [completed]="true" />
      <oge-step label="Plain" />
    </oge-stepper>
  `,
})
class StateHost {}

@Component({
  imports: [OgeStepper, OgeStep],
  template: `
    <oge-stepper [activeIndex]="1">
      <oge-step label="Account" />
      <oge-step
        label="Payment"
        description="How you pay"
        [invalid]="true"
        errorMessage="Card declined"
      />
    </oge-stepper>
  `,
})
class ErrorMessageHost {}
