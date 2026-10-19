import { render } from '@testing-library/react';
import { OgeStepper, type OgeStepDefinition } from './stepper';

const STEPS: OgeStepDefinition[] = [
  { key: 'account', label: 'Account', completed: true, content: 'account' },
  { key: 'profile', label: 'Profile', content: 'profile' },
  { key: 'review', label: 'Review', content: 'review' },
];

const phase = (container: HTMLElement): string => {
  const host = container.querySelector('.oge-stepper')!;
  return host.classList.contains('oge-stepper-anim-a')
    ? 'a'
    : host.classList.contains('oge-stepper-anim-b')
      ? 'b'
      : '-';
};

describe('<OgeStepper> motion', () => {
  it('the panel fades in on every step change, never on the first render', () => {
    const { container, rerender } = render(
      <OgeStepper steps={STEPS} activeIndex={0} />,
    );
    expect(phase(container)).toBe('-');
    rerender(<OgeStepper steps={STEPS} activeIndex={1} />);
    expect(phase(container)).toBe('a');
    rerender(<OgeStepper steps={STEPS} activeIndex={2} />);
    expect(phase(container)).toBe('b');
    // an unrelated re-render keeps the phase
    rerender(<OgeStepper steps={STEPS} activeIndex={2} ariaLabel="Signup" />);
    expect(phase(container)).toBe('b');
  });

  it('marks the connector out of a completed step for the fill', () => {
    const { container } = render(<OgeStepper steps={STEPS} activeIndex={1} />);
    const items = container.querySelectorAll('.oge-stepper-item');
    expect(items[0].classList.contains('oge-stepper-item-done')).toBe(true);
    expect(items[1].classList.contains('oge-stepper-item-done')).toBe(false);
  });
});
