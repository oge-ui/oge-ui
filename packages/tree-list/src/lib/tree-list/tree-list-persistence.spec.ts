import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OGE_STATE_STORAGE, type OgeStateStorage } from '@oge-ui/grid/foundation';
import { OgeColumn } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A' },
  { id: 2, parentId: 1, title: 'Child A1' },
  { id: 3, parentId: null, title: 'Root B' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const flushSave = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 300));

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) => row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? ''
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list [data]="data" keyExpr="id" parentIdExpr="parentId" stateKey="tree-a">
      <oge-column field="title" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
}

describe('OgeTreeList state persistence', () => {
  it('round-trips expansion and sort through the storage backend', async () => {
    const backend = new Map<string, string>();
    const storage: OgeStateStorage = {
      get: (key) => backend.get(key) ?? null,
      set: (key, value) => {
        backend.set(key, value);
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: OGE_STATE_STORAGE, useValue: storage }],
    });

    // first session: expand Root A, sort by title desc
    let fixture = TestBed.createComponent(Host);
    await settle(fixture);
    let el = fixture.nativeElement as HTMLElement;
    Array.from(el.querySelectorAll<HTMLButtonElement>('.oge-tree-expander'))[0]?.click();
    await settle(fixture);
    const header = el.querySelector<HTMLElement>('.oge-header-cell');
    header?.click(); // asc
    await settle(fixture);
    header?.click(); // desc
    await settle(fixture);
    await flushSave();
    expect(backend.has('oge-tree-list:tree-a')).toBe(true);
    fixture.destroy();

    // second session: state restores from the backend
    fixture = TestBed.createComponent(Host);
    await settle(fixture);
    el = fixture.nativeElement as HTMLElement;
    expect(rowTitles(el)).toEqual(['Root B', 'Root A', 'Child A1']);
    expect(el.querySelector('.oge-header-cell')?.getAttribute('aria-sort')).toBe('descending');
  });
});
