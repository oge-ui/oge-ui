import { StrictMode, useRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { OgeStepGuard } from '@oge-ui/behavior';
import {
  OgeStepper,
  type OgeStepDefinition,
  type OgeStepperHandle,
  type OgeStepperProps,
} from './stepper';
import { OgeStepperConfigProvider } from './navigation-config';

/**
 * The React mirror of the Angular stepper specs (`stepper-flow`,
 * `stepper-a11y`), case for case. The declarative `<oge-step>` children become
 * `steps` entries carrying `content` — the accordion precedent — so the
 * projection cases here exercise `content` / `deferRendering` / `keepAlive`.
 */

/** Flushes the microtask queue inside `act` — step guards settle here. */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const list = (): HTMLElement =>
  document.querySelector('.oge-stepper-list') as HTMLElement;
const headers = (): HTMLButtonElement[] =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('.oge-stepper-header'),
  );
const panels = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-stepper-panel'));

function key(el: HTMLElement, k: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    el.dispatchEvent(event);
  });
  return event;
}

const three: readonly OgeStepDefinition[] = [
  { key: 'a', label: 'One' },
  { key: 'b', label: 'Two' },
  { key: 'c', label: 'Three' },
];

/** Controlled host mirroring the Angular fixtures' two-way `activeIndex`. */
function Host({
  handleRef,
  onActiveIndexChange,
  ...rest
}: OgeStepperProps & {
  handleRef?: (handle: OgeStepperHandle | null) => void;
}) {
  const [active, setActive] = useState(rest.defaultActiveIndex ?? 0);
  return (
    <OgeStepper
      steps={three}
      {...rest}
      ref={handleRef}
      activeIndex={rest.activeIndex ?? active}
      onActiveIndexChange={(index) => {
        setActive(index);
        onActiveIndexChange?.(index);
      }}
    />
  );
}

function mount(props: OgeStepperProps = {}) {
  const state = { active: props.defaultActiveIndex ?? 0 };
  let handle: OgeStepperHandle | null = null;
  const utils = render(
    <Host
      {...props}
      handleRef={(h) => {
        handle = h;
      }}
      onActiveIndexChange={(index) => {
        state.active = index;
        props.onActiveIndexChange?.(index);
      }}
    />,
  );
  return {
    ...utils,
    state,
    handle: () => handle as unknown as OgeStepperHandle,
  };
}

describe('<OgeStepper> — navigation', () => {
  it('activates a step from its header and reports the change', () => {
    const changes: { index: number; key?: string }[] = [];
    const { state } = mount({
      onStepChanged: (event) => changes.push({ ...event }),
    });
    act(() => {
      fireEvent.click(headers()[2]);
    });
    expect(state.active).toBe(2);
    expect(changes.at(-1)).toMatchObject({
      index: 2,
      key: 'c',
      previousIndex: 0,
      previousKey: 'a',
    });
  });

  it('keeps activeIndex and activeKey in step', () => {
    const keys: (string | undefined)[] = [];
    const { handle, state } = mount({
      onActiveKeyChange: (value) => keys.push(value),
    });
    act(() => handle().goTo('c'));
    expect(state.active).toBe(2);
    expect(keys.at(-1)).toBe('c');
    expect(handle().activeKey).toBe('c');
  });

  it('a canceled stepChanging keeps the user where they are', () => {
    const changes: unknown[] = [];
    const { handle, state } = mount({
      onStepChanging: (event) => {
        event.cancel = true;
      },
      onStepChanged: (event) => changes.push(event),
    });
    act(() => handle().next());
    expect(state.active).toBe(0);
    expect(changes.length).toBe(0);
  });

  it('next() on the last step finishes instead of advancing', () => {
    const finishes: { index: number; key?: string }[] = [];
    const { handle, state } = mount({
      defaultActiveIndex: 2,
      onFinished: (event) => finishes.push({ ...event }),
    });
    act(() => handle().next());
    expect(state.active).toBe(2);
    expect(finishes).toEqual([{ index: 2, key: 'c' }]);
  });

  it('clamps the index when steps are removed', () => {
    const { rerender } = render(<Host defaultActiveIndex={2} />);
    expect(headers()[2].getAttribute('aria-current')).toBe('step');
    rerender(<Host steps={[{ key: 'a', label: 'One' }]} />);
    expect(headers().length).toBe(1);
    expect(headers()[0].getAttribute('aria-current')).toBe('step');
  });

  it('reset() returns to the first step', () => {
    const { handle, state } = mount({ defaultActiveIndex: 2 });
    act(() => handle().reset());
    expect(state.active).toBe(0);
  });
});

