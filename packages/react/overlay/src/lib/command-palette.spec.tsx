import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { resetScrollLockForTests, type OgeCommand } from '@oge-ui/behavior';
import {
  OgeCommandPalette,
  type OgeCommandExecuteEvent,
  type OgeCommandPaletteHandle,
} from './command-palette';
import { OgeOverlayConfigProvider } from './overlay-config';

const runs: string[] = [];
const COMMANDS: OgeCommand[] = [
  {
    id: 'new',
    label: 'New file',
    group: 'File',
    shortcut: 'Mod+N',
    icon: 'M4 4h16',
    run: () => runs.push('new'),
  },
  { id: 'save', label: 'Save all', group: 'File', disabled: true },
  {
    id: 'settings',
    label: 'Go to settings',
    group: 'Navigation',
    keywords: ['preferences'],
    description: 'Open the settings page',
  },
  { id: 'theme', label: 'Toggle theme' },
];

const panel = () => document.querySelector('.oge-command-palette');
const input = () =>
  document.querySelector('.oge-command-palette-input') as HTMLInputElement;
const options = () =>
  Array.from(document.querySelectorAll('[role="option"]')) as HTMLElement[];
const labels = () =>
  options().map(
    (o) => o.querySelector('.oge-command-palette-label')!.textContent,
  );
const hotkey = (init: KeyboardEventInit = { ctrlKey: true }) =>
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });

beforeEach(() => {
  runs.length = 0;
  resetScrollLockForTests();
});

describe('<OgeCommandPalette>', () => {
  it('opens on Ctrl+K as a labelled modal combobox over a listbox', () => {
    render(
      <StrictMode>
        <button id="trigger" type="button">
          Open
        </button>
        <OgeCommandPalette commands={COMMANDS} />
      </StrictMode>,
    );
    const trigger = document.getElementById('trigger')!;
    trigger.focus();
    expect(panel()).toBeNull();
    hotkey();
    const dialog = panel()!;
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Command palette');
    expect(document.activeElement).toBe(input());
    expect(input().getAttribute('role')).toBe('combobox');
    const list = document.getElementById(
      input().getAttribute('aria-controls')!,
    )!;
    expect(list.getAttribute('role')).toBe('listbox');
    expect(labels()).toEqual([
      'New file',
      'Save all',
      'Go to settings',
      'Toggle theme',
    ]);
    const groups = list.querySelectorAll('[role="group"]');
    expect(groups).toHaveLength(3);
    expect(
      document.getElementById(groups[0].getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('File');
    expect(groups[2].hasAttribute('aria-labelledby')).toBe(false);
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe(options()[0].id);
    expect(options()[1].getAttribute('aria-disabled')).toBe('true');
    expect(
      options()[0].querySelector('.oge-command-palette-shortcut')!.textContent,
    ).toMatch(/N$/);
    hotkey();
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('filters, highlights, announces and runs with the keyboard', () => {
    const executed: string[] = [];
    const queries: string[] = [];
    const recents: (readonly string[])[] = [];
    const ref = createRef<OgeCommandPaletteHandle>();
    render(
      <OgeCommandPalette
        ref={ref}
        commands={COMMANDS}
        onCommandExecute={(e) => executed.push(e.command.id)}
        onQueryChange={(q) => queries.push(q)}
        onRecentChange={(r) => recents.push(r)}
      />,
    );
    act(() => ref.current!.open());
    fireEvent.change(input(), { target: { value: 'pref' } });
    expect(labels()).toEqual(['Go to settings']);
    fireEvent.change(input(), { target: { value: 'tog' } });
    expect(labels()).toEqual(['Toggle theme', 'Go to settings']);
    expect(options()[0].querySelector('mark')!.textContent).toBe('Tog');
    expect(document.querySelector('[role="status"]')!.textContent).toBe(
      '2 results',
    );
    fireEvent.change(input(), { target: { value: 'zzz' } });
    expect(options()).toHaveLength(0);
    expect(
      document.querySelector('.oge-command-palette-empty')!.textContent,
    ).toBe('No matching commands');
    expect(input().hasAttribute('aria-activedescendant')).toBe(false);
    fireEvent.change(input(), { target: { value: '' } });
    expect(queries).toEqual(['pref', 'tog', 'zzz', '']);
    fireEvent.keyDown(input(), { key: 'ArrowDown' });
    expect(options()[2].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'ArrowUp' });
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'End', ctrlKey: true });
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input(), { key: 'Home' });
    fireEvent.keyDown(input(), { key: 'Home', ctrlKey: true });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(runs).toEqual(['new']);
    expect(executed).toEqual(['new']);
    expect(recents).toEqual([['new']]);
    expect(panel()).toBeNull();
    act(() => ref.current!.toggle());
    expect(panel()).not.toBeNull();
    act(() => ref.current!.open()); // already open
    act(() => ref.current!.close());
    expect(panel()).toBeNull();
  });

  it('lists controlled recent commands first, keeps open on request and runs on click', () => {
    const executed: string[] = [];
    function Host() {
      const [recent, setRecent] = useState<readonly string[]>(['theme']);
      const [opened, setOpened] = useState(true);
      return (
        <>
          <output data-testid="recent">{recent.join(',')}</output>
          <output data-testid="opened">{String(opened)}</output>
          <OgeCommandPalette
            commands={COMMANDS}
            opened={opened}
            onOpenedChange={setOpened}
            recent={recent}
            onRecentChange={setRecent}
            recentLimit={3}
            onCommandExecute={(e: OgeCommandExecuteEvent) => {
              e.keepOpen = true;
              executed.push(e.command.id);
            }}
          />
        </>
      );
    }
    const { getByTestId } = render(
      <OgeOverlayConfigProvider
        config={{ messages: { commandPaletteRecent: 'Son' } }}
      >
        <Host />
      </OgeOverlayConfigProvider>,
    );
    expect(labels()[0]).toBe('Toggle theme');
    expect(
      document.querySelector('.oge-command-palette-group-label')!.textContent,
    ).toBe('Son');
    fireEvent.pointerMove(options()[3]);
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    fireEvent.pointerMove(options()[2]); // disabled: ignored
    expect(options()[3].getAttribute('aria-selected')).toBe('true');
    fireEvent.click(options()[2]);
    fireEvent.click(options()[3]);
    expect(executed).toEqual(['settings']);
    expect(getByTestId('recent').textContent).toBe('settings,theme');
    expect(getByTestId('opened').textContent).toBe('true');
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(getByTestId('opened').textContent).toBe('false');
  });

  it('ignores the hotkey when turned off, takes a placeholder and closes on a backdrop press', () => {
    const { rerender } = render(
      <OgeCommandPalette commands={COMMANDS} hotkey={null} />,
    );
    hotkey();
    expect(panel()).toBeNull();
    rerender(
      <OgeCommandPalette
        commands={COMMANDS}
        hotkey="Mod+P"
        placeholder="Search"
        recentLimit={0}
        defaultRecent={['theme']}
      />,
    );
    hotkey({ ctrlKey: true, key: 'p' });
    expect(input().placeholder).toBe('Search');
    expect(labels()[0]).toBe('New file'); // recentLimit 0: no recent section
    const layer = document.querySelector('.oge-command-palette-layer')!;
    fireEvent.pointerDown(layer);
    expect(panel()).toBeNull();
    render(<OgeCommandPalette commands={COMMANDS} defaultOpened />);
    expect(panel()).not.toBeNull();
  });
});
