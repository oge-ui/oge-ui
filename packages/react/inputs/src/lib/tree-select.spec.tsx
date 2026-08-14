import { StrictMode, useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  OgeTreeSelect,
  type OgeTreeSelectSelectionChangedEvent,
  type OgeTreeSelectSelectionMode,
} from './tree-select';
import { OgeTreeViewConfigProvider } from '@oge-ui/react-navigation';
import type { OgeTreeCheckBoxesMode, RowKey } from '@oge-ui/behavior';

interface Folder {
  id: number;
  parentId: number | null;
  name: string;
}

/**
 * ```
 * 1 Documents        4 Photos
 *   2 Reports          5 Holiday
 *     3 Q1.pdf
 *   6 Notes
 * ```
 */
const FOLDERS: Folder[] = [
  { id: 1, parentId: null, name: 'Documents' },
  { id: 2, parentId: 1, name: 'Reports' },
  { id: 3, parentId: 2, name: 'Q1.pdf' },
  { id: 6, parentId: 1, name: 'Notes' },
  { id: 4, parentId: null, name: 'Photos' },
  { id: 5, parentId: 4, name: 'Holiday' },
];

const combo = () => screen.getByRole('combobox') as HTMLInputElement;
const panel = () => document.querySelector('.oge-tree-select-panel');
const host = () => document.querySelector('.oge-tree-select') as HTMLElement;

const rowFor = (name: string): HTMLElement | undefined =>
  Array.from(
    document.querySelectorAll<HTMLElement>('.oge-tree-view-item'),
  ).find((row) => row.textContent?.trim().startsWith(name));

const checkOf = (name: string): HTMLElement | null =>
  rowFor(name)?.querySelector<HTMLElement>('.oge-tree-view-check') ?? null;

/**
 * Opening moves DOM focus into the tree from a microtask, so every open has to
 * flush one turn before the assertions — otherwise React reports the focus
 * state update as unwrapped.
 */
const openPanel = async (): Promise<void> => {
  fireEvent.click(combo());
  await act(async () => {
    await Promise.resolve();
  });
};

interface HostState {
  value: unknown;
  opened: boolean;
  changes: OgeTreeSelectSelectionChangedEvent[];
}

function Host({
  initialValue = null,
  selectionMode = 'single',
  showCheckBoxes = 'none',
  disabled = false,
  readonly = false,
  state,
}: {
  initialValue?: unknown;
  selectionMode?: OgeTreeSelectSelectionMode;
  showCheckBoxes?: OgeTreeCheckBoxesMode;
  disabled?: boolean;
  readonly?: boolean;
  state: HostState;
}) {
  const [value, setValue] = useState<unknown>(initialValue);
  const [opened, setOpened] = useState(false);
  state.value = value;
  state.opened = opened;
  return (
    <OgeTreeSelect<Folder>
      label="Folder"
      items={FOLDERS}
      displayExpr="name"
      rootValue={null}
      selectionMode={selectionMode}
      showCheckBoxes={showCheckBoxes}
      disabled={disabled}
      readonly={readonly}
      showClearButton
      defaultExpandedKeys={[1, 2, 4]}
      value={value}
      onValueChange={setValue}
      opened={opened}
      onOpenedChange={setOpened}
      onSelectionChanged={(event) => state.changes.push(event)}
    />
  );
}

const newState = (): HostState => ({
  value: null,
  opened: false,
  changes: [],
});

