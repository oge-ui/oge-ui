import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTreeList } from './tree-list';

interface Node {
  id: number;
  parentId: number | null;
  name: string;
}

const NODES: Node[] = [
  { id: 1, parentId: null, name: 'Root' },
  { id: 2, parentId: 1, name: 'Child A' },
  { id: 3, parentId: 1, name: 'Child B' },
  { id: 4, parentId: null, name: 'Root 2' },
];

const ROW = 30;

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

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

describe('OgeTreeList animateRows', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  async function render(animateRows?: boolean) {
    const fixture = TestBed.createComponent(OgeTreeList<Node>);
    fixture.componentRef.setInput(
      'data',
      NODES.map((node) => ({ ...node })),
    );
    fixture.componentRef.setInput('columns', ['name']);
    if (animateRows !== undefined)
      fixture.componentRef.setInput('animateRows', animateRows);
    await settle(fixture);
    return {
      fixture,
      el: fixture.nativeElement as HTMLElement,
      tree: fixture.componentInstance,
    };
  }

  it('glides the rows below an expanded node and fades its children in', async () => {
    const { fixture, el, tree } = await render();
    expect(stub.calls).toHaveLength(0);
    tree.expandRow(1);
    await settle(fixture);
    const rows = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-rows .oge-row'),
    );
    expect(rows).toHaveLength(4);
    const byEl = new Map(stub.calls.map((call) => [call.el, call.keyframes]));
    // Root 2 travels from the second row to the fourth
    expect(byEl.get(rows[3])?.[0].transform).toBe(
      `translate(0px, ${-2 * ROW}px)`,
    );
    expect(byEl.get(rows[1])?.[0].opacity).toBe(0);
    expect(byEl.get(rows[2])?.[0].opacity).toBe(0);
    expect(byEl.has(rows[0])).toBe(false);
  });

  it('slides the revealed children in with a stagger', async () => {
    const { fixture, tree } = await render();
    tree.expandRow(1);
    await settle(fixture);
    const enters = stub.calls.filter((call) => call.keyframes[0].opacity === 0);
    expect(enters).toHaveLength(2);
    expect(enters[0].keyframes[0].transform).toBe('translateY(-4px)');
    expect(enters.map((call) => call.options?.delay ?? 0)).toEqual([0, 30]);
  });

  it('glides the rows below up on collapse and ghosts the hidden children', async () => {
    const { fixture, el, tree } = await render();
    tree.expandRow(1);
    await settle(fixture);
    stub.calls.length = 0;
    tree.collapseRow(1);
    await settle(fixture);
    const container = el.querySelector<HTMLElement>('.oge-rows');
    const ghosts = Array.from(
      container?.querySelectorAll<HTMLElement>(':scope > .oge-row-ghost') ?? [],
    );
    expect(ghosts).toHaveLength(2);
    expect(ghosts.every((ghost) => ghost.textContent?.includes('Child'))).toBe(
      true,
    );
    expect(ghosts.every((ghost) => !ghost.hasAttribute('data-rowindex'))).toBe(
      true,
    );
    const rows = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-rows > [data-rowindex]'),
    );
    expect(rows).toHaveLength(2);
    const glide = stub.calls.find((call) => call.el === rows[1]);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${2 * ROW}px)`);
  });

  it('applies the change at once with animateRows off', async () => {
    const { fixture, tree } = await render(false);
    tree.expandRow(1);
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
  });
});
