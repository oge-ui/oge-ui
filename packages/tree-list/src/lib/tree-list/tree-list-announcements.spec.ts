import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeTreeList } from './tree-list';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Engineering' },
  { id: 2, parentId: 1, title: 'Platform' },
  { id: 3, parentId: 1, title: 'Design system' },
  { id: 4, parentId: null, title: 'Sales' },
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

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(OgeTreeList<Task>);
  fixture.componentRef.setInput(
    'data',
    TASKS.map((task) => ({ ...task })),
  );
  fixture.componentRef.setInput('columns', [
    { field: 'title', caption: 'Title', required: true },
  ]);
  fixture.componentRef.setInput('keyExpr', 'id');
  fixture.componentRef.setInput('parentIdExpr', 'parentId');
  fixture.componentRef.setInput('filterDebounce', 0);
  fixture.componentRef.setInput('searchPanel', true);
  for (const [name, value] of Object.entries(inputs))
    fixture.componentRef.setInput(name, value);
  await settle(fixture);
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('OgeTreeList live announcements', () => {
  afterEach(() => getOgeLiveAnnouncer().clear());

  it('announces sort changes', async () => {
    const { fixture, el } = await render();
    (
      el.querySelector('.oge-header-cell[role="columnheader"]') as HTMLElement
    ).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Sorted by Title, ascending');
  }, 20_000);

  it('announces row expansion with the row text', async () => {
    const { fixture, el } = await render();
    (el.querySelector('.oge-tree-expander') as HTMLElement).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Engineering expanded');
    (el.querySelector('.oge-tree-expander') as HTMLElement).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('Engineering collapsed');
  });

  it('announces the visible row count after a search', async () => {
    const { fixture, el } = await render();
    const search = el.querySelector('.oge-search-input') as HTMLInputElement;
    search.value = 'Platform';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    await settle(fixture);
    await wait(650);
    // the match plus its ancestor
    expect(live()).toBe('2 rows');
  });

  it('stays silent with announcements off', async () => {
    const { fixture, el } = await render({ announcements: false });
    (el.querySelector('.oge-tree-expander') as HTMLElement).click();
    await settle(fixture);
    await wait(150);
    expect(live()).toBe('');
  });
});

describe('OgeTreeList edit validation semantics', () => {
  afterEach(() => getOgeLiveAnnouncer().clear());

  it('marks an invalid cell editor and points it at its error message', async () => {
    const { fixture, el } = await render({
      editing: { mode: 'cell', allowUpdating: true },
    });
    (
      el.querySelector(
        '.oge-row .oge-cell:not(.oge-checkbox-cell)',
      ) as HTMLElement
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

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-errormessage') as string;
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(
      errorId,
    );
    expect(document.getElementById(errorId)?.textContent?.trim()).toBe(
      'This field is required',
    );
    await wait(150);
    expect(live('assertive')).toBe('Title: This field is required');
  });
});
