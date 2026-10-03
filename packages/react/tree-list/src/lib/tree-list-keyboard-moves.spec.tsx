import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { OgeTreeList } from './tree-list';
import type { OgeTreeRowReparentEvent } from '@oge-ui/behavior';
import { settled } from './tree-list.test-utils';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
  owner: string;
}

const TASKS: Task[] = [
  { id: 1, parentId: null, title: 'Root A', owner: 'Ada' },
  { id: 2, parentId: 1, title: 'Child A1', owner: 'Grace' },
  { id: 4, parentId: 1, title: 'Child A2', owner: 'Linus' },
  { id: 3, parentId: null, title: 'Root B', owner: 'Erin' },
];

const columns = [
  { field: 'title', caption: 'Title' },
  { field: 'owner', caption: 'Owner', maxWidth: 160 },
];

async function renderTree() {
  const data = TASKS.map((task) => ({ ...task }));
  const events: OgeTreeRowReparentEvent<Task>[] = [];
  const result = render(
    <StrictMode>
      <OgeTreeList
        data={data}
        columns={columns}
        keyExpr="id"
        parentIdExpr="parentId"
        autoExpandAll
        rowDragging
        onRowReparented={(event) => events.push(event)}
      />
    </StrictMode>,
  );
  await settled();
  const { container } = result;
  const titles = () =>
    Array.from(container.querySelectorAll('.oge-row')).map((row) =>
      row.querySelector('[data-cell$="-0"]')?.textContent?.trim(),
    );
  const cellOf = (title: string) =>
    Array.from(
      container.querySelectorAll<HTMLElement>('[data-cell$="-0"]'),
    ).find((cell) => (cell.textContent ?? '').includes(title))!;
  const header = (id: string) =>
    Array.from(
      container.querySelectorAll<HTMLElement>(
        '.oge-header-row > .oge-header-cell[data-colid]',
      ),
    ).find((cell) => cell.dataset['colid'] === id)!;
  const announcer = () =>
    container.querySelector('.oge-grid-announcer')?.textContent?.trim() ?? '';
  const focus = (title: string) => {
    const cell = cellOf(title);
    act(() => cell.focus());
    fireEvent.focus(cell);
    return cell;
  };
  return { ...result, data, events, titles, header, announcer, focus };
}

describe('OgeTreeList (React) keyboard alternatives to dragging', () => {
  it('moves a row among its siblings and keeps the focus on it', async () => {
    const t = await renderTree();
    await waitFor(() =>
      expect(t.titles()).toEqual(['Root A', 'Child A1', 'Child A2', 'Root B']),
    );
    fireEvent.keyDown(t.focus('Child A2'), { key: 'ArrowUp', ctrlKey: true });
    await waitFor(() =>
      expect(t.titles()).toEqual(['Root A', 'Child A2', 'Child A1', 'Root B']),
    );
    expect(t.events.at(-1)).toMatchObject({
      key: 4,
      toParentKey: 1,
      position: 'before',
    });
    await waitFor(() =>
      expect(t.announcer()).toBe('Row moved to level 2, position 1 of 2'),
    );
    await waitFor(() =>
      expect(document.activeElement?.textContent).toContain('Child A2'),
    );
  });

  it('indents with Ctrl+ArrowRight and outdents with Ctrl+ArrowLeft', async () => {
    const t = await renderTree();
    fireEvent.keyDown(t.focus('Child A2'), {
      key: 'ArrowRight',
      ctrlKey: true,
    });
    expect(t.data.find((task) => task.id === 4)?.parentId).toBe(2);
    expect(t.events.at(-1)).toMatchObject({
      key: 4,
      fromParentKey: 1,
      toParentKey: 2,
      position: 'inside',
    });
    await waitFor(() =>
      expect(t.announcer()).toBe('Row moved to level 3, position 1 of 1'),
    );
    fireEvent.keyDown(t.focus('Child A2'), {
      key: 'ArrowLeft',
      ctrlKey: true,
    });
    expect(t.data.find((task) => task.id === 4)?.parentId).toBe(1);
  });

  it('resizes up to maxWidth and moves columns from the header', async () => {
    const t = await renderTree();
    const handle = t
      .header('owner')
      .querySelector('.oge-resize-handle') as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-label')).toBe('Resize Owner');
    expect(handle.getAttribute('aria-valuemax')).toBe('160');
    fireEvent.keyDown(handle, { key: 'End' });
    await waitFor(() =>
      expect(handle.getAttribute('aria-valuenow')).toBe('160'),
    );
    fireEvent.keyDown(t.header('owner'), {
      key: 'ArrowLeft',
      ctrlKey: true,
      shiftKey: true,
    });
    await waitFor(() =>
      expect(t.announcer()).toBe('Owner moved to position 1 of 2'),
    );
  });
});
