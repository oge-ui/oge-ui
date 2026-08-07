import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn, type OgeEditingOptions } from '@oge-ui/grid';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  effort: number;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', effort: 5 },
  { id: 2, parentId: 1, title: 'Child A1', effort: 3 },
  { id: 3, parentId: null, title: 'Root B', effort: 2 },
];

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const flush = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve));

function rowOf(el: HTMLElement, text: string): HTMLElement | undefined {
  return Array.from(el.querySelectorAll<HTMLElement>('.oge-row')).find((row) =>
    (row.textContent ?? '').includes(text),
  );
}

@Component({
  imports: [OgeTreeList, OgeColumn],
  template: `
    <oge-tree-list
      [data]="data"
      keyExpr="id"
      parentIdExpr="parentId"
      [autoExpandAll]="true"
      [editing]="editing"
    >
      <oge-column field="title" caption="Title" />
      <oge-column field="effort" caption="Effort" dataType="number" />
    </oge-tree-list>
  `,
})
class Host {
  readonly data = TASKS.map((task) => ({ ...task }));
  editing: OgeEditingOptions = { mode: 'cell', allowUpdating: true };
}

describe('OgeTreeList editing', () => {
  async function render(configure?: (host: Host) => void) {
    const fixture = TestBed.createComponent(Host);
    configure?.(fixture.componentInstance);
    await settle(fixture);
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeTreeList<Task>;
    return {
      fixture,
      host: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
      grid,
    };
  }

  it('cell mode: click opens an editor, Enter commits and writes back', async () => {
    const { fixture, host, el } = await render();
    const cell = rowOf(el, 'Child A1')?.querySelectorAll<HTMLElement>(
      '.oge-cell',
    )[0];
    cell?.click();
    await settle(fixture);
    const editor = el.querySelector<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    expect(editor).toBeTruthy();
    if (!editor) return;
    editor.value = 'Renamed A1';
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    await flush();
    await settle(fixture);
    expect(host.data[1].title).toBe('Renamed A1');
    expect(rowOf(el, 'Renamed A1')).toBeTruthy();
  });

  it('row mode: the command column edits and saves a whole row', async () => {
    const { fixture, host, el } = await render(
      (h) => (h.editing = { mode: 'row', allowUpdating: true }),
    );
    rowOf(el, 'Root B')
      ?.querySelector<HTMLButtonElement>('.oge-command-btn')
      ?.click();
    await settle(fixture);
    const editors = el.querySelectorAll<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    expect(editors.length).toBe(2);
    editors[1].value = '9';
    editors[1].dispatchEvent(new Event('input', { bubbles: true }));
    el.querySelector<HTMLButtonElement>('.oge-command-save')?.click();
    await settle(fixture);
    await flush();
    await settle(fixture);
    expect(host.data[2].effort).toBe(9);
  });

  it('addRow(parentKey) stages the parent so the saved row lands under it', async () => {
    const { fixture, host, el, grid } = await render(
      (h) =>
        (h.editing = { mode: 'row', allowUpdating: true, allowAdding: true }),
    );
    grid.addRow(1);
    await settle(fixture);
    // the new row renders on top with open editors
    const editors = el.querySelectorAll<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    expect(editors.length).toBe(2);
    editors[0].value = 'New child';
    editors[0].dispatchEvent(new Event('input', { bubbles: true }));
    el.querySelector<HTMLButtonElement>('.oge-command-save')?.click();
    await settle(fixture);
    await flush();
    await settle(fixture);
    const added = host.data.find((row) => row.title === 'New child');
    expect(added?.parentId).toBe(1);
    // after the reload it renders as a child of Root A
    expect(rowOf(el, 'New child')?.getAttribute('aria-level')).toBe('2');
  });

  it('form mode: the editing row swaps for an inline labeled form and saves', async () => {
    const { fixture, host, el } = await render(
      (h) => (h.editing = { mode: 'form', allowUpdating: true }),
    );
    rowOf(el, 'Root B')
      ?.querySelector<HTMLButtonElement>('.oge-command-btn')
      ?.click();
    await settle(fixture);
    const form = el.querySelector<HTMLElement>('.oge-form-row');
    expect(form).toBeTruthy();
    const labels = Array.from(el.querySelectorAll('.oge-form-label')).map(
      (label) => label.textContent?.trim(),
    );
    expect(labels).toEqual(['Title', 'Effort']);
    const editors = form?.querySelectorAll<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    if (!editors) throw new Error('form editors missing');
    editors[0].value = 'Renamed B';
    editors[0].dispatchEvent(new Event('input', { bubbles: true }));
    Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-form-actions button'),
    )[0].click();
    await settle(fixture);
    await flush();
    await settle(fixture);
    expect(host.data[2].title).toBe('Renamed B');
    expect(el.querySelector('.oge-form-row')).toBeNull();
  });

  it('popup mode: a modal dialog edits the row and saves through the source', async () => {
    const { fixture, host, el } = await render(
      (h) => (h.editing = { mode: 'popup', allowUpdating: true }),
    );
    rowOf(el, 'Child A1')
      ?.querySelector<HTMLButtonElement>('.oge-command-btn')
      ?.click();
    await settle(fixture);
    const popup = el.querySelector<HTMLElement>('.oge-edit-popup');
    expect(popup).toBeTruthy();
    const editors = popup?.querySelectorAll<HTMLInputElement>(
      '.oge-editor .oge-input-native',
    );
    if (!editors) throw new Error('popup editors missing');
    editors[1].value = '7';
    editors[1].dispatchEvent(new Event('input', { bubbles: true }));
    Array.from(
      el.querySelectorAll<HTMLButtonElement>('.oge-popup-actions button'),
    )[0].click();
    await settle(fixture);
    await flush();
    await settle(fixture);
    expect(host.data[1].effort).toBe(7);
    expect(el.querySelector('.oge-edit-popup')).toBeNull();
  });

  it('delete removes the row (and confirmDelete: false skips the dialog)', async () => {
    const { fixture, host, el } = await render(
      (h) =>
        (h.editing = {
          mode: 'row',
          allowUpdating: true,
          allowDeleting: true,
          confirmDelete: false,
        }),
    );
    const deleteBtn = rowOf(el, 'Root B')?.querySelector<HTMLButtonElement>(
      '.oge-command-delete',
    );
    deleteBtn?.click();
    await settle(fixture);
    await flush();
    await settle(fixture);
    expect(host.data.some((row) => row.title === 'Root B')).toBe(false);
    expect(rowOf(el, 'Root B')).toBeUndefined();
  });
});
