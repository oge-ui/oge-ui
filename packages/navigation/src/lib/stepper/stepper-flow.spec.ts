import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeStep } from './step';
import { OgeStepper } from './stepper';
import { OgeStepperNext, OgeStepperPrevious } from './stepper-nav';
import type {
  OgeStepBlockedEvent,
  OgeStepChangedEvent,
  OgeStepChangingEvent,
  OgeStepData,
  OgeStepGuard,
  OgeStepperFinishEvent,
} from './stepper-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function key(el: HTMLElement, k: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
  return event;
}

@Component({
  imports: [OgeStepper],
  template: `
    <oge-stepper
      [(activeIndex)]="active"
      [steps]="steps()"
      [linear]="linear()"
      [keyboardNavigation]="keyboardNavigation()"
      (stepChanging)="changings.push($event)"
      (stepChanged)="changes.push($event)"
      (stepBlocked)="blocks.push($event)"
      (finished)="finishes.push($event)"
    />
  `,
})
class FlowHost {
  readonly stepper = viewChild.required(OgeStepper);
  readonly active = signal(0);
  readonly linear = signal(false);
  readonly keyboardNavigation = signal(false);
  readonly steps = signal<readonly OgeStepData[]>([
    { key: 'a', label: 'One' },
    { key: 'b', label: 'Two' },
    { key: 'c', label: 'Three' },
  ]);
  readonly changings: OgeStepChangingEvent[] = [];
  readonly changes: OgeStepChangedEvent[] = [];
  readonly blocks: OgeStepBlockedEvent[] = [];
  readonly finishes: OgeStepperFinishEvent[] = [];
}

async function render(setup?: (host: FlowHost) => void) {
  const fixture = TestBed.createComponent(FlowHost);
  setup?.(fixture.componentInstance);
  await settle(fixture);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    host: fixture.componentInstance,
    el,
    headers: () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-stepper-header')),
    list: () => el.querySelector('.oge-stepper-list') as HTMLElement,
  };
}

describe('OgeStepper — navigation', () => {
  it('activates a step from its header and reports the change', async () => {
    const { fixture, host, headers } = await render();
    headers()[2].click();
    await settle(fixture);
    expect(host.active()).toBe(2);
    expect(host.changes.at(-1)).toMatchObject({
      index: 2,
      key: 'c',
      previousIndex: 0,
      previousKey: 'a',
    });
  });

  it('keeps activeIndex and activeKey in step', async () => {
    const { fixture, host } = await render();
    host.stepper().goTo('c');
    await settle(fixture);
    expect(host.active()).toBe(2);
    expect(host.stepper().activeKey()).toBe('c');
  });

  it('a canceled stepChanging keeps the user where they are', async () => {
    const { fixture, host } = await render();
    const sub = host.stepper().stepChanging.subscribe((e) => (e.cancel = true));
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(0);
    expect(host.changes.length).toBe(0);
    sub.unsubscribe();
  });

  it('next() on the last step finishes instead of advancing', async () => {
    const { fixture, host } = await render((h) => h.active.set(2));
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(2);
    expect(host.finishes).toEqual([{ index: 2, key: 'c' }]);
  });

  it('clamps the index when steps are removed', async () => {
    const { fixture, host } = await render((h) => h.active.set(2));
    host.steps.set([{ key: 'a', label: 'One' }]);
    await settle(fixture);
    expect(host.active()).toBe(0);
  });

  it('reset() returns to the first step', async () => {
    const { fixture, host } = await render((h) => h.active.set(2));
    host.stepper().reset();
    await settle(fixture);
    expect(host.active()).toBe(0);
  });
});

