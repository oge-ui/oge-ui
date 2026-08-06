import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeTreeList } from './tree-list';

interface Row {
  id: number;
  parentId: number | null;
  [column: string]: unknown;
}

const COLUMN_COUNT = 60;

function makeRows(): Row[] {
  const rows: Row[] = [];
  for (let r = 0; r < 4; r++) {
    const row: Row = { id: r + 1, parentId: r === 0 ? null : 1 };
    for (let c = 0; c < COLUMN_COUNT; c++) row[`col${c}`] = `r${r}c${c}`;
    rows.push(row);
  }
  return rows;
}

const COLUMNS = Array.from({ length: COLUMN_COUNT }, (_, i) => `col${i}`);

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeTreeList],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [columns]="columns"
      [columnMinWidth]="120"
      columnRenderingMode="virtual"
    >
    </oge-tree-list>
  `,
})
class Host {
  readonly data = makeRows();
  readonly columns = COLUMNS;
}

describe('OgeTreeList column virtualization', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeTreeList<Row>;
    return { fixture, el: fixture.nativeElement as HTMLElement, grid };
  }

  it('renders only the columns near the horizontal viewport', async () => {
    const { el } = await render();
    const headers = el.querySelectorAll(
      '.oge-header-cell:not(.oge-col-spacer)',
    );
    expect(headers.length).toBeGreaterThan(0);
    expect(headers.length).toBeLessThan(COLUMN_COUNT);
    // the off-window width is carried by a spacer track
    expect(el.querySelector('.oge-header-cell.oge-col-spacer')).toBeTruthy();
  });

  it('scrolling right renders later columns and a leading spacer', async () => {
    const { fixture, el, grid } = await render();
    (
      grid as unknown as { scrollLeft: { set(value: number): void } }
    ).scrollLeft.set(30 * 120);
    await settle(fixture);
    const captions = Array.from(
      el.querySelectorAll(
        '.oge-header-cell:not(.oge-col-spacer) .oge-header-caption',
      ),
    ).map((cell) => cell.textContent?.trim());
    expect(captions).not.toContain('Col0');
    expect(captions.some((caption) => caption?.startsWith('Col2'))).toBe(true);
    const cells = el.querySelectorAll('.oge-row .oge-cell.oge-col-spacer');
    expect(cells.length).toBeGreaterThan(0);
  });
});
