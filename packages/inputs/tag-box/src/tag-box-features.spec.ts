import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OgeListDataSource } from '@oge-ui/behavior';
import type {
  OgeSelectBoxCustomItemEvent,
  OgeSelectBoxItemsFn,
} from '@oge-ui/inputs/select-box';
import { OgeTagBox } from './tag-box';

interface Skill {
  id: number;
  name: string;
  area: string;
  off?: boolean;
}

const SKILLS: Skill[] = [
  { id: 1, name: 'Angular', area: 'Frontend' },
  { id: 2, name: 'Signals', area: 'Frontend' },
  { id: 3, name: 'Nx', area: 'Tooling' },
  { id: 4, name: 'Vitest', area: 'Tooling', off: true },
];

@Component({
  imports: [OgeTagBox],
  template: `
    <oge-tag-box
      label="Skills"
      [items]="items()"
      displayExpr="name"
      valueExpr="id"
      disabledExpr="off"
      [groupBy]="groupBy()"
      [itemTemplate]="option"
      [tagTemplate]="tag"
      [searchEnabled]="true"
      [acceptCustomValue]="acceptCustomValue()"
      [showSelectAll]="showSelectAll()"
      [maxSelectedItems]="maxSelectedItems()"
      [maxDisplayedTags]="maxDisplayedTags()"
      [dataSource]="dataSource()"
      [(value)]="value"
      (customItemCreating)="onCustom($event)"
    />
    <ng-template #option let-item let-selected="selected">
      <span class="option-tpl">{{ item.name }}{{ selected ? ' ✓' : '' }}</span>
    </ng-template>
    <ng-template #tag let-item let-text="text">
      <span class="tag-tpl">#{{ text }}</span>
    </ng-template>
  `,
})
class Host {
  readonly items = signal<readonly Skill[] | OgeSelectBoxItemsFn<Skill>>(
    SKILLS,
  );
  readonly value = signal<readonly unknown[]>([]);
  readonly groupBy = signal<string | undefined>(undefined);
  readonly acceptCustomValue = signal(false);
  readonly showSelectAll = signal(false);
  readonly maxSelectedItems = signal<number | undefined>(undefined);
  readonly maxDisplayedTags = signal<number | undefined>(undefined);
  readonly dataSource = signal<OgeListDataSource<Skill> | undefined>(undefined);

  onCustom(event: OgeSelectBoxCustomItemEvent<Skill>): void {
    event.customItem = { id: 99, name: event.text, area: 'Custom' };
  }
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 2; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  fixture.detectChanges();
}

function tagBox(fixture: ComponentFixture<Host>): OgeTagBox<Skill> {
  return fixture.debugElement.children[0].componentInstance;
}

function inputEl(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('.oge-input-native');
}

function key(fixture: ComponentFixture<unknown>, name: string): void {
  inputEl(fixture).dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true }),
  );
}

function type(fixture: ComponentFixture<unknown>, text: string): void {
  const input = inputEl(fixture);
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('OgeTagBox parity features', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 0) as unknown as number,
    );
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders item and tag templates', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.value.set([1]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('.tag-tpl')?.textContent).toBe(
      '#Angular',
    );
    // the remove button survives a tag template
    expect(
      fixture.nativeElement.querySelector('.oge-tag-remove'),
    ).not.toBeNull();
    tagBox(fixture).open();
    await settle(fixture);
    const options = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.option-tpl'),
    ).map((el) => el.textContent);
    expect(options[0]).toBe('Angular ✓');
  });

  it('groups options under headers', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.groupBy.set('area');
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-select-group'),
    ).map((el) => el.textContent?.trim());
    expect(headers).toEqual(['Frontend', 'Tooling']);
  });

  it('loads a lazy items function on first open', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.items.set(() =>
      Promise.resolve(SKILLS.slice(0, 2)),
    );
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelectorAll(
        '.oge-select-option[role="option"]',
      ).length,
    ).toBe(2);
  });

  it('creates a custom tag on Enter when acceptCustomValue is on', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.acceptCustomValue.set(true);
    await settle(fixture);
    type(fixture, 'Rust');
    await settle(fixture);
    key(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([99]);
    expect(fixture.nativeElement.querySelector('.tag-tpl')?.textContent).toBe(
      '#Rust',
    );
  });

  it('select all toggles every enabled visible item and reports mixed', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showSelectAll.set(true);
    fixture.componentInstance.value.set([1]);
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    const row = (): HTMLElement =>
      fixture.nativeElement.querySelector('.oge-tag-select-all-option');
    expect(row().getAttribute('aria-checked')).toBe('mixed');
    expect(row().textContent).toContain('Select all');
    row().click();
    await settle(fixture);
    // the disabled Vitest row is not touched
    expect(fixture.componentInstance.value()).toEqual([1, 2, 3]);
    expect(row().getAttribute('aria-checked')).toBe('true');
    row().click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it('ArrowUp from the first option reaches the select-all row', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.showSelectAll.set(true);
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    key(fixture, 'ArrowUp');
    await settle(fixture);
    expect(inputEl(fixture).getAttribute('aria-activedescendant')).toBe(
      tagBox(fixture).selectAllId,
    );
    key(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1, 2, 3]);
  });

  it('maxSelectedItems makes unselected options inert and says why', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxSelectedItems.set(2);
    fixture.componentInstance.value.set([1, 2]);
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-select-limit')?.textContent,
    ).toContain('up to 2');
    const nx = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('.oge-select-option'),
    ).find((el) => el.textContent?.includes('Nx')) as HTMLElement;
    expect(nx.getAttribute('aria-disabled')).toBe('true');
    nx.click();
    await settle(fixture);
    expect(fixture.componentInstance.value()).toEqual([1, 2]);
  });

  it('folds chips past maxDisplayedTags into a "+N more" chip', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.maxDisplayedTags.set(1);
    fixture.componentInstance.value.set([1, 2, 3]);
    await settle(fixture);
    expect(
      fixture.nativeElement.querySelector('.oge-tag-more')?.textContent?.trim(),
    ).toBe('+2 more');
  });

  it('pages remote data and keeps picked chips across searches', async () => {
    const calls: unknown[] = [];
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.dataSource.set({
      load: async (options) => {
        calls.push(options.searchText);
        const term = (options.searchText ?? '').toLowerCase();
        const rows = SKILLS.filter((s) => s.name.toLowerCase().includes(term));
        return { data: rows, totalCount: rows.length };
      },
    });
    await settle(fixture);
    tagBox(fixture).open();
    await settle(fixture);
    fixture.nativeElement.querySelector('.oge-select-option').click();
    await settle(fixture);
    type(fixture, 'nx');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await settle(fixture);
    expect(calls).toEqual([undefined, 'nx']);
    expect(fixture.nativeElement.querySelector('.tag-tpl')?.textContent).toBe(
      '#Angular',
    );
  });
});