describe('<OgeTreeSelect>', () => {
  it('renders a readonly combobox with the field chrome', () => {
    render(<Host state={newState()} />);
    expect(combo()).toHaveAttribute('role', 'combobox');
    expect(combo()).toHaveAttribute('aria-haspopup', 'tree');
    expect(combo().readOnly).toBe(true);
    expect(combo()).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.oge-input-label')?.textContent).toContain(
      'Folder',
    );
  });

  it('opens on field click and points aria-controls at the tree', async () => {
    const state = newState();
    render(<Host state={state} />);
    await openPanel();

    expect(state.opened).toBe(true);
    expect(panel()).not.toBeNull();
    const treeId = combo().getAttribute('aria-controls');
    expect(treeId).toBeTruthy();
    expect(document.getElementById(treeId ?? '')?.getAttribute('role')).toBe(
      'tree',
    );
  });

  it('commits the picked key and closes in single mode', async () => {
    const state = newState();
    render(<Host state={state} />);
    await openPanel();

    fireEvent.click(rowFor('Reports') as HTMLElement);
    await waitFor(() => expect(panel()).toBeNull());

    expect(state.value).toBe(2);
    expect(state.opened).toBe(false);
    expect(combo().value).toBe('Reports');
    expect(state.changes.at(-1)?.keys).toEqual([2]);
  });

  it('shows the display text of a preset value without opening', () => {
    render(<Host state={newState()} initialValue={5} />);
    expect(combo().value).toBe('Holiday');
  });

  it('collects several keys and joins their labels in multiple mode', async () => {
    const state = newState();
    render(
      <Host state={state} selectionMode="multiple" showCheckBoxes="normal" />,
    );
    await openPanel();

    fireEvent.click(checkOf('Notes') as HTMLElement);
    await waitFor(() => expect(state.value).toEqual([6]));
    expect(combo().value).toBe('Notes');
    // checkbox mode keeps the popup open for further picks
    expect(state.opened).toBe(true);

    fireEvent.click(checkOf('Holiday') as HTMLElement);
    // Holiday is Photos' only child, so the cascade promotes Photos too —
    // `selectedKeysMode="leavesOnly"` is the projection that hides that
    await waitFor(() => expect(state.value).toEqual([6, 4, 5]));
    expect(combo().value).toBe('Notes, Photos, Holiday');
  });

  it('carries the tri-state cascade into the committed value', async () => {
    const state = newState();
    render(
      <Host state={state} selectionMode="multiple" showCheckBoxes="normal" />,
    );
    await openPanel();

    fireEvent.click(checkOf('Reports') as HTMLElement);
    // Reports + its descendant Q1.pdf; Documents stays partial (Notes is off)
    await waitFor(() =>
      expect([...(state.value as number[])].sort()).toEqual([2, 3]),
    );
  });

  it('opens with ArrowDown and closes with Escape', async () => {
    const state = newState();
    render(<Host state={state} />);
    act(() => combo().focus());
    fireEvent.keyDown(combo(), { key: 'ArrowDown' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(state.opened).toBe(true);

    fireEvent.keyDown(combo(), { key: 'Escape' });
    await waitFor(() => expect(panel()).toBeNull());
    expect(state.opened).toBe(false);
  });

  it('moves focus into the tree when the popup opens', async () => {
    render(<Host state={newState()} initialValue={2} />);
    await openPanel();

    await waitFor(() => {
      const active = document.activeElement;
      expect(active?.classList.contains('oge-tree-view-item')).toBe(true);
      expect(active?.getAttribute('data-key')).toBe('2');
    });
  });

  it('the tree in the popup runs the APG key map', async () => {
    const state = newState();
    render(<Host state={state} />);
    await openPanel();

    const documents = rowFor('Documents') as HTMLElement;
    act(() => documents.focus());
    // ArrowDown steps to the next visible row (Documents is expanded)
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'ArrowDown',
    });
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('data-key')).toBe('2'),
    );
    // ArrowLeft collapses the expanded node it sits on
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'ArrowLeft',
    });
    await waitFor(() => expect(rowFor('Q1.pdf')).toBeUndefined());
  });

  it('clears through the field chrome clear button', async () => {
    const state = newState();
    render(<Host state={state} initialValue={2} />);
    expect(combo().value).toBe('Reports');

    fireEvent.click(document.querySelector('.oge-input-clear') as HTMLElement);
    await waitFor(() => expect(state.value).toBeNull());
    expect(combo().value).toBe('');
  });

  it('refuses to open while disabled', () => {
    const state = newState();
    render(<Host state={state} disabled />);
    fireEvent.click(combo());
    expect(state.opened).toBe(false);
    expect(panel()).toBeNull();
  });

  it('refuses to open while readonly', () => {
    const state = newState();
    render(<Host state={state} readonly />);
    fireEvent.click(combo());
    expect(state.opened).toBe(false);
    expect(panel()).toBeNull();
  });

  it('reports emptiness so the floating label and clear button behave', async () => {
    const state = newState();
    render(<Host state={state} />);
    expect(host().classList.contains('oge-input-empty')).toBe(true);

    await openPanel();
    fireEvent.click(rowFor('Documents') as HTMLElement);
    await waitFor(() =>
      expect(host().classList.contains('oge-input-empty')).toBe(false),
    );
  });

  it('treats an empty array as empty in multiple mode', () => {
    render(
      <Host
        state={newState()}
        selectionMode="multiple"
        showCheckBoxes="normal"
        initialValue={[]}
      />,
    );
    expect(host().classList.contains('oge-input-empty')).toBe(true);
  });

  it('renders the count instead of the labels in displayMode="count"', () => {
    render(
      <OgeTreeSelect<Folder>
        label="Folders"
        items={FOLDERS}
        displayExpr="name"
        rootValue={null}
        selectionMode="multiple"
        displayMode="count"
        value={[1, 2]}
      />,
    );
    expect(combo().value).toBe('2');
  });

  it('filters the popup tree through the shared search predicate', async () => {
    render(
      <OgeTreeSelect<Folder>
        label="Folder"
        items={FOLDERS}
        displayExpr="name"
        rootValue={null}
        searchEnabled
        defaultOpened
      />,
    );
    const search = document.querySelector(
      '.oge-tree-view-search-input',
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'holiday' } });
    await waitFor(() => expect(rowFor('Holiday')).toBeDefined());
    // withAncestors keeps the path, drops the rest
    expect(rowFor('Documents')).toBeUndefined();
    expect(rowFor('Photos')).toBeDefined();
  });

  it('the uncontrolled pair drives value and expansion on its own', async () => {
    const expanded: readonly RowKey[][] = [];
    render(
      <OgeTreeSelect<Folder>
        label="Folder"
        items={FOLDERS}
        displayExpr="name"
        rootValue={null}
        defaultValue={null}
        defaultExpandedKeys={[]}
        defaultOpened
        onExpandedKeysChange={(keys) =>
          (expanded as RowKey[][]).push([...keys])
        }
      />,
    );
    // only the roots are visible until something expands
    expect(rowFor('Reports')).toBeUndefined();
    fireEvent.click(
      rowFor('Documents')?.querySelector(
        '.oge-tree-view-toggle',
      ) as HTMLElement,
    );
    await waitFor(() => expect(rowFor('Reports')).toBeDefined());
    expect(expanded.at(-1)).toEqual([1]);

    fireEvent.click(rowFor('Reports') as HTMLElement);
    await waitFor(() => expect(combo().value).toBe('Reports'));
  });

  it('the popup tree reads OgeTreeViewConfigProvider, like the Angular DI config', () => {
    render(
      <OgeTreeViewConfigProvider
        config={{ messages: { searchPlaceholder: 'Klasor ara…' } }}
      >
        <OgeTreeSelect<Folder>
          label="Folder"
          items={FOLDERS}
          displayExpr="name"
          rootValue={null}
          searchEnabled
          defaultOpened
        />
      </OgeTreeViewConfigProvider>,
    );
    expect(
      document.querySelector('.oge-tree-view-search-input'),
    ).toHaveAttribute('placeholder', 'Klasor ara…');
  });

  it('survives a StrictMode double mount', async () => {
    const state = newState();
    render(
      <StrictMode>
        <Host state={state} />
      </StrictMode>,
    );
    expect(screen.getAllByRole('combobox')).toHaveLength(1);

    await openPanel();
    expect(panel()).not.toBeNull();
    // one tree, one open announcement — the effect's teardown ran clean
    expect(document.querySelectorAll('[role="tree"]')).toHaveLength(1);

    fireEvent.click(rowFor('Photos') as HTMLElement);
    await waitFor(() => expect(panel()).toBeNull());
    expect(state.value).toBe(4);
    expect(state.changes).toHaveLength(1);
  });
});
