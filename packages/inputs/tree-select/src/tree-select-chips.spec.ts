import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OgeTreeSelect } from './tree-select';
import type { OgeTreeSelectSelectionChangedEvent } from './tree-select-types';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
}

const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OgeTreeSelect],
  template: `
    <oge-tree-select
      label="Folders"
      [items]="items"
      displayExpr="name"
      [rootValue]="null"
      selectionMode="multiple"
      [selectNodesRecursive]="false"
      showSelectionAs="chips"
      [maxDisplayedTags]="maxDisplayedTags()"
      [(value)]="value"
      (selectionChanged)="changes.push($event)"
    />
  `,
})
class Host {
  readonly items = FOLDERS;
  readonly value = signal<unknown>([2, 4, 5]);
  readonly maxDisplayedTags = signal<number | undefined>(undefined);
  readonly changes: OgeTreeSelectSelectionChangedEvent[] = [];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('OgeTreeSelect chips', () => {
  it('renders the selection as chips with an empty field text', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const host: HTMLElement =
      fixture.nativeElement.querySelector('oge-tree-select');
    expect(host.classList.contains('oge-tree-select-chips')).toBe(true);
    const chips = Array.from(
      host.querySelectorAll<HTMLElement>('.oge-tag-text'),
    ).map((el) => el.textContent);
    expect(chips).toEqual(['Reports', 'Photos', 'Holiday']);
    expect(
      host.querySelector<HTMLInputElement>('.oge-input-native')?.value,
    ).toBe('');
  });

  it('removes a node from its chip button and from Backspace', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    const remove =
      fixture.nativeElement.querySelector<HTMLButtonElement>('.oge-tag-remove');
    expect(remove?.getAttribute('aria-label')).toBe('Remove Reports');
    remove?.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([4, 5]);
    expect(fixture.componentInstance.changes.at(-1)).toEqual({
      keys: [4, 5],
      previousKeys: [2, 4, 5],
    });
    fixture.nativeElement
      .querySelector('.oge-input-native')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }),
      );
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([4]);
  });

  it('folds chips past maxDisplayedTags into "+N more"', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxDisplayedTags.set(1);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-tag-more')?.textContent?.trim(),
    ).toBe('+2 more');
  });
});
