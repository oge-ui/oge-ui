import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import {
  resetScrollLockForTests,
  type OgeTourClosedEvent,
  type OgeTourStep,
} from '@oge-ui/behavior';
import { OgeTour, type OgeTourHandle } from './tour';
import { OgeOverlayConfigProvider } from './overlay-config';

const STEPS: OgeTourStep[] = [
  { target: '#search', title: 'Search', content: 'Find anything here.' },
  { title: 'No target', placement: 'top' },
  { target: '#missing', title: 'Last' },
];

const card = () =>
  document.querySelector('.oge-tour-card') as HTMLElement | null;
const button = (cls: string) =>
  document.querySelector(`.oge-tour-${cls}`) as HTMLButtonElement | null;
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

function Search() {
  return (
    <div
      id="search"
      ref={(el) => {
        if (el)
          el.getBoundingClientRect = () =>
            ({ top: 100, left: 50, width: 120, height: 30 }) as DOMRect;
      }}
    >
      Search
    </div>
  );
}

beforeEach(() => resetScrollLockForTests());

describe('<OgeTour>', () => {
  it('walks the steps with a spotlight, a labelled modal card and focus restore', async () => {
    const closed: OgeTourClosedEvent[] = [];
    const ref = createRef<OgeTourHandle>();
    function Host() {
      const [step, setStep] = useState(0);
      return (
        <>
          <output data-testid="step">{step}</output>
          <button
            id="trigger"
            type="button"
            onClick={() => ref.current!.start()}
          >
            Tour
          </button>
          <Search />
          <OgeOverlayConfigProvider config={{ messages: { tourSkip: 'Atla' } }}>
            <OgeTour
              ref={ref}
              steps={STEPS}
              step={step}
              onStepChange={setStep}
              onClosed={(e) => closed.push(e)}
            />
          </OgeOverlayConfigProvider>
        </>
      );
    }
    const { getByTestId } = render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const trigger = document.getElementById('trigger')!;
    trigger.focus();
    fireEvent.click(trigger);
    await flush();
    const dialog = card()!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-roledescription')).toBe('Tour');
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby')!)!
        .textContent,
    ).toBe('Search');
    expect(
      document.getElementById(dialog.getAttribute('aria-describedby')!)!
        .textContent,
    ).toBe('Find anything here.');
    expect(dialog.querySelector('.oge-tour-progress')!.textContent).toBe(
      'Step 1 of 3',
    );
    expect(document.activeElement).toBe(button('next'));
    expect(button('skip')!.textContent).toBe('Atla');
    const spot = document.querySelector('.oge-tour-spotlight') as HTMLElement;
    expect(spot.style.top).toBe('94px');
    expect(dialog.dataset['placement']).toBe('bottom');
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      'Step 1 of 3: Search',
    );

    fireEvent.click(button('next')!);
    await flush();
    expect(getByTestId('step').textContent).toBe('1');
    expect(document.querySelector('.oge-tour-spotlight')).toBeNull();
    expect(document.querySelector('.oge-tour-no-target')).not.toBeNull();
    expect(card()!.dataset['placement']).toBe('center');
    fireEvent.click(button('previous')!);
    expect(getByTestId('step').textContent).toBe('0');
    expect(document.activeElement).toBe(button('next'));
    fireEvent.keyDown(card()!, { key: 'ArrowRight' });
    fireEvent.keyDown(card()!, { key: 'ArrowRight' });
    expect(getByTestId('step').textContent).toBe('2');
    expect(button('next')!.textContent).toBe('Done');
    expect(button('skip')).toBeNull();
    fireEvent.keyDown(card()!, { key: 'ArrowRight' }); // never finishes
    fireEvent.keyDown(card()!, { key: 'Enter' });
    expect(card()).not.toBeNull();
    fireEvent.keyDown(card()!, { key: 'ArrowLeft' });
    expect(getByTestId('step').textContent).toBe('1');
    act(() => ref.current!.next());
    fireEvent.click(button('next')!);
    await flush();
    expect(card()).toBeNull();
    expect(closed).toEqual([{ reason: 'done', step: 2 }]);
    expect(document.activeElement).toBe(trigger);
  });

  it('skips, dismisses with Escape, and closes on the backdrop only when asked', async () => {
    const closed: OgeTourClosedEvent[] = [];
    const ref = createRef<OgeTourHandle>();
    const { rerender } = render(
      <>
        <Search />
        <OgeTour ref={ref} steps={STEPS} onClosed={(e) => closed.push(e)} />
      </>,
    );
    act(() => ref.current!.start(1));
    fireEvent.click(button('skip')!);
    expect(closed.at(-1)).toEqual({ reason: 'skip', step: 1 });
    act(() => ref.current!.start());
    fireEvent.keyDown(card()!, { key: 'Escape' });
    expect(closed.at(-1)).toEqual({ reason: 'escape', step: 0 });
    act(() => ref.current!.start());
    fireEvent.pointerDown(document.querySelector('.oge-tour-layer')!);
    expect(card()).not.toBeNull();
    rerender(
      <>
        <Search />
        <OgeTour
          ref={ref}
          steps={STEPS}
          closeOnBackdropClick
          showSkip={false}
          onClosed={(e) => closed.push(e)}
        />
      </>,
    );
    expect(button('skip')).toBeNull();
    fireEvent.pointerDown(document.querySelector('.oge-tour-layer')!);
    expect(closed.at(-1)).toEqual({ reason: 'backdrop', step: 0 });
    act(() => ref.current!.start(9));
    await flush();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(card()!.querySelector('.oge-tour-title')!.textContent).toBe('Last');
    act(() => ref.current!.previous());
    act(() => ref.current!.close());
    expect(closed.at(-1)).toEqual({ reason: 'api', step: 1 });
    act(() => ref.current!.close());
    expect(closed).toHaveLength(4);
  });

  it('opens uncontrolled from defaults', () => {
    render(<OgeTour steps={STEPS} defaultOpened defaultStep={1} />);
    expect(card()!.querySelector('.oge-tour-title')!.textContent).toBe(
      'No target',
    );
    render(<OgeTour steps={[]} defaultOpened />);
    expect(document.querySelectorAll('.oge-tour-card')).toHaveLength(1);
  });
});
