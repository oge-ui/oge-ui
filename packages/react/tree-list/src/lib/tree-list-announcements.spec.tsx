import { StrictMode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { OGE_LIVE_ANNOUNCER_ATTR, getOgeLiveAnnouncer } from '@oge-ui/behavior';
import { OgeTreeList } from './tree-list';
import { rows, settled } from './tree-list.test-utils';

interface Task {
  id: number;
  parentId: number | null;
  title: string;
}

const seed = (): Task[] => [
  { id: 1, parentId: null, title: 'Engineering' },
  { id: 2, parentId: 1, title: 'Platform' },
  { id: 3, parentId: 1, title: 'Design system' },
  { id: 4, parentId: null, title: 'Sales' },
];

const columns = [{ field: 'title', caption: 'Title', required: true }];

const live = (mode: 'polite' | 'assertive' = 'polite'): string =>
  document.querySelector(`[${OGE_LIVE_ANNOUNCER_ATTR}="${mode}"]`)
    ?.textContent ?? '';
const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

afterEach(() => getOgeLiveAnnouncer().clear());

describe('<OgeTreeList> live announcements', () => {
  it('announces sort changes (StrictMode)', async () => {
    render(
      <StrictMode>
        <OgeTreeList data={seed()} columns={columns} />
      </StrictMode>,
    );
    await settled();
    fireEvent.click(
      document.querySelector(
        '.oge-header-cell[role="columnheader"]',
      ) as HTMLElement,
    );
    await waitFor(() => expect(live()).toBe('Sorted by Title, ascending'));
  });

  it('announces row expansion with the row text', async () => {
    render(<OgeTreeList data={seed()} columns={columns} />);
    await settled();
    const expander = () =>
      document.querySelector('.oge-tree-expander') as HTMLElement;
    fireEvent.click(expander());
    await waitFor(() => expect(live()).toBe('Engineering expanded'));
    fireEvent.click(expander());
    await waitFor(() => expect(live()).toBe('Engineering collapsed'));
  });

  it('announces the visible row count after a search', async () => {
    const { container } = render(
      <OgeTreeList
        data={seed()}
        columns={columns}
        searchPanel
        filterDebounce={0}
      />,
    );
    await settled();
    fireEvent.change(
      container.querySelector('.oge-search-input') as HTMLInputElement,
      { target: { value: 'Platform' } },
    );
    // the match plus its ancestor
    await waitFor(() => expect(live()).toBe('2 rows'));
  });

  it('stays silent with announcements={false}', async () => {
    render(
      <OgeTreeList data={seed()} columns={columns} announcements={false} />,
    );
    await settled();
    fireEvent.click(
      document.querySelector('.oge-tree-expander') as HTMLElement,
    );
    await wait(200);
    expect(live()).toBe('');
  });
});

describe('<OgeTreeList> edit validation semantics', () => {
  it('marks an invalid cell editor and points it at its rendered error', async () => {
    render(
      <OgeTreeList
        data={seed()}
        columns={columns}
        editing={{ mode: 'cell', allowUpdating: true }}
      />,
    );
    await settled();
    fireEvent.click(rows()[0].querySelector('.oge-cell') as HTMLElement);
    await wait(0);
    const input = document.querySelector(
      '.oge-editor input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await wait(0);

    expect(input.getAttribute('aria-invalid')).toBe('true');
    const errorId = input.getAttribute('aria-errormessage') as string;
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(
      errorId,
    );
    expect(document.getElementById(errorId)?.textContent).toBe(
      'This field is required',
    );
    await waitFor(() =>
      expect(live('assertive')).toBe('Title: This field is required'),
    );
  });
});
