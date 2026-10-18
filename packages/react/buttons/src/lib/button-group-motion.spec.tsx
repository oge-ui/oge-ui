import { fireEvent, render } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeButton } from './button';
import { OgeButtonGroup } from './button-group';

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

const natives = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll('.oge-button-native'));

const group = (): HTMLElement =>
  document.querySelector('.oge-button-group') as HTMLElement;

describe('<OgeButtonGroup> selection pill', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('slides one pill from the old segment to the new one (single mode)', () => {
    stub = stubMotion();
    const { unmount } = render(
      <StrictMode>
        <OgeButtonGroup
          selectionMode="single"
          defaultSelectedKeys={['left']}
          ariaLabel="Align"
        >
          <OgeButton value="left" text="Left" />
          <OgeButton value="center" text="Center" />
          <OgeButton value="right" text="Right" />
        </OgeButtonGroup>
      </StrictMode>,
    );
    expect(stub.calls).toHaveLength(0);
    fireEvent.click(natives()[2]);
    const pill = group().querySelector<HTMLElement>(
      ':scope > .oge-button-group-pill',
    );
    expect(pill).not.toBeNull();
    expect(group().getAttribute('data-oge-indicator-glide')).toBe('run');
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].keyframes[0].transform).toBe(
      'translate(-120px, 0px) scale(1, 1)',
    );
    unmount();
    expect(document.querySelector('.oge-button-group-pill')).toBeNull();
  });

  it('skips solid-severity targets and multiple mode', () => {
    stub = stubMotion();
    const { unmount } = render(
      <OgeButtonGroup
        selectionMode="single"
        defaultSelectedKeys={['left']}
        ariaLabel="Align"
      >
        <OgeButton value="left" text="Left" />
        <OgeButton value="right" text="Right" severity="danger" />
      </OgeButtonGroup>,
    );
    fireEvent.click(natives()[1]);
    expect(stub.calls).toHaveLength(0);
    unmount();
    render(
      <OgeButtonGroup selectionMode="multiple" ariaLabel="Days">
        <OgeButton value="m" text="Mon" />
        <OgeButton value="t" text="Tue" />
      </OgeButtonGroup>,
    );
    fireEvent.click(natives()[0]);
    fireEvent.click(natives()[1]);
    expect(stub.calls).toHaveLength(0);
  });
});