describe('<OgeStepper> — linear, optional, editable', () => {
  it('linear blocks moving past an incomplete step', () => {
    const blocks: { reason: string; fromIndex: number; toIndex: number }[] = [];
    const { state } = mount({
      linear: true,
      onStepBlocked: (event) => blocks.push({ ...event }),
    });
    act(() => {
      fireEvent.click(headers()[2]);
    });
    expect(state.active).toBe(0);
    expect(blocks.at(-1)).toEqual({
      fromIndex: 0,
      toIndex: 2,
      reason: 'linear',
    });
    // and the header advertises that it cannot be reached
    expect(headers()[2].getAttribute('aria-disabled')).toBe('true');
  });

  it('linear lets a completed step through', () => {
    const blocks: unknown[] = [];
    const { state } = mount({
      linear: true,
      steps: [
        { key: 'a', label: 'One', completed: true },
        { key: 'b', label: 'Two', completed: true },
        { key: 'c', label: 'Three' },
      ],
      onStepBlocked: (event) => blocks.push(event),
    });
    act(() => {
      fireEvent.click(headers()[2]);
    });
    expect(state.active).toBe(2);
    expect(blocks.length).toBe(0);
  });

  it('linear steps past an optional step that was never completed', () => {
    const { state } = mount({
      linear: true,
      steps: [
        { key: 'a', label: 'One', completed: true },
        { key: 'b', label: 'Two', optional: true },
        { key: 'c', label: 'Three' },
      ],
    });
    act(() => {
      fireEvent.click(headers()[2]);
    });
    expect(state.active).toBe(2);
  });

  it('editable=false blocks going back into a step', () => {
    const blocks: { reason: string }[] = [];
    const { state } = mount({
      defaultActiveIndex: 2,
      steps: [
        { key: 'a', label: 'One', editable: false },
        { key: 'b', label: 'Two' },
        { key: 'c', label: 'Three' },
      ],
      onStepBlocked: (event) => blocks.push({ ...event }),
    });
    act(() => {
      fireEvent.click(headers()[0]);
    });
    expect(state.active).toBe(2);
    expect(blocks.at(-1)?.reason).toBe('editable');

    // the editable neighbour is still reachable
    act(() => {
      fireEvent.click(headers()[1]);
    });
    expect(state.active).toBe(1);
  });

  it('a disabled step cannot be activated', () => {
    const blocks: { reason: string }[] = [];
    const { handle, state } = mount({
      steps: [
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', disabled: true },
        { key: 'c', label: 'Three' },
      ],
      onStepBlocked: (event) => blocks.push({ ...event }),
    });
    expect(headers()[1].disabled).toBe(true);
    act(() => handle().goTo(1));
    expect(state.active).toBe(0);
    expect(blocks.at(-1)?.reason).toBe('disabled');
  });
});

