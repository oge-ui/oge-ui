import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OgeColumn } from '../columns/column';
import type { OgeEditingOptions } from '../state/editing-slice';
import { OgeGrid, type OgeSavingChangesEvent } from './grid';

interface Product {
  id: number;
  name: string;
  price: number;
}

function makeProducts(): Product[] {
  return [
    { id: 1, name: 'Klavye', price: 100 },
    { id: 2, name: 'Fare', price: 50 },
    { id: 3, name: 'Monitör', price: 900 },
  ];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [editing]="editing()"
      (savingChanges)="onSaving($event)"
    >
      <oge-column
        field="id"
        dataType="number"
        [width]="60"
        [editable]="false"
      />
      <oge-column field="name" [required]="true" />
      <oge-column field="price" dataType="number" />
    </oge-grid>
  `,
})
class EditingHost {
  data = makeProducts();
  readonly editing = signal<OgeEditingOptions>({ mode: 'cell' });
  readonly events: OgeSavingChangesEvent<Product>[] = [];
  cancelNext = false;

  onSaving(event: OgeSavingChangesEvent<Product>): void {
    this.events.push(event);
    if (this.cancelNext) event.cancel = true;
  }
}

function cellAt(el: HTMLElement, row: number, col: number): HTMLElement {
  return el.querySelectorAll('.oge-row')[row].querySelectorAll('.oge-cell')[
    col
  ] as HTMLElement;
}

/** The native input inside the composite `.oge-editor` host. */
function editorInput(root: HTMLElement | Element): HTMLInputElement {
  return root.querySelector(
    '.oge-editor .oge-input-native, .oge-editor input',
  ) as HTMLInputElement;
}

function editorInputs(root: HTMLElement | Element): HTMLInputElement[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>('.oge-editor .oge-input-native'),
  );
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressEnter(input: HTMLElement): void {
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
}

async function render(editing: OgeEditingOptions) {
  const fixture = TestBed.createComponent(EditingHost);
  fixture.componentInstance.editing.set(editing);
  await settle(fixture);
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

describe('OgeGrid editing — cell mode', () => {
  it('opens an editor on click, commits on Enter and writes back', async () => {
    const { fixture, host, el } = await render({ mode: 'cell' });
    cellAt(el, 0, 1).click();
    await settle(fixture);
    const editor = editorInput(el);
    expect(editor).toBeTruthy();
    expect(editor.value).toBe('Klavye');

    typeInto(editor, 'Mekanik Klavye');
    pressEnter(editor);
    await settle(fixture);

    expect(host.events).toHaveLength(1);
    expect(host.events[0].changes).toEqual([
      { type: 'update', key: 1, data: { name: 'Mekanik Klavye' } },
    ]);
    expect(host.data[0].name).toBe('Mekanik Klavye'); // ArrayDataSource write-back
    expect(cellAt(el, 0, 1).textContent?.trim()).toBe('Mekanik Klavye');
    expect(el.querySelector('.oge-editor')).toBeFalsy();
  });

  it('blocks commit while invalid and reverts on Escape', async () => {
    const { fixture, host, el } = await render({ mode: 'cell' });
    cellAt(el, 1, 1).click();
    await settle(fixture);
    const editor = editorInput(el);
    typeInto(editor, '');
    pressEnter(editor);
    await settle(fixture);
    expect(host.events).toHaveLength(0);
    expect(el.querySelector('.oge-editor-invalid')).toBeTruthy();

    editor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await settle(fixture);
    expect(el.querySelector('.oge-editor')).toBeFalsy();
    expect(host.data[1].name).toBe('Fare');
  });

  it('cancelable savingChanges prevents the write-back', async () => {
    const { fixture, host, el } = await render({ mode: 'cell' });
    host.cancelNext = true;
    cellAt(el, 0, 1).click();
    await settle(fixture);
    const editor = editorInput(el);
    typeInto(editor, 'X');
    pressEnter(editor);
    await settle(fixture);
    expect(host.events).toHaveLength(1);
    expect(host.data[0].name).toBe('Klavye'); // unchanged
  });
});

describe('OgeGrid editing — batch mode', () => {
  it('accumulates dirty cells, marks removals and saves everything at once', async () => {
    const { fixture, host, el } = await render({
      mode: 'batch',
      allowDeleting: true,
    });

    // edit two cells
    cellAt(el, 0, 2).click();
    await settle(fixture);
    typeInto(editorInput(el), '120');
    pressEnter(editorInput(el));
    await settle(fixture);

    cellAt(el, 1, 1).click();
    await settle(fixture);
    typeInto(editorInput(el), 'Oyuncu Faresi');
    pressEnter(editorInput(el));
    await settle(fixture);

    expect(el.querySelectorAll('.oge-cell-dirty').length).toBe(2);
    expect(cellAt(el, 0, 2).textContent?.trim()).toBe('120'); // pending value shown
    expect(host.data[0].price).toBe(100); // not saved yet

    // mark third row for deletion
    (
      el.querySelectorAll('.oge-command-delete')[2] as HTMLButtonElement
    ).click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-row-removed').length).toBe(1);

    // save everything
    const save = Array.from(el.querySelectorAll('.oge-toolbar-text-btn')).find(
      (b) => b.textContent?.includes('Save changes'),
    ) as HTMLButtonElement;
    save.click();
    await settle(fixture);
    await settle(fixture);

    expect(host.events).toHaveLength(1);
    expect(host.events[0].changes).toEqual([
      { type: 'update', key: 1, data: { price: 120 } },
      { type: 'update', key: 2, data: { name: 'Oyuncu Faresi' } },
      { type: 'remove', key: 3 },
    ]);
    expect(host.data).toHaveLength(2);
    expect(host.data[0].price).toBe(120);
    expect(host.data[1].name).toBe('Oyuncu Faresi');
    expect(el.querySelectorAll('.oge-cell-dirty').length).toBe(0);
  });

  it('discard clears all pending changes', async () => {
    const { fixture, host, el } = await render({ mode: 'batch' });
    cellAt(el, 0, 1).click();
    await settle(fixture);
    typeInto(editorInput(el), 'Değişti');
    pressEnter(editorInput(el));
    await settle(fixture);
    expect(el.querySelectorAll('.oge-cell-dirty').length).toBe(1);

    const discard = Array.from(
      el.querySelectorAll('.oge-toolbar-text-btn'),
    ).find((b) => b.textContent?.includes('Discard')) as HTMLButtonElement;
    discard.click();
    await settle(fixture);
    expect(el.querySelectorAll('.oge-cell-dirty').length).toBe(0);
    expect(cellAt(el, 0, 1).textContent?.trim()).toBe('Klavye');
    expect(host.events).toHaveLength(0);
  });
});

describe('OgeGrid editing — row mode', () => {
  it('edits a whole row via the command column and saves', async () => {
    const { fixture, host, el } = await render({
      mode: 'row',
      allowDeleting: true,
    });
    expect(el.querySelectorAll('.oge-command-cell').length).toBeGreaterThan(0);

    (
      el.querySelectorAll('[aria-label="Edit"]')[0] as HTMLButtonElement
    ).click();
    await settle(fixture);
    const editors = el.querySelectorAll('.oge-editor');
    expect(editors.length).toBe(2); // name + price (id not editable)

    const inputs = editorInputs(el);
    typeInto(inputs[0], 'Yeni Ad');
    typeInto(inputs[1], '111');
    (el.querySelector('[aria-label="Save"]') as HTMLButtonElement).click();
    await settle(fixture);
    await settle(fixture);

    expect(host.events[0].changes).toEqual([
      { type: 'update', key: 1, data: { name: 'Yeni Ad', price: 111 } },
    ]);
    expect(host.data[0]).toEqual({ id: 1, name: 'Yeni Ad', price: 111 });
  });

  it('deletes a row immediately in row mode', async () => {
    const { fixture, host, el } = await render({
      mode: 'row',
      allowDeleting: true,
    });
    (
      el.querySelectorAll('.oge-command-delete')[1] as HTMLButtonElement
    ).click();
    await settle(fixture);
    await settle(fixture);
    expect(host.events[0].changes).toEqual([{ type: 'remove', key: 2 }]);
    expect(host.data.map((p) => p.id)).toEqual([1, 3]);
  });

  it('adds a new row and inserts it on save', async () => {
    const { fixture, host, el } = await render({
      mode: 'row',
      allowAdding: true,
    });
    const add = Array.from(el.querySelectorAll('.oge-toolbar-text-btn')).find(
      (b) => b.textContent?.includes('Add'),
    ) as HTMLButtonElement;
    add.click();
    await settle(fixture);

    const inputs = editorInputs(el);
    typeInto(inputs[0], 'Kulaklık');
    typeInto(inputs[1], '75');
    (el.querySelector('[aria-label="Save"]') as HTMLButtonElement).click();
    await settle(fixture);
    await settle(fixture);

    expect(host.events[0].changes[0].type).toBe('insert');
    expect(host.events[0].changes[0].data).toEqual({
      name: 'Kulaklık',
      price: 75,
    });
    expect(host.data).toHaveLength(4);
    expect(host.data[3]).toMatchObject({ name: 'Kulaklık', price: 75 });
  });
});

describe('OgeGrid editing — popup mode', () => {
  it('opens the dialog, validates and saves', async () => {
    const { fixture, host, el } = await render({ mode: 'popup' });
    (el.querySelector('[aria-label="Edit"]') as HTMLButtonElement).click();
    await settle(fixture);
    const popup = el.querySelector('.oge-edit-modal .oge-modal') as HTMLElement;
    expect(popup).toBeTruthy();
    const editors = popup.querySelectorAll('.oge-editor');
    expect(editors.length).toBe(2);

    typeInto(editorInputs(popup)[0], 'Popup Adı');
    (
      Array.from(popup.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Save'),
      ) as HTMLButtonElement
    ).click();
    await settle(fixture);
    await settle(fixture);

    expect(host.data[0].name).toBe('Popup Adı');
    expect(el.querySelector('.oge-edit-modal .oge-modal')).toBeFalsy();
  });
});
