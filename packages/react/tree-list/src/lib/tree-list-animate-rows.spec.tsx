import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import { COLUMNS, makeRows, type Node } from './tree-list.test-utils';

const ROW = 30;

interface Call {
  el: HTMLElement;
  keyframes: Keyframe[];
}

/** Rows placed by `data-rowindex` in a 300px viewport; `animate` records. */
function stubLayout(): { calls: Call[]; restore(): void } {
  const calls: Call[] = [];
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const originalAnimate = proto.animate;
  const originalRect = proto.getBoundingClientRect;
  proto.animate = function (this: HTMLElement, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const index = this.getAttribute('data-rowindex');
    const top = index === null ? 0 : Number(index) * ROW;
    const height = this.classList.contains('oge-viewport')
      ? 10 * ROW
      : index === null
        ? 100000
        : ROW;
    return {
      left: 0,
      top,
      width: 400,
      height,
      right: 400,
      bottom: top + height,
      x: 0,
      y: top,
    } as DOMRect;
  };
  return {
    calls,
    restore() {
      if (originalAnimate === undefined) delete proto.animate;
      else proto.animate = originalAnimate;
      proto.getBoundingClientRect = originalRect;
    },
  };
}

const dataRows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.oge-rows .oge-row'));

describe('OgeTreeList animateRows', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  it('glides the rows below an expanded node and fades its children in', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(<OgeTreeList ref={ref} data={makeRows()} columns={COLUMNS} />);
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    expect(stub.calls).toHaveLength(0);
    act(() => ref.current?.expandRow(1));
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    const els = dataRows();
    const byEl = new Map(stub.calls.map((call) => [call.el, call.keyframes]));
    // Root B travels from the second row to the fourth
    expect(byEl.get(els[3])?.[0].transform).toBe(
      `translate(0px, ${-2 * ROW}px)`,
    );
    expect(byEl.get(els[1])?.[0].opacity).toBe(0);
    expect(byEl.has(els[0])).toBe(false);
  });

  it('applies the change at once with animateRows={false}', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(
      <OgeTreeList
        ref={ref}
        data={makeRows()}
        columns={COLUMNS}
        animateRows={false}
      />,
    );
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    act(() => ref.current?.expandRow(1));
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    expect(stub.calls).toHaveLength(0);
  });
});
