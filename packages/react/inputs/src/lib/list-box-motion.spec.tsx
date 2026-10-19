import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { OgeListBox } from './list-box';
import { OgeTransferList } from './transfer-list';

/**
 * jsdom has neither layout nor the Web Animations API: stack each list's
 * options (a transfer list's target pane 500px to the right) and record
 * `animate` calls.
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
    let left = 0;
    let top = 0;
    const list = this.closest('[role="listbox"]');
    if (list && this.classList.contains('oge-list-box-option')) {
      const pane = this.closest('[data-oge-transfer-side]');
      if (pane?.getAttribute('data-oge-transfer-side') === 'target') left = 500;
      top =
        Array.from(list.querySelectorAll('.oge-list-box-option')).indexOf(
          this,
        ) * 30;
    }
    return {
      left,
      top,
      width: 200,
      height: 30,
      right: left + 200,
      bottom: top + 30,
      x: left,
      y: top,
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

const moves = (stub: ReturnType<typeof stubMotion>) =>
  stub.calls.map((call) => ({
    text: call.el.textContent?.trim(),
    from: call.keyframes[0].transform,
  }));

describe('reorder and move motion', () => {
  let stub: ReturnType<typeof stubMotion> | undefined;
  afterEach(() => {
    stub?.restore();
    stub = undefined;
  });

  it('<OgeListBox> glides the swapped options from their old slots', () => {
    stub = stubMotion();
    render(
      <StrictMode>
        <OgeListBox
          label="Cities"
          items={['Ankara', 'Berlin', 'Bonn']}
          allowReordering
        />
      </StrictMode>,
    );
    const list = screen.getByRole('listbox');
    fireEvent.focus(list);
    fireEvent.keyDown(list, { key: 'ArrowDown', altKey: true });
    expect(
      Array.from(list.querySelectorAll('[role="option"]')).map((o) =>
        o.textContent?.trim(),
      ),
    ).toEqual(['Berlin', 'Ankara', 'Bonn']);
    expect(moves(stub)).toEqual([
      { text: 'Berlin', from: 'translate(0px, 30px)' },
      { text: 'Ankara', from: 'translate(0px, -30px)' },
    ]);
  });

  it('<OgeTransferList> glides moved items from one list to the other', () => {
    stub = stubMotion();
    function Host() {
      const [value, setValue] = useState<readonly unknown[]>([]);
      return (
        <OgeTransferList
          label="Letters"
          items={['A', 'B', 'C']}
          value={value}
          onValueChange={(next) => setValue(next ?? [])}
        />
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole('button', { name: 'Add all' }));
    expect(moves(stub)).toEqual([
      { text: 'A', from: 'translate(-500px, 0px)' },
      { text: 'B', from: 'translate(-500px, 0px)' },
      { text: 'C', from: 'translate(-500px, 0px)' },
    ]);
  });
});
