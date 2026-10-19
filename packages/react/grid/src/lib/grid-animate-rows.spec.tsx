import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
}

const ROW = 30;
const rows: Row[] = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Erin' },
];

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

const names = () =>
  Array.from(document.querySelectorAll('.oge-rows .oge-row')).map(
    (row) => row.querySelector('.oge-cell')?.textContent?.trim() ?? '',
  );

describe('OgeGrid animateRows', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  const sortByName = async () => {
    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }));
    await waitFor(() => expect(names()).toEqual(['Ada', 'Erin', 'Grace']));
  };

  it('is on by default and glides the rows a sort moved, by key', async () => {
    render(
      <StrictMode>
        <OgeGrid data={rows} keyField="id" columns={['name']} />
      </StrictMode>,
    );
    await waitFor(() => expect(names()).toEqual(['Ada', 'Grace', 'Erin']));
    expect(stub.calls).toHaveLength(0);
    await sortByName();
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('.oge-rows .oge-row'),
    );
    const moved = new Map(stub.calls.map((call) => [call.el, call.keyframes]));
    expect([...moved.keys()]).toEqual([els[1], els[2]]);
    // Erin was the third row, now the second: it starts one row lower
    expect(moved.get(els[1])?.[0].transform).toBe(`translate(0px, ${ROW}px)`);
  });

  it('applies the sort at once with animateRows={false}', async () => {
    render(
      <OgeGrid
        data={rows}
        keyField="id"
        columns={['name']}
        animateRows={false}
      />,
    );
    await waitFor(() => expect(names()).toHaveLength(3));
    await sortByName();
    expect(stub.calls).toHaveLength(0);
  });
});
