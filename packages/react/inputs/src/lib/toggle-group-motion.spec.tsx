import { fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeToggleGroup } from './toggle-group';

/**
 * jsdom has neither layout nor the Web Animations API: lay elements out in a
 * row by their index among same-class elements, and record `animate` calls.
 */
function stubMotion() {
  const calls: { el: Element; keyframes: Keyframe[] }[] = [];
  const proto = HTMLElement.prototype as unknown as { animate?: unknown };
  const animate = proto.animate;
  const rect = Element.prototype.getBoundingClientRect;
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return {
      finished: new Promise<void>(() => undefined),
      cancel: () => undefined,
      finish: () => undefined,
    };
  };
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const cls = this.classList[0];
    const i = cls
      ? Array.from(document.getElementsByClassName(cls)).indexOf(this)
      : 0;
    return {
      left: i * 60,
      top: 0,
      width: 50,
      height: 30,
      right: i * 60 + 50,
      bottom: 30,
      x: i * 60,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      Element.prototype.getBoundingClientRect = rect;
    },
  };
}

const segments = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-toggle-group-item'));

const track = (): HTMLElement =>
  document.querySelector('.oge-toggle-group-track') as HTMLElement;

describe('<OgeToggleGroup> selection pill', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('does nothing without the Web Animations API (jsdom)', () => {
    render(
      <OgeToggleGroup label="Align" items={['L', 'C', 'R']} defaultValue="L" />,
    );
    fireEvent.click(segments()[2]);
    expect(track().querySelector('.oge-toggle-group-pill')).toBeNull();
  });

  it('slides one pill from the old segment to the new one', () => {
    stub = stubMotion();
    const { unmount } = render(
      <StrictMode>
        <OgeToggleGroup
          label="Align"
          items={['L', 'C', 'R']}
          defaultValue="L"
        />
      </StrictMode>,
    );
    // the first commit (and StrictMode's replay) never glides
    expect(stub.calls).toHaveLength(0);
    fireEvent.click(segments()[2]);
    const pill = track().querySelector<HTMLElement>('.oge-toggle-group-pill');
    expect(pill?.getAttribute('aria-hidden')).toBe('true');
    expect(track().getAttribute('data-oge-indicator-glide')).toBe('run');
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].keyframes[0].transform).toBe(
      'translate(-120px, 0px) scale(1, 1)',
    );
    expect(segments()[2].getAttribute('aria-checked')).toBe('true');
    unmount();
    expect(document.querySelector('.oge-toggle-group-pill')).toBeNull();
  });

  it('never glides in multiple mode', () => {
    stub = stubMotion();
    render(
      <OgeToggleGroup
        label="Days"
        selectionMode="multiple"
        items={['M', 'T', 'W']}
        defaultValue={['M']}
      />,
    );
    fireEvent.click(segments()[1]);
    expect(stub.calls).toHaveLength(0);
  });
});