describe('<OgeStepper> — stepGuard', () => {
  function withGuard(guard: OgeStepGuard): OgeStepDefinition[] {
    return [
      { key: 'a', label: 'One', stepGuard: guard },
      { key: 'b', label: 'Two' },
    ];
  }

  it('a false guard vetoes the change and reports the reason', () => {
    const blocks: { reason: string }[] = [];
    const { handle, state } = mount({
      steps: withGuard(() => false),
      onStepBlocked: (event) => blocks.push({ ...event }),
    });
    act(() => handle().next());
    expect(state.active).toBe(0);
    expect(blocks.at(-1)?.reason).toBe('guard');
  });

  it('a true guard lets it through', () => {
    const { handle, state } = mount({ steps: withGuard(() => true) });
    act(() => handle().next());
    expect(state.active).toBe(1);
  });

  it('a promise guard reports pending and is single-flight', async () => {
    let allow!: (value: boolean) => void;
    let calls = 0;
    const { handle, state } = mount({
      steps: withGuard(() => {
        calls++;
        return new Promise<boolean>((resolve) => {
          allow = resolve;
        });
      }),
    });
    act(() => handle().next());
    expect(handle().changePending).toBe(true);
    expect(state.active).toBe(0);

    // a second gesture while pending is dropped
    act(() => handle().next());
    expect(calls).toBe(1);

    await act(async () => {
      allow(true);
      await Promise.resolve();
    });
    expect(handle().changePending).toBe(false);
    expect(state.active).toBe(1);
  });

  it('a rejected guard is a veto, not a change', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { handle, state } = mount({
      steps: withGuard(() => Promise.reject(new Error('nope'))),
    });
    act(() => handle().next());
    await flush();
    expect(state.active).toBe(0);
    expect(handle().changePending).toBe(false);
    warn.mockRestore();
  });

  it('a throwing guard is a veto too', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { handle, state } = mount({
      steps: withGuard(() => {
        throw new Error('nope');
      }),
    });
    act(() => handle().next());
    expect(state.active).toBe(0);
    warn.mockRestore();
  });

  it('the guard also gates the finish on the last step', () => {
    const finishes: unknown[] = [];
    const { handle } = mount({
      defaultActiveIndex: 1,
      steps: [
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', stepGuard: () => false },
      ],
      onFinished: (event) => finishes.push(event),
    });
    act(() => handle().next());
    expect(finishes.length).toBe(0);
  });
});

describe('<OgeStepper> — opt-in keyboard navigation', () => {
  it('does nothing unless keyboardNavigation is on', () => {
    mount();
    const event = key(list(), 'ArrowRight');
    expect(event.defaultPrevented).toBe(false);
  });

  it('arrow keys move focus only, and do not wrap', () => {
    mount({ keyboardNavigation: true });
    headers()[0].focus();

    key(list(), 'ArrowRight');
    expect(document.activeElement).toBe(headers()[1]);

    key(list(), 'End');
    expect(document.activeElement).toBe(headers()[2]);

    // a process does not loop from the last step back to the first
    key(list(), 'ArrowRight');
    expect(document.activeElement).toBe(headers()[2]);

    key(list(), 'Home');
    expect(document.activeElement).toBe(headers()[0]);

    key(list(), 'ArrowLeft');
    expect(document.activeElement).toBe(headers()[0]);
  });

  it('moving focus does not activate a step', () => {
    const changes: unknown[] = [];
    const { state } = mount({
      keyboardNavigation: true,
      onStepChanged: (event) => changes.push(event),
    });
    headers()[0].focus();
    key(list(), 'ArrowRight');
    // manual activation: Enter/Space on the button does the work natively
    expect(state.active).toBe(0);
    expect(changes.length).toBe(0);
  });

  it('skips a disabled step', () => {
    mount({
      keyboardNavigation: true,
      steps: [
        { key: 'a', label: 'One' },
        { key: 'b', label: 'Two', disabled: true },
        { key: 'c', label: 'Three' },
      ],
    });
    headers()[0].focus();
    key(list(), 'ArrowRight');
    expect(document.activeElement).toBe(headers()[2]);
  });

  it('follows the vertical axis when the list is vertical', () => {
    mount({ keyboardNavigation: true, orientation: 'vertical' });
    headers()[0].focus();
    key(list(), 'ArrowRight');
    expect(document.activeElement).toBe(headers()[0]);
    key(list(), 'ArrowDown');
    expect(document.activeElement).toBe(headers()[1]);
  });
});

