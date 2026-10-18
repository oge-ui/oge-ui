import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
}

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
}

/**
 * jsdom has no layout and no Web Animations: rows are placed by their
 * `data-rowindex` (30px each) inside a 300px viewport, and `animate` records.
 */
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

function names(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-rows .oge-row .oge-cell')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );
}

describe('OgeGrid animateRows', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  async function render(animateRows?: boolean) {
    const rows: Row[] = [
      { id: 1, name: 'Ada' },
      { id: 2, name: 'Grace' },
      { id: 3, name: 'Erin' },
    ];
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', rows);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('keyField', 'id');
    if (animateRows !== undefined)
      fixture.componentRef.setInput('animateRows', animateRows);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const header = el.querySelector('.oge-header-cell') as HTMLElement;
    const sort = async () => {
      header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle(fixture);
    };
    return { fixture, el, sort };
  }

  it('is on by default and glides the rows a sort moved, by key', async () => {
    const { el, sort } = await render();
    expect(stub.calls).toHaveLength(0); // the first render only records
    await sort(); // Ada, Erin, Grace
    expect(names(el)).toEqual(['Ada', 'Erin', 'Grace']);
    const rows = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-rows .oge-row'),
    );
    const moved = stub.calls.map((call) => call.el);
    expect(moved).toEqual([rows[1], rows[2]]);
    // Erin was the third row, now the second: it starts one row lower
    expect(stub.calls[0].keyframes[0].transform).toBe(
      `translate(0px, ${ROW}px)`,
    );
  });

  it('applies the sort at once with animateRows off', async () => {
    const { el, sort } = await render(false);
    await sort();
    expect(names(el)).toEqual(['Ada', 'Erin', 'Grace']);
    expect(stub.calls).toHaveLength(0);
  });

  it('does not animate a re-render that keeps the order', async () => {
    const { fixture } = await render();
    fixture.componentRef.setInput('rowAlternation', true);
    await settle(fixture);
    expect(stub.calls).toHaveLength(0);
  });
});
