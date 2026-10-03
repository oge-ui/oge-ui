import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  owner: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root', owner: 'Ada' },
  { id: 2, parentId: 1, title: 'Child', owner: 'Grace' },
];

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
    >
      <oge-column field="title" [width]="200" />
      <oge-column field="owner" [width]="200" [hidingPriority]="0" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeTreeList adaptive detail', () => {
  it('adds a leading toggle column and reveals the hidden values per row', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const list = fixture.debugElement.children[0].componentInstance;
    (list as { hostWidth: { set(v: number): void } }).hostWidth.set(300);
    await settle(fixture);

    const captions = Array.from(el.querySelectorAll('.oge-header-caption')).map(
      (h) => h.textContent?.trim(),
    );
    expect(captions).toEqual(['Title']);
    // the header gains a matching (named) utility cell
    expect(
      el
        .querySelector('.oge-header-row .oge-expander-cell')
        ?.getAttribute('aria-label'),
    ).toBe('Detail');

    const row = el.querySelectorAll<HTMLElement>('.oge-row')[1];
    const toggle = row.querySelector<HTMLButtonElement>(
      '.oge-adaptive-toggle',
    )!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await settle(fixture);
    const detail = row.querySelector<HTMLElement>('.oge-adaptive-detail')!;
    expect(toggle.getAttribute('aria-controls')).toBe(detail.id);
    expect(detail.querySelector('dt')?.textContent?.trim()).toBe('Owner');
    expect(detail.querySelector('dd')?.textContent?.trim()).toBe('Grace');
  });
});
