import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeKanban } from './kanban';

interface Row {
  id: number;
  status: string;
  title: string;
}

const COLUMN_COUNT = 20;
const CARD_COUNT = 10_000;

function makeRows(): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    rows.push({
      id: i,
      status: `col-${i % COLUMN_COUNT}`,
      title: `Card ${i}`,
    });
  }
  return rows;
}

@Component({
  imports: [OgeKanban],
  template: `
    <oge-kanban
      [dataSource]="rows()"
      keyExpr="id"
      columnExpr="status"
      titleExpr="title"
      [cardHeight]="100"
      style="height: 480px; display: block"
    />
  `,
})
class Host {
  readonly rows = signal<Row[]>(makeRows());
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await new Promise((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('<oge-kanban> virtualization smoke (10k cards / 20 columns)', () => {
  it('renders a bounded card window per column, not the whole board', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;

    const columns = host.querySelectorAll('.oge-kanban-cards');
    expect(columns).toHaveLength(COLUMN_COUNT);

    const rendered = host.querySelectorAll('.oge-kanban-card').length;
    // 500 cards per column; jsdom reports zero heights so each cell renders
    // its overscan fallback window — far below the full 10k either way.
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(500);

    // the spacer advertises the full scroll height (500 cards * 108px - 8)
    const inner = host.querySelector<HTMLElement>('.oge-kanban-cards-inner');
    expect(inner?.style.height).toBe(`${500 * 108 - 8}px`);
  });

  it('scrolling a cell moves its window without touching other columns', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host = fixture.nativeElement as HTMLElement;
    const cell = host.querySelector<HTMLElement>(
      '.oge-kanban-cards[data-col="col-0"]',
    );
    if (cell === null) throw new Error('no cell');

    Object.defineProperty(cell, 'clientHeight', { value: 480 });
    Object.defineProperty(cell, 'scrollTop', { value: 10_800, writable: true });
    cell.dispatchEvent(new Event('scroll'));
    await settle(fixture);

    const block = cell.querySelector<HTMLElement>('.oge-kanban-cards-block');
    expect(block?.style.transform).toMatch(/translateY\((\d+)px\)/);
    const offset = Number(
      /translateY\((\d+)px\)/.exec(block!.style.transform)![1],
    );
    expect(offset).toBeGreaterThan(0);
    const firstTitle = cell.querySelector(
      '.oge-kanban-card-title',
    )?.textContent;
    expect(firstTitle).not.toBe('Card 0');
  });
});
