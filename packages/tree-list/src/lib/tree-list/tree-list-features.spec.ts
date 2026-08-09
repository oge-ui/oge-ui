import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn, type OgeContextMenuEvent } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  office: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', office: 'Berlin' },
  { id: 2, parentId: 1, title: 'Child A1', office: 'London' },
  { id: 3, parentId: 2, title: 'Grand A1a', office: 'İstanbul' },
  { id: 4, parentId: null, title: 'Root B', office: 'Berlin' },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function rowTitles(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-row')).map(
    (row) =>
      row.querySelector('.oge-tree-cell-text')?.textContent?.trim() ?? '',
  );
}

function must<V>(value: V | null | undefined): V {
  if (value == null) throw new Error('expected element');
  return value;
}

function rowOf(el: HTMLElement, text: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.textContent ?? '').includes(text),
  );
}

class DataTransferStub {
  private readonly data = new Map<string, string>();
  effectAllowed = 'move';
  readonly types: string[] = [];
  setData(type: string, value: string): void {
    this.data.set(type, value);
    this.types.push(type);
  }
  getData(type: string): string {
    return this.data.get(type) ?? '';
  }
}

function dragEvent(type: string, transfer: DataTransferStub): DragEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: transfer });
  return event;
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [filterRow]="true"
      [filterDebounce]="0"
      [searchPanel]="true"
      [columnChooser]="true"
      [commandButtons]="commandButtons"
      (rowContextMenu)="onContextMenu($event)"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="office" caption="Office" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  readonly archived: number[] = [];
  readonly commandButtons = [
    {
      text: 'Archive',
      onClick: (_row: Task, key: number | string) =>
        this.archived.push(key as number),
    },
  ];
  contextItems: { text: string; action?: () => void }[] = [];
  onContextMenu(event: OgeContextMenuEvent<Task>): void {
    event.items.push(...this.contextItems);
  }
}

describe('OgeTreeList parity features', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('expandNodesOnFiltering reveals matches buried under collapsed branches', async () => {
    const { fixture, el } = await render();
    // everything starts collapsed (autoExpandAll defaults to false)
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    const titleFilter = el.querySelector<HTMLInputElement>(
      '.oge-filter-input .oge-input-native',
    );
    must(titleFilter).value = 'Grand';
    must(titleFilter).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // the ancestor chain auto-expanded to show the match
    expect(rowTitles(el)).toEqual(['Root A', 'Child A1', 'Grand A1a']);
    must(titleFilter).value = '';
    must(titleFilter).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // clearing restores the user's own (collapsed) expansion state
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
  });

  it('search matches render with a <mark> highlight', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector<HTMLInputElement>('.oge-search-input');
    must(search).value = 'istanbul';
    must(search).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    const mark = el.querySelector('.oge-row mark.oge-highlight');
    expect(mark?.textContent).toBe('İstanbul');
  });

  it('the operator menu switches the filter operator and re-applies the value', async () => {
    const { fixture, el } = await render();
    const titleFilter = el.querySelector<HTMLInputElement>(
      '.oge-filter-input .oge-input-native',
    );
    must(titleFilter).value = 'Root';
    must(titleFilter).dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // contains 'Root': both roots match
    expect(rowTitles(el)).toEqual(['Root A', 'Root B']);
    must(el.querySelector<HTMLButtonElement>('.oge-filter-op-btn')).click();
    await settle(fixture);
    const items = Array.from(
      el.querySelectorAll<HTMLButtonElement>(
        '.oge-operator-menu .oge-menu-item',
      ),
    );
    must(items.find((item) => item.textContent?.trim() === 'Equals')).click();
    await settle(fixture);
    // eq 'Root': no title equals the bare word — the same value re-applied
    // through the new operator empties the tree
    expect(rowTitles(el)).toEqual([]);
    expect(el.querySelector('.oge-no-data')).toBeTruthy();
  });

  it('renders its command bar as the shared APG toolbar component', async () => {
    const { el } = await render();
    const bar = must(el.querySelector('.oge-toolbar'));
    // `<oge-toolbar>` from @oge-ui/layout, not the retired hand-rolled div
    expect(bar.tagName.toLowerCase()).toBe('oge-toolbar');
    expect(bar.getAttribute('role')).toBe('toolbar');
    expect(
      bar.querySelector(
        '.oge-toolbar-section-before .oge-tool-btn[aria-label="Column chooser"]',
      ),
    ).not.toBeNull();
  });

  it('the column chooser hides and restores a column', async () => {
    const { fixture, el } = await render();
    must(
      el.querySelector<HTMLButtonElement>(
        '.oge-tool-btn[aria-label="Column chooser"]',
      ),
    ).click();
    await settle(fixture);
    const officeEntry = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-chooser-item'),
    ).find((entry) => entry.textContent?.includes('Office'));
    must(must(officeEntry).querySelector<HTMLInputElement>('input')).click();
    await settle(fixture);
    const headers = Array.from(el.querySelectorAll('.oge-header-caption')).map(
      (cell) => cell.textContent?.trim(),
    );
    expect(headers).not.toContain('Office');
  });

  it('custom command buttons render and fire onClick', async () => {
    const { fixture, host, el } = await render();
    const archive = rowOf(el, 'Root B')?.querySelector<HTMLButtonElement>(
      '.oge-command-text-btn',
    );
    expect(archive?.textContent?.trim()).toBe('Archive');
    must(archive).click();
    await settle(fixture);
    expect(host.archived).toEqual([4]);
  });

  it('the row context menu opens with consumer items and runs their action', async () => {
    const { fixture, host, el } = await render();
    let ran = false;
    host.contextItems = [{ text: 'Inspect', action: () => (ran = true) }];
    must(rowOf(el, 'Root A')).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const item = el.querySelector<HTMLButtonElement>(
      '.oge-context-menu .oge-menu-item',
    );
    expect(item?.textContent?.trim()).toBe('Inspect');
    must(item).click();
    await settle(fixture);
    expect(ran).toBe(true);
    expect(el.querySelector('.oge-context-menu')).toBeNull();
  });

  it('the header context menu pins and hides columns', async () => {
    const { fixture, el } = await render();
    const officeHeader = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-header-cell'),
    ).find((cell) => cell.textContent?.includes('Office'));
    must(officeHeader).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    await settle(fixture);
    const hide = Array.from(
      el.querySelectorAll<HTMLButtonElement>(
        '.oge-context-menu .oge-menu-item',
      ),
    ).find((item) => item.textContent?.includes('Hide column'));
    must(hide).click();
    await settle(fixture);
    const headers = Array.from(el.querySelectorAll('.oge-header-caption')).map(
      (cell) => cell.textContent?.trim(),
    );
    expect(headers).not.toContain('Office');
  });

  it('dragging a header onto another reorders the columns', async () => {
    const { fixture, el } = await render();
    const headers = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-header-cell'),
    );
    const transfer = new DataTransferStub();
    headers[1].dispatchEvent(dragEvent('dragstart', transfer)); // Office
    headers[0].dispatchEvent(dragEvent('dragover', transfer));
    headers[0].dispatchEvent(dragEvent('drop', transfer)); // before Title
    await settle(fixture);
    const captions = Array.from(el.querySelectorAll('.oge-header-caption')).map(
      (cell) => cell.textContent?.trim(),
    );
    expect(captions).toEqual(['Office', 'Title']);
  });
});