describe('OgeStepper — linear, optional, editable', () => {
  it('linear blocks moving past an incomplete step', async () => {
    const { fixture, host, headers } = await render((h) => h.linear.set(true));
    headers()[2].click();
    await settle(fixture);
    expect(host.active()).toBe(0);
    expect(host.blocks.at(-1)).toEqual({
      fromIndex: 0,
      toIndex: 2,
      reason: 'linear',
    });
    // and the header advertises that it cannot be reached
    expect(headers()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('linear lets a completed step through', async () => {
    const { fixture, host, headers } = await render((h) => {
      h.linear.set(true);
      h.steps.set([
        { key: 'a', label: 'One', completed: true },
        { key: 'b', label: 'Two', completed: true },
        { key: 'c', label: 'Three' },
      ]);
    });
    headers()[2].click();
    await settle(fixture);
    expect(host.active()).toBe(2);
    expect(host.blocks.length).toBe(0);
  });

  it('linear steps past an optional step that was never completed', async () => {
    const { fixture, host, headers } = await render((h) => {
      h.linear.set(true);
      h.steps.set([
        { key: 'a', label: 'One', completed: true },
        { key: 'b', label: 'Two', optional: true },
        { key: 'c', label: 'Three' },
      ]);
    });
    headers()[2].click();
    await settle(fixture);
    expect(host.active()).toBe(2);
  });

  it('editable=false blocks going back into a step', async () => {
    const { fixture, host, headers } = await render((h) => {
      h.active.set(2);
      h.steps.set([
        { key: 'a', label: 'One', editable: false },
        { key: 'b', label: 'Two' },
        { key: 'c', label: 'Three' },
      ]);
    });
    headers()[0].click();
    await settle(fixture);
    expect(host.active()).toBe(2);
    expect(host.blocks.at(-1)?.reason).toBe('editable');

    // the editable neighbour is still reachable
    headers()[1].click();
    await settle(fixture);
    expect(host.active()).toBe(1);
  });

  it('a disabled step cannot be activated', async () => {
    const { fixture, host, headers } = await render((h) =>
      h.steps.set([
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', disabled: true },
        { key: 'c', label: 'Three' },
      ]),
    );
    expect(headers()[1].disabled).toBe(true);
    host.stepper().goTo(1);
    await settle(fixture);
    expect(host.active()).toBe(0);
    expect(host.blocks.at(-1)?.reason).toBe('disabled');
  });
});

describe('OgeStepper — stepGuard', () => {
  function withGuard(guard: OgeStepGuard) {
    return (h: FlowHost) =>
      h.steps.set([
        { key: 'a', label: 'One', stepGuard: guard },
        { key: 'b', label: 'Two' },
      ]);
  }

  it('a false guard vetoes the change and reports the reason', async () => {
    const { fixture, host } = await render(withGuard(() => false));
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(0);
    expect(host.blocks.at(-1)?.reason).toBe('guard');
  });

  it('a true guard lets it through', async () => {
    const { fixture, host } = await render(withGuard(() => true));
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(1);
  });

  it('a promise guard reports pending and is single-flight', async () => {
    let allow!: (value: boolean) => void;
    let calls = 0;
    const { fixture, host } = await render(
      withGuard(() => {
        calls++;
        return new Promise<boolean>((resolve) => {
          allow = resolve;
        });
      }),
    );
    host.stepper().next();
    await settle(fixture);
    expect(host.stepper().changePending()).toBe(true);
    expect(host.active()).toBe(0);

    // a second gesture while pending is dropped
    host.stepper().next();
    await settle(fixture);
    expect(calls).toBe(1);

    allow(true);
    await settle(fixture);
    expect(host.stepper().changePending()).toBe(false);
    expect(host.active()).toBe(1);
  });

  it('a rejected guard is a veto, not a change', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, host } = await render(
      withGuard(() => Promise.reject(new Error('nope'))),
    );
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(0);
    expect(host.stepper().changePending()).toBe(false);
    warn.mockRestore();
  });

  it('a throwing guard is a veto too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, host } = await render(
      withGuard(() => {
        throw new Error('nope');
      }),
    );
    host.stepper().next();
    await settle(fixture);
    expect(host.active()).toBe(0);
    warn.mockRestore();
  });

  it('the guard also gates the finish on the last step', async () => {
    const { fixture, host } = await render((h) => {
      h.active.set(1);
      h.steps.set([
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', stepGuard: () => false },
      ]);
    });
    host.stepper().next();
    await settle(fixture);
    expect(host.finishes.length).toBe(0);
  });
});

