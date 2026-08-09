import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeForm } from './form';
import { OgeFormGroup } from './form-group';
import { OgeFormItem } from './form-item';
import type { OgeFormItemData } from './form-types';

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function labels(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('.oge-form-label')).map((n) =>
    (n.textContent ?? '').trim().replace(/\s*\*\s*required$/, ''),
  );
}

interface Person extends Record<string, unknown> {
  firstName: string;
  lastName: string;
  age: number;
  active: boolean;
}

@Component({
  selector: 'oge-merge-host',
  imports: [OgeForm, OgeFormItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" [items]="items()" labelLocation="start">
      <oge-form-item field="firstName" label="First" />
      <oge-form-item field="lastName" label="Last" [visible]="showLast()" />
    </oge-form>
  `,
})
class MergeHost {
  readonly data = signal<Person>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    age: 36,
    active: true,
  });
  readonly showLast = signal(true);
  readonly items = signal<readonly OgeFormItemData[]>([
    { field: 'age', label: 'Age' },
  ]);
}

@Component({
  selector: 'oge-group-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" [colCount]="2">
      <oge-form-group caption="Identity" [colCount]="2">
        <oge-form-item field="firstName" label="First" />
        <oge-form-item field="lastName" label="Last" [colSpan]="2" />
      </oge-form-group>
      <oge-form-item field="age" label="Age" />
    </oge-form>
  `,
})
class GroupHost {
  readonly data = signal<Person>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    age: 36,
    active: true,
  });
}

describe('OgeForm — item merge and layout', () => {
  it('renders declarative children before items entries', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    await settle(fixture);
    expect(labels(fixture.nativeElement as HTMLElement)).toEqual([
      'First',
      'Last',
      'Age',
    ]);
  });

  it('drops a child whose visible input is false', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    await settle(fixture);
    fixture.componentInstance.showLast.set(false);
    await settle(fixture);
    expect(labels(fixture.nativeElement as HTMLElement)).toEqual([
      'First',
      'Age',
    ]);
  });

  it('reorders with visibleIndex without disturbing unindexed items', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    fixture.componentInstance.items.set([
      { field: 'age', label: 'Age', visibleIndex: 0 },
    ]);
    await settle(fixture);
    expect(labels(fixture.nativeElement as HTMLElement)).toEqual([
      'Age',
      'First',
      'Last',
    ]);
  });

  it('picks the editor from the model value type', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('oge-text-box').length).toBe(2);
    expect(el.querySelectorAll('oge-number-box').length).toBe(1);
  });

  it('renders every editorType the union advertises', async () => {
    const fixture = TestBed.createComponent(EditorHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    for (const selector of [
      'oge-text-box',
      'oge-text-area',
      'oge-number-box',
      'oge-select-box',
      'oge-tag-box',
      'oge-autocomplete',
      'oge-tree-select',
      'oge-date-box',
      'oge-date-range-box',
      'oge-calendar',
      'oge-check-box',
      'oge-switch',
      'oge-radio-group',
    ]) {
      expect(el.querySelectorAll(selector).length, selector).toBe(1);
    }
  });

  it('reports the derived binding mode', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    await settle(fixture);
    const form = fixture.debugElement.children[0].componentInstance as OgeForm;
    expect(form.mode()).toBe('formData');
  });
});

@Component({
  selector: 'oge-nested-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" [colCount]="2" labelLocation="start">
      <oge-form-group caption="Outer" [colCount]="2">
        <oge-form-item field="firstName" label="First" />
        <oge-form-group caption="Inner" [colCount]="1">
          <oge-form-item field="lastName" label="Last" />
        </oge-form-group>
      </oge-form-group>
    </oge-form>
  `,
})
class NestedHost {
  readonly data = signal<Person>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    age: 36,
    active: true,
  });
}

@Component({
  selector: 'oge-order-host',
  imports: [OgeForm, OgeFormItem, OgeFormGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <oge-form [(formData)]="data" labelLocation="start">
      <oge-form-item field="age" label="Age" />
      <oge-form-group caption="Names" [visibleIndex]="0">
        <oge-form-item field="lastName" label="Last" [visibleIndex]="0" />
        <oge-form-item field="firstName" label="First" />
      </oge-form-group>
    </oge-form>
  `,
})
class OrderHost {
  readonly data = signal<Person>({
    firstName: 'Ada',
    lastName: 'Lovelace',
    age: 36,
    active: true,
  });
}

