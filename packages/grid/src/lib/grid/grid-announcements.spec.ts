import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeColumn } from '../columns/column';
import type { OgeEditingOptions } from '../state/editing-slice';
import { OgeGrid } from './grid';

interface Row {
  id: number;
  name: string;
  country: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ada', country: 'UK' },
  { id: 2, name: 'Grace', country: 'US' },
  { id: 3, name: 'Linus', country: 'FI' },
  { id: 4, name: 'Alan', country: 'UK' },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await wait(0);
  await fixture.whenStable();
  fixture.detectChanges();
}

const live = (mode: 'polite' | 'assertive' = 'polite'): string =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`)
    ?.textContent ?? '';

@Component({
  imports: [OgeGrid, OgeColumn],
  template: `
    <oge-grid
      [data]="data"
      keyField="id"
      [filterDebounce]="0"
      [searchPanel]="true"
      [paging]="paging()"
      [groupBy]="groupBy()"
      [selectionMode]="selectionMode()"
      [editing]="editing()"
      [announcements]="announcements()"
    >
      <oge-column field="name" [required]="true" />
      <oge-column field="country" caption="Country" />
    </oge-grid>
  `,
})
class Host {
  data = ROWS.map((row) => ({ ...row }));
  readonly paging = signal<false | { pageSize: number }>(false);
  readonly groupBy = signal<string[] | undefined>(undefined);
  readonly selectionMode = signal<'none' | 'checkbox'>('none');
  readonly editing = signal<false | OgeEditingOptions>(false);
  readonly announcements = signal<boolean | undefined>(undefined);
}

async function render(setup: (host: Host) => void = () => undefined) {
  const fixture = TestBed.createComponent(Host);
  setup(fixture.componentInstance);
  await settle(fixture);
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function headerOf(el: HTMLElement, caption: string): HTMLElement {
  return Array.from(
    el.querySelectorAll<HTMLElement>('.oge-header-cell[role="columnheader"]'),
  ).find((cell) => cell.textContent?.includes(caption)) as HTMLElement;
}

describe('OgeGrid live announcements', () => {
  afterEach(() => {
    getOgeLiveAnnouncer().clear();
  });

  it('announces a sort change with the column caption and direction', async () => {
    const { fixture, el } = await render();
    headerOf(el, 'Name').click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Sorted by Name, ascending');
    headerOf(el, 'Name').click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Sorted by Name, descending');
    headerOf(el, 'Name').click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Sort cleared');
    // the first spec of the file pays the template compilation
  }, 20_000);

  it('announces the result count once a search settled, debounced', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector('.oge-search-input') as HTMLInputElement;
    search.value = 'Ada';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    await settle(fixture);
    await wait(100);
    expect(live()).toBe('');
    await wait(500);
    expect(live()).toBe('1 row');
    search.value = 'a';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    await settle(fixture);
    await wait(600);
    expect(live()).toBe('3 rows');
  });

  it('announces page changes', async () => {
    const { fixture } = await render((host) =>
      host.paging.set({ pageSize: 2 }),
    );
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeGrid<Row>;
    grid.setPageIndex(1);
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Page 2 of 2');
  });

  it('announces group expansion with the group value', async () => {
    const { fixture, el } = await render((host) =>
      host.groupBy.set(['country']),
    );
    const group = Array.from(
      el.querySelectorAll<HTMLElement>('.oge-group-row'),
    ).find((row) => row.textContent?.includes('UK')) as HTMLElement;
    group.click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Group UK collapsed');
    (
      Array.from(el.querySelectorAll<HTMLElement>('.oge-group-row')).find(
        (row) => row.textContent?.includes('UK'),
      ) as HTMLElement
    ).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Group UK expanded');
  });

  it('announces the selected count after select-all', async () => {
    const { fixture, el } = await render((host) =>
      host.selectionMode.set('checkbox'),
    );
    const header = el.querySelector(
      '.oge-header-cell.oge-checkbox-cell input',
    ) as HTMLInputElement;
    header.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(fixture);
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('4 rows selected');
  });

  it('stays silent with announcements off', async () => {
    const { fixture, el } = await render((host) =>
      host.announcements.set(false),
    );
    headerOf(el, 'Name').click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('');
  });

  it('reads catalog overrides', async () => {
    const fixture = TestBed.createComponent(OgeGrid<Row>);
    fixture.componentRef.setInput('data', ROWS);
    fixture.componentRef.setInput('keyField', 'id');
    fixture.componentRef.setInput('columns', [
      { field: 'name', caption: 'Ad' },
    ]);
    fixture.componentRef.setInput('messages', {
      sortAscendingAnnouncement: '{column} artan sıralandı',
    });
    await settle(fixture);
    await settle(fixture);
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '.oge-header-cell[role="columnheader"]',
      ) as HTMLElement
    ).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Ad artan sıralandı');
  });
});

describe('OgeGrid edit validation semantics', () => {
  afterEach(() => {
    getOgeLiveAnnouncer().clear();
  });

  it('marks an invalid cell editor and points it at a rendered error message', async () => {
    const { fixture, el } = await render((host) =>
      host.editing.set({ mode: 'cell', allowUpdating: true }),
    );
    const cell = el
      .querySelectorAll('.oge-row')[0]
      .querySelectorAll('.oge-cell')[0] as HTMLElement;
    cell.click();
    await settle(fixture);
    const input = el.querySelector('.oge-editor input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    await settle(fixture);

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-errormessage');
    expect(errorId).toBeTruthy();
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(
      errorId,
    );
    const error = document.getElementById(errorId as string);
    expect(error?.textContent?.trim()).toBe('This field is required');
    expect(error?.classList).toContain('oge-sr-only');

    await wait(150);
    expect(live('assertive')).toBe('Name: This field is required');
  });

  it('removes the association once the value is valid again', async () => {
    const { fixture, el } = await render((host) =>
      host.editing.set({ mode: 'cell', allowUpdating: true }),
    );
    (
      el
        .querySelectorAll('.oge-row')[0]
        .querySelectorAll('.oge-cell')[0] as HTMLElement
    ).click();
    await settle(fixture);
    const input = el.querySelector('.oge-editor input') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(fixture);
    await settle(fixture);
    expect(input.getAttribute('aria-errormessage')).toBeTruthy();

    input.value = 'Ada L.';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    await settle(fixture);
    expect(input.hasAttribute('aria-errormessage')).toBe(false);
    expect(el.querySelector('.oge-cell-editor-error')).toBeNull();
  });

  it('form mode: the <oge-form> field carries aria-invalid and a described-by error', async () => {
    const { fixture, el } = await render((host) =>
      host.editing.set({ mode: 'form', allowUpdating: true }),
    );
    const grid = fixture.debugElement.children[0]
      .componentInstance as OgeGrid<Row>;
    grid.editRow(1);
    await settle(fixture);
    const form = el.querySelector('.oge-edit-form-row') as HTMLElement;
    const input = form.querySelector('.oge-input-native') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (form.querySelector('.oge-btn-accent') as HTMLElement).click();
    await settle(fixture);
    await settle(fixture);

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    const error = describedBy
      .split(' ')
      .map((id) => document.getElementById(id))
      .find((node) => node?.classList.contains('oge-input-error'));
    expect(error?.textContent?.trim()).toBeTruthy();
    await wait(150);
    expect(live('assertive')).toMatch(/^Name: /);
  });
});
