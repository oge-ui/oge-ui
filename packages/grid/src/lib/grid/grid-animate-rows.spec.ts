import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import { OgeDetailTemplate } from '../templates/detail-template';
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

interface Sale {
  id: number;
  region: string;
  city: string;
}

const SALES: Sale[] = [
  { id: 1, region: 'EU', city: 'Berlin' },
  { id: 2, region: 'EU', city: 'Paris' },
  { id: 3, region: 'US', city: 'NYC' },
];

@Component({
  imports: [OgeGrid, OgeColumn, OgeDetailTemplate],
  template: `
    <oge-grid [data]="data" keyField="id">
      <oge-column field="city" />
      <div *ogeDetailTemplate="let sale">Detail of {{ sale.id }}</div>
    </oge-grid>
  `,
})
class DetailHost {
  readonly data = SALES;
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid [data]="data" keyField="id" [groupBy]="['region']">
      <oge-column field="region" />
      <oge-column field="city" />
    </oge-grid>
  `,
})
class GroupHost {
  readonly data = SALES;
}

describe('OgeGrid expand/collapse motion', () => {
  let stub: ReturnType<typeof stubLayout>;
  beforeEach(() => (stub = stubLayout()));
  afterEach(() => stub.restore());

  const rowEls = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-rows > [data-rowindex]'));

  it('opens a detail row inside its clipping cell, gliding the rows below', async () => {
    const fixture = TestBed.createComponent(DetailHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('.oge-expander-btn')[0] as HTMLButtonElement).click();
    await settle(fixture);
    const detail = el.querySelector<HTMLElement>('.oge-detail-row');
    // the CSS height reveal needs the padding inside the clipping cell
    expect(
      detail?.querySelector(':scope > .oge-detail-cell > .oge-detail-content')
        ?.textContent,
    ).toContain('Detail of 1');
    const enter = stub.calls.find((call) => call.el === detail);
    expect(enter?.keyframes[0].opacity).toBe(0);
    const [, , paris] = rowEls(el);
    const glide = stub.calls.find((call) => call.el === paris);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${-ROW}px)`);

    stub.calls.length = 0;
    (el.querySelectorAll('.oge-expander-btn')[0] as HTMLButtonElement).click();
    await settle(fixture);
    expect(
      el.querySelectorAll('.oge-detail-row:not(.oge-row-ghost)'),
    ).toHaveLength(0);
    // closing removes the row at once; its ghost fades where it was
    const ghost = el.querySelector<HTMLElement>('.oge-rows > .oge-row-ghost');
    expect(ghost?.classList.contains('oge-detail-row')).toBe(true);
    expect(ghost?.getAttribute('aria-hidden')).toBe('true');
  });

  it('glides the rows below a collapsed group up and ghosts its rows', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // EU, Berlin, Paris, US, NYC
    expect(rowEls(el)).toHaveLength(5);
    const groupRow = el.querySelector<HTMLElement>('.oge-group-row');
    groupRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(fixture);
    const rows = rowEls(el);
    expect(rows).toHaveLength(3);
    const glide = stub.calls.find((call) => call.el === rows[1]);
    expect(glide?.keyframes[0].transform).toBe(`translate(0px, ${2 * ROW}px)`);
    expect(el.querySelectorAll('.oge-rows > .oge-row-ghost')).toHaveLength(2);

    stub.calls.length = 0;
    el.querySelector<HTMLElement>('.oge-group-row')?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle(fixture);
    const revealed = stub.calls.filter(
      (call) => call.keyframes[0].opacity === 0,
    );
    expect(revealed).toHaveLength(2);
  });
});
