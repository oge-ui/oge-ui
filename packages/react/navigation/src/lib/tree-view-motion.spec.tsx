import { StrictMode } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { OgeTreeView } from './tree-view';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}

/**
 * ```
 * 1 Documents        4 Photos
 *   2 Reports          5 Holiday
 *     3 Q1.pdf
 * ```
 */
const FLAT: Node[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

const ROW = 30;

interface Call {
  el: HTMLElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
}

/**
 * Rows laid out by their position among the rendered items in a 300px scroll
 * box; `animate` records. Ghosts sit at the container's top.
 */
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
    options: KeyframeAnimationOptions,
  ) {
    calls.push({ el: this, keyframes, options });
    return { finished: new Promise(() => undefined), cancel: () => undefined };
  };
  proto.getBoundingClientRect = function (this: HTMLElement) {
    let top = 0;
    let height = 100000;
    if (this.classList.contains('oge-tree-view-scroll')) height = 10 * ROW;
    else if (
      this.classList.contains('oge-tree-view-item') &&
      !this.classList.contains('oge-row-ghost')
    ) {
      const siblings = Array.from(
        this.parentElement?.querySelectorAll<HTMLElement>(
          ':scope > .oge-tree-view-item:not(.oge-row-ghost)',
        ) ?? [],
      );
      top = siblings.indexOf(this) * ROW;
      height = ROW;
    }
    return {
      left: 0,
      top,
      width: 300,
      height,
      right: 300,
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

const rows = (): HTMLElement[] =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '.oge-tree-view-item:not(.oge-row-ghost)',
    ),
  );

const rowFor = (name: string): HTMLElement | undefined =>
  rows().find((row) => row.textContent?.trim().startsWith(name));

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('OgeTreeView expand/collapse motion', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  it('glides the rows below an expanded node and slides its children in', async () => {
    render(
      <StrictMode>
        <OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />
      </StrictMode>,
    );
    expect(stub.calls).toHaveLength(0);
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    const [documents, reports, photos] = rows();
    const forEl = (el: HTMLElement) =>
      stub.calls.filter((call) => call.el === el);
    // one glide each, even though StrictMode renders twice
    expect(forEl(photos)).toHaveLength(1);
    expect(forEl(photos)[0].keyframes[0].transform).toBe(
      `translate(0px, ${-ROW}px)`,
    );
    expect(forEl(reports)[0].keyframes[0]).toEqual({
      opacity: 0,
      transform: 'translateY(-4px)',
    });
    expect(forEl(documents)).toHaveLength(0);
  });

  it('staggers several revealed children', async () => {
    const { rerender } = render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        expandedKeys={[]}
      />,
    );
    rerender(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        expandedKeys={[1, 2]}
      />,
    );
    await flush();
    const enters = stub.calls.filter((call) => call.keyframes[0].opacity === 0);
    expect(enters.map((call) => call.options.delay ?? 0)).toEqual([0, 30]);
  });

  it('glides the rows below up on collapse and ghosts the hidden children', async () => {
    render(
      <OgeTreeView
        items={FLAT}
        displayExpr="name"
        rootValue={null}
        defaultExpandedKeys={[1]}
      />,
    );
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await flush();
    expect(rows()).toHaveLength(2);
    const ghost = document.querySelector<HTMLElement>(
      '.oge-tree-view-viewport > .oge-row-ghost',
    );
    expect(ghost?.textContent).toContain('Reports');
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
    expect(ghost?.hasAttribute('data-key')).toBe(false);
    const glide = stub.calls.find((call) => call.el === rowFor('Photos'));
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${ROW}px)`);
  });

  it('glides a moved node when the data reparents it', async () => {
    const { rerender } = render(
      <OgeTreeView items={FLAT} displayExpr="name" rootValue={null} />,
    );
    rerender(
      <OgeTreeView
        items={[FLAT[3], FLAT[4], FLAT[0], FLAT[1], FLAT[2]]}
        displayExpr="name"
        rootValue={null}
      />,
    );
    await flush();
    const glide = stub.calls.find((call) => call.el === rowFor('Documents'));
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${-ROW}px)`);
  });
});
