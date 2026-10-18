import { act, render, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { OgeTreeList } from './tree-list';
import type { OgeTreeListHandle } from './tree-list-types';
import { COLUMNS, makeRows, type Node } from './tree-list.test-utils';

const ROW = 30;

interface Call {
  el: HTMLElement;
  keyframes: Keyframe[];
  options?: KeyframeAnimationOptions;
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
  proto.animate = function (
    this: HTMLElement,
    keyframes: Keyframe[],
    options?: KeyframeAnimationOptions,
  ) {
    calls.push({ el: this, keyframes, options });
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

  it('slides the revealed children in with a stagger', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(<OgeTreeList ref={ref} data={makeRows()} columns={COLUMNS} />);
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    act(() => ref.current?.expandRow(1));
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    const enters = stub.calls.filter((call) => call.keyframes[0].opacity === 0);
    expect(enters).toHaveLength(2);
    expect(enters[0].keyframes[0].transform).toBe('translateY(-4px)');
    expect(enters.map((call) => call.options?.delay ?? 0)).toEqual([0, 30]);
  });

  it('glides the rows below up on collapse and ghosts the hidden children', async () => {
    const ref = createRef<OgeTreeListHandle<Node>>();
    render(<OgeTreeList ref={ref} data={makeRows()} columns={COLUMNS} />);
    await waitFor(() => expect(dataRows()).toHaveLength(2));
    act(() => ref.current?.expandRow(1));
    await waitFor(() => expect(dataRows()).toHaveLength(4));
    stub.calls.length = 0;
    act(() => ref.current?.collapseRow(1));
    const rows = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('.oge-rows > [data-rowindex]'),
      );
    await waitFor(() => expect(rows()).toHaveLength(2));
    const ghosts = document.querySelectorAll<HTMLElement>(
      '.oge-rows > .oge-row-ghost',
    );
    expect(ghosts).toHaveLength(2);
    expect(ghosts[0].getAttribute('aria-hidden')).toBe('true');
    const glide = stub.calls.find((call) => call.el === rows()[1]);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${2 * ROW}px)`);
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