@Component({
  selector: 'oge-editor-host',
  imports: [OgeForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<oge-form [(formData)]="data" [items]="items" />`,
})
class EditorHost {
  readonly data = signal<Record<string, unknown>>({
    a: '',
    b: '',
    c: 0,
    d: '',
    e: [],
    f: '',
    g: '',
    h: null,
    i: [null, null],
    j: null,
    k: false,
    l: false,
    m: '',
  });
  readonly items: OgeFormItemData[] = [
    { field: 'a', editorType: 'textBox' },
    { field: 'b', editorType: 'textArea' },
    { field: 'c', editorType: 'numberBox' },
    { field: 'd', editorType: 'selectBox', editorOptions: { items: ['x'] } },
    { field: 'e', editorType: 'tagBox', editorOptions: { items: ['x'] } },
    { field: 'f', editorType: 'autocomplete', editorOptions: { items: ['x'] } },
    {
      field: 'g',
      editorType: 'treeSelect',
      editorOptions: { items: [{ id: 1, parentId: null, text: 'Root' }] },
    },
    { field: 'h', editorType: 'dateBox' },
    { field: 'i', editorType: 'dateRangeBox' },
    { field: 'j', editorType: 'calendar' },
    { field: 'k', editorType: 'checkBox' },
    { field: 'l', editorType: 'switch' },
    { field: 'm', editorType: 'radioGroup', editorOptions: { items: ['x'] } },
  ];
}

describe('OgeForm — nested groups', () => {
  it('renders a group inside a group, not as a sibling', async () => {
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const outer = el.querySelector<HTMLElement>('fieldset.oge-form-group');
    expect(outer?.querySelector('legend')?.textContent?.trim()).toBe('Outer');

    const inner = outer?.querySelector<HTMLElement>('fieldset.oge-form-group');
    expect(inner).toBeTruthy();
    expect(inner?.querySelector('legend')?.textContent?.trim()).toBe('Inner');
    // exactly two fieldsets in total, one inside the other
    expect(el.querySelectorAll('fieldset.oge-form-group').length).toBe(2);
  });

  it('keeps the items of a nested group inside it', async () => {
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const inner = el.querySelector<HTMLElement>(
      'fieldset.oge-form-group fieldset.oge-form-group',
    );
    expect(inner?.querySelectorAll('oge-form-field').length).toBe(1);
    expect(inner?.querySelector('.oge-form-label')?.textContent?.trim()).toBe(
      'Last',
    );
  });

  it('gives a nested group its own column count', async () => {
    const fixture = TestBed.createComponent(NestedHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const grids = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-form-fields'),
    );
    // outer form, outer group, inner group
    expect(grids[1].style.gridTemplateColumns).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
    expect(grids[2].style.gridTemplateColumns).toBe(
      'repeat(1, minmax(0, 1fr))',
    );
  });

  it('orders groups among their siblings, and items within a group', async () => {
    const fixture = TestBed.createComponent(OrderHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    // the group's visibleIndex pulls it ahead of the loose item…
    const children = Array.from(
      (el.querySelector('.oge-form-fields') as HTMLElement).children,
    );
    expect(children[0].tagName).toBe('FIELDSET');
    // …and inside it, Last is pulled ahead of First
    expect(labels(el)).toEqual(['Last', 'First', 'Age']);
  });
});

describe('OgeForm — groups', () => {
  it('renders a fieldset with the caption as its legend', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('fieldset.oge-form-group');
    expect(group).toBeTruthy();
    expect(group?.querySelector('legend')?.textContent?.trim()).toBe(
      'Identity',
    );
  });

  it('keeps ungrouped items outside the fieldset', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const group = el.querySelector('fieldset.oge-form-group') as HTMLElement;
    expect(group.querySelectorAll('oge-form-field').length).toBe(2);
    expect(el.querySelectorAll('oge-form-field').length).toBe(3);
  });

  it('spans an item across columns', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const fields = Array.from(
      el.querySelectorAll<HTMLElement>('oge-form-field'),
    );
    expect(fields[1].style.gridColumn).toBe('span 2');
    expect(fields[0].style.gridColumn).toBe('');
  });

  it('lays the top level out with the declared column count', async () => {
    const fixture = TestBed.createComponent(GroupHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const fields = el.querySelector<HTMLElement>('.oge-form-fields');
    expect(fields?.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');
  });

  it('falls back to an auto-fit track list for colCount auto', async () => {
    const fixture = TestBed.createComponent(MergeHost);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const fields = el.querySelector<HTMLElement>('.oge-form-fields');
    expect(fields?.style.gridTemplateColumns).toContain('auto-fit');
  });
});
