import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OgeTreeView } from './tree-view';
import type {
  OgeTreeAllowEditing,
  OgeTreeEditedEvent,
  OgeTreeEditingEvent,
  OgeTreeEditValidator,
} from './tree-view-types';
import { FLAT, key, settle, type Node } from './tree-view-test-host';

@Component({
  selector: 'oge-edit-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeView],
  template: `
    <oge-tree-view
      [items]="items()"
      displayExpr="name"
      [rootValue]="null"
      [allowEditing]="allowEditing()"
      [editOnDblClick]="editOnDblClick()"
      [validateEdit]="validate()"
      (itemEditStarting)="starting.push($event.key); $event.cancel = vetoStart"
      (itemEditing)="onEditing($event)"
      (itemEdited)="onEdited($event)"
    />
  `,
})
class EditHost {
  readonly tree = viewChild.required(OgeTreeView<Node>);
  readonly items = signal<readonly Node[]>(FLAT);
  readonly allowEditing = signal<OgeTreeAllowEditing<Node>>(true);
  readonly editOnDblClick = signal(false);
  readonly validate = signal<OgeTreeEditValidator<Node> | undefined>(undefined);
  vetoStart = false;
  vetoCommit = false;
  readonly starting: unknown[] = [];
  readonly editing: OgeTreeEditingEvent<Node>[] = [];
  readonly edited: OgeTreeEditedEvent<Node>[] = [];
  onEditing(event: OgeTreeEditingEvent<Node>): void {
    this.editing.push(event);
    if (this.vetoCommit) event.cancel = true;
  }
  onEdited(event: OgeTreeEditedEvent<Node>): void {
    this.edited.push(event);
    // the tree does not write the label — the application does
    this.items.update((rows) =>
      rows.map((row) =>
        row.id === event.key ? { ...row, name: event.value } : row,
      ),
    );
  }
}

async function renderEdit(setup?: (host: EditHost) => void) {
  const fixture = TestBed.createComponent(EditHost);
  setup?.(fixture.componentInstance);
  document.body.appendChild(fixture.nativeElement);
  await settle(fixture);
  const el: HTMLElement = fixture.nativeElement;
  const rows = () =>
    Array.from(el.querySelectorAll<HTMLElement>('.oge-tree-view-item'));
  const field = () =>
    el.querySelector<HTMLInputElement>('.oge-tree-view-edit-input');
  return { fixture, host: fixture.componentInstance, el, rows, field };
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('OgeTreeView label editing', () => {
  it('opens on F2 with the label selected and commits on Enter', async () => {
    const { fixture, host, rows, field } = await renderEdit();
    rows()[0].focus();
    key(rows()[0], 'F2');
    await settle(fixture);
    const input = field();
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    expect(input?.value).toBe('Documents');
    expect(input?.getAttribute('aria-label')).toBe('Item name');
    expect(rows()[0].getAttribute('aria-keyshortcuts')).toBe('F2');

    type(input as HTMLInputElement, 'Docs');
    key(input as HTMLInputElement, 'Enter');
    await settle(fixture);
    expect(host.editing[0]).toMatchObject({
      previousValue: 'Documents',
      value: 'Docs',
    });
    expect(host.edited[0]).toMatchObject({ key: 1, value: 'Docs' });
    expect(field()).toBeNull();
    expect(rows()[0].textContent).toContain('Docs');
    expect(document.activeElement).toBe(rows()[0]);
  });

  it('Escape cancels and gives the row its focus back', async () => {
    const { fixture, host, rows, field } = await renderEdit();
    key(rows()[0], 'F2');
    await settle(fixture);
    type(field() as HTMLInputElement, 'Nope');
    key(field() as HTMLInputElement, 'Escape');
    await settle(fixture);
    expect(field()).toBeNull();
    expect(host.edited).toEqual([]);
    expect(document.activeElement).toBe(rows()[0]);
  });

  it('commits on blur', async () => {
    const { fixture, host, rows, field } = await renderEdit();
    key(rows()[0], 'F2');
    await settle(fixture);
    type(field() as HTMLInputElement, 'Blurred');
    field()?.dispatchEvent(new FocusEvent('blur'));
    await settle(fixture);
    expect(host.edited[0]).toMatchObject({ value: 'Blurred' });
    expect(field()).toBeNull();
  });

  it('keeps the editor open with the validation message', async () => {
    const { fixture, host, rows, field, el } = await renderEdit((h) =>
      h.validate.set((value) => (value.length < 3 ? 'Too short' : null)),
    );
    key(rows()[0], 'F2');
    await settle(fixture);
    type(field() as HTMLInputElement, 'ab');
    key(field() as HTMLInputElement, 'Enter');
    await settle(fixture);
    expect(field()).not.toBeNull();
    expect(field()?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('.oge-tree-view-edit-error')?.textContent).toBe(
      'Too short',
    );
    expect(host.editing).toEqual([]);
  });

  it('respects the per-item predicate and the cancelable pre-events', async () => {
    const { fixture, host, rows, field } = await renderEdit((h) =>
      h.allowEditing.set((row) => row.id !== 1),
    );
    key(rows()[0], 'F2');
    await settle(fixture);
    expect(field()).toBeNull();

    host.vetoStart = true;
    rows()[1].focus();
    key(rows()[1], 'F2');
    await settle(fixture);
    expect(field()).toBeNull();
    expect(host.starting).toEqual([4]);

    host.vetoStart = false;
    host.vetoCommit = true;
    key(rows()[1], 'F2');
    await settle(fixture);
    type(field() as HTMLInputElement, 'Pictures');
    key(field() as HTMLInputElement, 'Enter');
    await settle(fixture);
    expect(host.edited).toEqual([]);
    expect(field()).toBeNull();
  });

  it('keeps tree keys out of the editor', async () => {
    const { fixture, rows, field } = await renderEdit();
    key(rows()[0], 'F2');
    await settle(fixture);
    // ArrowRight would expand Documents if it reached the row handler
    key(field() as HTMLInputElement, 'ArrowRight');
    await settle(fixture);
    expect(rows()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on double-click with editOnDblClick, and through editItem()', async () => {
    const { fixture, host, rows, field } = await renderEdit((h) =>
      h.editOnDblClick.set(true),
    );
    rows()[1]
      .querySelector('.oge-tree-view-text')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await settle(fixture);
    expect(field()?.value).toBe('Photos');
    host.tree().cancelEdit();
    await settle(fixture);
    expect(field()).toBeNull();
    expect(host.tree().editItem(1)).toBe(true);
    await settle(fixture);
    expect(field()?.value).toBe('Documents');
  });

  it('does nothing while editing is off', async () => {
    const { fixture, rows, field } = await renderEdit((h) =>
      h.allowEditing.set(false),
    );
    key(rows()[0], 'F2');
    await settle(fixture);
    expect(field()).toBeNull();
    expect(rows()[0].hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});