describe('<OgeStepper> — the ARIA model', () => {
  const labelled: readonly OgeStepDefinition[] = [
    { key: 'a', label: 'Account', description: 'Who you are' },
    { key: 'b', label: 'Shipping', optional: true },
    { key: 'c', label: 'Review' },
  ];

  it('is an ordered list of buttons, not a tablist', () => {
    mount({ steps: labelled });
    // The deliberate divergence from Material: a stepper is a process, not a
    // strip of freely browsable panels, so no tab semantics appear at all.
    expect(list().tagName).toBe('OL');
    expect(document.querySelectorAll('[role="tablist"]').length).toBe(0);
    expect(document.querySelectorAll('[role="tab"]').length).toBe(0);
    expect(document.querySelectorAll('[role="tabpanel"]').length).toBe(0);
    expect(document.querySelectorAll('[aria-selected]').length).toBe(0);
    expect(headers().every((h) => h.tagName === 'BUTTON')).toBe(true);
    expect(document.querySelectorAll('.oge-stepper-item').length).toBe(3);
  });

  it('marks exactly one header aria-current="step"', () => {
    const current = () =>
      Array.from(document.querySelectorAll('[aria-current]')).map((n) =>
        n.getAttribute('aria-current'),
      );
    const { rerender } = render(<Host steps={labelled} />);
    expect(current()).toEqual(['step']);
    expect(headers()[0].getAttribute('aria-current')).toBe('step');

    rerender(<Host steps={labelled} activeIndex={2} />);
    expect(current()).toEqual(['step']);
    expect(headers()[2].getAttribute('aria-current')).toBe('step');
  });

  it('labels each panel by its header and hides the inactive ones', () => {
    mount({
      steps: labelled.map((step) => ({
        ...step,
        content: <p>{step.label}</p>,
      })),
    });
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

  it('keeps every header in the Tab sequence — this is not a roving tabindex', () => {
    mount({ steps: labelled });
    // The accordion precedent: buttons in a list are natively Tab-reachable,
    // so a roving anchor would remove reachable controls for no benefit.
    expect(headers().some((h) => h.hasAttribute('tabindex'))).toBe(false);
  });

  it('names the list, and describes an optional step in text', () => {
    mount({ steps: labelled });
    expect(list().getAttribute('aria-label')).toBe('Steps');
    const optionalId = headers()[1].getAttribute('aria-describedby');
    expect(optionalId).toBeTruthy();
    expect(document.querySelector(`#${optionalId}`)?.textContent?.trim()).toBe(
      'Optional',
    );
    expect(headers()[0].getAttribute('aria-describedby')).toBeNull();
  });

  const states: readonly OgeStepDefinition[] = [
    { label: 'Active' },
    { label: 'Done', completed: true },
    { label: 'Error', invalid: true, completed: true },
    { label: 'Plain' },
  ];

  it('announces done and error states in text, since the glyph is aria-hidden', () => {
    mount({ steps: states });
    expect(
      document
        .querySelector('.oge-stepper-indicator')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      headers()[1].querySelector('.oge-sr-only')?.textContent?.trim(),
    ).toBe('Completed');
    expect(
      headers()[2].querySelector('.oge-sr-only')?.textContent?.trim(),
    ).toBe('Has errors');
  });

  it('renders every step state it advertises', () => {
    mount({ steps: states });
    expect(headers().map((h) => h.getAttribute('data-state'))).toEqual([
      'active',
      'done',
      'error',
      'number',
    ]);
  });

  it('renders every orientation and display value it advertises', () => {
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const { unmount } = mount({ steps: labelled, orientation });
      expect(
        document
          .querySelector('.oge-stepper')
          ?.getAttribute('data-orientation'),
      ).toBe(orientation);
      unmount();
    }
    for (const display of ['full', 'label', 'indicator'] as const) {
      const { unmount } = mount({ steps: labelled, display });
      expect(
        document.querySelector('.oge-stepper')?.getAttribute('data-display'),
      ).toBe(display);
      expect(document.querySelector('.oge-stepper-text') !== null).toBe(
        display !== 'indicator',
      );
      expect(document.querySelector('.oge-stepper-description') !== null).toBe(
        display === 'full',
      );
      unmount();
    }
  });

  it('shows a step error message in place of its description', () => {
    mount({
      defaultActiveIndex: 1,
      steps: [
        { label: 'Account' },
        {
          label: 'Payment',
          description: 'How you pay',
          invalid: true,
          errorMessage: 'Card declined',
        },
      ],
    });
    expect(
      document.querySelector('.oge-stepper-error')?.textContent?.trim(),
    ).toBe('Card declined');
    // the description is replaced, not stacked underneath it
    expect(document.querySelectorAll('.oge-stepper-description').length).toBe(
      0,
    );
  });

  it('overrides every message through the config provider', () => {
    render(
      <OgeStepperConfigProvider
        config={{ messages: { stepper: 'Adımlar', optional: 'İsteğe bağlı' } }}
      >
        <Host steps={labelled} />
      </OgeStepperConfigProvider>,
    );
    expect(list().getAttribute('aria-label')).toBe('Adımlar');
    expect(
      document.querySelector('.oge-stepper-optional')?.textContent?.trim(),
    ).toBe('İsteğe bağlı');
  });
});

describe('<OgeStepper> — step bodies and the navigation bar', () => {
  const bodies: readonly OgeStepDefinition[] = [
    { label: 'One', content: <p className="body-one">One body</p> },
    { label: 'Two', content: <p className="body-two">Two body</p> },
  ];

  it('stamps a step body and defers the rest', () => {
    const { handle } = mount({ steps: bodies, deferRendering: true });
    expect(document.querySelector('.body-one')).not.toBeNull();
    // deferRendering: the second body does not exist until it is reached
    expect(document.querySelector('.body-two')).toBeNull();

    act(() => handle().next());
    expect(document.querySelector('.body-two')).not.toBeNull();
    // keepAlive defaults to true, so the first body stays mounted
    expect(document.querySelector('.body-one')).not.toBeNull();
  });

  it('drops the body a step left when keepAlive is off', () => {
    const { handle } = mount({
      steps: bodies,
      deferRendering: true,
      keepAlive: false,
    });
    act(() => handle().next());
    expect(document.querySelector('.body-two')).not.toBeNull();
    expect(document.querySelector('.body-one')).toBeNull();
  });

  it('the built-in nav bar drives the stepper', () => {
    const { state } = mount({ steps: bodies, showNavigation: true });
    const back = () =>
      document.querySelector('.oge-stepper-nav-previous') as HTMLButtonElement;
    const next = () =>
      document.querySelector('.oge-stepper-nav-next') as HTMLButtonElement;
    expect(back().disabled).toBe(true);
    expect(next().textContent).toBe('Next');

    act(() => {
      fireEvent.click(next());
    });
    expect(state.active).toBe(1);
    expect(back().disabled).toBe(false);
    // the last step's button confirms the finish instead of advancing
    expect(next().textContent).toBe('Finish');

    act(() => {
      fireEvent.click(back());
    });
    expect(state.active).toBe(0);
  });

  it('renders a lazy body through renderContent', () => {
    mount({
      steps: [
        { label: 'One', renderContent: ({ index }) => <p>lazy {index}</p> },
        { label: 'Two' },
      ],
    });
    expect(panels()[0].textContent).toBe('lazy 0');
  });

  it('focus() moves to the active step header', () => {
    const { handle } = mount({ defaultActiveIndex: 1 });
    act(() => handle().focus());
    expect(document.activeElement).toBe(headers()[1]);
  });
});

describe('<OgeStepper> — StrictMode', () => {
  function StrictHost() {
    const handle = useRef<OgeStepperHandle>(null);
    const [active, setActive] = useState(0);
    return (
      <>
        <button
          type="button"
          id="strict-next"
          onClick={() => handle.current?.next()}
        >
          Next
        </button>
        <OgeStepper
          ref={handle}
          steps={three}
          activeIndex={active}
          onActiveIndexChange={setActive}
        />
      </>
    );
  }

  it('survives a double mount and still advances', () => {
    render(
      <StrictMode>
        <StrictHost />
      </StrictMode>,
    );
    act(() => {
      fireEvent.click(document.querySelector('#strict-next') as HTMLElement);
    });
    expect(headers()[1].getAttribute('aria-current')).toBe('step');
  });
});
