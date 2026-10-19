import { act, createRef, useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { OgeChipItem, OgeTimelineItem } from '@oge-ui/behavior';
import { OgeChipList } from './chip-list';
import { OgeDataView } from './data-view';
import { OgeListView } from './list-view';
import { OgeSplitter, type OgeSplitterHandle } from './splitter';
import { OgeTimeline } from './timeline';

interface AnimateCall {
  el: Element;
  keyframes: Keyframe[];
}

/**
 * Motion on: a Web Animations stub, a visible box for every element (a
 * zero box gets no exit ghost) and resolved pixel tracks for a splitter
 * host — 300px for an open side pane, 0 when collapsed.
 */
function stubMotion(): { calls: AnimateCall[]; restore(): void } {
  const proto = HTMLElement.prototype as unknown as {
    animate?: unknown;
    getBoundingClientRect: () => DOMRect;
  };
  const animate = proto.animate;
  const rect = proto.getBoundingClientRect;
  const computed = window.getComputedStyle;
  const calls: AnimateCall[] = [];
  proto.animate = function (this: Element, keyframes: Keyframe[]) {
    calls.push({ el: this, keyframes });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  proto.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 60,
      height: 24,
      right: 60,
      bottom: 24,
    }) as DOMRect;
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    const style = computed(el, pseudo);
    if (!el.classList?.contains('oge-splitter')) return style;
    return new Proxy(style, {
      get(target, key) {
        if (key === 'getPropertyValue') {
          return (name: string) => {
            if (name !== 'grid-template-columns')
              return target.getPropertyValue(name);
            return el.querySelector('.oge-splitter-pane-collapsed')
              ? '0px 6px 700px'
              : '300px 6px 400px';
          };
        }
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }) as typeof window.getComputedStyle;
  return {
    calls,
    restore() {
      if (animate === undefined) delete proto.animate;
      else proto.animate = animate;
      proto.getBoundingClientRect = rect;
      window.getComputedStyle = computed;
    },
  };
}

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

let motion: ReturnType<typeof stubMotion>;
beforeEach(() => (motion = stubMotion()));
afterEach(() => {
  motion.restore();
  document.querySelectorAll('.oge-exit-ghost').forEach((el) => el.remove());
});

const CHIPS: OgeChipItem[] = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
];

function Chips() {
  const [items, setItems] = useState(CHIPS);
  return (
    <div className="wrap">
      <OgeChipList
        items={items}
        removable
        ariaLabel="Tags"
        onItemRemoved={(event) =>
          setItems((all) => all.filter((item) => item.key !== event.item.key))
        }
      />
    </div>
  );
}

describe('<OgeChipList> motion', () => {
  it('a removed chip leaves through an exit ghost beside the list', async () => {
    const { container } = render(<Chips />);
    expect(motion.calls).toHaveLength(0);
    fireEvent.click(container.querySelector('button.oge-chip-remove')!);
    await flush();
    const list = container.querySelector('.oge-chip-list')!;
    expect(list.querySelectorAll('[data-oge-chip-key]')).toHaveLength(2);
    const ghost = container.querySelector('.wrap > .oge-exit-ghost');
    expect(ghost?.textContent).toContain('Alpha');
    expect(motion.calls.map((call) => call.el)).toEqual([ghost]);
  });
});

describe('<OgeTimeline> enter motion', () => {
  const entering = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll('.oge-timeline-item-entering'),
      (el) => el.querySelector('.oge-timeline-title')?.textContent,
    );

  it('only entries appended after the first render enter', () => {
    const base: OgeTimelineItem[] = [
      { key: 'ordered', title: 'Ordered' },
      { key: 'shipped', title: 'Shipped' },
    ];
    const { container, rerender } = render(<OgeTimeline items={base} />);
    expect(entering(container)).toEqual([]);
    const next = [...base, { key: 'delivered', title: 'Delivered' }];
    rerender(<OgeTimeline items={next} />);
    expect(entering(container)).toEqual(['Delivered']);
    // an unrelated re-render keeps the class
    rerender(<OgeTimeline items={next} ariaLabel="History" />);
    expect(entering(container)).toEqual(['Delivered']);
  });
});

describe('<OgeSplitter> collapse motion', () => {
  it('a collapse glides the tracks between the resolved sizes', () => {
    const ref = createRef<OgeSplitterHandle>();
    render(
      <OgeSplitter
        ref={ref}
        panes={[
          { key: 'side', size: 30, collapsible: true, content: 'side' },
          { key: 'main', size: 70, content: 'main' },
        ]}
      />,
    );
    const tracks = () =>
      motion.calls.filter((call) => 'gridTemplateColumns' in call.keyframes[0]);
    expect(tracks()).toHaveLength(0);
    act(() => {
      ref.current?.collapse('side');
    });
    expect(tracks().map((call) => call.keyframes)).toEqual([
      [
        { gridTemplateColumns: '300px 6px 400px' },
        { gridTemplateColumns: '0px 6px 700px' },
      ],
    ]);
  });
});

describe('<OgeListView> / <OgeDataView> layout motion', () => {
  const PEOPLE = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Grace' },
    { id: 3, name: 'Alan' },
  ];
  const entered = (attr: string) =>
    motion.calls
      .filter((call) => call.keyframes[0].opacity === 0)
      .map((call) => call.el.getAttribute(attr));

  it('list rows coming back after a filter fade in', () => {
    const { rerender } = render(
      <OgeListView
        items={PEOPLE}
        keyExpr="id"
        displayExpr="name"
        searchEnabled
        searchValue=""
      />,
    );
    expect(motion.calls).toHaveLength(0);
    rerender(
      <OgeListView
        items={PEOPLE}
        keyExpr="id"
        displayExpr="name"
        searchEnabled
        searchValue="Grace"
      />,
    );
    rerender(
      <OgeListView
        items={PEOPLE}
        keyExpr="id"
        displayExpr="name"
        searchEnabled
        searchValue=""
      />,
    );
    expect(entered('data-oge-list-key')).toEqual(['1', '3']);
  });

  it("a data view page change fades the new page's items in", () => {
    const { rerender } = render(
      <OgeDataView items={PEOPLE} pageSize={2} pageIndex={0} />,
    );
    expect(motion.calls).toHaveLength(0);
    rerender(<OgeDataView items={PEOPLE} pageSize={2} pageIndex={1} />);
    expect(entered('data-oge-data-view-key')).toEqual(['3']);
  });
});
