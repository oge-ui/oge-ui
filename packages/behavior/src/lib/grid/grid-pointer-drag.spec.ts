import { afterEach, describe, expect, it } from 'vitest';
import {
  isOgeDragExcludedTarget,
  ogeMoveGroupingTo,
  ogeOwnedClosest,
  resolveOgeAttributeTarget,
  resolveOgeHeaderDropTarget,
  resolveOgeRowDropIndex,
} from './grid-pointer-drag';

function grid(): HTMLElement {
  document.body.innerHTML = `
    <div class="oge-grid" id="outer">
      <div class="oge-group-panel"><span data-group-chip="city">City</span></div>
      <div class="oge-header-row">
        <div class="oge-header-cell" data-colid="name">Name
          <button class="oge-header-filter-btn">f</button>
          <span class="oge-resize-handle"></span>
        </div>
        <div class="oge-header-cell" data-colid="city">City</div>
      </div>
      <div class="oge-row" data-rowindex="3"><div class="oge-cell">x</div>
        <div class="oge-grid" id="inner">
          <div class="oge-header-row"><div class="oge-header-cell" data-colid="sub">Sub</div></div>
          <div class="oge-row" data-rowindex="0"><div class="oge-cell">y</div></div>
        </div>
      </div>
    </div>`;
  return document.getElementById('outer') as HTMLElement;
}

const q = (selector: string) => document.querySelector(selector) as HTMLElement;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('grid pointer-drag targets', () => {
  it('resolves another header or the group panel, as allowed', () => {
    const host = grid();
    const city = q('[data-colid="city"]');
    expect(
      resolveOgeHeaderDropTarget(city, host, { reorder: true, group: true }),
    ).toEqual({
      kind: 'column',
      id: 'city',
    });
    expect(
      resolveOgeHeaderDropTarget(city, host, { reorder: false, group: true }),
    ).toBeNull();
    const chip = q('[data-group-chip]');
    expect(
      resolveOgeHeaderDropTarget(chip, host, { reorder: true, group: true }),
    ).toEqual({
      kind: 'group',
    });
    expect(
      resolveOgeHeaderDropTarget(chip, host, { reorder: true, group: false }),
    ).toBeNull();
  });

  it('never resolves a target of a nested detail grid', () => {
    const host = grid();
    expect(
      resolveOgeHeaderDropTarget(q('[data-colid="sub"]'), host, {
        reorder: true,
        group: true,
      }),
    ).toBeNull();
    // the inner row's cell belongs to the inner grid…
    expect(resolveOgeRowDropIndex(q('#inner .oge-cell'), host)).toBeNull();
    // …while the outer row resolves to its index
    expect(resolveOgeRowDropIndex(q('.oge-row > .oge-cell'), host)).toBe(3);
    expect(resolveOgeRowDropIndex(null, host)).toBeNull();
  });

  it('resolves data attributes within a container only', () => {
    const host = grid();
    expect(
      resolveOgeAttributeTarget(
        q('[data-group-chip]'),
        host,
        'data-group-chip',
      ),
    ).toBe('city');
    const outside = document.createElement('span');
    outside.setAttribute('data-group-chip', 'x');
    document.body.appendChild(outside);
    expect(
      resolveOgeAttributeTarget(outside, host, 'data-group-chip'),
    ).toBeNull();
    expect(ogeOwnedClosest(outside, 'span', null)).toBeNull();
  });

  it('excludes nested controls but not the source itself', () => {
    grid();
    const cell = q('[data-colid="name"]');
    expect(isOgeDragExcludedTarget(q('.oge-header-filter-btn'), cell)).toBe(
      true,
    );
    expect(isOgeDragExcludedTarget(q('.oge-resize-handle'), cell)).toBe(true);
    expect(isOgeDragExcludedTarget(cell, cell)).toBe(false);
    expect(isOgeDragExcludedTarget(null, cell)).toBe(false);
  });
});

describe('ogeMoveGroupingTo', () => {
  function slice(fields: string[]) {
    return {
      fields,
      move(field: string, direction: 1 | -1): number {
        const from = this.fields.indexOf(field);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= this.fields.length) return -1;
        [this.fields[from], this.fields[to]] = [
          this.fields[to],
          this.fields[from],
        ];
        return to;
      },
    };
  }

  it('moves step by step to the target index, both ways', () => {
    const s = slice(['a', 'b', 'c', 'd']);
    expect(ogeMoveGroupingTo(s, [...s.fields], 'a', 2)).toBe(2);
    expect(s.fields).toEqual(['b', 'c', 'a', 'd']);
    expect(ogeMoveGroupingTo(s, [...s.fields], 'd', 0)).toBe(0);
    expect(s.fields).toEqual(['d', 'b', 'c', 'a']);
  });

  it('is a no-op for an unknown field, the same index or an out-of-range index', () => {
    const s = slice(['a', 'b']);
    expect(ogeMoveGroupingTo(s, s.fields, 'x', 0)).toBe(-1);
    expect(ogeMoveGroupingTo(s, s.fields, 'a', 0)).toBe(-1);
    expect(ogeMoveGroupingTo(s, s.fields, 'a', 5)).toBe(-1);
    expect(s.fields).toEqual(['a', 'b']);
  });
});