describe('OgeStepper — opt-in keyboard navigation', () => {
  it('does nothing unless keyboardNavigation is on', async () => {
    const { list } = await render();
    const event = key(list(), 'ArrowRight');
    expect(event.defaultPrevented).toBe(false);
  });

  it('arrow keys move focus only, and do not wrap', async () => {
    const { fixture, headers, list } = await render((h) =>
      h.keyboardNavigation.set(true),
    );
    headers()[0].focus();

    key(list(), 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[1]);

    key(list(), 'End');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[2]);

    // a process does not loop from the last step back to the first
    key(list(), 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[2]);

    key(list(), 'Home');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[0]);

    key(list(), 'ArrowLeft');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[0]);
  });

  it('moving focus does not activate a step', async () => {
    const { fixture, host, headers, list } = await render((h) =>
      h.keyboardNavigation.set(true),
    );
    headers()[0].focus();
    key(list(), 'ArrowRight');
    await settle(fixture);
    // manual activation: Enter/Space on the button does the work natively
    expect(host.active()).toBe(0);
    expect(host.changes.length).toBe(0);
  });

  it('skips a disabled step', async () => {
    const { fixture, headers, list } = await render((h) => {
      h.keyboardNavigation.set(true);
      h.steps.set([
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', disabled: true },
        { key: 'c', label: 'Three' },
      ]);
    });
    headers()[0].focus();
    key(list(), 'ArrowRight');
    await settle(fixture);
    expect(document.activeElement).toBe(headers()[2]);
  });
});

@Component({
  imports: [OgeStepper, OgeStep, OgeStepperNext, OgeStepperPrevious],
  template: `
    <oge-stepper #wizard [(activeIndex)]="active" [deferRendering]="true">
      <oge-step label="One">
        <p class="body-one">One body</p>
        <!-- inside a projected body: DI resolves from where it was declared -->
        <button type="button" class="inner-next" ogeStepperNext>Next</button>
      </oge-step>
      <oge-step label="Two"><p class="body-two">Two body</p></oge-step>
    </oge-stepper>
    <!-- outside the component: the explicit form, which no reference offers -->
    <button type="button" ogeStepperPrevious [ogeStepperTarget]="wizard">
      Back
    </button>
    <button type="button" ogeStepperNext [ogeStepperTarget]="wizard">
      Next
    </button>
  `,
})
class ProjectionHost {
  readonly stepper = viewChild.required(OgeStepper);
  readonly active = signal(0);
}

describe('OgeStepper — projected content and the nav directives', () => {
  async function render() {
    const fixture = TestBed.createComponent(ProjectionHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el,
      next: () =>
        el.querySelectorAll<HTMLButtonElement>(
          '.oge-stepper-next',
        )[1] as HTMLButtonElement,
      innerNext: () => el.querySelector('.inner-next') as HTMLButtonElement,
      back: () =>
        el.querySelector('.oge-stepper-previous') as HTMLButtonElement,
    };
  }

  it('stamps a declarative step body and defers the rest', async () => {
    const { fixture, el, next } = await render();
    expect(el.querySelector('.body-one')).not.toBeNull();
    // deferRendering: the second body does not exist until it is reached
    expect(el.querySelector('.body-two')).toBeNull();

    next().click();
    await settle(fixture);
    expect(el.querySelector('.body-two')).not.toBeNull();
    // keepAlive defaults to true, so the first body stays mounted
    expect(el.querySelector('.body-one')).not.toBeNull();
  });

  it('an explicitly bound nav button drives the stepper from outside it', async () => {
    const { fixture, host, next, back } = await render();
    expect(back().disabled).toBe(true);

    next().click();
    await settle(fixture);
    expect(host.active()).toBe(1);
    expect(back().disabled).toBe(false);

    back().click();
    await settle(fixture);
    expect(host.active()).toBe(0);
  });

  it('a nav button inside a projected step body finds the stepper by DI', async () => {
    const { fixture, host, innerNext } = await render();
    innerNext().click();
    await settle(fixture);
    expect(host.active()).toBe(1);
  });
});
